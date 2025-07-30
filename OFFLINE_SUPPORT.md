# Offline Support - Podpora offline režimu

## Prehľad

Tento dokument popisuje implementované pokročilé offline funkcie v Service Worker pre aplikáciu PreMarketPrice, ktoré umožňujú plnú funkcionalnosť aj bez internetového pripojenia.

## Verzia

**v3.1.0** - Pokročilé offline funkcie s inteligentným offline managementom

## Implementované offline funkcie

### 1. Offline Detection - Detekcia offline stavu

#### Automatická detekcia
- **Connection Quality Monitoring** - Monitorovanie kvality pripojenia
- **Periodic Health Checks** - Periodické kontroly zdravia pripojenia
- **Browser Events** - Sledovanie browser online/offline eventov
- **Network API Integration** - Integrácia s Network Information API

```javascript
// Offline state management
let offlineState = {
  isOffline: false,
  lastOnlineTime: Date.now(),
  offlineStartTime: null,
  connectionQuality: "unknown", // good, poor, offline
  pendingRequests: [],
  offlineDataVersion: "v1.0",
};

// Initialize offline monitoring
function initializeOfflineMonitoring() {
  // Monitor connection quality
  setInterval(async () => {
    try {
      const response = await fetch("/api/prices/cached", { 
        method: "HEAD",
        cache: "no-cache" 
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
```

#### Connection Quality Levels
- **Good** - Normálne pripojenie, všetky funkcie dostupné
- **Poor** - Slabé pripojenie, obmedzené funkcie
- **Offline** - Žiadne pripojenie, offline režim

### 2. Offline Data Management - Správa offline dát

#### Offline Data Store
- **Memory Storage** - Rýchle prístupné dáta v pamäti
- **localStorage Backup** - Zálohovanie v localStorage
- **TTL Support** - Podpora pre Time-To-Live
- **Priority-based Storage** - Uchovávanie podľa priority

```javascript
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
    
    return true;
  } catch (error) {
    return false;
  }
}
```

#### Offline Data Types
- **Critical Data** - Kritické dáta (TTL: 1 hodina)
- **High Priority Data** - Vysoká priorita (TTL: 6 hodín)
- **Medium Priority Data** - Stredná priorita (TTL: 24 hodín)
- **Low Priority Data** - Nízka priorita (TTL: 7 dní)

### 3. Offline-First Strategies - Offline-first stratégie

#### Network-First with Offline Fallback
Pre kritické API požiadavky:
```javascript
async function handleOfflineApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check for specific offline fallback data
  if (OFFLINE_ASSETS.fallback_data[pathname]) {
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
          "X-Offline": "true",
        },
      }
    );
  }

  // Try to get from cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return new Response(
      JSON.stringify({
        ...JSON.parse(await cachedResponse.text()),
        offline: true,
        cachedAt: Date.now(),
      }),
      {
        status: cachedResponse.status,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          "X-Offline": "true",
        },
      }
    );
  }

  // Generic offline response
  return new Response(
    JSON.stringify({
      error: "Offline - No cached data available",
      message: "Please check your internet connection and try again",
      timestamp: Date.now(),
      offline: true,
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "X-Offline": "true",
      },
    }
  );
}
```

#### Cache-First for Static Assets
Pre statické zdroje:
```javascript
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
    }

    return networkResponse;
  } catch (error) {
    // Return placeholder for failed assets
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
}
```

### 4. Enhanced Offline Navigation - Rozšírená offline navigácia

#### Intelligent Fallbacks
```javascript
async function handleOfflineNavigation(request) {
  const url = new URL(request.url);
  
  // Try to get cached version of the requested page
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Try to get cached home page
  const homeResponse = await caches.match("/");
  if (homeResponse) {
    return homeResponse;
  }

  // Return enhanced offline page
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
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
```

### 5. Background Sync - Synchronizácia v pozadí

