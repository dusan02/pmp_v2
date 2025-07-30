// Advanced Analytics System
interface AnalyticsEvent {
  id: string;
  name: string;
  category: 'user' | 'performance' | 'business' | 'error' | 'system';
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  page: string;
  userAgent: string;
  referrer?: string;
}

interface AnalyticsSession {
  id: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  events: number;
  duration: number;
  referrer?: string;
  userAgent: string;
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screen: {
      width: number;
      height: number;
    };
  };
}

interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  batchSize: number;
  flushInterval: number;
  endpoint: string;
  sessionTimeout: number;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private session: AnalyticsSession | null = null;
  private config: AnalyticsConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      debug: false,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      endpoint: '/api/analytics',
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    this.initialize();
  }

  private initialize() {
    if (!this.config.enabled) return;

    // Initialize session
    this.initializeSession();

    // Setup event listeners
    this.setupEventListeners();

    // Start flush timer
    this.startFlushTimer();

    // Setup online/offline detection
    this.setupConnectivityDetection();

    if (this.config.debug) {
      console.log('📊 Analytics initialized:', this.config);
    }
  }

  private initializeSession() {
    const sessionId = this.getSessionId();
    const deviceInfo = this.getDeviceInfo();

    this.session = {
      id: sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      events: 0,
      duration: 0,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      deviceInfo
    };

    // Track session start
    this.track('session', 'start', 'Session Started', undefined, {
      sessionId,
      referrer: document.referrer,
      deviceInfo
    });
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    const screen = {
      width: window.screen.width,
      height: window.screen.height
    };

    // Detect device type
    let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      type = screen.width > 768 ? 'tablet' : 'mobile';
    }

    // Detect OS
    let os = 'Unknown';
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';

    // Detect browser
    let browser = 'Unknown';
    if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';
    else if (/Opera/i.test(userAgent)) browser = 'Opera';

    return { type, os, browser, screen };
  }

  private setupEventListeners() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('user', 'page_hide', 'Page Hidden');
      } else {
        this.track('user', 'page_show', 'Page Shown');
      }
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.track('user', 'page_unload', 'Page Unload');
      this.flush(true); // Force flush on unload
    });

    // User interactions
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        this.track('user', 'click', target.textContent?.trim() || target.tagName, undefined, {
          element: target.tagName,
          text: target.textContent?.trim(),
          href: (target as HTMLAnchorElement).href
        });
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      this.track('user', 'form_submit', form.id || 'form', undefined, {
        formId: form.id,
        action: form.action
      });
    });

    // Scroll tracking
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        this.track('user', 'scroll', 'Page Scroll', scrollPercent, {
          scrollY: window.scrollY,
          scrollPercent
        });
      }, 100);
    });

    // Error tracking
    window.addEventListener('error', (e) => {
      this.track('error', 'javascript_error', e.message, undefined, {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error?.toString()
      });
    });

    // Performance tracking
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.track('performance', 'page_load', 'Page Load Complete', navEntry.loadEventEnd - navEntry.fetchStart, {
              dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcp: navEntry.connectEnd - navEntry.connectStart,
              ttfb: navEntry.responseStart - navEntry.requestStart,
              domReady: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart
            });
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  private setupConnectivityDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.track('system', 'online', 'Connection Restored');
      this.flush(); // Flush pending events
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.track('system', 'offline', 'Connection Lost');
    });
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  // Public API
  track(
    category: AnalyticsEvent['category'],
    action: string,
    label?: string,
    value?: number,
    properties?: Record<string, any>
  ) {
    if (!this.config.enabled || !this.session) return;

    const event: AnalyticsEvent = {
      id: this.generateId(),
      name: `${category}_${action}`,
      category,
      action,
      label,
      value,
      properties,
      timestamp: Date.now(),
      sessionId: this.session.id,
      userId: this.getUserId(),
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    this.events.push(event);
    this.session.events++;
    this.session.lastActivity = Date.now();

    if (this.config.debug) {
      console.log('📊 Analytics Event:', event);
    }

    // Auto-flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  // Business-specific tracking methods
  trackPageView(page: string, title?: string) {
    if (this.session) {
      this.session.pageViews++;
    }
    this.track('user', 'page_view', title || page, undefined, {
      page,
      title: title || document.title
    });
  }

  trackStockView(ticker: string, price: number, change: number) {
    this.track('business', 'stock_view', ticker, price, {
      ticker,
      price,
      change,
      changePercent: change
    });
  }

  trackFavoriteToggle(ticker: string, isFavorite: boolean) {
    this.track('business', 'favorite_toggle', ticker, isFavorite ? 1 : 0, {
      ticker,
      isFavorite
    });
  }

  trackSearch(query: string, results: number) {
    this.track('business', 'search', query, results, {
      query,
      results,
      queryLength: query.length
    });
  }

  trackPerformance(metric: string, value: number, category: string = 'performance') {
    this.track(category, metric, metric, value, {
      metric,
      category
    });
  }

  trackError(error: Error, context?: string) {
    this.track('error', 'application_error', error.message, undefined, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context
    });
  }

  // Session management
  private getUserId(): string | undefined {
    // This would typically come from your auth system
    return localStorage.getItem('user_id') || undefined;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Data flushing
  private async flush(force: boolean = false) {
    if (!this.isOnline && !force) {
      // Store events locally for later sync
      this.storeOfflineEvents();
      return;
    }

    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          session: this.session,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Analytics flush failed: ${response.status}`);
      }

      if (this.config.debug) {
        console.log('📊 Analytics flushed:', eventsToSend.length, 'events');
      }
    } catch (error) {
      // Restore events for retry
      this.events.unshift(...eventsToSend);
      
      if (this.config.debug) {
        console.error('📊 Analytics flush error:', error);
      }
    }
  }

  private storeOfflineEvents() {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    offlineEvents.push(...this.events);
    localStorage.setItem('analytics_offline_events', JSON.stringify(offlineEvents));
    
    if (this.config.debug) {
      console.log('📊 Events stored offline:', this.events.length);
    }
  }

  // Sync offline events when back online
  async syncOfflineEvents() {
    const offlineEvents = JSON.parse(localStorage.getItem('analytics_offline_events') || '[]');
    if (offlineEvents.length === 0) return;

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: offlineEvents,
          offline: true,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        localStorage.removeItem('analytics_offline_events');
        if (this.config.debug) {
          console.log('📊 Offline events synced:', offlineEvents.length);
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('📊 Offline sync error:', error);
      }
    }
  }

  // Session management
  updateSession() {
    if (this.session) {
      this.session.duration = Date.now() - this.session.startTime;
      this.session.lastActivity = Date.now();
    }
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true);
  }

  // Get analytics data
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getSession(): AnalyticsSession | null {
    return this.session ? { ...this.session } : null;
  }

  // Configuration
  updateConfig(config: Partial<AnalyticsConfig>) {
    this.config = { ...this.config, ...config };
    if (config.flushInterval) {
      this.startFlushTimer();
    }
  }
}

// Singleton instance
export const analytics = new Analytics({
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development'
});

// Export types
export type { AnalyticsEvent, AnalyticsSession, AnalyticsConfig }; 