import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push('/loginplatform/dashboard')
      }
    }
    checkSession()
  }, [router])

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { 
        callbackUrl: '/loginplatform/dashboard' 
      })
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gmail Monitor Demo
          </h1>
          <p className="text-gray-600 mb-4">
            Connect your Gmail account to monitor real-time emails
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>By signing in</strong>, you authorize this app to:
                </p>
                <ul className="list-disc list-inside mt-1 text-sm text-blue-700">
                  <li>Read your Gmail messages</li>
                  <li>Set up real-time Gmail notifications</li>
                  <li>Process new emails as they arrive</li>
                </ul>
                <p className="text-xs text-blue-600 mt-1">
                  Your session will expire after 1 hour for security.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </div>
              )}
            </button>
            
            <div className="text-sm text-gray-500">
              <p>By signing in, you agree to allow this demo app to:</p>
              <ul className="mt-2 text-xs text-left list-disc list-inside space-y-1">
                <li>View your email messages and settings</li>
                <li>View your basic profile information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
