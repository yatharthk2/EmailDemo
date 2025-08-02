import { google } from 'googleapis'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    const { messageId, attachmentId, filename } = req.query

    if (!messageId || !attachmentId || !filename) {
      return res.status(400).json({ message: 'Missing required parameters' })
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Get the attachment
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId as string,
      id: attachmentId as string
    })

    if (!attachment.data.data) {
      return res.status(404).json({ message: 'Attachment not found' })
    }

    // Decode the base64 data
    const buffer = Buffer.from(attachment.data.data, 'base64url')

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)

    // Send the PDF data
    res.send(buffer)

  } catch (error) {
    console.error('PDF Download Error:', error)
    res.status(500).json({ message: 'Failed to download PDF' })
  }
}
