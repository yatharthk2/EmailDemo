import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function AuthTest() {
  const { data: session, status } = useSession()
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-auth')
      const data = await response.json()
      setTestResult({ status: response.status, data })
    } catch (error) {
      setTestResult({ 
        status: 'ERROR', 
        data: { message: error instanceof Error ? error.message : 'Unknown error' } 
      })
    } finally {
      setLoading(false)
    }
  }

  const testEmailAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/emails-auto-process')
      const data = await response.json()
      setTestResult({ status: response.status, data })
    } catch (error) {
      setTestResult({ 
        status: 'ERROR', 
        data: { message: error instanceof Error ? error.message : 'Unknown error' } 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Test</h1>
          
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-2">Session Status</h2>
              <p><strong>Status:</strong> {status}</p>
              {session && (
                <div className="text-sm text-gray-600 mt-2">
                  <p><strong>Email:</strong> {session.user?.email}</p>
                  <p><strong>Has Access Token:</strong> {session.accessToken ? 'Yes' : 'No'}</p>
                  <p><strong>Has Refresh Token:</strong> {session.refreshToken ? 'Yes' : 'No'}</p>
                  {session.error && (
                    <p className="text-red-600"><strong>Error:</strong> {session.error}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {!session ? (
                <button
                  onClick={() => signIn('google')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Sign in with Google
                </button>
              ) : (
                <button
                  onClick={() => signOut()}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                >
                  Sign out
                </button>
              )}

              <button
                onClick={testAuth}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Authentication'}
              </button>

              <button
                onClick={testEmailAPI}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Email API'}
              </button>
            </div>

            {testResult && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Test Result</h3>
                <div className="bg-gray-100 p-3 rounded-md">
                  <p><strong>Status:</strong> {testResult.status}</p>
                  <pre className="text-xs mt-2 whitespace-pre-wrap">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
