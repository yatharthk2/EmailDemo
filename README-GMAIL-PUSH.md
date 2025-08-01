# Gmail Push Notification Setup

This project implements Gmail push notifications using Google Cloud Pub/Sub. Here's how it works:

## Architecture

1. **Gmail Push Notification Setup**:
   - When a user authenticates, we call the Gmail API to set up a "watch" on their inbox.
   - This watch tells Gmail to send notifications about changes to a Google Cloud Pub/Sub topic.

2. **Google Cloud Pub/Sub**:
   - Pub/Sub is a messaging service that receives notifications from Gmail.
   - It forwards these notifications to our webhook endpoint.

3. **Our Webhook Endpoint**:
   - The webhook (`/api/gmail-webhook`) receives messages from Pub/Sub.
   - It decodes the messages and extracts information like the user's email and historyId.
   - The historyId is used to query Gmail for what has changed since the last notification.

## Troubleshooting

### Common Issues

1. **Invalid Topic Name Error**:
   - Error: "Invalid topicName does not match projects/aerial-velocity-340305/topics/*"
   - Solution: Ensure the topic name is exactly in this format: `projects/aerial-velocity-340305/topics/gmail-notifications`

2. **Gmail API Scope Errors**:
   - Error: "Metadata scope does not support 'q' parameter" 
   - Solution: Ensure the right scopes are enabled in NextAuth configuration:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/pubsub`

3. **Webhook Not Receiving Notifications**:
   - Check the webhook endpoint logs to verify requests are being received
   - Use the test endpoint `/api/webhook-test` to verify connectivity
   - Ensure your Pub/Sub subscription is properly configured

## Setup Instructions

1. **Google Cloud Console Setup**:
   - Create a project in Google Cloud Console (or use your existing one).
   - Enable the Gmail API, Google+ API, and Pub/Sub API.
   - Create OAuth 2.0 credentials for a web application.
   - Create a Pub/Sub topic named `gmail-notifications`.
   - Create a Pub/Sub subscription named `gmail-notifications-sub` for that topic.
   - Configure the subscription as a push subscription to your webhook URL: `https://emailreceipt.yatharthk.com/api/gmail-webhook`.

2. **Environment Variables**:
   - Copy `.env.example` to `.env.local` and fill in all the required variables.

3. **Set Up Watch for User**:
   - After a user logs in, call the `/api/setup-watch` endpoint to set up Gmail push notifications for that user.
   - This needs to be done once initially and then renewed approximately every 7 days (Gmail's watch expiration limit).

## Important Considerations

1. **Webhook Security**:
   - Google Pub/Sub verifies that messages come from authorized sources.
   - For extra security, you can implement authentication token verification.

2. **Error Handling**:
   - If the webhook fails to process a message, Pub/Sub will retry delivery.
   - Implement idempotent message handling to avoid processing duplicates.

3. **Watch Expiration**:
   - Gmail watch settings expire after 7 days.
   - Implement a scheduled job to refresh watches for active users.

4. **User Management**:
   - Store user information and historyIds in a database.
   - When processing notifications, fetch the appropriate user credentials.

## API Endpoints

- **POST /api/setup-watch**: Sets up Gmail push notifications for the authenticated user.
- **POST /api/gmail-webhook**: Receives and processes push notifications from Google Pub/Sub.

## Testing

To test the system:
1. Log in with a Google account.
2. Call the setup-watch endpoint.
3. Send an email to the user's Gmail account.
4. Check application logs to see if the notification was received and processed.
