'use client';

import React, { useEffect, useState } from 'react';
import { usePerformance } from '@/hooks/usePerformance';
import { reportWebVitals } from '@/lib/web-vitals';
import { initializePreloading } from '@/lib/preload';
import { initializePWA } from '@/lib/sw-register';

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
    
    // Initialize preloading and PWA features
    initializePreloading();
    initializePWA();
    
    // Report initial load performance
    if (typeof window !== 'undefined') {
      const loadTime = performance.now();
      reportMetric('Initial Load', loadTime);
      
      // Report DOM content loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          const domReadyTime = performance.now();
          reportMetric('DOM Ready', domReadyTime);
        });
      } else {
        const domReadyTime = performance.now();
        reportMetric('DOM Ready', domReadyTime);
      }
      
      // Report window load
      window.addEventListener('load', () => {
        const windowLoadTime = performance.now();
        reportMetric('Window Load', windowLoadTime);
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
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
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
            table.classList.add('table-loaded');
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