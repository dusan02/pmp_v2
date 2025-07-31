// Enhanced Service Worker with intelligent caching and performance monitoring
const CACHE_VERSION = "v3.1.0";
const CACHE_NAME = `premarket-cache-${CACHE_VERSION}`;
const STATIC_CACHE = `premarket-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `premarket-dynamic-${CACHE_VERSION}`;
const API_CACHE = `premarket-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `premarket-images-${CACHE_VERSION}`;
const FONT_CACHE = `premarket-fonts-${CACHE_VERSION}`;
const DATA_CACHE = `premarket-data-${CACHE_VERSION}`;
const OFFLINE_CACHE = `premarket-offline-${CACHE_VERSION}`;

// Advanced cache configuration with content-type specific settings
const CACHE_CONFIG = {
  static: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 100,
    strategy: "cache-first",
    priority: "high",
  },
  dynamic: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 50,
    strategy: "stale-while-revalidate",
    priority: "medium",
  },
  api: {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 20,
    strategy: "network-first",
    priority: "critical",
  },
  images: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 200,
    strategy: "cache-first",
    priority: "medium",
  },
  fonts: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 50,
    strategy: "cache-first",
    priority: "high",
  },
  data: {
    maxAge: 15 * 60 * 1000, // 15 minutes
    maxEntries: 30,
    strategy: "network-first",
    priority: "critical",
  },
  offline: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100,
    strategy: "cache-first",
    priority: "critical",
  },
};

// Content type mapping for intelligent caching
const CONTENT_TYPE_STRATEGIES = {
  "text/html": {
    cache: STATIC_CACHE,
    strategy: "network-first",
    priority: "high",
  },
  "text/css": {
    cache: STATIC_CACHE,
    strategy: "cache-first",
    priority: "high",
  },
  "application/javascript": {
    cache: STATIC_CACHE,
    strategy: "cache-first",
    priority: "high",
  },
  "image/png": {
    cache: IMAGE_CACHE,
    strategy: "cache-first",
    priority: "medium",
  },
  "image/jpeg": {
    cache: IMAGE_CACHE,
    strategy: "cache-first",
    priority: "medium",
  },
  "image/svg+xml": {
    cache: IMAGE_CACHE,
    strategy: "cache-first",
    priority: "medium",
  },
  "image/webp": {
    cache: IMAGE_CACHE,
    strategy: "cache-first",
    priority: "medium",
  },
  "image/avif": {
    cache: IMAGE_CACHE,
    strategy: "cache-first",
    priority: "medium",
  },
  "font/woff": { cache: FONT_CACHE, strategy: "cache-first", priority: "high" },
  "font/woff2": {
    cache: FONT_CACHE,
    strategy: "cache-first",
    priority: "high",
  },
  "application/json": {
    cache: DATA_CACHE,
    strategy: "network-first",
    priority: "critical",
  },
  "application/xml": {
    cache: DATA_CACHE,
    strategy: "network-first",
    priority: "medium",
  },
};

// Priority-based asset classification
const PRIORITY_ASSETS = {
  critical: ["/", "/manifest.json", "/api/prices/cached", "/api/auth/me"],
  high: ["/favicon.ico", "/icon-192.png", "/icon-512.png", "/api/favorites"],
  medium: ["/offline.html", "/api/analytics", "/api/performance"],
  low: ["/api/test", "/api/security/events"],
};

// Offline-specific assets and data
const OFFLINE_ASSETS = {
  pages: ["/", "/offline.html"],
  critical_data: ["/api/prices/cached", "/api/auth/me", "/api/favorites"],
  static_assets: [
    "/favicon.ico",
    "/icon-192.png",
    "/icon-512.png",
    "/manifest.json",
  ],
  fallback_data: {
    "/api/prices/cached": {
      data: [],
      message: "Offline - Using cached stock data",
      timestamp: Date.now(),
    },
    "/api/auth/me": {
      user: null,
      message: "Offline - User data not available",
      timestamp: Date.now(),
    },
  },
};

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/og-image.png",
  "/icon-192.png",
  "/icon-512.png",
  "/offline.html",
];

