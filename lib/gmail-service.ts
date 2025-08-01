import { google } from 'googleapis'

export class GmailService {
  private oauth2Client: any
  private gmail: any

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }
  
  /**
   * Stop any existing watch on the Gmail account
   */
  async stopWatch(userId = 'me') {
    try {
      console.log('Stopping existing Gmail watch...');
      const result = await this.gmail.users.stop({
        userId
      });
      console.log('Gmail watch stopped successfully');
      return result.data;
    } catch (error: any) {
      // If the error is 404, it means there's no watch to stop, which is fine
      if (error.code === 404 || (error.response && error.response.status === 404)) {
        console.log('No active watch to stop');
        return { success: true, message: 'No active watch to stop' };
      }
      console.error('Error stopping Gmail watch:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Set up a watch on the Gmail account to get notifications about changes
   */
  async setupWatch(userId = 'me') {
    try {
      // First, stop any existing watch
      await this.stopWatch(userId);
      
      // Then set up a new watch
      const topicName = `projects/aerial-velocity-340305/topics/gmail-notifications`;
      console.log('Using topic name:', topicName);
      
      const watchRequest = {
        userId,
        requestBody: {
          // Hard-code the project ID and topic name for now
          topicName: topicName,
          labelIds: ['INBOX'],
          labelFilterAction: 'include'
        }
      }
      
      const result = await this.gmail.users.watch(watchRequest)
      console.log('Gmail watch setup successful:', result.data)
      
      return result.data
    } catch (error: any) {
      console.error('Error setting up Gmail watch:', error.response?.data || error.message)
      throw error
    }
  }
  
  /**
   * Get history changes since the specified historyId
   */
  async getHistory(startHistoryId: string, userId = 'me') {
    try {
      const response = await this.gmail.users.history.list({
        userId,
        startHistoryId
      })
      
      return response.data.history || []
    } catch (error) {
      console.error('Error fetching history:', error)
      return []
    }
  }
  
  /**
   * Get a specific message by ID
   */
  async getMessage(messageId: string, userId = 'me') {
    try {
      const response = await this.gmail.users.messages.get({
        userId,
        id: messageId,
        format: 'full'
      })
      
      return response.data
    } catch (error) {
      console.error('Error fetching message:', error)
      return null
    }
  }
  
  /**
   * Extract the body content from an email message
   */
  static extractEmailBody(payload: any): string | null {
    try {
      // Handle different email structures
      if (payload.parts) {
        // Multipart email
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
          if (part.mimeType === 'text/html' && part.body.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
          // Handle nested parts
          if (part.parts) {
            const nestedBody = GmailService.extractEmailBody(part)
            if (nestedBody) return nestedBody
          }
        }
      } else if (payload.body && payload.body.data) {
        // Single part email
        return Buffer.from(payload.body.data, 'base64').toString('utf-8')
      }
      
      return null
    } catch (error) {
      console.error('Error extracting email body:', error)
      return null
    }
  }
}
