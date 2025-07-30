# OptimizedImage Component - Optimalizovaný image komponent

## Prehľad
OptimizedImage je pokročilý React komponent pre optimalizované zobrazovanie obrázkov. Poskytuje automatické lazy loading, fallback mechanizmy, performance monitoring a pokročilé optimalizácie pre rýchle načítanie.

## Implementované funkcie

### 1. Pokročilé Optimalizácie
#### Lazy Loading
- **Intersection Observer**: Automatické načítanie obrázkov pri zobrazení
- **Configurable Threshold**: Nastaviteľný threshold pre presnejšie načítanie
- **Root Margin**: Predčasné načítanie pre plynulejší UX

#### Format Support
- **WebP/AVIF**: Automatická detekcia a podpora moderných formátov
- **Fallback Formats**: Graceful degradation pre staršie prehliadače
- **Quality Control**: Nastaviteľná kvalita kompresie

#### Performance Monitoring
- **Load Time Tracking**: Meranie času načítania obrázkov
- **Cache Status**: Detekcia cache hit/miss
- **Size Calculation**: Výpočet veľkosti obrázkov
- **Format Detection**: Automatická detekcia formátu

### 2. Error Handling & Fallbacks
#### Retry Logic
- **Automatic Retry**: Automatické opakovanie pri chybe
- **Fallback Sources**: Viacero zdrojov pre spoľahlivosť
- **Error Tracking**: Sledovanie chýb pre analytics

#### Visual Fallbacks
- **Loading Skeletons**: Animované placeholder-y
- **Error States**: Vizuálne indikátory chýb
- **Graceful Degradation**: Postupné znižovanie kvality

### 3. Advanced Features
#### Preloading
- **Priority Images**: Predčasné načítanie dôležitých obrázkov
- **Resource Hints**: Optimalizované načítanie zdrojov
- **Memory Management**: Efektívne správa pamäte

#### Responsive Design
- **Dynamic Sizing**: Automatické prispôsobenie veľkosti
- **Responsive Images**: Optimalizované pre rôzne zariadenia
- **Aspect Ratio**: Zachovanie pomeru strán

## Použitie

### Základné použitie
```tsx
import OptimizedImage from '@/components/OptimizedImage';

// Základný príklad
<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  width={300}
  height={200}
/>
```

### Pokročilé použitie
```tsx
// S fallback a priority
<OptimizedImage
  src="https://example.com/image.jpg"
  alt="High priority image"
  width={400}
  height={300}
  priority={true}
  fallback="/fallback-image.jpg"
  quality={90}
  format="webp"
  onLoad={() => console.log('Image loaded')}
  onError={() => console.log('Image failed')}
/>
```

### Company Logo použitie
```tsx
import CompanyLogo from '@/components/CompanyLogo';

// Automatické načítanie loga spoločnosti
<CompanyLogo
  ticker="AAPL"
  size={48}
  priority={true}
  onLoad={() => console.log('Apple logo loaded')}
/>
```

## Props Interface

### OptimizedImageProps
```typescript
interface OptimizedImageProps {
  src: string;                    // URL obrázka
  alt: string;                    // Alt text pre accessibility
  width?: number;                 // Šírka obrázka
  height?: number;                // Výška obrázka
  className?: string;             // CSS triedy
  priority?: boolean;             // Priorita načítania
  fallback?: string;              // Fallback URL
  onError?: () => void;           // Error callback
  onLoad?: () => void;            // Load callback
  sizes?: string;                 // Responsive sizes
  quality?: number;               // Kvalita kompresie (1-100)
  placeholder?: 'blur' | 'empty'; // Placeholder typ
  blurDataURL?: string;           // Blur placeholder URL
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  loading?: 'lazy' | 'eager';     // Loading stratégia
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  style?: React.CSSProperties;    // Inline štýly
  onClick?: () => void;           // Click handler
  title?: string;                 // Title atribút
}
```

### CompanyLogoProps
```typescript
interface CompanyLogoProps {
  ticker: string;                 // Ticker symbol
  size?: number;                  // Veľkosť loga
  className?: string;             // CSS triedy
  priority?: boolean;             // Priorita načítania
  onLoad?: () => void;            // Load callback
  onError?: () => void;           // Error callback
}
```

## Performance Metriky

### Sledované metriky
- **Load Time**: Čas načítania obrázka
- **Image Size**: Veľkosť obrázka v bytoch
- **Format**: Detekovaný formát obrázka
- **Cache Status**: Hit/miss status cache

### Performance Logging
```typescript
// Console output
✅ Image loaded: /path/to/image.jpg {
  loadTime: "245.67ms",
  size: "156.3KB",
  format: "webp",
  cacheStatus: "hit"
}
```

### Development Indicators
- **Load Time Badge**: Zobrazenie času načítania
- **Cache Status Badge**: Indikátor cache statusu
- **Performance Tracking**: Integrácia s analytics

## Optimalizácie

### 1. Lazy Loading
```typescript
// Intersection Observer konfigurácia
{
  rootMargin: '100px',  // Predčasné načítanie
  threshold: 0.01       // Nízky threshold
}
```

### 2. Format Optimization
```typescript
// Automatická detekcia formátu
const format = img.src.includes('.webp') ? 'webp' : 
               img.src.includes('.avif') ? 'avif' : 
               img.src.includes('.png') ? 'png' : 'jpeg';
```

### 3. Cache Detection
```typescript
// Približná detekcia cache
const cacheStatus = loadTime < 50 ? 'hit' : 'miss';
```

