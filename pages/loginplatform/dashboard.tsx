import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

interface Attachment {
  filename: string
  mimeType: string
  attachmentId: string
  size: number
}

interface Email {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
  source?: string
  hasPdfAttachment?: boolean
  pdfAttachments?: Attachment[]
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/email-auth-flow/signin')
    } else if (status === 'authenticated' && session) {
      // Check if session will expire soon (within 5 minutes)
      const checkSessionExpiry = () => {
        const sessionExpiry = new Date(session.expires as string);
        const now = new Date();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (sessionExpiry.getTime() - now.getTime() < fiveMinutes) {
          // Show notification that session is about to expire
          alert("Your session will expire soon. You'll need to sign in again to continue.");
        }
      };
      
      // Check once on load
      checkSessionExpiry();
      
      // Also check every minute
      const interval = setInterval(checkSessionExpiry, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [status, router, session])

  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/emails')
      if (response.ok) {
        const emailData = await response.json()
        setEmails(emailData)
        setLastRefresh(new Date())
      } else {
        console.error('Failed to fetch emails')
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle sign out with clean up
  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    
    try {
      // Try to stop Gmail watch before signing out
      await fetch('/api/stop-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Gmail watch stopped successfully');
    } catch (error) {
      console.error('Error stopping Gmail watch:', error);
    } finally {
      // Sign out regardless of whether stopping watch succeeded
      signOut({ callbackUrl: '/' });
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
              <h1 className="text-2xl font-bold text-gray-900">Receipt Monitor</h1>
              <p className="text-sm text-gray-500">Emails with PDF receipts</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {session.user?.name}
              </div>
              <button
                onClick={handleSignOut}
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
        {/* Status indicator for Gmail notifications */}
        <div className="mb-8 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm leading-5 text-green-700">
                Gmail notifications are active. You will receive real-time updates when new emails arrive.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                PDF Receipt Emails ({emails.length})
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-sm font-medium text-gray-900">No PDF receipts found</h3>
                <p className="mt-2 text-sm text-gray-500">No emails with PDF receipts were found in your inbox.</p>
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
                          {email.hasPdfAttachment && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                              PDF Receipt
                            </span>
                          )}
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
                      
                      {/* PDF Attachments */}
                      {email.pdfAttachments && email.pdfAttachments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {email.pdfAttachments.map((attachment, index) => (
                              <a 
                                key={index}
                                href={`/api/download-attachment?messageId=${email.id}&attachmentId=${attachment.attachmentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <svg className="-ml-1 mr-1 h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                {attachment.filename.length > 20 ? attachment.filename.substring(0, 18) + '...' : attachment.filename}
                              </a>
                            ))}
                          </div>
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
    </div>
  )
}
