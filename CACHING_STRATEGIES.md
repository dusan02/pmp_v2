# Caching Strategies - Strategie cachovania pre rôzne typy obsahu

## Prehľad

Tento dokument popisuje implementované pokročilé caching stratégie v Service Worker pre optimalizáciu výkonu aplikácie PreMarketPrice.

## Verzia

**v3.0.0** - Pokročilé caching stratégie s adaptívnym rozhodovaním

## Implementované stratégie

### 1. Adaptive Caching - Inteligentné rozhodovanie

Service Worker automaticky vyberá optimálnu caching stratégiu na základe:

- **Content-Type** požiadavky
- **URL pattern**
- **Priorita** zdroja
- **Typ obsahu** (API, obrázky, fonty, atď.)

```javascript
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

  // Adaptive strategy selection
  if (isCritical) {
    return {
      strategy: "network-first",
      cache: API_CACHE,
      priority: "critical",
    };
  } else if (isImage) {
    return { strategy: "cache-first", cache: IMAGE_CACHE, priority: "medium" };
  } else if (isFont) {
    return { strategy: "cache-first", cache: FONT_CACHE, priority: "high" };
  }
  // ...
}
```

### 2. Content-Type Specific Caching

Rôzne stratégie pre rôzne typy obsahu:

| Content Type             | Stratégia     | Cache  | Priorita | Max Age |
| ------------------------ | ------------- | ------ | -------- | ------- |
| `text/html`              | Network-first | Static | High     | 7 dní   |
| `text/css`               | Cache-first   | Static | High     | 7 dní   |
| `application/javascript` | Cache-first   | Static | High     | 7 dní   |
| `image/*`                | Cache-first   | Images | Medium   | 30 dní  |
| `font/*`                 | Cache-first   | Fonts  | High     | 1 rok   |
| `application/json`       | Network-first | Data   | Critical | 15 min  |
| `application/xml`        | Network-first | Data   | Medium   | 15 min  |

### 3. Priority-Based Caching

Klasifikácia zdrojov podľa priority:

#### Critical Priority

- `/api/prices/cached` - Hlavné dáta akcií
- `/api/auth/me` - Autentifikačné dáta
- `/` - Hlavná stránka
- `/manifest.json` - PWA manifest

#### High Priority

- `/favicon.ico` - Favicon
- `/icon-192.png`, `/icon-512.png` - PWA ikony
- `/api/favorites` - Obľúbené akcie
- Fonty (woff, woff2)

#### Medium Priority

- `/offline.html` - Offline stránka
- `/api/analytics` - Analytické dáta
- `/api/performance` - Performance metriky
- Obrázky (png, jpg, svg)

#### Low Priority

- `/api/test` - Testovacie endpointy
- `/api/security/events` - Security events

### 4. Cache Partitioning

Rozdelenie cache do špecializovaných úložísk:

```javascript
const STATIC_CACHE = `premarket-static-v3.0.0`;
const DYNAMIC_CACHE = `premarket-dynamic-v3.0.0`;
const API_CACHE = `premarket-api-v3.0.0`;
const IMAGE_CACHE = `premarket-images-v3.0.0`;
const FONT_CACHE = `premarket-fonts-v3.0.0`;
const DATA_CACHE = `premarket-data-v3.0.0`;
```

### 5. Predictive Caching

Prediktívne cachovanie na základe vzorov používania:

```javascript
const PREDICTIVE_PATTERNS = {
  "/api/prices/cached": ["/api/prices/refresh", "/api/performance"],
  "/api/auth/me": ["/api/favorites", "/api/history"],
  "/": ["/api/prices/cached", "/api/analytics"],
};
```

### 6. Cache Warming

Automatické zahrievanie cache:

- Pri inštalácii Service Worker
- Každých 6 hodín
- Po obnovení pripojenia
- Na základe prediktívnych vzorov

## Implementované caching stratégie

### 1. Network-First Strategy

Pre kritické API a navigačné požiadavky:

```javascript
async function networkFirstStrategy(request, cacheName, priority) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      cache.put(request, responseWithMetadata);

      // Trigger predictive caching
      triggerPredictiveCaching(request.url);

      return networkResponse;
    }
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}
```

### 2. Cache-First Strategy

Pre statické zdroje a obrázky:

```javascript
async function cacheFirstStrategy(request, cacheName, priority) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    throw error;
  }
}
```

### 3. Stale-While-Revalidate Strategy

Pre dynamický obsah a CDN:

```javascript
async function staleWhileRevalidateStrategy(request, cacheName, priority) {
  try {
    const cachedResponse = await caches.match(request);

    // Return cached response immediately if available
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then((response) => {
        if (response.ok) {
          caches.open(cacheName).then((cache) => {
            cache.put(request, response);
          });
        }
      });

      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    throw error;
  }
}
```

## Pokročilé funkcie

### 1. Enhanced Cache Metadata

Každá cached response obsahuje metadata:

```javascript
const metadata = {
  timestamp: Date.now(),
  maxAge: CACHE_CONFIG[cacheName.split("-")[1]]?.maxAge,
  priority,
  strategy: "network-first",
};

const responseWithMetadata = new Response(responseToCache.body, {
  headers: {
    ...Object.fromEntries(responseToCache.headers.entries()),
    "sw-cache-timestamp": metadata.timestamp.toString(),
    "sw-cache-max-age": metadata.maxAge.toString(),
    "sw-cache-priority": metadata.priority,
    "sw-cache-strategy": metadata.strategy,
  },
});
```