### 4. Retry Logic
```typescript
// Automatické opakovanie pri chybe
if (fallback && imageSrc !== fallback && retryCount < 2) {
  setRetryCount(prev => prev + 1);
  setImageSrc(fallback);
}
```

## Company Logo System

### Logo Sources Priority
1. **Clearbit**: Reálne logá spoločností
2. **Google Favicons**: Univerzálne favicony
3. **DuckDuckGo**: Alternatívne favicony
4. **UI Avatars**: Generované avatary

### Domain Mapping
```typescript
const tickerDomains = {
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'GOOGL': 'google.com',
  // ... 200+ spoločností
};
```

### Color Mapping
```typescript
const companyColors = {
  'AAPL': '000000', // Apple black
  'MSFT': '00A4EF', // Microsoft blue
  'GOOGL': '4285F4', // Google blue
  // ... konzistentné farby
};
```

## CSS Animácie

### Shimmer Effect
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Loading States
- **Skeleton**: Gradient placeholder
- **Spinner**: Rotating loader
- **Fade In**: Smooth opacity transition

## Integrácia s Analytics

### Performance Tracking
```typescript
// Automatické sledovanie
if (typeof window !== 'undefined' && (window as any).trackImagePerformance) {
  (window as any).trackImagePerformance(metrics);
}
```

### Error Tracking
```typescript
// Sledovanie chýb
if (typeof window !== 'undefined' && (window as any).trackImageError) {
  (window as any).trackImageError(src, retryCount);
}
```

## Best Practices

### 1. Priority Images
```tsx
// Pre dôležité obrázky (hero, above-the-fold)
<OptimizedImage
  src="/hero-image.jpg"
  priority={true}
  fetchPriority="high"
/>
```

### 2. Responsive Images
```tsx
// Pre rôzne veľkosti obrazoviek
<OptimizedImage
  src="/responsive-image.jpg"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 3. Fallback Strategy
```tsx
// Viacero fallback zdrojov
<OptimizedImage
  src="/primary-image.jpg"
  fallback="/fallback-image.jpg"
  onError={() => console.log('All sources failed')}
/>
```

### 4. Company Logos
```tsx
// Automatické načítanie loga
<CompanyLogo
  ticker="TSLA"
  size={64}
  priority={true}
  onLoad={() => console.log('Tesla logo loaded')}
/>
```

## Výhody

### 1. Performance
- ✅ Automatické lazy loading
- ✅ Format optimization
- ✅ Cache detection
- ✅ Preloading pre priority images

### 2. User Experience
- ✅ Smooth loading animations
- ✅ Graceful error handling
- ✅ Responsive design
- ✅ Accessibility support

### 3. Developer Experience
- ✅ TypeScript support
- ✅ Comprehensive props
- ✅ Performance monitoring
- ✅ Easy integration

### 4. Reliability
- ✅ Multiple fallback sources
- ✅ Retry logic
- ✅ Error tracking
- ✅ Graceful degradation

## Technické detaily

### Intersection Observer
```typescript
const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      setIsInView(true);
      observer.disconnect();
    }
  },
  {
    rootMargin: '100px',
    threshold: 0.01
  }
);
```

### Performance Measurement
```typescript
const loadTime = performance.now() - loadStartTime.current;
const size = img.naturalWidth * img.naturalHeight * 4;
const cacheStatus = loadTime < 50 ? 'hit' : 'miss';
```

### Format Detection
```typescript
const format = img.src.includes('.webp') ? 'webp' : 
               img.src.includes('.avif') ? 'avif' : 
               img.src.includes('.png') ? 'png' : 'jpeg';
```

## Monitoring a Debugging

### Development Mode
- **Load Time Badge**: Zobrazenie času načítania
- **Cache Status Badge**: Indikátor cache
- **Console Logging**: Detailné logy

### Production Mode
- **Performance Tracking**: Analytics integration
- **Error Monitoring**: Error tracking
- **Metrics Collection**: Performance metrics

## Budúce rozšírenia

### 1. Advanced Formats
- **AVIF Support**: Pokročilá podpora AVIF
- **Progressive JPEG**: Progressive loading
- **WebP Animation**: Animated WebP support

### 2. Smart Loading
- **Predictive Loading**: AI-based preloading
- **Bandwidth Detection**: Adaptive quality
- **Device Optimization**: Device-specific optimization

### 3. Advanced Analytics
- **Real-time Metrics**: Live performance data
- **A/B Testing**: Format comparison
- **User Behavior**: Loading pattern analysis

### 4. CDN Integration
- **Multi-CDN**: Multiple CDN support
- **Edge Optimization**: Edge computing
- **Global Distribution**: Worldwide optimization

## Záver

OptimizedImage komponent poskytuje komplexné riešenie pre optimalizované zobrazovanie obrázkov. Kombinuje moderné webové technológie s pokročilými optimalizáciami pre maximálny výkon a používateľský zážitok.

### Kľúčové výhody:
- ✅ Automatické lazy loading a format optimization
- ✅ Pokročilé error handling a fallback mechanizmy
- ✅ Performance monitoring a analytics integration
- ✅ Responsive design a accessibility support
- ✅ TypeScript support a comprehensive documentation
- ✅ Easy integration a developer-friendly API

### Implementované v:
- **OptimizedImage.tsx**: Hlavný optimalizovaný image komponent
- **CompanyLogo.tsx**: Špecializovaný komponent pre logá spoločností
- **getLogoUrl.ts**: Centralizovaný systém pre logo URL generovanie 