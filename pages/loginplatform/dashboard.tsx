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
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

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
        setEmails(emailData)
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
                <div key={email.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-medium text-sm">
                          {extractSenderName(email.from).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {extractSenderName(email.from)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            New
                          </span>
                          <p className="text-sm text-gray-500 flex-shrink-0">
                            {formatDate(email.date)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500 truncate">
                        {extractEmailAddress(email.from)}
                      </p>
                      
                      <h3 className="text-sm font-medium text-gray-900 mt-1 truncate">
                        {email.subject}
                      </h3>
                      
                      {email.snippet && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {email.snippet}
                        </p>
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
    </div>
  )
}