// Critical API endpoints
const CRITICAL_APIS = ["/api/prices/cached", "/api/auth/me", "/api/favorites"];

// External CDN domains to cache
const CDN_DOMAINS = [
  "logo.clearbit.com",
  "ui-avatars.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

// Predictive caching patterns
const PREDICTIVE_PATTERNS = {
  "/api/prices/cached": ["/api/prices/refresh", "/api/performance"],
  "/api/auth/me": ["/api/favorites", "/api/history"],
  "/": ["/api/prices/cached", "/api/analytics"],
};

// Performance monitoring with enhanced metrics
let cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  lastReset: Date.now(),
  strategyStats: {
    "cache-first": { hits: 0, misses: 0 },
    "network-first": { hits: 0, misses: 0 },
    "stale-while-revalidate": { hits: 0, misses: 0 },
  },
  contentTypeStats: {},
  priorityStats: {
    critical: { hits: 0, misses: 0 },
    high: { hits: 0, misses: 0 },
    medium: { hits: 0, misses: 0 },
    low: { hits: 0, misses: 0 },
  },
  offlineStats: {
    offlineRequests: 0,
    offlineHits: 0,
    offlineMisses: 0,
    lastOfflineTime: null,
    totalOfflineTime: 0,
  },
};

// Offline state management
let offlineState = {
  isOffline: false,
  lastOnlineTime: Date.now(),
  offlineStartTime: null,
  connectionQuality: "unknown", // good, poor, offline
  pendingRequests: [],
  offlineDataVersion: "v1.0",
};

// Cache warming queue
let cacheWarmingQueue = [];

// Install event - cache static assets with priority
self.addEventListener("install", (event) => {
  console.log(`[SW] Installing Service Worker ${CACHE_VERSION}`);

  event.waitUntil(
    Promise.all([
      // Cache critical assets first
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[SW] Caching critical static assets");
        return cache.addAll(PRIORITY_ASSETS.critical);
      }),
      // Cache high priority assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[SW] Caching high priority assets");
        return cache.addAll(PRIORITY_ASSETS.high);
      }),
      // Cache critical APIs
      caches.open(API_CACHE).then((cache) => {
        console.log("[SW] Caching critical APIs");
        return cache.addAll(CRITICAL_APIS);
      }),
      // Cache offline-specific assets
      caches.open(OFFLINE_CACHE).then((cache) => {
        console.log("[SW] Caching offline assets");
        return cache.addAll(OFFLINE_ASSETS.pages);
      }),
    ])
      .then(() => {
        console.log("[SW] Service Worker installed successfully");
        self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Installation failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log(`[SW] Activating Service Worker ${CACHE_VERSION}`);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service Worker activated successfully");
        self.clients.claim();

        // Start cache warming
        setTimeout(() => {
          warmCache();
        }, 1000);

        // Initialize offline monitoring
        initializeOfflineMonitoring();
      })
      .catch((error) => {
        console.error("[SW] Activation failed:", error);
      })
  );
});

// Fetch event - adaptive caching strategy with offline support
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and non-HTTP(S) requests
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Determine caching strategy based on content type and URL
  const strategy = determineCachingStrategy(request, url);

  // Handle different types of requests with adaptive strategy
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request, strategy));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request, strategy));
  } else if (isCdnRequest(url.hostname)) {
    event.respondWith(handleCdnRequest(request, strategy));
  } else {
    event.respondWith(handleNavigationRequest(request, strategy));
  }
});

