import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className='scroll-smooth'>
      <Head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.15.1/devicon.min.css"/>
      </Head>
      <body className='text-black'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
