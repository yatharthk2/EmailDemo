import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { ReceiptProcessor } from '../../lib/receipt-processor';
import { EmailData, PdfAttachment, ProcessingResult } from '../../types/receipt-types';

type ResponseData = {
  success: boolean;
  message: string;
  results?: ProcessingResult[];
  error?: string;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase size limit for handling PDFs
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Check if user is authenticated
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Get emails from request body
    const emails: EmailData[] = req.body.emails;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No emails provided' 
      });
    }

    // Check for PDF attachments
    const emailsWithPdfs = emails.filter(email => 
      email.pdfAttachments && 
      Array.isArray(email.pdfAttachments) && 
      email.pdfAttachments.length > 0
    );

    if (emailsWithPdfs.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No PDF attachments found in the provided emails' 
      });
    }

    // Process PDF attachments
    const receiptProcessor = new ReceiptProcessor();
    const results = await receiptProcessor.processEmailBatch(emailsWithPdfs);

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${results.length} attachments`,
      results
    });

  } catch (error) {
    console.error('Error processing emails:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error processing emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