// Determine optimal caching strategy based on request characteristics
function determineCachingStrategy(request, url) {
  const contentType = request.headers.get("accept") || "";
  const isImage =
    contentType.includes("image/") ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i);
  const isFont =
    contentType.includes("font/") ||
    url.pathname.match(/\.(woff|woff2|ttf|eot)$/i);
  const isData =
    contentType.includes("application/json") ||
    contentType.includes("application/xml");
  const isCritical = PRIORITY_ASSETS.critical.some((asset) =>
    url.pathname.includes(asset)
  );
  const isHighPriority = PRIORITY_ASSETS.high.some((asset) =>
    url.pathname.includes(asset)
  );

  // Adaptive strategy selection
  if (isCritical) {
    return {
      strategy: "network-first",
      cache: API_CACHE,
      priority: "critical",
    };
  } else if (isHighPriority) {
    return {
      strategy: "stale-while-revalidate",
      cache: STATIC_CACHE,
      priority: "high",
    };
  } else if (isImage) {
    return { strategy: "cache-first", cache: IMAGE_CACHE, priority: "medium" };
  } else if (isFont) {
    return { strategy: "cache-first", cache: FONT_CACHE, priority: "high" };
  } else if (isData) {
    return {
      strategy: "network-first",
      cache: DATA_CACHE,
      priority: "critical",
    };
  } else {
    return {
      strategy: "stale-while-revalidate",
      cache: DYNAMIC_CACHE,
      priority: "medium",
    };
  }
}

// Check if request is for static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    ".css",
    ".js",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
  ];
  return (
    staticExtensions.some((ext) => pathname.endsWith(ext)) ||
    STATIC_ASSETS.includes(pathname)
  );
}

// Check if request is for CDN
function isCdnRequest(hostname) {
  return CDN_DOMAINS.some((domain) => hostname.includes(domain));
}

// Handle API requests with adaptive strategy and offline support
async function handleApiRequest(request, strategy) {
  const cacheKey = `${request.url}?${Date.now()}`;
  const { strategy: cacheStrategy, cache: cacheName, priority } = strategy;

  try {
    if (cacheStrategy === "network-first") {
      return await networkFirstStrategy(request, cacheName, priority);
    } else if (cacheStrategy === "cache-first") {
      return await cacheFirstStrategy(request, cacheName, priority);
    } else {
      return await staleWhileRevalidateStrategy(request, cacheName, priority);
    }
  } catch (error) {
    console.error(`[SW] API request failed: ${request.url}`, error);
    cacheStats.errors++;
    cacheStats.offlineStats.offlineRequests++;

    // Enhanced offline response with fallback data
    return await handleOfflineApiRequest(request);
  }
}

// Handle offline API requests with intelligent fallbacks
async function handleOfflineApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check for specific offline fallback data
  if (OFFLINE_ASSETS.fallback_data[pathname]) {
    cacheStats.offlineStats.offlineHits++;
    console.log(`[SW] Serving offline fallback for: ${pathname}`);

    return new Response(
      JSON.stringify({
        ...OFFLINE_ASSETS.fallback_data[pathname],
        offline: true,
        cachedAt: Date.now(),
        cacheStats: cacheStats.offlineStats,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Offline": "true",
        },
      }
    );
  }

  // Try to get from cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    cacheStats.offlineStats.offlineHits++;
    console.log(`[SW] Serving cached response for: ${pathname}`);

    // Add offline headers to cached response
    const responseBody = await cachedResponse.text();
    const responseData = JSON.parse(responseBody);

    return new Response(
      JSON.stringify({
        ...responseData,
        offline: true,
        cachedAt: Date.now(),
        cacheStats: cacheStats.offlineStats,
      }),
      {
        status: cachedResponse.status,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          "X-Offline": "true",
          "X-Cached-At":
            cachedResponse.headers.get("sw-cache-timestamp") ||
            Date.now().toString(),
        },
      }
    );
  }

  // Generic offline response
  cacheStats.offlineStats.offlineMisses++;
  console.log(`[SW] No offline data available for: ${pathname}`);

  return new Response(
    JSON.stringify({
      error: "Offline - No cached data available",
      message: "Please check your internet connection and try again",
      timestamp: Date.now(),
      cacheStats: cacheStats.offlineStats,
      offline: true,
      path: pathname,
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Offline": "true",
      },
    }
  );
}

