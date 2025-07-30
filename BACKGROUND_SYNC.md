# Background Sync - Synchronizácia v pozadí

## Prehľad

Tento dokument popisuje implementáciu pokročilých background sync funkcií v aplikácii PreMarketPrice, ktoré zabezpečujú automatickú synchronizáciu dát v pozadí a offline data management.

## Verzia

**v3.1.0** - Pokročilé background sync funkcie s inteligentným offline managementom

## Implementované background sync funkcie

### 1. Service Worker Background Sync

#### Automatická synchronizácia pri obnovení pripojenia

```javascript
// Trigger background sync when coming back online
function triggerBackgroundSync() {
  self.registration.sync?.register("background-sync").catch(() => {
    // Background sync not supported, trigger manually
    setTimeout(() => {
      doBackgroundSync();
    }, 1000);
  });
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
```

#### Kritické API synchronizácie

```javascript
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
```

### 2. Offline Data Synchronizácia

#### Pending Requests Queue

```javascript
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
```

#### Pridávanie čakajúcich požiadaviek

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
    console.log(`[SW Manager] Added pending request: ${url}`);
    return true;
  } catch (error) {
    console.error('[SW Manager] Failed to add pending request:', error);
    return false;
  }
}
```

### 3. Background Data Service

#### Automatické aktualizácie dát

```typescript
class BackgroundDataService {
  private cache: typeof stockDataCache;
  private config: BackgroundServiceConfig;
  private isRunning: boolean = false;
  private updateTimer?: NodeJS.Timeout;
  private lastUpdateTime: Date = new Date();
  private updateCount: number = 0;
  private errorCount: number = 0;

