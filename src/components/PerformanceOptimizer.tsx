'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { usePerformance } from '@/hooks/usePerformance';
import { reportWebVitals } from '@/lib/web-vitals';
import { initializePreloading } from '@/lib/preload';
import { initializePWA } from '@/lib/sw-register';
import { performanceMonitor } from '@/lib/performance-api';
import { analytics } from '@/lib/analytics';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  enableAdvancedOptimizations?: boolean;
  performanceBudget?: {
    maxLoadTime?: number;
    maxMemoryUsage?: number;
    maxBundleSize?: number;
  };
  enableErrorBoundary?: boolean;
  enableResourceOptimization?: boolean;
  enableMemoryManagement?: boolean;
}

interface PerformanceBudget {
  maxLoadTime: number;
  maxMemoryUsage: number;
  maxBundleSize: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxLoadTime: 3000, // 3 seconds
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxBundleSize: 500 * 1024, // 500KB
};

class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error, errorInfo: React.ErrorInfo) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error, errorInfo: React.ErrorInfo) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Track error in analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('error', 'react_error_boundary', error.message, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('Performance Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="performance-error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>We're working to fix this issue. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function PerformanceOptimizer({ 
  children, 
  enableAdvancedOptimizations = true,
  performanceBudget = DEFAULT_PERFORMANCE_BUDGET,
  enableErrorBoundary = true,
  enableResourceOptimization = true,
  enableMemoryManagement = true
}: PerformanceOptimizerProps) {
  const [isClient, setIsClient] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [budgetViolations, setBudgetViolations] = useState<string[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const { reportMetric } = usePerformance();
  const optimizationTimeoutRef = useRef<NodeJS.Timeout>();
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Performance budget checking
  const checkPerformanceBudget = useCallback((metrics: any) => {
    const violations: string[] = [];
    
    if (metrics.loadTime && metrics.loadTime > performanceBudget.maxLoadTime) {
      violations.push(`Load time (${metrics.loadTime}ms) exceeds budget (${performanceBudget.maxLoadTime}ms)`);
    }
    
    if (metrics.memoryUsage && metrics.memoryUsage > performanceBudget.maxMemoryUsage) {
      violations.push(`Memory usage (${Math.round(metrics.memoryUsage / 1024 / 1024)}MB) exceeds budget (${Math.round(performanceBudget.maxMemoryUsage / 1024 / 1024)}MB)`);
    }
    
    if (violations.length > 0) {
      setBudgetViolations(violations);
      analytics.track('performance', 'budget_violation', 'Performance budget exceeded', {
        violations,
        metrics
      });
    }
  }, [performanceBudget]);

  // Memory management
  const optimizeMemory = useCallback(() => {
    if (!enableMemoryManagement || typeof window === 'undefined') return;
    
    setIsOptimizing(true);
    
    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    // Clear non-essential caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (!cacheName.includes('critical')) {
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Clear image cache for non-visible images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.offsetParent) { // Not visible
        img.src = '';
        img.removeAttribute('src');
      }
    });
    
    setTimeout(() => setIsOptimizing(false), 100);
  }, [enableMemoryManagement]);

  // Resource optimization
  const optimizeResources = useCallback(() => {
    if (!enableResourceOptimization || typeof window === 'undefined') return;
    
    // Optimize images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.offsetParent && !img.loading) {
        img.loading = 'lazy';
      }
    });
    
    // Optimize tables
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      if (!table.classList.contains('optimized')) {
        table.classList.add('optimized');
        // Add virtual scrolling for large tables
        if (table.rows.length > 100) {
          table.classList.add('virtual-scroll');
        }
      }
    });
    
    // Optimize animations
    const animatedElements = document.querySelectorAll('.animate-pulse, .animate-spin');
    animatedElements.forEach(element => {
      if (!element.offsetParent) {
        element.classList.add('paused');
      }
    });
  }, [enableResourceOptimization]);

  // Monitor memory usage
  useEffect(() => {
    if (!enableMemoryManagement || typeof window === 'undefined') return;
    
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize;
        setMemoryUsage(usage);
        
        // Alert if memory usage is high
        if (usage > performanceBudget.maxMemoryUsage * 0.8) {
          console.warn('High memory usage detected:', Math.round(usage / 1024 / 1024), 'MB');
          optimizeMemory();
        }
      }
    };
    
    memoryCheckIntervalRef.current = setInterval(checkMemory, 10000); // Check every 10 seconds
    checkMemory(); // Initial check
    
    return () => {
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
    };
  }, [enableMemoryManagement, performanceBudget.maxMemoryUsage, optimizeMemory]);

  // Main initialization
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
          
          // Update performance metrics state
          setPerformanceMetrics(summary);
          
          // Check performance budget
          checkPerformanceBudget({
            loadTime: windowLoadTime,
            memoryUsage: summary.memory.used,
            bundleSize: summary.resources.total
          });
          
          // Track performance metrics
          analytics.trackPerformance('navigation_total_time', summary.navigation.totalTime);
          analytics.trackPerformance('memory_usage_percent', 
            (summary.memory.used / summary.memory.limit) * 100);
          analytics.trackPerformance('resource_count', summary.resources.total);
        }, 1000);
      });
    }
  }, [reportMetric, checkPerformanceBudget]);

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

  // Advanced optimizations
  useEffect(() => {
    if (!enableAdvancedOptimizations || !isClient) return;
    
    // Debounced resource optimization
    const debouncedOptimize = () => {
      if (optimizationTimeoutRef.current) {
        clearTimeout(optimizationTimeoutRef.current);
      }
      optimizationTimeoutRef.current = setTimeout(() => {
        optimizeResources();
      }, 1000);
    };
    
    // Optimize on scroll
    const handleScroll = () => {
      debouncedOptimize();
    };
    
    // Optimize on resize
    const handleResize = () => {
      debouncedOptimize();
    };
    
    // Optimize on visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause non-essential operations
        if (memoryCheckIntervalRef.current) {
          clearInterval(memoryCheckIntervalRef.current);
        }
      } else {
        // Page is visible, resume operations
        if (enableMemoryManagement) {
          memoryCheckIntervalRef.current = setInterval(() => {
            if ('memory' in performance) {
              const memory = (performance as any).memory;
              setMemoryUsage(memory.usedJSHeapSize);
            }
          }, 10000);
        }
        optimizeResources();
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (optimizationTimeoutRef.current) {
        clearTimeout(optimizationTimeoutRef.current);
      }
    };
  }, [isClient, enableAdvancedOptimizations, optimizeResources, enableMemoryManagement]);

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
      
      .animate-pulse.paused {
        animation-play-state: paused;
      }
      
      /* Reduce layout thrashing */
      .company-logo {
        contain: layout style paint;
      }
      
      /* Optimize scrolling */
      .container {
        contain: layout style;
      }
      
      /* Virtual scrolling for large tables */
      .virtual-scroll {
        max-height: 400px;
        overflow-y: auto;
      }
      
      /* Performance error boundary */
      .performance-error-boundary {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        padding: 2rem;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin: 1rem 0;
      }
      
      .error-content {
        text-align: center;
        max-width: 400px;
      }
      
      .error-content h2 {
        color: #dc3545;
        margin-bottom: 1rem;
      }
      
      .retry-button {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
      }
      
      .retry-button:hover {
        background: #0056b3;
      }
      
      .error-details {
        margin-top: 1rem;
        text-align: left;
      }
      
      .error-details summary {
        cursor: pointer;
        color: #6c757d;
        margin-bottom: 0.5rem;
      }
      
      .error-details pre {
        background: #f8f9fa;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
        overflow-x: auto;
      }
      
      /* Memory optimization indicator */
      .memory-optimizing {
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: #ffc107;
        color: #212529;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.875rem;
        z-index: 1000;
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      /* Budget violation indicator */
      .budget-violation {
        position: fixed;
        top: 1rem;
        left: 1rem;
        background: #dc3545;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.875rem;
        z-index: 1000;
        max-width: 300px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [isClient]);

  // Render error boundary if enabled
  if (enableErrorBoundary) {
    return (
      <PerformanceErrorBoundary
        onError={(error, errorInfo) => {
          analytics.track('error', 'performance_optimizer_error', error.message, {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
          });
        }}
      >
        {children}
        {isOptimizing && (
          <div className="memory-optimizing">
            Optimizing memory...
          </div>
        )}
        {budgetViolations.length > 0 && (
          <div className="budget-violation">
            <strong>Performance Budget Exceeded:</strong>
            <ul>
              {budgetViolations.map((violation, index) => (
                <li key={index}>{violation}</li>
              ))}
            </ul>
          </div>
        )}
      </PerformanceErrorBoundary>
    );
  }

  return (
    <>
      {children}
      {isOptimizing && (
        <div className="memory-optimizing">
          Optimizing memory...
        </div>
      )}
      {budgetViolations.length > 0 && (
        <div className="budget-violation">
          <strong>Performance Budget Exceeded:</strong>
          <ul>
            {budgetViolations.map((violation, index) => (
              <li key={index}>{violation}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
} 