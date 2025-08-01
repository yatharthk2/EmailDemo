import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function SetupGmailWatch() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const setupWatch = async () => {
    if (!session) {
      setError('You must be logged in to set up Gmail notifications')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Initiating Gmail watch setup...')
      const response = await fetch('/api/setup-watch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      console.log('Setup watch response:', data)

      if (!response.ok) {
        console.error('Error from setup watch API:', data)
        throw new Error(data.message || data.error || 'Failed to set up Gmail watch')
      }

      setResult(data)
    } catch (err: any) {
      console.error('Error setting up Gmail watch:', err)
      const errorMessage = err.message || 'An error occurred while setting up Gmail watch'
      setError(errorMessage)
      
      // If it's a Google API error, provide more specific guidance
      if (errorMessage.includes('topicName') || errorMessage.includes('Pub/Sub')) {
        setError(`${errorMessage}. Please verify that your Google Cloud Pub/Sub topic is correctly configured.`)
      } else if (errorMessage.includes('scope') || errorMessage.includes('permission')) {
        setError(`${errorMessage}. You may need to re-authorize your account with the required permissions.`)
      } else if (errorMessage.includes('Only one user push notification client allowed')) {
        setError(`There is already an active notification setup. The system will attempt to reset it before setting up a new one.`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Gmail Push Notification Setup</h2>
      
      <p className="mb-4">
        Set up Gmail push notifications to receive real-time updates when new emails arrive.
        This needs to be done once every 7 days.
      </p>

      <div className="mb-6">
        <button
          onClick={setupWatch}
          disabled={isLoading || !session}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Setting up...' : 'Set up Gmail Notifications'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
          <p className="font-bold">Setup successful!</p>
          <p>You will now receive push notifications for new emails.</p>
          <div className="mt-2">
            <p><strong>History ID:</strong> {result.historyId}</p>
            <p><strong>Expires:</strong> {new Date(parseInt(result.expiration)).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">How it works</h3>
        <p>
          When you set up Gmail notifications, we register with Google to receive push 
          notifications whenever new emails arrive in your inbox. This allows us to
          process your emails in real-time without constantly polling the Gmail API.
        </p>
        <p className="mt-2">
          The setup expires after 7 days, so you&apos;ll need to renew it periodically.
        </p>
      </div>
    </div>
  )
}
