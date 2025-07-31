import { useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthCallback = () => {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        // Send error to parent window
        window.opener?.postMessage({
          type: 'GMAIL_AUTH_ERROR',
          error: error
        }, window.location.origin);
        window.close();
        return;
      }

      if (code) {
        try {
          // Exchange code for access token
          const response = await fetch('/api/auth/gmail', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (response.ok) {
            // Send success message to parent window with all auth data
            window.opener?.postMessage({
              type: 'GMAIL_AUTH_SUCCESS',
              authData: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                email: data.email,
                name: data.name,
                expires_in: data.expires_in
              }
            }, window.location.origin);
          } else {
            throw new Error(data.error || 'Authentication failed');
          }
        } catch (error) {
          // Send error to parent window
          window.opener?.postMessage({
            type: 'GMAIL_AUTH_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, window.location.origin);
        }
      }

      window.close();
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing authentication...</p>
        <p className="mt-2 text-sm text-gray-500">This window will close automatically</p>
      </div>
    </div>
  );
};

export default AuthCallback;