### 2. Priority-Based Retention

Kritické položky sa uchovávajú dlhšie:

```javascript
// Priority-based retention - critical items get longer retention
const priorityMultiplier =
  priority === "critical" ? 2 : priority === "high" ? 1.5 : 1;
const adjustedMaxAge = maxAge * priorityMultiplier;
```

### 3. Enhanced Performance Monitoring

Rozšírené štatistiky pre každú stratégiu:

```javascript
let cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  strategyStats: {
    "cache-first": { hits: 0, misses: 0 },
    "network-first": { hits: 0, misses: 0 },
    "stale-while-revalidate": { hits: 0, misses: 0 },
  },
  priorityStats: {
    critical: { hits: 0, misses: 0 },
    high: { hits: 0, misses: 0 },
    medium: { hits: 0, misses: 0 },
    low: { hits: 0, misses: 0 },
  },
};
```

## Konfigurácia

### Cache Configuration

```javascript
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
};
```

## Použitie

### Service Worker Manager

```typescript
import { swManager } from "@/lib/sw-register";

// Získanie caching stratégie pre URL
const strategy = swManager.getCachingStrategy("/api/prices/cached");
console.log(strategy); // { strategy: 'network-first', cache: 'premarket-api-v3.0.0', priority: 'critical' }

// Zahrievanie cache
await swManager.warmCache();

// Získanie štatistík
const stats = await swManager.getCacheStats();
console.log(stats.strategyStats); // Štatistiky pre každú stratégiu
```

### CacheStats Component

```tsx
import CacheStats from "@/components/CacheStats";

// V React komponente
<CacheStats className="my-4" />;
```

## Výhody implementácie

1. **Adaptívne rozhodovanie** - Automatický výber optimálnej stratégie
2. **Content-Type optimalizácia** - Špecializované stratégie pre rôzne typy obsahu
3. **Priority-based caching** - Kritické zdroje sa cachujú s vyššou prioritou
4. **Predictive caching** - Prediktívne cachovanie na základe vzorov
5. **Enhanced monitoring** - Detailné štatistiky pre každú stratégiu
6. **Cache partitioning** - Optimalizované úložiská pre rôzne typy obsahu
7. **Automatic cache warming** - Automatické zahrievanie cache
8. **Priority-based retention** - Dlhšie uchovávanie kritických položiek

## Testovanie

### 1. Testovanie caching stratégii

```javascript
// V DevTools Console
navigator.serviceWorker.controller.postMessage({ type: "GET_CACHE_STATS" });
```

### 2. Testovanie offline funkcionality

1. Otvoriť DevTools
2. Prejsť na Network tab
3. Nastaviť "Offline"
4. Testovať navigáciu a API volania

### 3. Testovanie cache warming

```javascript
// V DevTools Console
navigator.serviceWorker.controller.postMessage({ type: "WARM_CACHE" });
```

## Monitoring a Analytics

### Cache Performance Metrics

- **Hit Rate** - Celkový pomer cache hits
- **Strategy Performance** - Výkon pre každú stratégiu
- **Priority Performance** - Výkon pre každú prioritu
- **Content Type Performance** - Výkon pre každý content type

### Real-time Monitoring

CacheStats komponent zobrazuje:

- Celkové štatistiky
- Výkon stratégií
- Výkon priorit
- Content type štatistiky
- Časovú značku poslednej aktualizácie

## Optimalizácie

### 1. Performance Optimizations

- **Lazy loading** - Načítanie cache štatistík na požiadanie
- **Background updates** - Aktualizácia cache v pozadí
- **Predictive caching** - Prediktívne cachovanie často používaných zdrojov

### 2. Memory Optimizations

- **Cache size limits** - Obmedzenie veľkosti cache
- **Automatic cleanup** - Automatické čistenie starých položiek
- **Priority-based retention** - Inteligentné uchovávanie položiek

### 3. Network Optimizations

- **Stale-while-revalidate** - Rýchle odpovede s aktualizáciou v pozadí
- **Network-first for critical data** - Získanie najnovších dát pre kritické API
- **Cache-first for static assets** - Rýchle načítanie statických zdrojov

## Budúce vylepšenia

1. **Machine Learning** - Prediktívne cachovanie na základe ML modelov
2. **Dynamic Strategy Adjustment** - Dynamické prispôsobenie stratégií na základe výkonu
3. **Cross-Device Sync** - Synchronizácia cache medzi zariadeniami
4. **Advanced Analytics** - Pokročilé analytické nástroje
5. **A/B Testing** - Testovanie rôznych caching stratégií

## Záver

Implementované caching stratégie poskytujú:

- **Inteligentné rozhodovanie** o caching stratégiách
- **Optimalizovaný výkon** pre rôzne typy obsahu
- **Pokročilé monitorovanie** cache výkonu
- **Prediktívne cachovanie** pre lepší UX
- **Automatické optimalizácie** bez zásahu používateľa

Tieto stratégie výrazne zlepšujú výkon aplikácie, znižujú latenciu a poskytujú lepšiu offline skúsenosť.
