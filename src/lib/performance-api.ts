// Advanced Performance API Integration
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  category: 'navigation' | 'resource' | 'paint' | 'layout' | 'memory' | 'custom';
  timestamp: number;
}

interface PerformanceData {
  navigation: {
    dns: number;
    tcp: number;
    ttfb: number;
    domContentLoaded: number;
    loadComplete: number;
    totalTime: number;
  };
  resources: {
    total: number;
    cached: number;
    network: number;
    averageSize: number;
  };
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  paint: {
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  };
  layout: {
    layoutShifts: number;
    cumulativeLayoutShift: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Navigation timing
    this.observeNavigation();
    
    // Resource timing
    this.observeResources();
    
    // Paint timing
    this.observePaint();
    
    // Layout shifts
    this.observeLayoutShifts();
    
    // Memory usage (if available)
    this.observeMemory();
    
    // Long tasks
    this.observeLongTasks();
    
    // First input delay
    this.observeFirstInput();
  }

  private observeNavigation() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          
          this.addMetric('DNS Lookup', navEntry.domainLookupEnd - navEntry.domainLookupStart, 'ms', 'navigation');
          this.addMetric('TCP Connection', navEntry.connectEnd - navEntry.connectStart, 'ms', 'navigation');
          this.addMetric('Time to First Byte', navEntry.responseStart - navEntry.requestStart, 'ms', 'navigation');
          this.addMetric('DOM Content Loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'ms', 'navigation');
          this.addMetric('Load Complete', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms', 'navigation');
          this.addMetric('Total Navigation Time', navEntry.loadEventEnd - navEntry.fetchStart, 'ms', 'navigation');
        }
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
    this.observers.push(observer);
  }

  private observeResources() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      let totalSize = 0;
      let cachedCount = 0;
      let networkCount = 0;

      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Calculate transfer size
          const transferSize = resourceEntry.transferSize || 0;
          totalSize += transferSize;
          
          if (transferSize === 0) {
            cachedCount++;
          } else {
            networkCount++;
          }

