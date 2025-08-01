import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { GmailService } from '../../lib/gmail-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Get the email ID from the query parameters
  const messageId = req.query.id as string
  
  if (!messageId) {
    return res.status(400).json({ message: 'Missing required parameter: id' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    // Initialize Gmail service with user's access token
    const gmailService = new GmailService(
      session.accessToken,
      session.refreshToken as string
    )
    
    // Get the full message
    const message = await gmailService.getMessage(messageId)
    
    if (!message) {
      return res.status(404).json({ message: 'Email not found' })
    }
    
    // Process the message
    const headers = message.payload?.headers || []
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown'
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'
    const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString()
    
    // Check if it has PDF attachments
    const hasPdfAttachment = GmailService.hasPdfAttachment(message)
    
    // Get attachment details
    const attachments = GmailService.getAttachments(message)
    
    // Filter to only keep PDF attachments
    const pdfAttachments = attachments.filter(
      attachment => attachment.mimeType === 'application/pdf' || 
                    attachment.filename.toLowerCase().endsWith('.pdf')
    )
    
    // Only return emails with PDF attachments
    if (!hasPdfAttachment) {
      return res.status(200).json({ noPdfAttachment: true })
    }
    
    // Return the processed email data
    res.status(200).json({
      id: message.id,
      from,
      subject,
      date: new Date(date).toISOString(),
      snippet: message.snippet,
      hasPdfAttachment,
      pdfAttachments: pdfAttachments.length > 0 ? pdfAttachments : undefined,
      threadId: message.threadId,
      isNew: true
    })
  } catch (error) {
    console.error('Error fetching email:', error)
    res.status(500).json({ message: 'Failed to fetch email' })
  }
}
