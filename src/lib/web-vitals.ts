// Core Web Vitals tracking using native Performance API
interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function getRating(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

function sendToConsole(metric: WebVitalsMetric) {
  console.log(`[Web Vitals] ${metric.name}:`, metric.value, `(${metric.rating})`);
}

// LCP (Largest Contentful Paint)
function measureLCP() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;
      
      const metric: WebVitalsMetric = {
        name: 'LCP',
        value: lastEntry.startTime,
        rating: getRating(lastEntry.startTime, { good: 2500, poor: 4000 })
      };
      
      sendToConsole(metric);
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }
}

// FID (First Input Delay)
function measureFID() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const metric: WebVitalsMetric = {
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          rating: getRating(entry.processingStart - entry.startTime, { good: 100, poor: 300 })
        };
        
        sendToConsole(metric);
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
  }
}

// CLS (Cumulative Layout Shift)
function measureCLS() {
  if ('PerformanceObserver' in window) {
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        }
      });
      
      const metric: WebVitalsMetric = {
        name: 'CLS',
        value: clsValue,
        rating: getRating(clsValue, { good: 0.1, poor: 0.25 })
      };
      
      sendToConsole(metric);
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
  }
}

// TTFB (Time to First Byte)
function measureTTFB() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const metric: WebVitalsMetric = {
          name: 'TTFB',
          value: entry.responseStart - entry.requestStart,
          rating: getRating(entry.responseStart - entry.requestStart, { good: 800, poor: 1800 })
        };
        
        sendToConsole(metric);
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  }
}

// INP (Interaction to Next Paint) - simplified version
function measureINP() {
  if ('PerformanceObserver' in window) {
    let interactionEntries: PerformanceEntry[] = [];
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        interactionEntries.push(entry);
      });
      
      // Calculate INP as the 75th percentile of interaction delays
      if (interactionEntries.length > 0) {
        const delays = interactionEntries.map(entry => entry.duration).sort((a, b) => a - b);
        const inpValue = delays[Math.floor(delays.length * 0.75)];
        
        const metric: WebVitalsMetric = {
          name: 'INP',
          value: inpValue,
          rating: getRating(inpValue, { good: 200, poor: 500 })
        };
        
        sendToConsole(metric);
      }
    });
    
    observer.observe({ entryTypes: ['interaction'] });
  }
}

export function reportWebVitals() {
  if (typeof window === 'undefined') return;
  
  // Measure all Core Web Vitals
  measureLCP();
  measureFID();
  measureCLS();
  measureTTFB();
  measureINP();
  
  console.log('[Web Vitals] Core Web Vitals tracking initialized');
}