#### Pending Requests Queue
```javascript
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
    return true;
  } catch (error) {
    return false;
  }
}

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    console.log("[SW] Starting offline data sync...");
    
    // Process pending requests
    for (const pendingRequest of offlineState.pendingRequests) {
      try {
        const response = await fetch(pendingRequest.url, pendingRequest.options);
        if (response.ok) {
          console.log(`[SW] Synced pending request: ${pendingRequest.url}`);
        }
      } catch (error) {
        console.error(`[SW] Failed to sync pending request: ${pendingRequest.url}`, error);
      }
    }
    
    // Clear pending requests
    offlineState.pendingRequests = [];
    
    console.log("[SW] Offline data sync completed");
  } catch (error) {
    console.error("[SW] Offline data sync failed:", error);
  }
}
```

### 6. Offline Analytics - Offline analytika

#### Enhanced Performance Monitoring
```javascript
let cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  lastReset: Date.now(),
  strategyStats: {
    'cache-first': { hits: 0, misses: 0 },
    'network-first': { hits: 0, misses: 0 },
    'stale-while-revalidate': { hits: 0, misses: 0 }
  },
  priorityStats: {
    critical: { hits: 0, misses: 0 },
    high: { hits: 0, misses: 0 },
    medium: { hits: 0, misses: 0 },
    low: { hits: 0, misses: 0 }
  },
  offlineStats: {
    offlineRequests: 0,
    offlineHits: 0,
    offlineMisses: 0,
    lastOfflineTime: null,
    totalOfflineTime: 0,
  },
};
```

#### Offline State Tracking
```javascript
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
```

### 7. Offline Notifications - Offline notifikácie

#### State Change Notifications
```javascript
// Notify clients about state changes
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// Update offline state
function updateOfflineState(isOffline) {
  const now = Date.now();
  
  if (isOffline && !offlineState.isOffline) {
    // Going offline
    offlineState.isOffline = true;
    offlineState.offlineStartTime = now;
    offlineState.connectionQuality = "offline";
    
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
```

## Použitie

### Service Worker Manager

```typescript
import { swManager } from '@/lib/sw-register';

// Získanie offline stavu
const offlineState = await swManager.getOfflineState();
console.log('Offline state:', offlineState);

// Uloženie offline dát
await swManager.storeOfflineData('user-preferences', {
  theme: 'dark',
  language: 'sk'
}, 'high', 24 * 60 * 60 * 1000); // 24 hodín

// Získanie offline dát
const userPrefs = await swManager.getOfflineData('user-preferences');

// Pridanie čakajúcej požiadavky
await swManager.addPendingRequest('/api/favorites', {
  method: 'POST',
  body: JSON.stringify({ symbol: 'AAPL' })
});

// Sledovanie offline stavu
const unsubscribe = swManager.onOfflineStateChange((state) => {
  console.log('Offline state changed:', state);
});
```

### OfflineStatus Component

```tsx
import OfflineStatus from '@/components/OfflineStatus';

// V React komponente
<OfflineStatus className="my-4" />
```

### Offline Data Management

```typescript
// Store critical data for offline use
await swManager.storeOfflineData('stock-data', {
  symbols: ['AAPL', 'GOOGL', 'MSFT'],
  lastUpdate: Date.now(),
  data: stockData
}, 'critical', 60 * 60 * 1000); // 1 hodina

// Store user preferences
await swManager.storeOfflineData('user-settings', {
  theme: 'dark',
  notifications: true,
  language: 'sk'
}, 'high', 7 * 24 * 60 * 60 * 1000); // 7 dní

// Store temporary data
await swManager.storeOfflineData('temp-cache', {
  searchResults: results,
  filters: activeFilters
}, 'medium', 30 * 60 * 1000); // 30 minút
```

## Offline Capabilities

### 1. Full Offline Navigation
- ✅ Navigácia po všetkých cachovaných stránkach
- ✅ Offline stránka s informáciami o stave
- ✅ Automatické obnovenie pri obnovení pripojenia

### 2. Offline Data Access
- ✅ Zobrazenie cachovaných dát akcií
- ✅ Prístup k obľúbeným akciám
- ✅ Užívateľské nastavenia
- ✅ Offline analytické dáta

