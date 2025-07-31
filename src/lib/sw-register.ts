// Enhanced Service Worker Registration Utility

interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  lastReset: number;
  strategyStats: {
    'cache-first': { hits: number; misses: number };
    'network-first': { hits: number; misses: number };
    'stale-while-revalidate': { hits: number; misses: number };
  };
  contentTypeStats: Record<string, { hits: number; misses: number }>;
  priorityStats: {
    critical: { hits: number; misses: number };
    high: { hits: number; misses: number };
    medium: { hits: number; misses: number };
    low: { hits: number; misses: number };
  };
  offlineStats: {
    offlineRequests: number;
    offlineHits: number;
    offlineMisses: number;
    lastOfflineTime: number | null;
    totalOfflineTime: number;
  };
}

interface ServiceWorkerStatus {
  isRegistered: boolean;
  isActive: boolean;
  version?: string;
  cacheStats?: CacheStats;
  lastUpdate?: number;
  cacheVersion?: string;
}

interface CachingStrategy {
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  cache: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface OfflineState {
  isOffline: boolean;
  lastOnlineTime: number;
  offlineStartTime: number | null;
  connectionQuality: 'good' | 'poor' | 'offline' | 'unknown';
  pendingRequests: Array<{
    url: string;
    options: RequestInit;
    timestamp: number;
  }>;
  offlineDataVersion: string;
}

interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private status: ServiceWorkerStatus = {
    isRegistered: false,
    isActive: false
  };
  private offlineState: OfflineState = {
    isOffline: false,
    lastOnlineTime: Date.now(),
    offlineStartTime: null,
    connectionQuality: 'unknown',
    pendingRequests: [],
    offlineDataVersion: 'v1.0'
  };
  private offlineDataStore: Map<string, OfflineData> = new Map();
  private offlineListeners: Array<(state: OfflineState) => void> = [];

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async register(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW Manager] Service Worker not supported');
      return false;
    }

    try {
      // console.log('[SW Manager] Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      // console.log('[SW Manager] Service Worker registered successfully:', registration);
      
      this.status.isRegistered = true;
      this.status.version = registration.active?.scriptURL?.split('?')[0] || 'unknown';
      this.status.cacheVersion = 'v3.1.0';

      // Handle service worker updates
      this.setupUpdateHandling(registration);

      // Handle service worker messages
      this.setupMessageHandling();

      // Monitor service worker state
      this.monitorServiceWorkerState(registration);

      // Initialize offline monitoring
      this.initializeOfflineMonitoring();

      return true;
    } catch (error) {
      console.error('[SW Manager] Service Worker registration failed:', error);
      return false;
    }
  }

  private setupUpdateHandling(registration: ServiceWorkerRegistration) {
    registration.addEventListener('updatefound', () => {
      console.log('[SW Manager] Service Worker update found');
      
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log(`[SW Manager] New SW state: ${newWorker.state}`);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.status.lastUpdate = Date.now();
            this.showUpdateNotification();
          }
        });
      }
    });
  }

  private setupMessageHandling() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW Manager] Message from SW:', event.data);
      
      if (event.data && event.data.type === 'SKIP_WAITING') {
        window.location.reload();
      } else if (event.data && event.data.type === 'SYNC_COMPLETED') {
        this.showSyncNotification();
      } else if (event.data && event.data.type === 'CACHE_STATS') {
        this.status.cacheStats = event.data.stats;
        this.updateCacheStatsDisplay();
      } else if (event.data && event.data.type === 'OFFLINE_STATE_CHANGED') {
        this.handleOfflineStateChange(event.data);
      }
    });
  }

  private handleOfflineStateChange(data: { isOffline: boolean; timestamp: number }) {
    this.offlineState.isOffline = data.isOffline;
    
    if (data.isOffline) {
      this.offlineState.offlineStartTime = data.timestamp;
      this.offlineState.connectionQuality = 'offline';
      console.log('[SW Manager] App went offline');
    } else {
      this.offlineState.lastOnlineTime = data.timestamp;
      this.offlineState.connectionQuality = 'good';
      if (this.offlineState.offlineStartTime) {
        const offlineDuration = data.timestamp - this.offlineState.offlineStartTime;
        console.log(`[SW Manager] App came back online after ${offlineDuration}ms`);
      }
    }

    // Notify listeners
    this.offlineListeners.forEach(listener => listener(this.offlineState));
  }

  private monitorServiceWorkerState(registration: ServiceWorkerRegistration) {
    if (registration.active) {
      this.status.isActive = true;
    }

    registration.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Service Worker controller changed');
      this.status.isActive = true;
    });
  }

  private initializeOfflineMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('[SW Manager] Browser online event');
      this.updateConnectionQuality('good');
    });

    window.addEventListener('offline', () => {
      console.log('[SW Manager] Browser offline event');
      this.updateConnectionQuality('offline');
    });

    // Monitor connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        const quality = this.getConnectionQuality(connection);
        this.updateConnectionQuality(quality);
      });
    }

    // Periodic connection check
    setInterval(() => {
      this.checkConnectionQuality();
    }, 30000); // Every 30 seconds
  }

  private updateConnectionQuality(quality: 'good' | 'poor' | 'offline') {
    this.offlineState.connectionQuality = quality;
    
    if (quality === 'offline' && !this.offlineState.isOffline) {
      this.offlineState.isOffline = true;
      this.offlineState.offlineStartTime = Date.now();
    } else if (quality === 'good' && this.offlineState.isOffline) {
      this.offlineState.isOffline = false;
      this.offlineState.lastOnlineTime = Date.now();
    }

    // Notify listeners
    this.offlineListeners.forEach(listener => listener(this.offlineState));
  }

  private getConnectionQuality(connection: any): 'good' | 'poor' | 'offline' {
    if (!navigator.onLine) return 'offline';
    
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return 'poor';
    }
    
    return 'good';
  }

  private async checkConnectionQuality() {
    try {
      const response = await fetch('/api/prices/cached', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        this.updateConnectionQuality('good');
      } else {
        this.updateConnectionQuality('poor');
      }
    } catch (error) {
      this.updateConnectionQuality('offline');
    }
  }

  private showUpdateNotification() {
    // Create update notification
    const notification = document.createElement('div');
    notification.className = 'sw-update-notification';
    notification.innerHTML = `
      <div class="sw-update-content">
        <span>🔄 Nová verzia aplikácie je dostupná</span>
        <button onclick="this.parentElement.parentElement.remove(); window.location.reload();">
          Aktualizovať
        </button>
        <button onclick="this.parentElement.parentElement.remove();">
          Neskôr
        </button>
      </div>
    `;
    
    // Add styles
    if (!document.getElementById('sw-update-styles')) {
      const style = document.createElement('style');
      style.id = 'sw-update-styles';
      style.textContent = `
        .sw-update-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          color: #333;
          padding: 1rem;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 10000;
          animation: slideIn 0.3s ease;
        }
        .sw-update-content {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }
        .sw-update-content button {
          background: #333;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .sw-update-content button:hover {
          background: #555;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  private showSyncNotification() {
    // Show sync completion notification
    const notification = document.createElement('div');
    notification.className = 'sw-sync-notification';
    notification.innerHTML = `
      <div class="sw-sync-content">
        <span>✅ Dáta boli synchronizované</span>
      </div>
    `;
    
    // Add styles if not exists
    if (!document.getElementById('sw-sync-styles')) {
      const style = document.createElement('style');
      style.id = 'sw-sync-styles';
      style.textContent = `
        .sw-sync-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(45deg, #4CAF50, #45a049);
          color: white;
          padding: 1rem;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 10000;
          animation: slideIn 0.3s ease;
        }
        .sw-sync-content {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }

  private updateCacheStatsDisplay() {
    // Update cache stats in UI if available
    const statsElement = document.getElementById('cache-stats');
    if (statsElement && this.status.cacheStats) {
      const { hits, misses, errors, strategyStats, priorityStats, offlineStats } = this.status.cacheStats;
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : '0';
      
      // Calculate strategy-specific hit rates
      const strategyRates = Object.entries(strategyStats).map(([strategy, stats]) => {
        const strategyTotal = stats.hits + stats.misses;
        const rate = strategyTotal > 0 ? ((stats.hits / strategyTotal) * 100).toFixed(1) : '0';
        return `${strategy}: ${rate}%`;
      }).join(', ');
      
      // Calculate priority-specific hit rates
      const priorityRates = Object.entries(priorityStats).map(([priority, stats]) => {
        const priorityTotal = stats.hits + stats.misses;
        const rate = priorityTotal > 0 ? ((stats.hits / priorityTotal) * 100).toFixed(1) : '0';
        return `${priority}: ${rate}%`;
      }).join(', ');

      // Calculate offline-specific stats
      const offlineHitRate = offlineStats.offlineRequests > 0 
        ? ((offlineStats.offlineHits / offlineStats.offlineRequests) * 100).toFixed(1) 
        : '0';
      
      statsElement.innerHTML = `
        <div class="cache-stats">
          <span>Cache Hit Rate: ${hitRate}%</span>
          <span>Hits: ${hits}</span>
          <span>Misses: ${misses}</span>
          <span>Errors: ${errors}</span>
          <span>Strategies: ${strategyRates}</span>
          <span>Priorities: ${priorityRates}</span>
          <span>Offline Hit Rate: ${offlineHitRate}%</span>
          <span>Offline Requests: ${offlineStats.offlineRequests}</span>
        </div>
      `;
    }
  }

  async unregister(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        console.log('[SW Manager] Service Worker unregistered successfully');
        this.status.isRegistered = false;
        this.status.isActive = false;
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SW Manager] Service Worker unregistration failed:', error);
      return false;
    }
  }

  async getCacheStats(): Promise<CacheStats | null> {
    if (!this.status.isActive) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.type === 'CACHE_STATS') {
            resolve(event.data.stats);
          } else {
            resolve(null);
          }
        };
        
        registration.active?.postMessage(
          { type: 'GET_CACHE_STATS' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[SW Manager] Failed to get cache stats:', error);
      return null;
    }
  }

  async getOfflineState(): Promise<OfflineState | null> {
    if (!this.status.isActive) {
      return this.offlineState;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.type === 'OFFLINE_STATE') {
            resolve(event.data.state);
          } else {
            resolve(this.offlineState);
          }
        };
        
        registration.active?.postMessage(
          { type: 'GET_OFFLINE_STATE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('[SW Manager] Failed to get offline state:', error);
      return this.offlineState;
    }
  }

  async clearCache(): Promise<boolean> {
    if (!this.status.isActive) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'CLEAR_CACHE' });
      console.log('[SW Manager] Cache clear requested');
      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to clear cache:', error);
      return false;
    }
  }

  async warmCache(): Promise<boolean> {
    if (!this.status.isActive) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'WARM_CACHE' });
      console.log('[SW Manager] Cache warming requested');
      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to warm cache:', error);
      return false;
    }
  }

  async registerBackgroundSync(tag: string): Promise<boolean> {
    if (!this.status.isActive) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        console.log(`[SW Manager] Background sync registered: ${tag}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SW Manager] Background sync registration failed:', error);
      return false;
    }
  }

  // Offline data management
  async storeOfflineData(key: string, data: any, priority: 'critical' | 'high' | 'medium' | 'low' = 'medium', ttl: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const offlineData: OfflineData = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        priority
      };

      this.offlineDataStore.set(key, offlineData);
      
      // Store in localStorage as backup
      localStorage.setItem(`offline_${key}`, JSON.stringify(offlineData));
      
      console.log(`[SW Manager] Stored offline data: ${key}`);
      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to store offline data:', error);
      return false;
    }
  }

  async getOfflineData(key: string): Promise<any | null> {
    try {
      // Try memory first
      const offlineData = this.offlineDataStore.get(key);
      if (offlineData && offlineData.expiresAt > Date.now()) {
        return offlineData.data;
      }

      // Try localStorage
      const stored = localStorage.getItem(`offline_${key}`);
      if (stored) {
        const parsed: OfflineData = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          this.offlineDataStore.set(key, parsed);
          return parsed.data;
        } else {
          // Clean up expired data
          localStorage.removeItem(`offline_${key}`);
          this.offlineDataStore.delete(key);
        }
      }

      return null;
    } catch (error) {
      console.error('[SW Manager] Failed to get offline data:', error);
      return null;
    }
  }

  async clearOfflineData(key?: string): Promise<boolean> {
    try {
      if (key) {
        this.offlineDataStore.delete(key);
        localStorage.removeItem(`offline_${key}`);
      } else {
        this.offlineDataStore.clear();
        // Clear all offline data from localStorage
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('offline_')) {
            localStorage.removeItem(k);
          }
        });
      }
      
      console.log(`[SW Manager] Cleared offline data${key ? `: ${key}` : ''}`);
      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to clear offline data:', error);
      return false;
    }
  }

  // Offline state listeners
  onOfflineStateChange(listener: (state: OfflineState) => void): () => void {
    this.offlineListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.offlineListeners.indexOf(listener);
      if (index > -1) {
        this.offlineListeners.splice(index, 1);
      }
    };
  }

  // Add pending request for offline sync
  async addPendingRequest(url: string, options: RequestInit = {}): Promise<boolean> {
    if (!this.status.isActive) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ 
        type: 'ADD_PENDING_REQUEST',
        request: { url, options, timestamp: Date.now() }
      });
      console.log(`[SW Manager] Added pending request: ${url}`);
      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to add pending request:', error);
      return false;
    }
  }

  getStatus(): ServiceWorkerStatus {
    return { ...this.status };
  }

  getOfflineStateSync(): OfflineState {
    return { ...this.offlineState };
  }

  // Get caching strategy for a specific URL
  getCachingStrategy(url: string): CachingStrategy {
    const urlObj = new URL(url, window.location.origin);
    
    // Check if it's a critical API
    if (urlObj.pathname.startsWith('/api/prices/cached') || urlObj.pathname.startsWith('/api/auth/me')) {
      return { strategy: 'network-first', cache: 'premarket-api-v3.1.0', priority: 'critical' };
    }
    
    // Check if it's a high priority asset
    if (urlObj.pathname.includes('/favicon.ico') || urlObj.pathname.includes('/icon-')) {
      return { strategy: 'cache-first', cache: 'premarket-static-v3.1.0', priority: 'high' };
    }
    
    // Check if it's an image
    if (urlObj.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i)) {
      return { strategy: 'cache-first', cache: 'premarket-images-v3.1.0', priority: 'medium' };
    }
    
    // Check if it's a font
    if (urlObj.pathname.match(/\.(woff|woff2|ttf|eot)$/i)) {
      return { strategy: 'cache-first', cache: 'premarket-fonts-v3.1.0', priority: 'high' };
    }
    
    // Default strategy
    return { strategy: 'stale-while-revalidate', cache: 'premarket-dynamic-v3.1.0', priority: 'medium' };
  }
}

// Export singleton instance
export const swManager = ServiceWorkerManager.getInstance();

// Legacy functions for backward compatibility
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  const success = await swManager.register();
  if (success) {
    return navigator.serviceWorker.ready;
  }
  return undefined;
}

export async function unregisterServiceWorker(): Promise<void> {
  await swManager.unregister();
}

// Check if app is installed as PWA
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[SW Manager] Failed to request notification permission:', error);
    return false;
  }
}

// Send notification
export function sendNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options,
    });
  }
}

// Background sync registration
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  return await swManager.registerBackgroundSync(tag);
}

// Initialize PWA features
export async function initializePWA() {
  if (typeof window === 'undefined') return;

  console.log('[SW Manager] Initializing PWA features...');

  // Register service worker
  await swManager.register();

  // Request notification permission on user interaction
  document.addEventListener('click', async () => {
    if (Notification.permission === 'default') {
      await requestNotificationPermission();
    }
  }, { once: true });

  // Add to home screen prompt
  let deferredPrompt: any;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    console.log('[SW Manager] Install prompt available');
    
    // Show install prompt when appropriate
    const installButton = document.getElementById('install-pwa');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`[SW Manager] User response to install prompt: ${outcome}`);
          deferredPrompt = null;
          installButton.style.display = 'none';
        }
      });
    }
  });

  // Handle app installed event
  window.addEventListener('appinstalled', () => {
    console.log('[SW Manager] App installed successfully');
    deferredPrompt = null;
  });

  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('[SW Manager] App is online');
    // Trigger background sync when connection is restored
    registerBackgroundSync('background-sync');
  });

  window.addEventListener('offline', () => {
    console.log('[SW Manager] App is offline');
  });

  console.log('[SW Manager] PWA features initialized');
}

// Export types for external use
export type { CacheStats, ServiceWorkerStatus, CachingStrategy, OfflineState, OfflineData };