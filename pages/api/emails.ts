import { google } from 'googleapis'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { GmailService } from '../../lib/gmail-service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    const gmailService = new GmailService(
      session.accessToken,
      session.refreshToken as string
    )

    // Check for a historyId query parameter for using the push notification system
    // This would be for manual testing or implementing continuity after webhook events
    const historyId = req.query.historyId as string
    
    // If historyId is provided, fetch email changes since that ID
    if (historyId) {
      const history = await gmailService.getHistory(historyId)
      if (history && history.length > 0) {
        // Process the history changes
        // This is similar to what would happen in the webhook
        const emailDetails = await processHistoryChanges(gmailService, history)
        return res.status(200).json(emailDetails)
      }
    }

    // Default behavior - list recent messages
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Get list of messages without using the 'q' parameter 
    // (since we're using the gmail.readonly scope)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10
    })

    if (!response.data.messages) {
      return res.status(200).json([])
    }

    // Get details for each message
    const emailDetails = await Promise.all(
      response.data.messages.map(async (message) => {
        const msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        })

        const headers = msgDetail.data.payload?.headers || []
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
        const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString()

        return {
          id: message.id,
          from,
          subject,
          date: new Date(date).toISOString(),
          snippet: msgDetail.data.snippet
        }
      })
    )

    res.status(200).json(emailDetails)
  } catch (error) {
    console.error('Gmail API Error:', error)
    res.status(500).json({ message: 'Failed to fetch emails' })
  }
}

/**
 * Process history changes from Gmail API
 * This is used both in the webhook and when manually fetching history changes
 */
async function processHistoryChanges(gmailService: GmailService, history: any[]) {
  const emailDetails: any[] = []
  
  for (const change of history) {
    // Check for new messages
    if (change.messagesAdded) {
      for (const messageAdded of change.messagesAdded) {
        const messageId = messageAdded.message.id
        const message = await gmailService.getMessage(messageId)
        
        if (message) {
          const headers = message.payload?.headers || []
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown'
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'
          const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString()
          
          emailDetails.push({
            id: message.id,
            from,
            subject,
            date: new Date(date).toISOString(),
            snippet: message.snippet,
            historyId: message.historyId,
            source: 'push_notification'
          })
        }
      }
    }
  }
  
  return emailDetails
}
