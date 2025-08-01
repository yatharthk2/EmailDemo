import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/pubsub',
          access_type: 'online', // Forces 'online' access type, so no refresh token
          prompt: 'consent',      // Forces consent screen to appear every time
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        // Add an expiry time for the access token (typically 1 hour)
        token.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      return session
    },
  },
  // Session settings
  session: {
    // Use JWT strategy for session management
    strategy: 'jwt',
    // Set short session max age (e.g., 1 hour)
    maxAge: 60 * 60 // 1 hour in seconds
  },
  pages: {
    signIn: '/email-auth-flow/signin',
    error: '/email-auth-flow/error',
    signOut: '/',
    // Use our custom callback page that will set up Gmail notifications
    newUser: '/email-auth-flow/callback',
    // Also redirect all users through our callback page
    verifyRequest: '/email-auth-flow/callback',
  },
}

export default NextAuth(authOptions)
