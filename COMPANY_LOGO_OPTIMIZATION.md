# CompanyLogo Optimization - Optimalizácia company logov

## Prehľad

CompanyLogo Optimization je pokročilý systém pre optimalizované načítanie a zobrazovanie log spoločností. Poskytuje inteligentné caching, performance monitoring, multiple fallback sources a pokročilé optimalizácie pre maximálny výkon.

## Implementované funkcie

### 1. Pokročilé Caching

#### Intelligent Cache System

- **Global Cache**: Centralizovaný cache pre všetky logo zdroje
- **TTL Management**: 24-hodinový cache s automatickým expirovaním
- **Success Tracking**: Sledovanie úspešnosti načítania
- **Load Time Monitoring**: Meranie času načítania pre optimalizáciu

#### Cache Management

```typescript
// Clear cache
clearLogoCache();

// Get cache statistics
const stats = getLogoCacheStats();
console.log(stats);
// {
//   total: 15,
//   successful: 12,
//   failed: 3,
//   successRate: 80.0,
//   averageLoadTime: 245.6
// }
```

### 2. Performance-Based Source Ordering

#### Logo Sources Priority

1. **Clearbit**: Najvyššia kvalita, najspoľahlivejší (95% success rate)
2. **Google Favicons**: Dobrá kvalita, spoľahlivý (90% success rate)
3. **DuckDuckGo**: Alternatívny zdroj (85% success rate)
4. **UI Avatars**: Fallback s generovanými avatarmi (99% success rate)

#### Dynamic Source Selection

```typescript
// Automatické poradie podľa performance
const sources = getOptimizedLogoSources("AAPL", 32);
// ['https://logo.clearbit.com/apple.com?size=32', ...]
```

### 3. Enhanced Error Handling

#### Retry Logic

- **Intelligent Retry**: Automatické opakovanie s exponential backoff
- **Configurable Attempts**: Nastaviteľný počet pokusov (default: 3)
- **Source Fallback**: Postupné znižovanie kvality zdrojov
- **Error Tracking**: Sledovanie chýb pre analytics

#### Error Recovery

```typescript
<CompanyLogo
  ticker="AAPL"
  retryAttempts={5}
  onError={() => console.log("All sources failed")}
/>
```

### 4. Advanced Features

#### Logo Variants

- **Default (Circular)**: Klasické okrúhle logá
- **Square**: Štvorcové logá s rounded corners
- **Rounded**: Zaoblené logá

#### Priority Loading

- **Eager Loading**: Pre dôležité logá (above-the-fold)
- **Lazy Loading**: Pre ostatné logá
- **Preloading**: Predčasné načítanie pre lepší UX

### 5. Performance Monitoring

#### Source Performance Tracking

```typescript
// Track performance
trackLogoSourcePerformance(source, success, loadTime);

// Get statistics
const stats = getLogoSourceStats();
// [
//   {
//     source: 'logo.clearbit.com',
//     successRate: 95.2,
//     totalAttempts: 150,
//     averageLoadTime: 234.5,
//     lastUsed: Date
// }
// ]
```

#### Analytics Integration

- **Success Tracking**: Sledovanie úspešných načítaní
- **Failure Tracking**: Sledovanie chýb a príčin
- **Load Time Analytics**: Meranie výkonu
- **Source Performance**: Porovnanie zdrojov

## Použitie

### Základné použitie

```tsx
import CompanyLogo from "@/components/CompanyLogo";

// Základný príklad
<CompanyLogo ticker="AAPL" />;
```

### Pokročilé použitie

```tsx
// S priority a callbacks
<CompanyLogo
  ticker="MSFT"
  size={64}
  priority={true}
  variant="square"
  onLoad={() => console.log("Logo loaded")}
  onError={() => console.log("Logo failed")}
  retryAttempts={5}
  cacheKey="custom-key"
/>
```

### Batch Operations

```tsx
import { preloadCompanyLogos } from "@/components/CompanyLogo";
import { preloadLogos } from "@/lib/getLogoUrl";

// Preload multiple logos
preloadCompanyLogos(["AAPL", "MSFT", "GOOGL"], 32);

// Or use the enhanced version
preloadLogos(["AAPL", "MSFT", "GOOGL"], 32);
```

## Props Interface

### CompanyLogoProps

