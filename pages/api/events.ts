import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

// Store active SSE clients
const clients: Map<string, NextApiResponse> = new Map();
const userEmails: Map<string, string> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Authenticate the request
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.accessToken || !session?.user?.email) {
      return res.status(401).json({ message: 'Not authenticated' })
    }
    
    const userEmail = session.user.email;
    const clientId = Math.random().toString(36).substring(2, 15);

    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

    // Store the client connection
    clients.set(clientId, res);
    userEmails.set(clientId, userEmail);
    
    console.log(`Client ${clientId} connected (user: ${userEmail}). Active connections: ${clients.size}`);

    // Remove client when connection closes
    req.on('close', () => {
      clients.delete(clientId);
      userEmails.delete(clientId);
      console.log(`Client ${clientId} disconnected. Active connections: ${clients.size}`);
    });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    res.status(500).json({ message: 'Failed to set up event stream' });
  }
}

// Helper function to send notifications to specific users
export function sendNotificationToUser(userEmail: string, data: any) {
  let notified = false;
  
  clients.forEach((client, clientId) => {
    if (userEmails.get(clientId) === userEmail) {
      try {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
        notified = true;
      } catch (error) {
        console.error(`Error sending notification to client ${clientId}:`, error);
      }
    }
  });
  
  return notified;
}

// Helper function to broadcast a message to all connected clients
export function broadcastMessage(data: any) {
  clients.forEach((client, clientId) => {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error(`Error broadcasting to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  });
}