### 3. Offline-First Features
- ✅ Inteligentné fallbacky pre všetky API
- ✅ Offline data storage s TTL
- ✅ Priority-based data management
- ✅ Background sync pri obnovení pripojenia

### 4. Enhanced User Experience
- ✅ Real-time offline status indikátor
- ✅ Offline notifikácie
- ✅ Automatická synchronizácia
- ✅ Offline analytics a monitoring

## Testovanie

### 1. Testovanie offline detekcie

```javascript
// V DevTools Console
// Simulácia offline stavu
navigator.serviceWorker.controller.postMessage({ 
  type: 'SIMULATE_OFFLINE' 
});

// Kontrola offline stavu
const state = await swManager.getOfflineState();
console.log('Offline state:', state);
```

### 2. Testovanie offline navigácie

1. Otvoriť DevTools
2. Prejsť na Network tab
3. Nastaviť "Offline"
4. Navigovať po aplikácii
5. Skontrolovať offline stránky

### 3. Testovanie offline dát

```javascript
// Store test data
await swManager.storeOfflineData('test-data', {
  message: 'Test offline data',
  timestamp: Date.now()
}, 'critical');

// Retrieve test data
const data = await swManager.getOfflineData('test-data');
console.log('Offline data:', data);

// Clear test data
await swManager.clearOfflineData('test-data');
```

### 4. Testovanie background sync

```javascript
// Add pending request
await swManager.addPendingRequest('/api/test', {
  method: 'POST',
  body: JSON.stringify({ test: true })
});

// Check pending requests
const state = await swManager.getOfflineState();
console.log('Pending requests:', state.pendingRequests);
```

## Monitoring a Analytics

### Offline Performance Metrics

- **Offline Requests** - Počet offline požiadaviek
- **Offline Hit Rate** - Pomer úspešných offline odpovedí
- **Offline Duration** - Celkový čas offline
- **Sync Success Rate** - Úspešnosť synchronizácie

### Real-time Monitoring

OfflineStatus komponent zobrazuje:
- Aktuálny stav pripojenia
- Kvalitu pripojenia
- Offline dáta a ich TTL
- Čakajúce požiadavky
- Offline možnosti

## Optimalizácie

### 1. Performance Optimizations

- **Memory-first Storage** - Rýchle prístupné dáta v pamäti
- **Lazy Loading** - Načítanie offline dát na požiadanie
- **Background Sync** - Synchronizácia v pozadí
- **Intelligent Caching** - Inteligentné cachovanie podľa priority

### 2. Storage Optimizations

- **TTL Management** - Automatické čistenie expirovaných dát
- **Priority-based Retention** - Dlhšie uchovávanie kritických dát
- **localStorage Backup** - Zálohovanie v localStorage
- **Size Limits** - Obmedzenie veľkosti offline dát

### 3. Network Optimizations

- **Connection Quality Detection** - Detekcia kvality pripojenia
- **Adaptive Strategies** - Prispôsobenie stratégií podľa pripojenia
- **Background Sync** - Synchronizácia pri obnovení pripojenia
- **Pending Requests Queue** - Fronta čakajúcich požiadaviek

## Budúce vylepšenia

1. **Offline Database** - IndexedDB pre komplexné offline dáta
2. **Conflict Resolution** - Riešenie konfliktov pri synchronizácii
3. **Offline Analytics** - Pokročilé offline analytické nástroje
4. **Cross-Device Sync** - Synchronizácia medzi zariadeniami
5. **Offline Machine Learning** - ML modely pre offline predikcie

## Záver

Implementované offline funkcie poskytujú:

- **Plnú offline funkcionalnosť** - Aplikácia funguje aj bez pripojenia
- **Inteligentné offline management** - Automatická správa offline dát
- **Enhanced user experience** - Lepšia UX v offline režime
- **Real-time monitoring** - Sledovanie offline stavu v reálnom čase
- **Automatic synchronization** - Automatická synchronizácia pri obnovení pripojenia

Tieto funkcie zabezpečujú, že aplikácia je plne funkčná aj bez internetového pripojenia a poskytuje používateľom plynulú skúsenosť bez ohľadu na stav pripojenia. 