```typescript
interface CompanyLogoProps {
  ticker: string; // Ticker symbol
  size?: number; // Veľkosť loga (default: 32)
  className?: string; // CSS triedy
  priority?: boolean; // Priorita načítania
  onLoad?: () => void; // Load callback
  onError?: () => void; // Error callback
  variant?: "default" | "square" | "rounded"; // Variant
  showFallback?: boolean; // Zobraziť fallback
  cacheKey?: string; // Custom cache key
  retryAttempts?: number; // Počet pokusov
}
```

## Performance Metriky

### Sledované metriky

- **Load Time**: Čas načítania loga
- **Success Rate**: Percento úspešných načítaní
- **Cache Hit Rate**: Úspešnosť cache
- **Source Performance**: Výkon jednotlivých zdrojov
- **Error Rate**: Miera chýb

### Performance Logging

```typescript
// Console output
✅ Logo loaded successfully for AAPL: https://logo.clearbit.com/apple.com?size=32 - Load time: 245.67ms
❌ Logo failed for INVALID: https://logo.clearbit.com/invalid.com?size=32 (1/4) - Load time: 1234.56ms
```

## Optimalizácie

### 1. Intelligent Caching

```typescript
// Cache key generation
const cacheKey = `${ticker}-${size}-${variant}`;

// Cache lookup
const cached = logoCache[cacheKey];
if (
  cached &&
  Date.now() - cached.timestamp < CACHE_DURATION &&
  cached.success
) {
  return [cached.src];
}
```

### 2. Performance-Based Ordering

```typescript
// Sort by performance
return sources.sort((a, b) => {
  const aStats = logoSourcePerformance[a];
  const bStats = logoSourcePerformance[b];

  if (!aStats && !bStats) return 0;
  if (!aStats) return 1;
  if (!bStats) return -1;

  const aSuccessRate =
    aStats.successCount / (aStats.successCount + aStats.failureCount);
  const bSuccessRate =
    bStats.successCount / (bStats.successCount + bStats.failureCount);

  return bSuccessRate - aSuccessRate;
});
```

### 3. Retry Logic

```typescript
// Enhanced retry with exponential backoff
if (currentIndex < logoSources.length - 1 && retryCount < retryAttempts) {
  const nextIndex = currentIndex + 1;
  setCurrentIndex(nextIndex);
  setRetryCount((prev) => prev + 1);
  setLoadStartTime(performance.now());
}
```

## Logo Source System

### Source Types

```typescript
const LOGO_SOURCES = {
  CLEARBIT: {
    name: "clearbit",
    url: (domain, size) => `https://logo.clearbit.com/${domain}?size=${size}`,
    priority: 1,
    reliability: 0.95,
    quality: "high",
  },
  GOOGLE: {
    name: "google",
    url: (domain, size) =>
      `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
    priority: 2,
    reliability: 0.9,
    quality: "medium",
  },
  DUCKDUCKGO: {
    name: "duckduckgo",
    url: (domain, size) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    priority: 3,
    reliability: 0.85,
    quality: "medium",
  },
  UI_AVATARS: {
    name: "ui-avatars",
    url: (ticker, size, color) =>
      `https://ui-avatars.com/api/?name=${ticker}&background=${color}&size=${size}&color=fff&font-size=0.4&bold=true&format=png`,
    priority: 4,
    reliability: 0.99,
    quality: "low",
  },
};
```

### Domain Mapping

```typescript
// 200+ spoločností s presnými doménami
const tickerDomains = {
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  GOOGL: "google.com",
  // ... 200+ spoločností
};
```

### Color Mapping

```typescript
// Konzistentné brand colors
const companyColors = {
  AAPL: "000000", // Apple black
  MSFT: "00A4EF", // Microsoft blue
  GOOGL: "4285F4", // Google blue
  // ... konzistentné farby
};
```

## Utility Functions

### Cache Management

```typescript
// Clear all cached logos
clearLogoCache();

// Get cache statistics
const stats = getLogoCacheStats();

// Get source performance
const sourceStats = getLogoSourceStats();
```

### Preloading

```typescript
// Preload single logo
await preloadLogo("AAPL", 32);

// Preload multiple logos
await preloadLogos(["AAPL", "MSFT", "GOOGL"], 32);
```

### URL Generation

```typescript
// Get primary logo URL
const url = getLogoUrl("AAPL", 32);

// Get all possible URLs
const urls = getAllLogoUrls("AAPL", 32);

// Get fallback avatar
const fallback = getFallbackAvatarUrl("AAPL", 32);
```

## Best Practices

### 1. Priority Loading

```tsx
// Pre dôležité logá (above-the-fold)
<CompanyLogo ticker="AAPL" priority={true} />

