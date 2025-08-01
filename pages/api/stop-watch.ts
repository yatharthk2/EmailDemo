import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { GmailService } from '../../lib/gmail-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Stopping Gmail watch...')
    
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    
    console.log('User authenticated, creating Gmail service...')
    const gmailService = new GmailService(
      session.accessToken,
      session.refreshToken as string
    )
    
    // Log the user email for debugging
    console.log(`Stopping watch for user: ${session.user?.email}`)
    
    // Stop the Gmail watch
    const stopResponse = await gmailService.stopWatch()
    console.log('Stop response received:', stopResponse)
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Gmail watch stopped successfully',
      ...stopResponse
    })
  } catch (error) {
    console.error('Error stopping Gmail watch:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to stop Gmail watch',
      error: String(error)
    })
  }
}