          // Add individual resource metrics
          this.addMetric(`${resourceEntry.name} Load Time`, resourceEntry.duration, 'ms', 'resource');
          this.addMetric(`${resourceEntry.name} Size`, transferSize, 'bytes', 'resource');
        }
      });

      // Add summary metrics
      this.addMetric('Total Resources', entries.length, 'count', 'resource');
      this.addMetric('Cached Resources', cachedCount, 'count', 'resource');
      this.addMetric('Network Resources', networkCount, 'count', 'resource');
      this.addMetric('Average Resource Size', totalSize / entries.length, 'bytes', 'resource');
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  private observePaint() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'paint') {
          const paintEntry = entry as PerformancePaintTiming;
          
          if (paintEntry.name === 'first-paint') {
            this.addMetric('First Paint', paintEntry.startTime, 'ms', 'paint');
          } else if (paintEntry.name === 'first-contentful-paint') {
            this.addMetric('First Contentful Paint', paintEntry.startTime, 'ms', 'paint');
          }
        }
      });
    });

    observer.observe({ entryTypes: ['paint'] });
    this.observers.push(observer);
  }

  private observeLayoutShifts() {
    let cumulativeLayoutShift = 0;
    let layoutShiftCount = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'layout-shift') {
          const layoutEntry = entry as any;
          if (!layoutEntry.hadRecentInput) {
            cumulativeLayoutShift += layoutEntry.value;
            layoutShiftCount++;
            
            this.addMetric('Layout Shift', layoutEntry.value, 'score', 'layout');
          }
        }
      });

      this.addMetric('Cumulative Layout Shift', cumulativeLayoutShift, 'score', 'layout');
      this.addMetric('Layout Shift Count', layoutShiftCount, 'count', 'layout');
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }

  private observeMemory() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      setInterval(() => {
        this.addMetric('Memory Used', memory.usedJSHeapSize, 'bytes', 'memory');
        this.addMetric('Memory Total', memory.totalJSHeapSize, 'bytes', 'memory');
        this.addMetric('Memory Limit', memory.jsHeapSizeLimit, 'bytes', 'memory');
      }, 5000); // Check every 5 seconds
    }
  }

  private observeLongTasks() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'longtask') {
          this.addMetric('Long Task', entry.duration, 'ms', 'custom');
        }
      });
    });

    observer.observe({ entryTypes: ['longtask'] });
    this.observers.push(observer);
  }

  private observeFirstInput() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'first-input') {
          const inputEntry = entry as any;
          this.addMetric('First Input Delay', inputEntry.processingStart - inputEntry.startTime, 'ms', 'custom');
        }
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.push(observer);
  }

  private addMetric(name: string, value: number, unit: string, category: PerformanceMetric['category']) {
    const metric: PerformanceMetric = {
      name,
      value: Math.round(value * 100) / 100,
      unit,
      category,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.logMetric(metric);
  }

  private logMetric(metric: PerformanceMetric) {
    const emoji = this.getCategoryEmoji(metric.category);
    console.log(`${emoji} [Performance] ${metric.name}: ${metric.value}${metric.unit}`);
  }

  private getCategoryEmoji(category: string): string {
    switch (category) {
      case 'navigation': return '🌐';
      case 'resource': return '📦';
      case 'paint': return '🎨';
      case 'layout': return '📐';
      case 'memory': return '🧠';
      case 'custom': return '⚡';
      default: return '📊';
    }
  }

  // Custom performance measurements
  measureCustomMetric(name: string, fn: () => void) {
    const start = performance.now();
    fn();
    const end = performance.now();
    this.addMetric(name, end - start, 'ms', 'custom');
  }

  async measureAsyncMetric(name: string, fn: () => Promise<void>) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    this.addMetric(name, end - start, 'ms', 'custom');
  }

  // Get performance summary
  getPerformanceSummary(): PerformanceData {
    const navigation = this.getNavigationMetrics();
    const resources = this.getResourceMetrics();
    const memory = this.getMemoryMetrics();
    const paint = this.getPaintMetrics();
    const layout = this.getLayoutMetrics();

    return {
      navigation,
      resources,
      memory,
      paint,
      layout
    };
  }

  private getNavigationMetrics() {
    const navMetrics = this.metrics.filter(m => m.category === 'navigation');
    return {
      dns: navMetrics.find(m => m.name === 'DNS Lookup')?.value || 0,
      tcp: navMetrics.find(m => m.name === 'TCP Connection')?.value || 0,
      ttfb: navMetrics.find(m => m.name === 'Time to First Byte')?.value || 0,
      domContentLoaded: navMetrics.find(m => m.name === 'DOM Content Loaded')?.value || 0,
      loadComplete: navMetrics.find(m => m.name === 'Load Complete')?.value || 0,
      totalTime: navMetrics.find(m => m.name === 'Total Navigation Time')?.value || 0
    };
  }

  private getResourceMetrics() {
    const resourceMetrics = this.metrics.filter(m => m.category === 'resource');
    return {
      total: resourceMetrics.find(m => m.name === 'Total Resources')?.value || 0,
      cached: resourceMetrics.find(m => m.name === 'Cached Resources')?.value || 0,
      network: resourceMetrics.find(m => m.name === 'Network Resources')?.value || 0,
      averageSize: resourceMetrics.find(m => m.name === 'Average Resource Size')?.value || 0
    };
  }

  private getMemoryMetrics() {
    const memoryMetrics = this.metrics.filter(m => m.category === 'memory');
    return {
      used: memoryMetrics.find(m => m.name === 'Memory Used')?.value || 0,
      total: memoryMetrics.find(m => m.name === 'Memory Total')?.value || 0,
      limit: memoryMetrics.find(m => m.name === 'Memory Limit')?.value || 0
    };
  }

  private getPaintMetrics() {
    const paintMetrics = this.metrics.filter(m => m.category === 'paint');
    return {
      firstPaint: paintMetrics.find(m => m.name === 'First Paint')?.value || 0,
      firstContentfulPaint: paintMetrics.find(m => m.name === 'First Contentful Paint')?.value || 0,
      largestContentfulPaint: paintMetrics.find(m => m.name === 'LCP')?.value || 0
    };
  }

  private getLayoutMetrics() {
    const layoutMetrics = this.metrics.filter(m => m.category === 'layout');
    return {
      layoutShifts: layoutMetrics.find(m => m.name === 'Layout Shift Count')?.value || 0,
      cumulativeLayoutShift: layoutMetrics.find(m => m.name === 'Cumulative Layout Shift')?.value || 0
    };
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }

  // Get all metrics
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types
export type { PerformanceMetric, PerformanceData }; 