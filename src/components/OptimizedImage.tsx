'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Building2, Download, AlertCircle } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fallback?: string;
  onError?: () => void;
  onLoad?: () => void;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
}

interface ImageLoadMetrics {
  loadTime: number;
  size: number;
  format: string;
  cacheStatus: 'hit' | 'miss' | 'unknown';
}

export default function OptimizedImage({
  src,
  alt,
  width = 32,
  height = 32,
  className = '',
  priority = false,
  fallback,
  onError,
  onLoad,
  sizes,
  quality = 85,
  placeholder = 'empty',
  blurDataURL,
  format = 'auto',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority = 'auto',
  style,
  onClick,
  title
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [loadMetrics, setLoadMetrics] = useState<ImageLoadMetrics | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const loadStartTime = useRef<number>(0);

  // Generate optimized image URL with format support
  const getOptimizedSrc = useCallback((originalSrc: string, targetFormat?: string) => {
    if (!originalSrc || originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')) {
      return originalSrc;
    }

    const targetFormatToUse = targetFormat || format;
    
    // For external URLs, try to optimize if possible
    if (originalSrc.startsWith('http')) {
      // For Clearbit logos, we can't modify the URL
      if (originalSrc.includes('logo.clearbit.com')) {
        return originalSrc;
      }
      
      // For Google favicons, we can optimize
      if (originalSrc.includes('google.com/s2/favicons')) {
        return originalSrc;
      }
      
      // For ui-avatars, we can optimize
      if (originalSrc.includes('ui-avatars.com')) {
        return originalSrc;
      }
    }

    return originalSrc;
  }, [format]);

  // Preload image for priority images
  useEffect(() => {
    if (priority && !isPreloaded) {
      const preloadImage = new Image();
      preloadImage.src = getOptimizedSrc(src);
      preloadImage.onload = () => {
        setIsPreloaded(true);
        console.log(`🖼️ Preloaded priority image: ${src}`);
      };
      preloadImage.onerror = () => {
        console.warn(`⚠️ Failed to preload priority image: ${src}`);
      };
    }
  }, [priority, src, getOptimizedSrc, isPreloaded]);

  // Intersection Observer for lazy loading with improved performance
  useEffect(() => {
    if (priority || isPreloaded) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Increased margin for better UX
        threshold: 0.01 // Lower threshold for earlier loading
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isPreloaded]);

  // Enhanced error handling with retry logic
  const handleImageError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    
    // Track error metrics
    if (typeof window !== 'undefined' && (window as any).trackImageError) {
      (window as any).trackImageError(src, retryCount);
    }

    if (fallback && imageSrc !== fallback && retryCount < 2) {
      console.log(`🔄 Retrying image load (${retryCount + 1}/2): ${fallback}`);
      setRetryCount(prev => prev + 1);
      setImageSrc(fallback);
      setHasError(false);
      setIsLoading(true);
      loadStartTime.current = performance.now();
    } else {
      console.error(`❌ Image failed to load after ${retryCount + 1} attempts: ${src}`);
      onError?.();
    }
  }, [fallback, imageSrc, retryCount, src, onError]);

  // Enhanced load handling with performance metrics
  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const loadTime = performance.now() - loadStartTime.current;
    const img = event.currentTarget;
    
    // Calculate image size (approximate)
    const size = img.naturalWidth * img.naturalHeight * 4; // 4 bytes per pixel (RGBA)
    
    // Determine format from src
    const format = img.src.includes('.webp') ? 'webp' : 
                   img.src.includes('.avif') ? 'avif' : 
                   img.src.includes('.png') ? 'png' : 'jpeg';
    
    // Check cache status (approximate)
    const cacheStatus = loadTime < 50 ? 'hit' : 'miss';
    
    const metrics: ImageLoadMetrics = {
      loadTime,
      size,
      format,
      cacheStatus
    };
    
    setLoadMetrics(metrics);
    setIsLoading(false);
    setHasError(false);
    
    // Log performance metrics
    console.log(`✅ Image loaded: ${src}`, {
      loadTime: `${loadTime.toFixed(2)}ms`,
      size: `${(size / 1024).toFixed(1)}KB`,
      format,
      cacheStatus
    });
    
    // Track performance metrics
    if (typeof window !== 'undefined' && (window as any).trackImagePerformance) {
      (window as any).trackImagePerformance(metrics);
    }
    
    onLoad?.();
  }, [src, onLoad]);

  // Start load timer when image becomes visible
  useEffect(() => {
    if (isInView && !isLoading) {
      loadStartTime.current = performance.now();
    }
  }, [isInView, isLoading]);

  // Show loading skeleton with improved animation
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded ${className}`}
        style={{ 
          width, 
          height,
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }}
      />
    );
  }

  // Show error fallback with retry option
  if (hasError && !fallback) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center rounded cursor-pointer hover:bg-gray-200 transition-colors ${className}`}
        style={{ width, height }}
        title={title || alt}
        onClick={onClick}
      >
        <div className="flex flex-col items-center text-center">
          <AlertCircle size={Math.min(width, height) * 0.4} className="text-gray-400 mb-1" />
          <span className="text-xs text-gray-500">{width > 48 ? alt : ''}</span>
        </div>
      </div>
    );
  }

  // Determine image props based on format and optimization
  const imageProps = {
    src: getOptimizedSrc(imageSrc),
    alt,
    width,
    height,
    className: `rounded transition-all duration-300 ${
      isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
    } ${className}`,
    priority,
    onLoad: handleImageLoad,
    onError: handleImageError,
    sizes: sizes || `${width}px`,
    quality,
    placeholder,
    blurDataURL,
    loading: priority ? 'eager' : loading,
    decoding,
    fetchPriority: priority ? 'high' : fetchPriority,
    style: {
      objectFit: 'contain' as const,
      ...style
    },
    onClick,
    title: title || alt
  };

  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      style={{ width, height }}
      ref={imgRef}
    >
      {/* Loading overlay with improved animation */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && loadMetrics && (
        <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 rounded-bl">
          {loadMetrics.loadTime.toFixed(0)}ms
        </div>
      )}
      
      <Image {...imageProps} />
      
      {/* Cache status indicator for development */}
      {process.env.NODE_ENV === 'development' && loadMetrics && (
        <div className={`absolute bottom-0 left-0 text-xs px-1 rounded-tr ${
          loadMetrics.cacheStatus === 'hit' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'
        }`}>
          {loadMetrics.cacheStatus}
        </div>
      )}
    </div>
  );
}

// Add CSS for shimmer animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
} 