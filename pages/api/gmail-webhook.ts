import { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { getToken } from 'next-auth/jwt'

interface PubSubMessage {
  message: {
    data: string
    messageId: string
    publishTime: string
    attributes?: Record<string, string>
  }
  subscription: string
}

interface GmailNotification {
  emailAddress: string
  historyId: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Log all incoming requests for debugging
  console.log('Webhook request received:')
  console.log('- Method:', req.method)
  console.log('- Headers:', JSON.stringify(req.headers))
  console.log('- Body:', JSON.stringify(req.body, null, 2))
  
  // Handle Pub/Sub subscription verification (special GET request)
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge']
    if (challenge) {
      console.log('Responding to subscription verification challenge')
      return res.status(200).send(challenge)
    }
    return res.status(200).json({ message: 'Webhook endpoint is active' })
  }
  
  // Only allow POST requests for normal operation
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Processing webhook POST request')
    
    // Basic validation
    const body = req.body as PubSubMessage
    if (!body?.message?.data) {
      console.log('No Pub/Sub message data received. Body:', JSON.stringify(req.body))
      
      // Handle direct Gmail notification format
      // Gmail sends direct notifications in the format: {"emailAddress":"user@gmail.com","historyId":"123456"}
      if (typeof req.body === 'string') {
        try {
          // Try to parse the string as JSON
          const parsedBody = JSON.parse(req.body);
          if (parsedBody.emailAddress && parsedBody.historyId) {
            console.log('Found direct Gmail notification format (JSON string)')
            await processGmailNotification(
              parsedBody.emailAddress, 
              parsedBody.historyId.toString()
            );
            return res.status(200).json({ success: true });
          }
        } catch (e) {
          console.log('Failed to parse body as JSON string', e);
        }
      }
      
      // Check for direct object format (not nested inside a Pub/Sub message)
      if (req.body?.emailAddress && req.body?.historyId) {
        console.log('Found direct Gmail notification format (object)')
        await processGmailNotification(
          req.body.emailAddress as string, 
          req.body.historyId.toString()
        )
        return res.status(200).json({ success: true })
      }
      
      // Return 200 OK even for invalid format to avoid Gmail retries
      // In production, you might want to log these invalid requests
      return res.status(200).json({ 
        success: false,
        message: 'Notification received but format was not recognized',
        receivedBody: req.body
      })
    }

    // Decode base64 data
    const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8')
    console.log('Decoded data:', decodedData)
    
    // Parse the decoded data
    const notification = JSON.parse(decodedData) as GmailNotification
    
    // Extract email address and historyId from notification
    const { emailAddress, historyId } = notification
    console.log(`Processing notification for ${emailAddress}, historyId: ${historyId}`)
    
    // Process the notification
    await processGmailNotification(emailAddress, historyId)
    
    // Acknowledge successful receipt
    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ message: 'Internal server error', error: String(error) })
  }
}

async function processGmailNotification(emailAddress: string, historyId: string) {
  try {
    console.log(`🔔 NEW NOTIFICATION: Email ${emailAddress} has updates with history ID: ${historyId}`)
    
    // In a production environment, you'd fetch user tokens from a database and process the notification
    // For demonstration purposes, we'll just log it

    // IMPORTANT: For a production system, you would:
    // 1. Store user OAuth tokens in a database keyed by email address
    // 2. When a notification is received, look up the user by email address
    // 3. Use their stored tokens to create a GmailService instance
    // 4. Call the Gmail API to get the history changes using historyId
    // 5. Process any new or modified messages
    
    // Example implementation (commented out):
    /*
    // 1. Find the user in the database based on emailAddress
    const user = await db.findUserByEmail(emailAddress);
    
    // 2. If user found, get their tokens
    if (!user || !user.refreshToken) {
      throw new Error('User not found or missing refresh token');
    }
    
    // 3. Initialize Gmail service with user's tokens
    const gmailService = new GmailService(user.accessToken, user.refreshToken);
    
    // 4. Get history changes
    const history = await gmailService.getHistory(historyId);
    
    // 5. Process changes
    if (history.length > 0) {
      console.log(`Found ${history.length} history changes`);
      for (const change of history) {
        if (change.messagesAdded) {
          console.log(`Processing ${change.messagesAdded.length} new messages`);
          for (const messageAdded of change.messagesAdded) {
            const messageId = messageAdded.message.id;
            const message = await gmailService.getMessage(messageId);
            if (message) {
              await processNewEmail(message);
            }
          }
        }
      }
    }
    */
    
    console.log(`✅ Successfully received notification for ${emailAddress}.`);
    console.log(`📧 History ID: ${historyId}`);
    console.log(`⏱️ Timestamp: ${new Date().toISOString()}`);
    
    // Display a notification summary
    console.log('\n==================================================');
    console.log('📬 GMAIL NOTIFICATION RECEIVED');
    console.log('--------------------------------------------------');
    console.log(`👤 User: ${emailAddress}`);
    console.log(`🔄 History ID: ${historyId}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    console.log('==================================================\n');
  } catch (error) {
    console.error('Error processing Gmail notification:', error)
    throw error
  }
}

/**
 * Process a new email message
 * In a production environment, this would save to a database, trigger notifications, etc.
 */
async function processNewEmail(message: any) {
  // Extract email details
  const headers = message.payload?.headers || []
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'
  const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender'
  const to = headers.find((h: any) => h.name === 'To')?.value || 'Unknown Recipient'
  const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString()
  const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value
  
  console.log('\n========== NEW EMAIL RECEIVED ==========')
  console.log(`📨 From: ${from}`)
  console.log(`📧 To: ${to}`)
  console.log(`📝 Subject: ${subject}`)
  console.log(`📅 Date: ${date}`)
  console.log(`🆔 Gmail ID: ${message.id}`)
  console.log(`📬 Message-ID: ${messageId}`)
  console.log('========================================\n')
  
  // Extract email body if needed
  const body = await extractEmailBody(message.payload)
  if (body) {
    console.log('📄 Body Preview:', body.substring(0, 200) + '...')
  }
  
  return {
    id: message.id,
    messageId,
    from,
    to,
    subject,
    date: new Date(date).toISOString(),
    snippet: message.snippet,
    body: body?.substring(0, 500) // Truncate long bodies
  }
}

/**
 * Extract the body content from an email message
 */
function extractEmailBody(payload: any): string | null {
  try {
    // Handle different email structures
    if (payload.parts) {
      // Multipart email
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
        if (part.mimeType === 'text/html' && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
        // Handle nested parts
        if (part.parts) {
          const nestedBody = extractEmailBody(part)
          if (nestedBody) return nestedBody
        }
      }
    } else if (payload.body && payload.body.data) {
      // Single part email
      return Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }
    
    return null
  } catch (error) {
    console.error('Error extracting email body:', error)
    return null
  }
}