// Network-first strategy with offline detection
async function networkFirstStrategy(request, cacheName, priority) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();

      // Add cache metadata
      const metadata = {
        timestamp: Date.now(),
        maxAge:
          CACHE_CONFIG[cacheName.split("-")[1]]?.maxAge ||
          CACHE_CONFIG.api.maxAge,
        priority,
        strategy: "network-first",
      };

      const responseWithMetadata = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers.entries()),
          "sw-cache-timestamp": metadata.timestamp.toString(),
          "sw-cache-max-age": metadata.maxAge.toString(),
          "sw-cache-priority": metadata.priority,
          "sw-cache-strategy": metadata.strategy,
        },
      });

      cache.put(request, responseWithMetadata);
      updateStats("network-first", "hits", priority);

      // Trigger predictive caching
      triggerPredictiveCaching(request.url);

      // Update offline state
      updateOfflineState(false);

      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log(`[SW] Network failed, trying cache: ${request.url}`);
    updateStats("network-first", "misses", priority);

    // Update offline state
    updateOfflineState(true);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`[SW] Serving from cache: ${request.url}`);
      return cachedResponse;
    }

    throw error;
  }
}

// Cache-first strategy
async function cacheFirstStrategy(request, cacheName, priority) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      updateStats("cache-first", "hits", priority);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      updateStats("cache-first", "hits", priority);
    }

    return networkResponse;
  } catch (error) {
    updateStats("cache-first", "misses", priority);
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request, cacheName, priority) {
  try {
    const cachedResponse = await caches.match(request);

    // Return cached response immediately if available
    if (cachedResponse) {
      updateStats("stale-while-revalidate", "hits", priority);

      // Update cache in background
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(cacheName).then((cache) => {
              cache.put(request, response);
            });
          }
        })
        .catch(() => {
          // Ignore background fetch errors
        });

      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      updateStats("stale-while-revalidate", "hits", priority);
    }

    return networkResponse;
  } catch (error) {
    updateStats("stale-while-revalidate", "misses", priority);
    throw error;
  }
}

// Handle static assets with adaptive strategy
async function handleStaticRequest(request, strategy) {
  const { strategy: cacheStrategy, cache: cacheName, priority } = strategy;

  try {
    if (cacheStrategy === "cache-first") {
      return await cacheFirstStrategy(request, cacheName, priority);
    } else {
      return await staleWhileRevalidateStrategy(request, cacheName, priority);
    }
  } catch (error) {
    cacheStats.errors++;
    console.error(`[SW] Static asset fetch failed: ${request.url}`, error);

    // Return placeholder for failed static assets
    if (request.url.includes(".png") || request.url.includes(".jpg")) {
      return new Response(
        `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" fill="#f3f4f6"/>
          <text x="16" y="20" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">?</text>
        </svg>`,
        {
          headers: { "Content-Type": "image/svg+xml" },
        }
      );
    }

    throw error;
  }
}

// Handle CDN requests with adaptive strategy
async function handleCdnRequest(request, strategy) {
  const { strategy: cacheStrategy, cache: cacheName, priority } = strategy;

  try {
    if (cacheStrategy === "stale-while-revalidate") {
      return await staleWhileRevalidateStrategy(request, cacheName, priority);
    } else {
      return await cacheFirstStrategy(request, cacheName, priority);
    }
  } catch (error) {
    cacheStats.errors++;
    console.error(`[SW] CDN fetch failed: ${request.url}`, error);

    // Return placeholder for failed CDN requests
    if (request.url.includes("logo.clearbit.com")) {
      return new Response(
        `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" fill="#f3f4f6"/>
          <text x="16" y="20" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">?</text>
        </svg>`,
        {
          headers: { "Content-Type": "image/svg+xml" },
        }
      );
    }

    throw error;
  }
}

// Handle navigation requests with enhanced offline support
async function handleNavigationRequest(request, strategy) {
  const { strategy: cacheStrategy, cache: cacheName, priority } = strategy;

  try {
    if (cacheStrategy === "network-first") {
      return await networkFirstStrategy(request, cacheName, priority);
    } else {
      return await staleWhileRevalidateStrategy(request, cacheName, priority);
    }
  } catch (error) {
    // Enhanced offline navigation handling
    return await handleOfflineNavigation(request);
  }
}

