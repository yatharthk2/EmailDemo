import { useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

export default function AuthCallback() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If authentication is complete and successful
    if (status === 'authenticated' && session) {
      // Automatically set up Gmail notifications after successful login
      setupGmailNotifications()
        .then(() => {
          console.log('Gmail notifications set up automatically')
        })
        .catch(error => {
          console.error('Error setting up Gmail notifications:', error)
        })
        .finally(() => {
          // Redirect to dashboard regardless of notification setup success
          router.push('/loginplatform/dashboard')
        })
    } else if (status === 'unauthenticated') {
      // If not authenticated, redirect to sign-in
      router.push('/email-auth-flow/signin')
    }
  }, [status, session, router])

  // Function to set up Gmail notifications
  async function setupGmailNotifications() {
    try {
      const response = await fetch('/api/setup-watch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to set up Gmail notifications')
      }

      return await response.json()
    } catch (error) {
      console.error('Error setting up Gmail notifications:', error)
      throw error
    }
  }

  // Show loading state while authentication is in progress
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">Setting up your account...</h2>
        <p className="mt-2 text-gray-500">Configuring Gmail notifications. Please wait.</p>
      </div>
    </div>
  )
}