  /**
   * Start the background service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("🔄 Background service is already running");
      return;
    }

    console.log("🚀 Starting background data service...");
    this.isRunning = true;

    // Initial update
    await this.performUpdate();

    // Schedule regular updates
    this.scheduleNextUpdate();

    console.log(
      `✅ Background service started - updates every ${
        this.config.updateInterval / 1000
      }s`
    );
  }

  /**
   * Perform a single update cycle
   */
  private async performUpdate(): Promise<void> {
    const startTime = Date.now();
    console.log(
      `🔄 Starting background update #${++this
        .updateCount} at ${new Date().toISOString()}`
    );

    try {
      // Update cache with new data
      await this.cache.updateCache();

      // Update last update time
      this.lastUpdateTime = new Date();

      // Store update status in Redis
      await this.storeUpdateStatus({
        lastUpdate: this.lastUpdateTime.toISOString(),
        updateCount: this.updateCount,
        errorCount: this.errorCount,
        isRunning: this.isRunning,
        nextUpdate: new Date(
          Date.now() + this.config.updateInterval
        ).toISOString(),
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Background update completed in ${duration}ms`);
    } catch (error) {
      this.errorCount++;
      console.error("❌ Background update failed:", error);

      // Retry logic
      if (this.errorCount <= this.config.maxRetries) {
        console.log(
          `🔄 Retrying in ${this.config.retryDelay}ms (attempt ${this.errorCount}/${this.config.maxRetries})`
        );
        setTimeout(() => this.performUpdate(), this.config.retryDelay);
      } else {
        console.error("❌ Max retries exceeded, stopping background service");
        this.stop();
      }
    }
  }
}
```

#### Konfigurácia background service

```typescript
// Default configuration
const DEFAULT_CONFIG: BackgroundServiceConfig = {
  updateInterval: 5 * 60 * 1000, // 5 minutes
  batchSize: 50,
  maxRetries: 3,
  retryDelay: 30 * 1000, // 30 seconds
};
```

### 4. API Endpoints pre Background Sync

#### Kontrola background service

```typescript
// src/app/api/background/control/route.ts
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    const service = getBackgroundService();

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: "Background service not initialized",
        },
        { status: 404 }
      );
    }

    switch (action) {
      case "start":
        await service.start();
        return NextResponse.json({
          success: true,
          message: "Background service started",
        });

      case "stop":
        service.stop();
        return NextResponse.json({
          success: true,
          message: "Background service stopped",
        });

      case "force-update":
        await service.forceUpdate();
        return NextResponse.json({
          success: true,
          message: "Forced background update completed",
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action. Use: start, stop, or force-update",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error controlling background service:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to control background service",
      },
      { status: 500 }
    );
  }
}
```

#### Status background service

```typescript
// src/app/api/background/status/route.ts
export async function GET(request: NextRequest) {
  try {
    const service = getBackgroundService();

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: "Background service not initialized",
        },
        { status: 404 }
      );
    }

    const status = await service.getStatus();
    const stats = service.getStats();

    return NextResponse.json({
      success: true,
      data: {
        status,
        stats,
      },
    });
  } catch (error) {
    console.error("Error getting background service status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get background service status",
      },
      { status: 500 }
    );
  }
}
```

### 5. Service Worker Manager Integration

#### Background sync registrácia

```typescript
// Background sync registration
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

// Export function
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  return await swManager.registerBackgroundSync(tag);
}
```

#### Automatická synchronizácia pri obnovení pripojenia

```typescript
// Initialize PWA features
export async function initializePWA() {
  if (typeof window === "undefined") return;

  console.log("[SW Manager] Initializing PWA features...");

  // Register service worker
  await swManager.register();

  // Monitor online/offline status
  window.addEventListener("online", () => {
    console.log("[SW Manager] App is online");
    // Trigger background sync when connection is restored
    registerBackgroundSync("background-sync");
  });

  window.addEventListener("offline", () => {
    console.log("[SW Manager] App is offline");
  });

  console.log("[SW Manager] PWA features initialized");
}
```

## Použitie

### 1. Automatická synchronizácia

Background sync sa spúšťa automaticky:

- **Pri obnovení internetového pripojenia**
- **Každých 5 minút** pre background data service
- **Pri offline data sync** - synchronizácia čakajúcich požiadaviek

### 2. Manuálna kontrola

```typescript
// Spustenie background service
const response = await fetch("/api/background/control", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "start" }),
});

// Zastavenie background service
const response = await fetch("/api/background/control", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "stop" }),
});

// Vynútenie aktualizácie
const response = await fetch("/api/background/control", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "force-update" }),
});
```

### 3. Kontrola statusu

```typescript
// Získanie statusu background service
const response = await fetch("/api/background/status");
const { data } = await response.json();

console.log("Background service status:", data.status);
console.log("Background service stats:", data.stats);
```

### 4. Pridávanie čakajúcich požiadaviek

```typescript
import { swManager } from "@/lib/sw-register";

// Pridanie požiadavky do fronty pre synchronizáciu
await swManager.addPendingRequest("/api/favorites", {
  method: "POST",
  body: JSON.stringify({ symbol: "AAPL" }),
});

// Registrácia background sync
await swManager.registerBackgroundSync("offline-data-sync");
```

## Background Sync Typy

### 1. **background-sync**

- Automatická synchronizácia kritických API
- Spúšťa sa pri obnovení pripojenia
- Synchronizuje cache s najnovšími dátami

### 2. **cache-cleanup**

- Čistenie starých cache záznamov
- Optimalizácia úložného priestoru
- Priority-based retention

### 3. **cache-warming**

- Prediktívne načítanie často používaných dát
- Zlepšenie performance
- Inteligentné cache management

### 4. **offline-data-sync**

- Synchronizácia offline dát
- Spracovanie čakajúcich požiadaviek
- Conflict resolution

## Monitoring a Analytics

### Background Service Metrics

```typescript
interface BackgroundServiceStats {
  isRunning: boolean;
  updateCount: number;
  errorCount: number;
  lastUpdateTime: Date;
  config: BackgroundServiceConfig;
}
```

### Sync Performance Metrics

- **Sync Success Rate** - Úspešnosť synchronizácie
- **Sync Duration** - Čas trvania synchronizácie
- **Pending Requests Count** - Počet čakajúcich požiadaviek
- **Error Rate** - Miera chýb pri synchronizácii

### Real-time Monitoring

```typescript
// Monitorovanie background sync
swManager.onOfflineStateChange((state) => {
  if (!state.isOffline) {
    console.log("Connection restored, triggering background sync...");
    registerBackgroundSync("background-sync");
  }
});

// Monitorovanie sync completion
navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_COMPLETED") {
    console.log("Background sync completed:", event.data.timestamp);
  }
});
```

## Optimalizácie

### 1. Performance Optimizations

- **Batch Processing** - Spracovanie požiadaviek v dávkach
- **Retry Logic** - Automatické opakovanie pri chybách
- **Exponential Backoff** - Postupné zvyšovanie času medzi pokusmi
- **Priority-based Sync** - Synchronizácia podľa priority

### 2. Network Optimizations

- **Connection Quality Detection** - Detekcia kvality pripojenia
- **Adaptive Sync Intervals** - Prispôsobenie intervalov podľa pripojenia
- **Background Sync API** - Využitie natívnych browser API
- **Fallback Mechanisms** - Zálohové mechanizmy pre staršie browsery

### 3. Storage Optimizations

- **Redis Integration** - Perzistentné ukladanie statusu
- **Cache Management** - Inteligentné správa cache
- **Data Compression** - Kompresia synchronizovaných dát
- **Conflict Resolution** - Riešenie konfliktov pri synchronizácii

## Testovanie

### 1. Testovanie automatickej synchronizácie

```javascript
// Simulácia obnovenia pripojenia
window.dispatchEvent(new Event("online"));

// Kontrola background sync
setTimeout(async () => {
  const response = await fetch("/api/background/status");
  const { data } = await response.json();
  console.log("Background sync status:", data);
}, 5000);
```

### 2. Testovanie offline data sync

```javascript
// Pridanie testovej požiadavky
await swManager.addPendingRequest("/api/test", {
  method: "POST",
  body: JSON.stringify({ test: true }),
});

// Kontrola čakajúcich požiadaviek
const state = await swManager.getOfflineState();
console.log("Pending requests:", state.pendingRequests);
```

### 3. Testovanie background service

```javascript
// Spustenie background service
await fetch("/api/background/control", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "start" }),
});

// Kontrola statusu
const response = await fetch("/api/background/status");
const { data } = await response.json();
console.log("Service status:", data.status);
```

## Budúce vylepšenia

1. **Cross-Device Sync** - Synchronizácia medzi zariadeniami
2. **Conflict Resolution** - Pokročilé riešenie konfliktov
3. **Incremental Sync** - Synchronizácia len zmien
4. **Real-time Sync** - Synchronizácia v reálnom čase
5. **Offline Analytics** - Analytika offline aktivít

## Záver

Implementované background sync funkcie poskytujú:

- **Automatickú synchronizáciu** - Dáta sa synchronizujú automaticky
- **Offline data management** - Správa offline dát a čakajúcich požiadaviek
- **Background data service** - Automatické aktualizácie v pozadí
- **Real-time monitoring** - Sledovanie stavu synchronizácie v reálnom čase
- **Intelligent retry logic** - Automatické opakovanie pri chybách

Tieto funkcie zabezpečujú, že aplikácia má vždy aktuálne dáta a poskytuje používateľom plynulú skúsenosť bez ohľadu na stav pripojenia.
