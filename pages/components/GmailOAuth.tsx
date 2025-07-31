import React, { useState } from 'react';
import { useGmailAuth } from '../../hooks/useGmailAuth';

interface GmailOAuthProps {
  onSuccess?: (accessToken: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  className?: string;
}

const GmailOAuth: React.FC<GmailOAuthProps> = ({
  onSuccess,
  onError,
  buttonText = "Connect Gmail",
  className = ""
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login, logout, isAuthenticated, userEmail } = useGmailAuth();

  // Gmail OAuth configuration
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email';

  const handleGoogleAuth = () => {
    if (!CLIENT_ID) {
      const errorMsg = 'Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.';
      console.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);

    // Construct OAuth URL
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Open OAuth popup
    const popup = window.open(
      authUrl,
      'gmail-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for popup to close or receive message
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
      }
    }, 1000);

    // Listen for messages from popup
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GMAIL_AUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup?.close();
        setIsLoading(false);
        
        // Use the auth hook to save the authentication data
        login(event.data.authData);
        
        onSuccess?.(event.data.authData.access_token);
        window.removeEventListener('message', messageListener);
      } else if (event.data.type === 'GMAIL_AUTH_ERROR') {
        clearInterval(checkClosed);
        popup?.close();
        setIsLoading(false);
        onError?.(event.data.error);
        window.removeEventListener('message', messageListener);
      }
    };

    window.addEventListener('message', messageListener);
  };

  const handleDisconnect = () => {
    logout();
  };

  return (
    <div className="gmail-oauth-container">
      {!isAuthenticated ? (
        <button
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className={`inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-md transition-all duration-200 ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
          } ${className}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {buttonText}
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Gmail Connected ({userEmail})
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default GmailOAuth;
