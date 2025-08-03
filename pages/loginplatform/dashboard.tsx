import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface Email {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
  hasPdfAttachment?: boolean
  pdfAttachments?: Array<{filename: string, attachmentId: string, size?: number}>
  attachmentCount?: number
  processed?: boolean
  processingStatus?: 'not_processed' | 'processing' | 'completed' | 'failed'
  receiptCount?: number
  merchantNames?: string[]
  totalAmount?: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedPdf, setSelectedPdf] = useState<{emailId: string, filename: string, attachmentId: string} | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/email-auth-flow/signin')
    }
  }, [status, router])

  const fetchEmails = async () => {
    console.log('[DASHBOARD] Fetching emails with auto-processing...')
    try {
      const response = await fetch('/api/emails-auto-process')
      if (response.ok) {
        const emailData = await response.json()
        console.log('[DASHBOARD] Received emails:', emailData.length)
        
        // Enhance emails with processing status
        const enhancedEmails = await Promise.all(
          emailData.map(async (email: Email) => {
            try {
              // Check if email has been processed by looking for receipts
              const receiptResponse = await fetch(`/api/processed-files?emailId=${email.id}`)
              if (receiptResponse.ok) {
                const receiptData = await receiptResponse.json()
                const processedFiles = receiptData.files || []
                
                const receiptFiles = processedFiles.filter((file: any) => file.isReceipt)
                const completedReceipts = receiptFiles.filter((file: any) => file.processingStatus === 'completed')
                
                return {
                  ...email,
                  processed: receiptFiles.length > 0,
                  processingStatus: receiptFiles.length === 0 ? 'not_processed' :
                                   completedReceipts.length === receiptFiles.length ? 'completed' :
                                   completedReceipts.length > 0 ? 'processing' : 'failed',
                  receiptCount: receiptFiles.length,
                  merchantNames: completedReceipts.map((r: any) => r.merchantName).filter(Boolean),
                  totalAmount: completedReceipts.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0)
                }
              }
              return email
            } catch (error) {
              console.error(`Error checking processing status for email ${email.id}:`, error)
              return email
            }
          })
        )
        
        setEmails(enhancedEmails)
        setLastRefresh(new Date())
      } else {
        console.error('[DASHBOARD] Failed to fetch emails:', response.status)
      }
    } catch (error) {
      console.error('[DASHBOARD] Error fetching emails:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchEmails()
      
      // Set up polling for real-time updates every 30 seconds
      const interval = setInterval(fetchEmails, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const extractEmailAddress = (fromString: string) => {
    const match = fromString.match(/<(.+)>/)
    return match ? match[1] : fromString
  }

  const extractSenderName = (fromString: string) => {
    const match = fromString.match(/^(.+)\s</)
    return match ? match[1].replace(/"/g, '') : fromString.split('@')[0]
  }

  const getProcessingStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProcessingStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Processed'
      case 'processing': return 'Processing'
      case 'failed': return 'Failed'
      default: return 'New'
    }
  }

  const openEmailModal = (email: Email) => {
    setSelectedEmail(email)
    setShowEmailModal(true)
  }

  const openPdfViewer = (emailId: string, filename: string, attachmentId: string) => {
    setSelectedPdf({ emailId, filename, attachmentId })
    setShowPdfModal(true)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gmail PDF Auto-Processor</h1>
              <p className="text-sm text-gray-500">Auto-processing PDF receipts with AI</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/receipt-processing/ledger">
                <button className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">
                  View Ledger
                </button>
              </Link>
              <Link href="/processing-logs">
                <button className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                  Processing Logs
                </button>
              </Link>
              <Link href="/reconciliation">
                <button className="px-4 py-2 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
                  Bank Reconciliation
                </button>
              </Link>
              <div className="text-sm text-gray-600">
                Welcome, {session.user?.name}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auto-Processing Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full mr-3">
              <svg className="w-4 h-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">Auto-Processing Active</h3>
              <p className="text-sm text-green-700">PDF attachments are automatically processed with AI as emails arrive</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                PDF Emails Auto-Processed ({emails.length})
              </h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
                <button
                  onClick={fetchEmails}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="-ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Email List */}
          <div className="divide-y divide-gray-200">
            {loading && emails.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading emails...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-sm font-medium text-gray-900">No unread emails</h3>
                <p className="mt-2 text-sm text-gray-500">All caught up! Check back later for new messages.</p>
              </div>
            ) : (
              emails.map((email) => (
                <div 
                  key={email.id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500"
                  onClick={() => openEmailModal(email)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center relative">
                        <span className="text-indigo-600 font-medium text-sm">
                          {extractSenderName(email.from).charAt(0).toUpperCase()}
                        </span>
                        {/* Processing Status Indicator */}
                        {email.processingStatus === 'completed' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {email.processingStatus === 'processing' && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {extractSenderName(email.from)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProcessingStatusColor(email.processingStatus)}`}>
                            {getProcessingStatusText(email.processingStatus)}
                          </span>
                          <p className="text-sm text-gray-500 flex-shrink-0">
                            {formatDate(email.date)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {extractEmailAddress(email.from)}
                      </p>
                      
                      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-1">
                        {email.subject}
                      </h3>
                      
                      {email.snippet && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {email.snippet}
                        </p>
                      )}

                      {/* Processing Summary */}
                      {email.processed && email.receiptCount && email.receiptCount > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-2">
                          <div className="flex items-center text-xs text-green-700">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{email.receiptCount} receipt{email.receiptCount > 1 ? 's' : ''} processed</span>
                            {email.totalAmount && email.totalAmount > 0 && (
                              <span className="ml-2">• Total: ${email.totalAmount.toFixed(2)}</span>
                            )}
                          </div>
                          {email.merchantNames && email.merchantNames.length > 0 && (
                            <div className="text-xs text-green-600 mt-1">
                              {email.merchantNames.slice(0, 2).join(', ')}
                              {email.merchantNames.length > 2 && ` +${email.merchantNames.length - 2} more`}
                            </div>
                          )}
                        </div>
                      )}

                      {/* PDF Attachments */}
                      {email.pdfAttachments && email.pdfAttachments.length > 0 && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span>{email.pdfAttachments.length} PDF attachment{email.pdfAttachments.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            🔄 Auto-refreshing every 30 seconds for real-time updates
          </p>
        </div>
      </main>

      {/* Email Detail Modal */}
      {showEmailModal && selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">Email Details</h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <p className="text-sm text-gray-900">{selectedEmail.from}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <p className="text-sm text-gray-900">{selectedEmail.subject}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedEmail.date).toLocaleString()}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Preview</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{selectedEmail.snippet}</p>
                  </div>
                </div>

                {selectedEmail.pdfAttachments && selectedEmail.pdfAttachments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PDF Attachments</label>
                    <div className="space-y-2">
                      {selectedEmail.pdfAttachments.map((pdf, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{pdf.filename}</p>
                              {pdf.size && (
                                <p className="text-xs text-gray-500">{Math.round(pdf.size / 1024)} KB</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => openPdfViewer(selectedEmail.id, pdf.filename, pdf.attachmentId)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            View PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEmail.processed && selectedEmail.receiptCount && selectedEmail.receiptCount > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Processing Results</label>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-green-800">
                          {selectedEmail.receiptCount} receipt{selectedEmail.receiptCount > 1 ? 's' : ''} successfully processed
                        </span>
                      </div>
                      {selectedEmail.totalAmount && selectedEmail.totalAmount > 0 && (
                        <p className="text-sm text-green-700 mb-2">
                          Total Amount: ${selectedEmail.totalAmount.toFixed(2)}
                        </p>
                      )}
                      {selectedEmail.merchantNames && selectedEmail.merchantNames.length > 0 && (
                        <div>
                          <p className="text-sm text-green-700 font-medium mb-1">Merchants:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedEmail.merchantNames.map((merchant, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {merchant}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfModal && selectedPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">{selectedPdf.filename}</h2>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-hidden" style={{ height: 'calc(95vh - 120px)' }}>
              <iframe
                src={`/api/download-pdf?messageId=${selectedPdf.emailId}&attachmentId=${selectedPdf.attachmentId}&filename=${encodeURIComponent(selectedPdf.filename)}`}
                className="w-full h-full border-0 rounded"
                title={selectedPdf.filename}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
