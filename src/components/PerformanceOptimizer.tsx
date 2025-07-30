'use client';

import React, { useEffect, useState } from 'react';
import { usePerformance } from '@/hooks/usePerformance';
import { reportWebVitals } from '@/lib/web-vitals';
import { initializePreloading } from '@/lib/preload';
import { initializePWA } from '@/lib/sw-register';
import { performanceMonitor } from '@/lib/performance-api';
import { analytics } from '@/lib/analytics';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
}

export default function PerformanceOptimizer({ children }: PerformanceOptimizerProps) {
  const [isClient, setIsClient] = useState(false);
  const { reportMetric } = usePerformance();

  useEffect(() => {
    setIsClient(true);
    
    // Initialize Core Web Vitals tracking
    reportWebVitals();
    
    // Initialize advanced Performance API monitoring
    console.log('🚀 Initializing advanced Performance API monitoring...');
    
    // Initialize analytics system
    console.log('📊 Initializing analytics system...');
    
    // Initialize preloading and PWA features
    initializePreloading();
    initializePWA();
    
    // Report initial load performance
    if (typeof window !== 'undefined') {
      const loadTime = performance.now();
      reportMetric('Initial Load', loadTime);
      
      // Track page view
      analytics.trackPageView(window.location.pathname, document.title);
      
      // Report DOM content loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          const domReadyTime = performance.now();
          reportMetric('DOM Ready', domReadyTime);
          
          // Track DOM ready event
          analytics.track('performance', 'dom_ready', 'DOM Content Loaded', domReadyTime);
        });
      } else {
        const domReadyTime = performance.now();
        reportMetric('DOM Ready', domReadyTime);
        analytics.track('performance', 'dom_ready', 'DOM Content Loaded', domReadyTime);
      }
      
      // Report window load
      window.addEventListener('load', () => {
        const windowLoadTime = performance.now();
        reportMetric('Window Load', windowLoadTime);
        
        // Track window load event
        analytics.track('performance', 'window_load', 'Window Load Complete', windowLoadTime);
        
        // Log performance summary after page load
        setTimeout(() => {
          const summary = performanceMonitor.getPerformanceSummary();
          console.log('📊 Performance Summary:', summary);
          
          // Track performance metrics
          analytics.trackPerformance('navigation_total_time', summary.navigation.totalTime);
          analytics.trackPerformance('memory_usage_percent', 
            (summary.memory.used / summary.memory.limit) * 100);
          analytics.trackPerformance('resource_count', summary.resources.total);
        }, 1000);
      });
    }
  }, [reportMetric]);

  // Optimize images when they come into view
  useEffect(() => {
    if (!isClient) return;

    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              // Measure image loading performance
              performanceMonitor.measureAsyncMetric(`Image Load: ${img.dataset.src}`, async () => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
              });
              
              // Track image load event
              analytics.track('performance', 'image_load', img.dataset.src);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach((img) => imageObserver.observe(img));

    return () => {
      imageObserver.disconnect();
    };
  }, [isClient]);

  // Optimize table rendering for large datasets
  useEffect(() => {
    if (!isClient) return;

    const tableObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const table = entry.target as HTMLTableElement;
            
            // Measure table rendering performance
            performanceMonitor.measureCustomMetric(`Table Render: ${table.className || 'unknown'}`, () => {
              table.classList.add('table-loaded');
            });
            
            // Track table render event
            analytics.track('performance', 'table_render', table.className || 'unknown');
            
            tableObserver.unobserve(table);
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    // Observe all tables
    const tables = document.querySelectorAll('table');
    tables.forEach((table) => tableObserver.observe(table));

    return () => {
      tableObserver.disconnect();
    };
  }, [isClient]);

  // Track user interactions
  useEffect(() => {
    if (!isClient) return;

    // Track stock interactions
    const trackStockInteraction = (ticker: string, action: string, price?: number, change?: number) => {
      analytics.track('business', action, ticker, price, {
        ticker,
        price,
        change,
        action
      });
    };

    // Track favorite toggles
    const trackFavoriteToggle = (ticker: string, isFavorite: boolean) => {
      analytics.trackFavoriteToggle(ticker, isFavorite);
    };

    // Track search events
    const trackSearch = (query: string, results: number) => {
      analytics.trackSearch(query, results);
    };

    // Expose tracking functions globally for other components
    (window as any).trackStockInteraction = trackStockInteraction;
    (window as any).trackFavoriteToggle = trackFavoriteToggle;
    (window as any).trackSearch = trackSearch;

    return () => {
      delete (window as any).trackStockInteraction;
      delete (window as any).trackFavoriteToggle;
      delete (window as any).trackSearch;
    };
  }, [isClient]);

  // Add CSS for performance optimizations
  useEffect(() => {
    if (!isClient) return;

    const style = document.createElement('style');
    style.textContent = `
      /* Performance optimizations */
      .table-loaded {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      table {
        opacity: 0.8;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      /* Optimize animations */
      * {
        will-change: auto;
      }
      
      .animate-pulse {
        will-change: opacity;
      }
      
      /* Reduce layout thrashing */
      .company-logo {
        contain: layout style paint;
      }
      
      /* Optimize scrolling */
      .container {
        contain: layout style;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [isClient]);

  return <>{children}</>;
} 