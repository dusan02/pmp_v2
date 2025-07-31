'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDomain, companyColors } from '@/lib/getLogoUrl';

interface CompanyLogoProps {
  ticker: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

// Cache for successful logo URLs to avoid repeated requests
const logoCache = new Map<string, string>();

// Local logo mapping for companies that have local logos
const localLogos: Record<string, string> = {
  'NVDA': '/logos/nvidia.svg',
  'MSFT': '/logos/microsoft.svg',
  'AAPL': '/logos/apple.svg',
  'AMZN': '/logos/amazon.svg',
  'GOOGL': '/logos/google.svg',
  'GOOG': '/logos/google.svg',
  'TSLA': '/logos/tesla.svg',
  'META': '/logos/meta.svg',
  'NFLX': '/logos/netflix.svg',
  'MSCI': '/logos/msci.svg',
  'ILMN': '/logos/illumina.svg',
  'STZ': '/logos/constellation.svg'
};

export default function CompanyLogo({
  ticker,
  size = 32,
  className = '',
  priority = false
}: CompanyLogoProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get optimized logo sources with caching
  const getLogoSources = useMemo(() => {
    // Check cache first
    const cachedUrl = logoCache.get(ticker);
    if (cachedUrl) {
      return [cachedUrl];
    }

    // Use the centralized domain mapping from getLogoUrl.ts
    let domain: string | null = null;
    try {
      domain = getDomain(ticker);
    } catch (error) {
      // If no domain mapping exists, fallback to initials
      console.log(`No domain mapping found for ticker: ${ticker}, using fallback`);
      return [];
    }
    
    return [
      // Primary: Clearbit Logo API (most reliable for real logos)
      `https://logo.clearbit.com/${domain}?size=${size}`,
      // Fallback 1: Local logo if available
      localLogos[ticker] || null,
      // Fallback 2: Google Favicon (works for most companies)
      `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
      // Fallback 3: DuckDuckGo favicon
      `https://icons.duckduckgo.com/ip3/${domain}.ico`
      // No ui-avatars.com!
    ].filter(Boolean); // Remove null values
  }, [ticker, size]);

  useEffect(() => {
    const logoSources = getLogoSources;
    
    // If we have a cached URL, use it directly
    if (logoSources.length === 1 && logoCache.has(ticker)) {
      setSrc(logoSources[0]);
      setIsLoading(false);
      return;
    }
    
    setCurrentIndex(0);
    setSrc(logoSources[0] || null);
    setIsLoading(true);
  }, [ticker, size, getLogoSources]);

  useEffect(() => {
    if (!src || src === '') return;

    const logoSources = getLogoSources;
    const img = new window.Image();
    img.src = src;

    const handleLoad = () => {
      setIsLoading(false);
      // Cache successful URLs (only cache real logos, not fallbacks)
      if (src && !src.includes('duckduckgo.com')) {
        logoCache.set(ticker, src);
      }
    };

    const handleError = () => {
      if (currentIndex < logoSources.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setSrc(logoSources[nextIndex]);
      } else {
        // All sources failed, fallback to initials
        setSrc(null);
        setIsLoading(false);
      }
    };

    img.onload = handleLoad;
    img.onerror = handleError;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, currentIndex, ticker, getLogoSources]);

  // Fallback: render initials if no logo is available
  if (!src || src === '') {
    return (
      <div 
        className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}
        style={{ 
          width: size, 
          height: size,
          opacity: 0.8,
          fontWeight: 'bold',
          fontSize: size * 0.5,
          color: '#666',
          userSelect: 'none',
        }}
      >
        {ticker}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${ticker} company logo`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      style={{ 
        objectFit: 'contain',
        opacity: isLoading ? 0.5 : 1,
        transition: 'opacity 0.2s ease-in-out'
      }}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
} 