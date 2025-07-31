# Performance API Integration

## Prehľad

Performance API Integration rozširuje Core Web Vitals o pokročilé metriky výkonu aplikácie. Poskytuje detailné sledovanie navigácie, zdrojov, pamäte, paint udalostí a layout zmien.

## Implementované funkcie

### 1. Pokročilé Performance Metriky

#### Navigation Timing

- **DNS Lookup**: Čas potrebný na vyhľadanie DNS
- **TCP Connection**: Čas na vytvorenie TCP spojenia
- **TTFB (Time to First Byte)**: Čas do prvého bytu odpovede
- **DOM Content Loaded**: Čas načítania DOM
- **Load Complete**: Čas úplného načítania stránky
- **Total Navigation Time**: Celkový čas navigácie

#### Resource Timing

- **Total Resources**: Celkový počet načítaných zdrojov
- **Cached Resources**: Počet zdrojov z cache
- **Network Resources**: Počet zdrojov z internetu
- **Average Resource Size**: Priemerná veľkosť zdrojov
- **Individual Resource Metrics**: Čas načítania a veľkosť každého zdroja

#### Memory Usage

- **Used Memory**: Využitá pamäť
- **Total Memory**: Celková alokovaná pamäť
- **Memory Limit**: Limit pamäte prehliadača
- **Memory Usage %**: Percento využitia pamäte

#### Paint Timing

- **First Paint (FP)**: Prvý paint
- **First Contentful Paint (FCP)**: Prvý obsahový paint
- **Largest Contentful Paint (LCP)**: Najväčší obsahový paint

#### Layout Shifts

- **Layout Shift Count**: Počet layout zmien
- **Cumulative Layout Shift (CLS)**: Kumulatívny layout shift score

#### Custom Metrics

- **Long Tasks**: Úlohy dlhšie ako 50ms
- **First Input Delay (FID)**: Oneskorenie prvého vstupu
- **Custom Measurements**: Vlastné merania výkonu

### 2. Performance Monitor Class

```typescript
class PerformanceMonitor {
  // Automatické sledovanie všetkých metrík
  private initializeObservers();

  // Custom merania
  measureCustomMetric(name: string, fn: () => void);
  async measureAsyncMetric(name: string, fn: () => Promise<void>);

  // Získanie súhrnu
  getPerformanceSummary(): PerformanceData;

  // Cleanup
  destroy();
}
```

### 3. Performance Dashboard Component

Vizuálny komponent pre zobrazenie performance metrík:

- **Collapsible Interface**: Rozbaľovateľné detaily
- **Real-time Updates**: Aktualizácia každých 5 sekúnd
- **Color-coded Metrics**: Farebné označenie podľa výkonu
- **Responsive Design**: Prispôsobenie pre mobilné zariadenia

## Použitie

### Automatické sledovanie

Performance API sa inicializuje automaticky v `PerformanceOptimizer`:

```typescript
// V PerformanceOptimizer.tsx
import { performanceMonitor } from "@/lib/performance-api";

useEffect(() => {
  // Automaticky sa spustí sledovanie
  console.log("🚀 Initializing advanced Performance API monitoring...");
}, []);
```

### Custom merania

```typescript
import { performanceMonitor } from "@/lib/performance-api";

// Meranie synchronnej funkcie
performanceMonitor.measureCustomMetric("Custom Operation", () => {
  // Váš kód
});

// Meranie asynchrónnej funkcie
await performanceMonitor.measureAsyncMetric("API Call", async () => {
  const data = await fetch("/api/data");
  return data.json();
});
```

### Získanie súhrnu

```typescript
const summary = performanceMonitor.getPerformanceSummary();
console.log("Performance Summary:", summary);
```

## Metriky a Thresholds

### Navigation Metrics

