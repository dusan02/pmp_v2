import type { Metadata } from 'next'
import './globals.css'
import { initializePreloading } from '@/lib/preload'
import { initializePWA } from '@/lib/sw-register'
import PerformanceOptimizer from '@/components/PerformanceOptimizer'

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
      <head>
        {/* Preload critical resources */}
        <link rel="preload" href="/favicon.ico" as="image" />
        <link rel="preload" href="/og-image.png" as="image" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" as="style" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://logo.clearbit.com" />
        <link rel="preconnect" href="https://ui-avatars.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* Standard meta tags */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Structured Data - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "PreMarketPrice.com",
              "description": "Real-time pre-market stock tracking for top 200 US companies",
              "url": "https://premarketprice.com",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "PreMarketPrice.com"
              },
              "publisher": {
                "@type": "Organization",
                "name": "PreMarketPrice.com"
              }
            })
          }}
        />
      </head>
      <body>
        <PerformanceOptimizer>
          {children}
        </PerformanceOptimizer>
      </body>
    </html>
  )
} 