import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface EventSourceProps {
  onNewEmail: (data: any) => void;
  onError?: (error: any) => void;
}

export default function EventSourceListener({ onNewEmail, onError }: EventSourceProps) {
  const { data: session, status } = useSession();
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    // Only set up the connection if the user is authenticated
    if (status === 'authenticated' && session) {
      // Create event source connection
      eventSource = new EventSource('/api/events');
      
      // Connection opened
      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnected(true);
        
        // Dispatch a custom event to notify parent components
        const event = new CustomEvent('sse-connected');
        window.dispatchEvent(event);
      };
      
      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE event received:', data);
          
          if (data.type === 'new_email') {
            console.log('New email notification received');
            onNewEmail(data);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      // Handle errors
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnected(false);
        if (onError) onError(error);
        
        // Close the connection on error and try to reconnect after a delay
        if (eventSource) {
          eventSource.close();
          setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            // The browser will automatically try to reconnect
          }, 5000);
        }
      };
    }
    
    // Clean up on unmount
    return () => {
      if (eventSource) {
        console.log('Closing SSE connection');
        eventSource.close();
      }
    };
  }, [session, status, onNewEmail, onError]);
  
  return null; // This is a non-visual component
}
