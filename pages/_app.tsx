import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import Navigation from '@/components/Navigation'
import Head from 'next/head'

export default function App({ 
  Component, 
  pageProps: { session, ...pageProps } 
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <Head>
        <title>Email Receipt Processing | Demo</title>
        <meta name="description" content="Email receipt processing demo with Groq LLM integration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Component {...pageProps} />
        </main>
      </div>
    </SessionProvider>
  )
}
