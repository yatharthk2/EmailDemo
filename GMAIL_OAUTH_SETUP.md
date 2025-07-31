# Gmail OAuth Setup Guide

This guide will help you set up Gmail OAuth authentication for your application.

## Prerequisites

1. A Google Cloud Platform account
2. A project in Google Cloud Console

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Gmail API
   - Google+ API (for user info)

## Step 2: Create OAuth 2.0 Credentials

1. In the Google Cloud Console, go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Web application** as the application type
4. Add your authorized origins:
   - `http://localhost:3000` (for development)
   - Your production domain (for production)
5. Add your authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://yourdomain.com/auth/callback` (for production)

## Step 3: Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Google OAuth credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
   NEXTAUTH_URL=http://localhost:3000
   ```

## Step 4: OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless you have G Suite)
3. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (if in testing mode)

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your homepage
3. Click the "Try Demo!" button
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you'll be redirected back to your app

## Security Notes

- Never commit your `.env.local` file to version control
- Use different credentials for development and production
- Regularly rotate your client secrets
- Monitor your API usage in Google Cloud Console

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**:
   - Make sure your redirect URI in Google Cloud Console exactly matches your environment variable

2. **"invalid_client" error**:
   - Check that your client ID and secret are correct
   - Ensure you're using the right credentials for your environment

3. **Popup blocked**:
   - Modern browsers may block popups. Users need to allow popups for your site

4. **CORS errors**:
   - Make sure your domain is added to authorized origins in Google Cloud Console

## Production Deployment

For production deployment:

1. Update your environment variables with production values
2. Add your production domain to Google Cloud Console
3. Ensure HTTPS is enabled for your production site
4. Update the OAuth consent screen with your production app details

## API Usage

After successful authentication, you can use the access token to make Gmail API calls:

```javascript
// Example: List Gmail messages
const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

For more Gmail API endpoints, see the [Gmail API documentation](https://developers.google.com/gmail/api/reference/rest).