- **DNS Lookup**: Good ≤ 100ms, Poor > 300ms
- **TCP Connection**: Good ≤ 200ms, Poor > 600ms
- **TTFB**: Good ≤ 800ms, Poor > 1800ms
- **DOM Ready**: Good ≤ 2000ms, Poor > 4000ms
- **Load Complete**: Good ≤ 3000ms, Poor > 6000ms
- **Total Time**: Good ≤ 5000ms, Poor > 10000ms

### Paint Metrics

- **First Paint**: Good ≤ 1000ms, Poor > 3000ms
- **FCP**: Good ≤ 1800ms, Poor > 3000ms
- **LCP**: Good ≤ 2500ms, Poor > 4000ms

### Layout Metrics

- **CLS Score**: Good ≤ 0.1, Poor > 0.25

### Memory Usage

- **Usage %**: Good ≤ 50%, Poor > 80%

## Integrácia s UI

### Performance Dashboard

Komponent zobrazuje:

- **Navigation**: Časy načítania stránky
- **Resources**: Štatistiky zdrojov
- **Memory**: Využitie pamäte
- **Paint**: Paint udalosti
- **Layout**: Layout zmeny

### Real-time Monitoring

- Automatické aktualizácie každých 5 sekúnd
- Farebné označenie podľa výkonu
- Hover efekty pre detailné informácie
- Responsive design pre všetky zariadenia

## Výhody

### 1. Detailné Sledovanie

- Komplexné metriky výkonu
- Real-time monitoring
- Historické dáta

### 2. Optimalizácia

- Identifikácia problémov
- Benchmarking
- Performance tracking

### 3. User Experience

- Vizuálne zobrazenie
- Intuitívne rozhranie
- Okamžité feedback

### 4. Developer Tools

- Console logging
- Custom measurements
- Performance debugging

## Technické detaily

### PerformanceObserver API

Používa natívne PerformanceObserver API pre:

- Navigation timing
- Resource timing
- Paint timing
- Layout shifts
- Long tasks
- First input delay

### Memory API

Sleduje pamäťové metriky:

- `performance.memory.usedJSHeapSize`
- `performance.memory.totalJSHeapSize`
- `performance.memory.jsHeapSizeLimit`

### Custom Measurements

Podporuje vlastné merania:

- Synchronné funkcie
- Asynchrónne operácie
- API volania
- DOM operácie

## Monitoring a Logging

### Console Output

Všetky metriky sa logujú do konzoly s emoji kategoriami:

- 🌐 Navigation
- 📦 Resources
- 🎨 Paint
- 📐 Layout
- 🧠 Memory
- ⚡ Custom

### Performance Summary

Automatické generovanie súhrnu po načítaní stránky:

```typescript
setTimeout(() => {
  const summary = performanceMonitor.getPerformanceSummary();
  console.log("📊 Performance Summary:", summary);
}, 1000);
```

## Optimalizácie

### 1. Efficient Observers

- Automatické cleanup
- Optimalizované intervaly
- Memory management

### 2. Conditional Loading

- Kontrola podpory API
- Graceful degradation
- Fallback mechanisms

### 3. Performance Impact

- Minimal overhead
- Non-blocking operations
- Background monitoring

## Budúce rozšírenia

### 1. Analytics Integration

- Backend reporting
- Historical data
- Trend analysis

### 2. Alerting System

- Performance thresholds
- Email notifications
- Slack integration

### 3. Advanced Metrics

- User interactions
- Page transitions
- Component performance

### 4. Visualization

- Charts and graphs
- Performance trends
- Comparative analysis

## Záver

Performance API Integration poskytuje komplexný systém pre sledovanie výkonu aplikácie. Kombinuje Core Web Vitals s pokročilými metrikami pre úplný prehľad o výkone aplikácie.

### Kľúčové výhody:

- ✅ Detailné sledovanie všetkých aspektov výkonu
- ✅ Real-time monitoring a reporting
- ✅ Vizuálne rozhranie pre easy debugging
- ✅ Custom measurements pre špecifické potreby
- ✅ Optimalizované pre minimálny overhead
- ✅ Kompatibilné so všetkými modernými prehliadačmi
