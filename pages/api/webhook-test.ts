import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Log all request details for debugging
    console.log('\n==== 🧪 WEBHOOK TEST REQUEST RECEIVED ====')
    console.log('📝 Method:', req.method)
    console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2))
    
    // For POST requests, log the body
    if (req.method === 'POST') {
      console.log('📦 Raw Body:', req.body)
      
      // If body is a string, try to parse it as JSON
      if (typeof req.body === 'string') {
        try {
          const parsedBody = JSON.parse(req.body);
          console.log('📦 Parsed Body (string→JSON):', parsedBody)
        } catch (e) {
          console.log('⚠️ Body is a string but not valid JSON')
        }
      }
      
      // If it's a Pub/Sub message, decode the data
      if (req.body?.message?.data) {
        try {
          const decodedData = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
          console.log('🔓 Decoded Pub/Sub data:', decodedData);
          try {
            const parsedData = JSON.parse(decodedData);
            console.log('🔍 Parsed Pub/Sub data:', parsedData);
          } catch (e) {
            console.log('⚠️ Decoded data is not valid JSON');
          }
        } catch (e) {
          console.log('❌ Failed to decode Pub/Sub data:', e);
        }
      }
    }
    
    // For GET requests, log query parameters
    if (req.method === 'GET') {
      console.log('❓ Query Parameters:', req.query)
    }
    
    console.log('====================================\n')
    
    // Return a 200 OK response with detailed information
    res.status(200).json({ 
      success: true, 
      message: 'Webhook test endpoint is working',
      timestamp: new Date().toISOString(),
      received: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        bodyType: typeof req.body,
        bodyIsString: typeof req.body === 'string',
        bodyIsObject: typeof req.body === 'object',
        bodyKeys: typeof req.body === 'object' ? Object.keys(req.body || {}) : null,
        bodyLength: typeof req.body === 'string' ? req.body.length : null
      }
    })
  } catch (error) {
    console.error('Error in test webhook:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Error in test webhook',
      error: String(error)
    })
  }
}