// Handle offline navigation with intelligent fallbacks
async function handleOfflineNavigation(request) {
  const url = new URL(request.url);

  // Try to get cached version of the requested page
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log(`[SW] Serving cached page: ${url.pathname}`);
    return cachedResponse;
  }

  // Try to get cached home page
  const homeResponse = await caches.match("/");
  if (homeResponse) {
    console.log(`[SW] Serving cached home page for: ${url.pathname}`);
    return homeResponse;
  }

  // Return enhanced offline page
  console.log(`[SW] Serving offline page for: ${url.pathname}`);
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - PreMarketPrice</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .offline-container {
                background: rgba(255, 255, 255, 0.1);
                padding: 2rem;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                max-width: 500px;
            }
            .offline-message { 
                color: white; 
                margin: 20px 0; 
                line-height: 1.6;
            }
            .retry-button {
                background: linear-gradient(45deg, #ffd700, #ffed4e);
                color: #333;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 1rem;
            }
            .offline-stats {
                margin-top: 1rem;
                font-size: 0.9rem;
                opacity: 0.8;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <h1>PreMarketPrice</h1>
            <div class="offline-message">
                <h2>Ste offline</h2>
                <p>Vaše internetové pripojenie nie je dostupné.</p>
                <p>Skontrolujte svoje pripojenie a skúste to znova.</p>
                <div class="offline-stats">
                    <p>Offline požiadavky: ${cacheStats.offlineStats.offlineRequests}</p>
                    <p>Cache hits: ${cacheStats.offlineStats.offlineHits}</p>
                    <p>Cache misses: ${cacheStats.offlineStats.offlineMisses}</p>
                </div>
            </div>
            <button class="retry-button" onclick="window.location.reload()">
                Skúsiť znova
            </button>
        </div>
        <script>
            // Auto-retry when connection is restored
            window.addEventListener('online', () => {
                window.location.reload();
            });
            
            // Check connection every 5 seconds
            setInterval(() => {
                if (navigator.onLine) {
                    window.location.reload();
                }
            }, 5000);
        </script>
    </body>
    </html>`,
    {
      headers: {
        "Content-Type": "text/html",
        "X-Offline": "true",
      },
    }
  );
}

// Update cache statistics
function updateStats(strategy, type, priority) {
  cacheStats[type]++;
  cacheStats.strategyStats[strategy][type]++;
  cacheStats.priorityStats[priority][type]++;

  // Update content type stats
  if (!cacheStats.contentTypeStats[strategy]) {
    cacheStats.contentTypeStats[strategy] = { hits: 0, misses: 0 };
  }
  cacheStats.contentTypeStats[strategy][type]++;
}

// Update offline state
function updateOfflineState(isOffline) {
  const now = Date.now();

  if (isOffline && !offlineState.isOffline) {
    // Going offline
    offlineState.isOffline = true;
    offlineState.offlineStartTime = now;
    offlineState.connectionQuality = "offline";

    console.log("[SW] Going offline");

    // Notify clients about offline state
    notifyClients({
      type: "OFFLINE_STATE_CHANGED",
      isOffline: true,
      timestamp: now,
    });
  } else if (!isOffline && offlineState.isOffline) {
    // Going online
    offlineState.isOffline = false;
    offlineState.lastOnlineTime = now;
    offlineState.connectionQuality = "good";

    if (offlineState.offlineStartTime) {
      const offlineDuration = now - offlineState.offlineStartTime;
      offlineState.totalOfflineTime += offlineDuration;
      cacheStats.offlineStats.lastOfflineTime = offlineDuration;
    }

    console.log("[SW] Going online");

    // Notify clients about online state
    notifyClients({
      type: "OFFLINE_STATE_CHANGED",
      isOffline: false,
      timestamp: now,
    });

    // Trigger background sync
    triggerBackgroundSync();
  }
}

// Initialize offline monitoring
function initializeOfflineMonitoring() {
  // Monitor connection quality
  setInterval(async () => {
    try {
      const response = await fetch("/api/prices/cached", {
        method: "HEAD",
        cache: "no-cache",
      });

      if (response.ok) {
        updateOfflineState(false);
      } else {
        updateOfflineState(true);
      }
    } catch (error) {
      updateOfflineState(true);
    }
  }, 30000); // Check every 30 seconds
}

// Notify clients about state changes
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// Trigger background sync when coming back online
function triggerBackgroundSync() {
  self.registration.sync?.register("background-sync").catch(() => {
    // Background sync not supported, trigger manually
    setTimeout(() => {
      doBackgroundSync();
    }, 1000);
  });
}

// Trigger predictive caching based on current request
function triggerPredictiveCaching(currentUrl) {
  const patterns = PREDICTIVE_PATTERNS[currentUrl] || [];

  patterns.forEach(async (predictedUrl) => {
    if (!cacheWarmingQueue.includes(predictedUrl)) {
      cacheWarmingQueue.push(predictedUrl);

      // Warm cache in background
      setTimeout(async () => {
        try {
          const response = await fetch(predictedUrl);
          if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(predictedUrl, response.clone());
            console.log(`[SW] Predictive cache warmed: ${predictedUrl}`);
          }
        } catch (error) {
          console.log(`[SW] Predictive cache warming failed: ${predictedUrl}`);
        } finally {
          cacheWarmingQueue = cacheWarmingQueue.filter(
            (url) => url !== predictedUrl
          );
        }
      }, 1000);
    }
  });
}

// Cache warming function
async function warmCache() {
  console.log("[SW] Starting cache warming...");

  const warmingUrls = [
    ...PRIORITY_ASSETS.critical,
    ...PRIORITY_ASSETS.high,
    ...CRITICAL_APIS,
  ];

  for (const url of warmingUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const strategy = determineCachingStrategy(
          new Request(url),
          new URL(url, self.location.origin)
        );
        const cache = await caches.open(strategy.cache);
        cache.put(url, response.clone());
        console.log(`[SW] Cache warmed: ${url}`);
      }
    } catch (error) {
      console.log(`[SW] Cache warming failed: ${url}`);
    }
  }

  console.log("[SW] Cache warming completed");
}

// Background sync for offline data
self.addEventListener("sync", (event) => {
  console.log(`[SW] Background sync triggered: ${event.tag}`);

  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === "cache-cleanup") {
    event.waitUntil(cleanupOldCaches());
  } else if (event.tag === "cache-warming") {
    event.waitUntil(warmCache());
  } else if (event.tag === "offline-data-sync") {
    event.waitUntil(syncOfflineData());
  }
});

async function doBackgroundSync() {
  try {
    console.log("[SW] Starting background sync...");

    // Sync critical data when connection is restored
    const promises = CRITICAL_APIS.map(async (api) => {
      try {
        const response = await fetch(`${api}?refresh=true`);
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          cache.put(api, response.clone());
          console.log(`[SW] Synced: ${api}`);
        }
      } catch (error) {
        console.error(`[SW] Sync failed for ${api}:`, error);
      }
    });

    await Promise.all(promises);
    console.log("[SW] Background sync completed");

    // Send notification to client
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_COMPLETED",
          timestamp: Date.now(),
        });
      });
    });
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    console.log("[SW] Starting offline data sync...");

    // Process pending requests
    for (const pendingRequest of offlineState.pendingRequests) {
      try {
        const response = await fetch(
          pendingRequest.url,
          pendingRequest.options
        );
        if (response.ok) {
          console.log(`[SW] Synced pending request: ${pendingRequest.url}`);
        }
      } catch (error) {
        console.error(
          `[SW] Failed to sync pending request: ${pendingRequest.url}`,
          error
        );
      }
    }

    // Clear pending requests
    offlineState.pendingRequests = [];

    console.log("[SW] Offline data sync completed");
  } catch (error) {
    console.error("[SW] Offline data sync failed:", error);
  }
}

// Enhanced cleanup with priority-based retention
async function cleanupOldCaches() {
  console.log("[SW] Starting enhanced cache cleanup...");

  const cacheNames = [
    STATIC_CACHE,
    DYNAMIC_CACHE,
    API_CACHE,
    IMAGE_CACHE,
    FONT_CACHE,
    DATA_CACHE,
    OFFLINE_CACHE,
  ];

  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const config =
        CACHE_CONFIG[cacheName.split("-")[1]] || CACHE_CONFIG.dynamic;

      const now = Date.now();
      let deletedCount = 0;
      let retainedCount = 0;

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const timestamp = response.headers.get("sw-cache-timestamp");
          const priority =
            response.headers.get("sw-cache-priority") || "medium";

          if (timestamp) {
            const age = now - parseInt(timestamp);
            const maxAge = config.maxAge;

            // Priority-based retention - critical items get longer retention
            const priorityMultiplier =
              priority === "critical" ? 2 : priority === "high" ? 1.5 : 1;
            const adjustedMaxAge = maxAge * priorityMultiplier;

            if (age > adjustedMaxAge) {
              await cache.delete(request);
              deletedCount++;
            } else {
              retainedCount++;
            }
          }
        }
      }

      console.log(
        `[SW] Cleaned ${deletedCount} entries, retained ${retainedCount} from ${cacheName}`
      );
    } catch (error) {
      console.error(`[SW] Cleanup failed for ${cacheName}:`, error);
    }
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: event.data ? event.data.text() : "New market data available",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "view",
        title: "View Data",
        icon: "/icon-192.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/icon-192.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("PreMarketPrice", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "view") {
    event.waitUntil(self.clients.openWindow("/"));
  }
});

// Handle messages from client
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "GET_CACHE_STATS") {
    event.ports[0].postMessage({
      type: "CACHE_STATS",
      stats: cacheStats,
    });
  } else if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(clearAllCaches());
  } else if (event.data && event.data.type === "WARM_CACHE") {
    event.waitUntil(warmCache());
  } else if (event.data && event.data.type === "GET_OFFLINE_STATE") {
    event.ports[0].postMessage({
      type: "OFFLINE_STATE",
      state: offlineState,
    });
  } else if (event.data && event.data.type === "ADD_PENDING_REQUEST") {
    offlineState.pendingRequests.push(event.data.request);
  }
});

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    // Reset stats
    cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
      lastReset: Date.now(),
      strategyStats: {
        "cache-first": { hits: 0, misses: 0 },
        "network-first": { hits: 0, misses: 0 },
        "stale-while-revalidate": { hits: 0, misses: 0 },
      },
      contentTypeStats: {},
      priorityStats: {
        critical: { hits: 0, misses: 0 },
        high: { hits: 0, misses: 0 },
        medium: { hits: 0, misses: 0 },
        low: { hits: 0, misses: 0 },
      },
      offlineStats: {
        offlineRequests: 0,
        offlineHits: 0,
        offlineMisses: 0,
        lastOfflineTime: null,
        totalOfflineTime: 0,
      },
    };

    // Reset offline state
    offlineState = {
      isOffline: false,
      lastOnlineTime: Date.now(),
      offlineStartTime: null,
      connectionQuality: "unknown",
      pendingRequests: [],
      offlineDataVersion: "v1.0",
    };

    console.log("[SW] All caches cleared");
  } catch (error) {
    console.error("[SW] Cache clear failed:", error);
  }
}

// Periodic cache cleanup (every 24 hours)
setInterval(() => {
  cleanupOldCaches();
}, 24 * 60 * 60 * 1000);

// Reset cache stats daily
setInterval(() => {
  cacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    lastReset: Date.now(),
    strategyStats: {
      "cache-first": { hits: 0, misses: 0 },
      "network-first": { hits: 0, misses: 0 },
      "stale-while-revalidate": { hits: 0, misses: 0 },
    },
    contentTypeStats: {},
    priorityStats: {
      critical: { hits: 0, misses: 0 },
      high: { hits: 0, misses: 0 },
      medium: { hits: 0, misses: 0 },
      low: { hits: 0, misses: 0 },
    },
    offlineStats: {
      offlineRequests: 0,
      offlineHits: 0,
      offlineMisses: 0,
      lastOfflineTime: null,
      totalOfflineTime: 0,
    },
  };
  console.log("[SW] Cache stats reset");
}, 24 * 60 * 60 * 1000);

// Periodic cache warming (every 6 hours)
setInterval(() => {
  warmCache();
}, 6 * 60 * 60 * 1000);
