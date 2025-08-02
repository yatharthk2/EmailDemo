import { google } from 'googleapis'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

// Helper function to check for PDF attachments
function checkForPdfAttachments(payload: any): boolean {
  if (!payload) return false
  
  // Check if this part has attachments
  if (payload.parts) {
    for (const part of payload.parts) {
      if (checkForPdfAttachments(part)) return true
    }
  }
  
  // Check the current part
  if (payload.filename && payload.filename.toLowerCase().endsWith('.pdf')) {
    return true
  }
  
  // Check mimeType for PDF
  if (payload.mimeType === 'application/pdf') {
    return true
  }
  
  return false
}

// Helper function to extract PDF attachments information
function extractPdfAttachments(payload: any): Array<{filename: string, attachmentId: string, size?: number}> {
  const pdfAttachments: Array<{filename: string, attachmentId: string, size?: number}> = []
  
  function traverse(part: any) {
    if (part.parts) {
      part.parts.forEach(traverse)
    }
    
    if (part.filename && 
        part.filename.toLowerCase().endsWith('.pdf') && 
        part.body?.attachmentId) {
      pdfAttachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId,
        size: part.body.size
      })
    }
  }
  
  if (payload) {
    traverse(payload)
  }
  
  return pdfAttachments
}

// Helper function to count total attachments
function countAttachments(payload: any): number {
  if (!payload) return 0
  
  let count = 0
  
  if (payload.parts) {
    for (const part of payload.parts) {
      count += countAttachments(part)
    }
  }
  
  // Count if this part is an attachment
  if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) {
    count++
  }
  
  return count
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Calculate date 7 days ago for filtering
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const dateFilter = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '/')
    
    // Get list of messages with PDF attachments from last 7 days
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50, // Increased to find more emails with PDF attachments
      q: `is:unread has:attachment filename:pdf after:${dateFilter}`
    })

    if (!response.data.messages) {
      return res.status(200).json([])
    }

    // Get details for each message and verify PDF attachments
    const emailDetails = await Promise.all(
      response.data.messages.map(async (message) => {
        const msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        })

        const headers = msgDetail.data.payload?.headers || []
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
        const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString()

        // Check for PDF attachments
        const hasPdfAttachment = checkForPdfAttachments(msgDetail.data.payload)
        
        if (!hasPdfAttachment) {
          return null // Filter out emails without PDF attachments
        }

        const attachmentCount = countAttachments(msgDetail.data.payload)
        const pdfAttachments = extractPdfAttachments(msgDetail.data.payload)

        return {
          id: message.id,
          from,
          subject,
          date: new Date(date).toISOString(),
          snippet: msgDetail.data.snippet,
          attachmentCount,
          hasPdfAttachment: true,
          pdfAttachments
        }
      })
    )

    // Filter out null values and limit to 10 results
    const filteredEmails = emailDetails.filter(email => email !== null).slice(0, 10)

    res.status(200).json(filteredEmails)
  } catch (error) {
    console.error('Gmail API Error:', error)
    res.status(500).json({ message: 'Failed to fetch emails' })
  }
}
