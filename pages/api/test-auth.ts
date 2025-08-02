import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ 
        message: 'Not authenticated',
        authenticated: false 
      })
    }

    // Check if session has access token
    if (!session.accessToken) {
      return res.status(401).json({ 
        message: 'No access token available',
        authenticated: false,
        hasSession: true 
      })
    }

    // Check for auth errors
    if (session.error === 'RefreshAccessTokenError') {
      return res.status(401).json({ 
        message: 'Token refresh failed - please sign in again',
        authenticated: false,
        hasSession: true,
        error: 'REFRESH_TOKEN_ERROR'
      })
    }

    return res.status(200).json({
      message: 'Authentication successful',
      authenticated: true,
      hasSession: true,
      hasAccessToken: !!session.accessToken,
      hasRefreshToken: !!session.refreshToken,
      userEmail: session.user?.email
    })

  } catch (error) {
    console.error('[TEST-AUTH] Error:', error)
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
