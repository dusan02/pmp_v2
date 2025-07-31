'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDomain, companyColors } from '@/lib/getLogoUrl';
import OptimizedImage from './OptimizedImage';

interface CompanyLogoProps {
  ticker: string;
  size?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  variant?: 'default' | 'square' | 'rounded';
  showFallback?: boolean;
  cacheKey?: string;
  retryAttempts?: number;
}

interface LogoCache {
  [key: string]: {
    src: string;
    timestamp: number;
    success: boolean;
    loadTime: number;
  };
}

// Global cache for logo sources
const logoCache: LogoCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRY_ATTEMPTS = 3;

export default function CompanyLogo({
  ticker,
  size = 32,
  className = '',
  priority = false,
  onLoad,
  onError,
  variant = 'default',
  showFallback = true,
  cacheKey,
  retryAttempts = MAX_RETRY_ATTEMPTS
}: CompanyLogoProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logoSources, setLogoSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState<number>(0);
  const [bestSource, setBestSource] = useState<string | null>(null);

  // Generate cache key
  const cacheKeyFinal = useMemo(() => {
    return cacheKey || `${ticker}-${size}-${variant}`;
  }, [ticker, size, variant, cacheKey]);

  // Get all possible logo sources with intelligent ordering
  const getLogoSources = useCallback((ticker: string, size: number) => {
    // Check cache first
    const cached = logoCache[cacheKeyFinal];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION && cached.success) {
      return [cached.src];
    }

    let domain: string;
    try {
      domain = getDomain(ticker);
    } catch (error) {
      // If no domain mapping exists, fallback to initials
      console.log(`No domain mapping found for ticker: ${ticker}, using fallback`);
      return [];
    }
    
    // Intelligent source ordering based on reliability and performance
    const sources = [
      // Primary: Clearbit (highest quality, most reliable)
      {
        url: `https://logo.clearbit.com/${domain}?size=${size}`,
        priority: 1,
        type: 'clearbit'
      },
      // Secondary: Google Favicon (good quality, reliable)
      {
        url: `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
        priority: 2,
        type: 'google'
      },
      // Tertiary: DuckDuckGo favicon (alternative)
      {
        url: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        priority: 3,
        type: 'duckduckgo'
      },
      // Last resort: ui-avatars with company colors
      {
        url: `https://ui-avatars.com/api/?name=${ticker}&background=${companyColors[ticker] || '0066CC'}&size=${size}&color=fff&font-size=0.4&bold=true&format=png`,
        priority: 4,
        type: 'ui-avatars'
      }
    ];

    // Sort by priority and return URLs
    return sources.sort((a, b) => a.priority - b.priority).map(s => s.url);
  }, [cacheKeyFinal]);

  // Initialize logo sources
  useEffect(() => {
    const sources = getLogoSources(ticker, size);
    setLogoSources(sources);
    setCurrentIndex(0);
    setIsLoading(true);
    setRetryCount(0);
    setLoadStartTime(performance.now());
  }, [ticker, size, getLogoSources]);

  // Enhanced error handling with intelligent retry
  const handleImageError = useCallback(() => {
    const loadTime = performance.now() - loadStartTime;
    const currentSrc = logoSources[currentIndex];
    
    console.log(`❌ Logo failed for ${ticker}: ${currentSrc} (${currentIndex + 1}/${logoSources.length}) - Load time: ${loadTime.toFixed(2)}ms`);
    
    // Cache the failed attempt
    logoCache[cacheKeyFinal] = {
      src: currentSrc,
      timestamp: Date.now(),
      success: false,
      loadTime
    };

    if (currentIndex < logoSources.length - 1 && retryCount < retryAttempts) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setRetryCount(prev => prev + 1);
      setLoadStartTime(performance.now());
    } else {
      // All sources failed or max retries reached
      setIsLoading(false);
      console.warn(`⚠️ All logo sources failed for ${ticker} after ${retryCount + 1} attempts. Using fallback.`);
      
      // Track analytics
      if (typeof window !== 'undefined' && (window as any).trackLogoFailure) {
        (window as any).trackLogoFailure(ticker, retryCount, logoSources);
      }
      
      onError?.();
    }
  }, [ticker, currentIndex, logoSources, retryCount, retryAttempts, loadStartTime, cacheKeyFinal, onError]);

  // Enhanced load handling with caching
  const handleImageLoad = useCallback(() => {
    const loadTime = performance.now() - loadStartTime;
    const currentSrc = logoSources[currentIndex];
    
    setIsLoading(false);
    setBestSource(currentSrc);
    
    console.log(`✅ Logo loaded successfully for ${ticker}: ${currentSrc} - Load time: ${loadTime.toFixed(2)}ms`);
    
    // Cache the successful source
    logoCache[cacheKeyFinal] = {
      src: currentSrc,
      timestamp: Date.now(),
      success: true,
      loadTime
    };

    // Track analytics
    if (typeof window !== 'undefined' && (window as any).trackLogoSuccess) {
      (window as any).trackLogoSuccess(ticker, currentSrc, loadTime, currentIndex);
    }
    
    onLoad?.();
  }, [ticker, currentIndex, logoSources, loadStartTime, cacheKeyFinal, onLoad]);

  // Get variant-specific styling
  const getVariantStyles = useCallback(() => {
    switch (variant) {
      case 'square':
        return 'rounded';
      case 'rounded':
        return 'rounded-lg';
      default:
        return 'rounded-full';
    }
  }, [variant]);

  // Generate fallback component
  const renderFallback = useCallback(() => {
    if (!showFallback) return null;

    const color = companyColors[ticker] || '0066CC';
    const backgroundColor = `#${color}`;
    
    return (
      <div 
        className={`${getVariantStyles()} flex items-center justify-center text-white font-bold ${className}`}
        style={{ 
          width: size, 
          height: size,
          backgroundColor,
          fontSize: Math.max(size * 0.3, 10)
        }}
        title={`${ticker} logo`}
      >
        {ticker.slice(0, 2).toUpperCase()}
      </div>
    );
  }, [ticker, size, variant, className, showFallback, getVariantStyles]);

  // Don't render if no sources available
  if (logoSources.length === 0) {
    return renderFallback();
  }

  const currentSrc = logoSources[currentIndex];
  const fallbackSrc = logoSources.length > 1 ? logoSources[logoSources.length - 1] : undefined;

  return (
    <div className="relative">
      <OptimizedImage
        src={currentSrc}
        alt={`${ticker} company logo`}
        width={size}
        height={size}
        className={`${getVariantStyles()} ${className}`}
        priority={priority}
        fallback={fallbackSrc}
        onLoad={handleImageLoad}
        onError={handleImageError}
        quality={90}
        format="auto"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        style={{ objectFit: 'contain' }}
        title={`${ticker} logo`}
      />
      
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -top-1 -right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded text-center min-w-[20px]">
          {currentIndex + 1}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className={`absolute inset-0 ${getVariantStyles()} bg-gray-200 animate-pulse flex items-center justify-center`}>
          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Utility functions for external use
export const clearLogoCache = () => {
  Object.keys(logoCache).forEach(key => delete logoCache[key]);
  console.log('🧹 Logo cache cleared');
};

export const getLogoCacheStats = () => {
  const total = Object.keys(logoCache).length;
  const successful = Object.values(logoCache).filter(entry => entry.success).length;
  const failed = total - successful;
  
  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    averageLoadTime: Object.values(logoCache).reduce((sum, entry) => sum + entry.loadTime, 0) / total || 0
  };
};

export const preloadCompanyLogos = (tickers: string[], size: number = 32) => {
  tickers.forEach(ticker => {
    const img = new Image();
    img.src = `https://logo.clearbit.com/${getDomain(ticker)}?size=${size}`;
    img.onload = () => {
      console.log(`🔄 Preloaded logo for ${ticker}`);
    };
    img.onerror = () => {
      console.log(`⚠️ Failed to preload logo for ${ticker}`);
    };
  });
}; 