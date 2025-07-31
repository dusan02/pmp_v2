import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PreMarketPrice.com - Real-Time Pre-Market Stock Tracking | Top 200 US Companies',
  description: 'Track real-time pre-market movements of the top 200 US companies. Monitor percentage changes, market cap fluctuations, and build your personalized watchlist. Get live stock data before market opens.',
  keywords: 'pre-market stocks, stock tracking, market cap, stock prices, US stocks, stock portfolio, real-time stock data, pre-market trading, stock analysis, market movements',
  authors: [{ name: 'PreMarketPrice.com' }],
  creator: 'PreMarketPrice.com',
  publisher: 'PreMarketPrice.com',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://premarketprice.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PreMarketPrice.com - Real-Time Pre-Market Stock Tracking',
    description: 'Track real-time pre-market movements of the top 200 US companies. Monitor percentage changes, market cap fluctuations, and build your personalized watchlist.',
    url: 'https://premarketprice.com',
    siteName: 'PreMarketPrice.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PreMarketPrice.com - Stock Tracking Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PreMarketPrice.com - Real-Time Pre-Market Stock Tracking',
    description: 'Track real-time pre-market movements of the top 200 US companies.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
} 