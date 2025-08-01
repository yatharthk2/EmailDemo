import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { GmailService } from '../../lib/gmail-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }
  
  // Get required query parameters
  const messageId = req.query.messageId as string
  const attachmentId = req.query.attachmentId as string
  
  if (!messageId || !attachmentId) {
    return res.status(400).json({ 
      message: 'Missing required parameters: messageId and attachmentId are required' 
    })
  }

  try {
    // Get the session to authenticate the request
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    
    // Create Gmail service with user's access token
    const gmailService = new GmailService(
      session.accessToken,
      session.refreshToken as string
    )
    
    // Get the attachment data
    const attachment = await gmailService.getAttachment(messageId, attachmentId)
    
    if (!attachment || !attachment.data) {
      return res.status(404).json({ message: 'Attachment not found' })
    }
    
    // Decode base64 data
    const buffer = Buffer.from(attachment.data, 'base64')
    
    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="receipt.pdf"')
    res.setHeader('Content-Length', buffer.length)
    
    // Send the PDF data
    res.send(buffer)
  } catch (error) {
    console.error('Error downloading attachment:', error)
    res.status(500).json({ message: 'Failed to download attachment', error: String(error) })
  }
}
