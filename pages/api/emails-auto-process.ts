import { google } from 'googleapis'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db'

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

// Helper function to count all attachments
function countAttachments(payload: any): number {
  let count = 0
  
  function traverse(part: any) {
    if (part.parts) {
      part.parts.forEach(traverse)
    }
    
    if (part.filename && part.body?.attachmentId) {
      count++
    }
  }
  
  if (payload) {
    traverse(payload)
  }
  
  return count
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[AUTO-EMAILS] API called:', new Date().toISOString())
  
  if (req.method !== 'GET') {
    console.log('[AUTO-EMAILS] Method not allowed:', req.method)
    return res.status(405).json({ message: 'Method not allowed' })
  }

  let processor: ReceiptProcessorWithDB | null = null;

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.accessToken) {
      console.log('[AUTO-EMAILS] No valid session found')
      return res.status(401).json({ 
        message: 'Unauthorized - Please sign in with Google to access Gmail',
        requiresAuth: true 
      })
    }

    // Check for forceReprocess query parameter (defaults to false for auto processing)
    const forceReprocess = req.query.forceReprocess === 'true';
    console.log(`[AUTO-EMAILS] Force reprocessing: ${forceReprocess}`);

    console.log('[AUTO-EMAILS] Setting up Gmail API client')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    // Set credentials with both access and refresh tokens
    oauth2Client.setCredentials({ 
      access_token: session.accessToken,
      refresh_token: session.refreshToken
    })

    // Set up automatic token refresh
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        console.log('[AUTO-EMAILS] New refresh token received')
      }
      if (tokens.access_token) {
        console.log('[AUTO-EMAILS] Access token refreshed')
      }
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Calculate date filter for last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const dateFilter = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '/')

    console.log('[AUTO-EMAILS] Searching for emails with PDF attachments since:', dateFilter)
    
    // Get list of messages with PDF attachments from last 7 days
    let response
    try {
      response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        q: `is:unread has:attachment filename:pdf after:${dateFilter}`
      })
    } catch (gmailError: any) {
      console.error('[AUTO-EMAILS] Gmail API Error:', gmailError)
      
      if (gmailError.code === 401) {
        return res.status(401).json({ 
          message: 'Gmail authentication failed. Please sign out and sign in again.',
          error: 'INVALID_CREDENTIALS',
          requiresReauth: true
        })
      }
      
      if (gmailError.code === 403) {
        return res.status(403).json({ 
          message: 'Gmail access denied. Please check your Gmail API permissions.',
          error: 'ACCESS_DENIED'
        })
      }
      
      return res.status(500).json({ 
        message: 'Gmail API error occurred',
        error: gmailError.message
      })
    }

    if (!response.data.messages) {
      console.log('[AUTO-EMAILS] No messages found')
      return res.status(200).json([])
    }

    console.log(`[AUTO-EMAILS] Found ${response.data.messages.length} potential emails`)

    // Initialize receipt processor
    try {
      processor = new ReceiptProcessorWithDB()
      console.log('[AUTO-EMAILS] Receipt processor initialized successfully')
    } catch (processorError) {
      console.error('[AUTO-EMAILS] Failed to initialize receipt processor:', processorError)
      return res.status(500).json({ message: 'Failed to initialize processing system' })
    }
    
    // Get details for each message and auto-process PDFs
    const emailDetails = await Promise.all(
      response.data.messages.map(async (message) => {
        try {
          console.log(`[AUTO-EMAILS] Processing email ID: ${message.id}`)
          
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
            console.log(`[AUTO-EMAILS] No PDF attachments found in email: ${message.id}`)
            return null
          }

          const attachmentCount = countAttachments(msgDetail.data.payload)
          const pdfAttachments = extractPdfAttachments(msgDetail.data.payload)

          console.log(`[AUTO-EMAILS] Found ${pdfAttachments.length} PDF attachments in email: ${message.id}`)

          // Auto-process each PDF attachment
          for (const pdf of pdfAttachments) {
            try {
              console.log(`[AUTO-EMAILS] Auto-processing PDF: ${pdf.filename} from email: ${message.id}`)
              
              // Download the PDF attachment
              const attachment = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: message.id!,
                id: pdf.attachmentId
              })

              if (attachment.data.data && processor) {
                const pdfBuffer = Buffer.from(attachment.data.data, 'base64')
                
                // Process with receipt processor
                await processor.processDocumentWithDB(
                  message.id!,
                  pdf.filename,
                  pdfBuffer,
                  forceReprocess  // Pass the forceReprocess flag
                )
                console.log(`[AUTO-EMAILS] Successfully processed PDF: ${pdf.filename}`)
              }
            } catch (pdfError) {
              console.error(`[AUTO-EMAILS] Failed to process PDF ${pdf.filename}:`, pdfError)
            }
          }

          return {
            id: message.id,
            from,
            subject,
            date: new Date(date).toISOString(),
            snippet: msgDetail.data.snippet,
            attachmentCount,
            hasPdfAttachment: true,
            pdfAttachments,
            processed: true
          }
        } catch (emailError) {
          console.error(`[AUTO-EMAILS] Failed to process email ${message.id}:`, emailError)
          return null
        }
      })
    )

    // Filter out null values and limit to 10 results with proper typing
    const filteredEmails = emailDetails.filter((email): email is NonNullable<typeof email> => email !== null).slice(0, 10)
    
    // Generate processing summary
    const totalPdfs = filteredEmails.reduce((sum, email) => sum + (email.pdfAttachments?.length || 0), 0)
    console.log(`[AUTO-EMAILS] ===== PROCESSING SUMMARY =====`)
    console.log(`[AUTO-EMAILS] Emails processed: ${filteredEmails.length}`)
    console.log(`[AUTO-EMAILS] Total PDFs processed: ${totalPdfs}`)
    console.log(`[AUTO-EMAILS] Processing completed successfully`)
    console.log(`[AUTO-EMAILS] ===============================`)
    
    // Close the processor database connection
    if (processor) {
      processor.close()
    }
    
    res.status(200).json(filteredEmails)
  } catch (error) {
    console.error('[AUTO-EMAILS] Gmail API Error:', error)
    
    // Try to close processor if it was initialized
    try {
      if (processor) {
        processor.close()
      }
    } catch (closeError) {
      console.error('[AUTO-EMAILS] Error closing processor:', closeError)
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch and process emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