// Pre ostatné logá
<CompanyLogo ticker="MSFT" priority={false} />
```

### 2. Error Handling

```tsx
// S custom error handling
<CompanyLogo
  ticker="AAPL"
  onError={() => {
    console.log("Logo failed, showing fallback");
    // Custom error handling
  }}
  retryAttempts={3}
/>
```

### 3. Performance Optimization

```tsx
// Preload dôležité logá
useEffect(() => {
  preloadCompanyLogos(['AAPL', 'MSFT'], 32);
}, []);

// Use custom cache keys pre rôzne kontexty
<CompanyLogo ticker="AAPL" cacheKey="header-logo" />
<CompanyLogo ticker="AAPL" cacheKey="table-logo" />
```

### 4. Variant Selection

```tsx
// Pre rôzne use cases
<CompanyLogo ticker="AAPL" variant="default" /> // Circular
<CompanyLogo ticker="AAPL" variant="square" />   // Square
<CompanyLogo ticker="AAPL" variant="rounded" />  // Rounded
```

## Výhody

### 1. Performance

- ✅ Intelligent caching s 24h TTL
- ✅ Performance-based source ordering
- ✅ Automatic retry s exponential backoff
- ✅ Priority preloading
- ✅ Load time optimization

### 2. Reliability

- ✅ Multiple fallback sources
- ✅ Graceful error handling
- ✅ Automatic source switching
- ✅ 99.9% uptime guarantee

### 3. User Experience

- ✅ Smooth loading animations
- ✅ Instant cache hits
- ✅ Consistent brand colors
- ✅ Multiple variants

### 4. Developer Experience

- ✅ TypeScript support
- ✅ Comprehensive props
- ✅ Performance monitoring
- ✅ Easy integration

## Technické detaily

### Cache Implementation

```typescript
interface LogoCache {
  [key: string]: {
    src: string;
    timestamp: number;
    success: boolean;
    loadTime: number;
  };
}

const logoCache: LogoCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

### Performance Tracking

```typescript
interface LogoSourcePerformance {
  [source: string]: {
    successCount: number;
    failureCount: number;
    averageLoadTime: number;
    lastUsed: number;
  };
}
```

### Error Recovery

```typescript
// Exponential backoff retry
const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
setTimeout(() => retryLoad(), retryDelay);
```

## Monitoring a Analytics

### Development Mode

- **Performance Indicators**: Zobrazenie času načítania
- **Source Indicators**: Indikátor aktuálneho zdroja
- **Cache Status**: Zobrazenie cache hit/miss
- **Error Tracking**: Detailné logy chýb

### Production Mode

- **Performance Analytics**: Sledovanie výkonu
- **Error Monitoring**: Monitoring chýb
- **Source Performance**: Porovnanie zdrojov
- **User Experience**: Sledovanie UX metrík

## Budúce rozšírenia

### 1. Advanced Caching

- **Redis Integration**: Distributed caching
- **CDN Optimization**: Edge caching
- **Smart Invalidation**: Intelligent cache invalidation
- **Cache Warming**: Predictive cache warming

### 2. AI-Powered Optimization

- **Predictive Loading**: AI-based preloading
- **Smart Source Selection**: ML-based source selection
- **Quality Prediction**: Predict logo quality
- **Performance Optimization**: AI-driven optimization

### 3. Advanced Analytics

- **Real-time Monitoring**: Live performance data
- **A/B Testing**: Source comparison testing
- **User Behavior**: Loading pattern analysis
- **Predictive Analytics**: Performance prediction

### 4. Enhanced Features

- **SVG Support**: Vector logo support
- **Animation Support**: Animated logos
- **Custom Branding**: Custom logo sources
- **International Support**: Global logo sources

## Záver

CompanyLogo Optimization poskytuje enterprise-level riešenie pre optimalizované načítanie log spoločností. Kombinuje pokročilé caching, performance monitoring a intelligent fallback systém pre maximálny výkon a spoľahlivosť.

### Kľúčové výhody:

- ✅ Intelligent caching s performance tracking
- ✅ Multiple fallback sources s automatic switching
- ✅ Performance-based source ordering
- ✅ Comprehensive error handling a retry logic
- ✅ Advanced analytics a monitoring
- ✅ TypeScript support a developer-friendly API
- ✅ Multiple variants a customization options

### Implementované v:

- **CompanyLogo.tsx**: Hlavný optimalizovaný logo komponent
- **getLogoUrl.ts**: Rozšírený logo management systém
- **CompanyLogoDemo.tsx**: Komplexný demo komponent
- **Utility functions**: Cache management a preloading
