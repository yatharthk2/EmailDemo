import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';
import { ReceiptProcessorWithDB } from '../../lib/receipt-processor-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.accessToken) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { emailIds, forceReprocess = false } = req.body;

    if (!emailIds || !Array.isArray(emailIds)) {
      return res.status(400).json({ message: 'emailIds array is required' });
    }

    console.log(`[PROCESS-EMAILS] Processing ${emailIds.length} emails (forceReprocess: ${forceReprocess})`);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const processor = new ReceiptProcessorWithDB();
    const results = [];

    for (const emailId of emailIds) {
      try {
        // Get email details
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: emailId,
          format: 'full'
        });

        // Find PDF attachments
        const attachments = await extractPdfAttachments(gmail, emailId, message.data.payload);

        for (const attachment of attachments) {
          const result = await processor.processDocumentWithDB(
            emailId,
            attachment.filename,
            attachment.data,
            forceReprocess  // Pass the forceReprocess flag
          );
          results.push(result);
        }
      } catch (error) {
        results.push({
          success: false,
          emailId,
          filename: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: 0
        });
      }
    }

    res.status(200).json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Email processing error:', error);
    res.status(500).json({ 
      message: 'Failed to process emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function extractPdfAttachments(gmail: any, messageId: string, payload: any): Promise<Array<{filename: string, data: Buffer}>> {
  const attachments: Array<{filename: string, data: Buffer}> = [];

  async function traverse(part: any) {
    if (part.parts) {
      for (const subPart of part.parts) {
        await traverse(subPart);
      }
    }

    if (part.filename && 
        part.filename.toLowerCase().endsWith('.pdf') && 
        part.body?.attachmentId) {
      
      try {
        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId
        });

        if (attachment.data.data) {
          const buffer = Buffer.from(attachment.data.data, 'base64url');
          attachments.push({
            filename: part.filename,
            data: buffer
          });
        }
      } catch (error) {
        console.error(`Failed to download attachment ${part.filename}:`, error);
      }
    }
  }

  if (payload) {
    await traverse(payload);
  }

  return attachments;
}
