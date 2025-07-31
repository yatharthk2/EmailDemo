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

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Get list of messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'is:unread'
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
