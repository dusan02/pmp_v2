# Analytics Setup

## Prehľad

Analytics Setup implementuje pokročilý systém pre sledovanie používateľského správania, performance metrík a business intelligence. Poskytuje real-time analytics, offline podporu a komplexné reporting.

## Implementované funkcie

### 1. Pokročilý Analytics Systém

#### Event Tracking

- **User Events**: Kliky, scroll, form submissions, page views
- **Performance Events**: Load times, memory usage, resource loading
- **Business Events**: Stock views, favorites, searches
- **Error Events**: JavaScript errors, API failures
- **System Events**: Online/offline status, session management

#### Session Management

- **Automatické session tracking** s unique ID
- **Device detection** (desktop/mobile/tablet)
- **Browser a OS detection**
- **Screen resolution tracking**
- **Session duration a activity monitoring**

#### Real-time Analytics

- **Live session tracking**
- **Active users monitoring**
- **Real-time event processing**
- **Instant data updates**

### 2. Analytics API

#### POST `/api/analytics`

Spracováva analytics events:

```typescript
interface AnalyticsRequest {
  events: AnalyticsEvent[];
  session: AnalyticsSession;
  timestamp: number;
  offline?: boolean;
}
```

#### GET `/api/analytics`

Získava analytics dáta:

- `?type=daily` - Denné štatistiky
- `?type=events` - Posledné events
- `?type=sessions` - Posledné sessions
- `?type=realtime` - Real-time stats

### 3. Analytics Dashboard

Vizuálny komponent pre zobrazenie analytics dát:

- **Today's Overview**: Page views, sessions, events, active users
- **Current Session**: Session info, duration, page views
- **Device Information**: Type, OS, browser, screen
- **Real-time Updates**: Live data updates
- **Analytics Actions**: Manual tracking, test events

## Použitie

### Automatické sledovanie

Analytics sa inicializuje automaticky v `PerformanceOptimizer`:

```typescript
// V PerformanceOptimizer.tsx
import { analytics } from "@/lib/analytics";

useEffect(() => {
  // Automaticky sa spustí analytics
  console.log("📊 Initializing analytics system...");

  // Track page view
  analytics.trackPageView(window.location.pathname, document.title);
}, []);
```

### Manual tracking

```typescript
import { analytics } from "@/lib/analytics";

// Track custom events
analytics.track("user", "button_click", "Export Button");

// Track business events
analytics.trackStockView("AAPL", 150.25, 2.5);
analytics.trackFavoriteToggle("TSLA", true);
analytics.trackSearch("tech stocks", 25);

// Track performance
analytics.trackPerformance("api_call_time", 1250);

// Track errors
analytics.trackError(new Error("API failed"), "stock_data_fetch");
```

### Business-specific tracking

```typescript
// Stock interactions
analytics.trackStockView(ticker, price, change);

// Favorite toggles
analytics.trackFavoriteToggle(ticker, isFavorite);

// Search events
analytics.trackSearch(query, resultsCount);

// Performance metrics
analytics.trackPerformance(metricName, value);
```

## Event Kategórie

### User Events

- `page_view` - Zobrazenie stránky
- `click` - Klik na element
- `scroll` - Scroll event
- `form_submit` - Odoslanie formulára
- `page_hide/show` - Zmena visibility

### Performance Events

- `page_load` - Načítanie stránky
- `dom_ready` - DOM ready event
- `window_load` - Window load event
- `image_load` - Načítanie obrázka
- `table_render` - Render tabuľky

### Business Events

- `stock_view` - Zobrazenie akcie
- `favorite_toggle` - Pridanie/odobranie z obľúbených
- `search` - Vyhľadávanie
- `export_data` - Export dát

### Error Events

- `javascript_error` - JavaScript chyba
- `application_error` - Aplikácia chyba
- `api_error` - API chyba

### System Events

- `session_start` - Začiatok session
- `online/offline` - Zmena connectivity
- `page_unload` - Zatvorenie stránky

## Offline Podpora

### Offline Event Storage

```typescript
// Events sa ukladajú lokálne keď je offline
localStorage.setItem("analytics_offline_events", JSON.stringify(events));
```

### Sync keď je online

```typescript
// Automatické sync offline events
analytics.syncOfflineEvents();
```

### Batch Processing

- Events sa spracovávajú v batchoch po 10
- Automatické flush každých 30 sekúnd
- Force flush pri page unload

## Real-time Analytics

### Redis Storage

```typescript
// Daily stats
analytics:daily:2024-01-15
{
  totalEvents: "1250",
  totalSessions: "45",
  totalPageViews: "3200",
  lastUpdated: "1705123456789"
}

// Category stats
analytics:category:user:2024-01-15
{
  count: "850"
}

// Page stats
analytics:page:/:2024-01-15
{
  views: "1200"
}
```

### Active Sessions

- Sledovanie sessions z posledných 5 minút
- Real-time active users count
- Session duration tracking

## Database Schema

### AnalyticsEvent

```sql
CREATE TABLE analytics_event (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  category VARCHAR(50),
  action VARCHAR(255),
  label TEXT,
  value DECIMAL,
  properties JSONB,
  timestamp TIMESTAMP,
  session_id VARCHAR(255),
  user_id VARCHAR(255),
  page VARCHAR(255),
  user_agent TEXT,
  referrer TEXT,
  offline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### AnalyticsSession

```sql
CREATE TABLE analytics_session (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE,
  start_time TIMESTAMP,
  last_activity TIMESTAMP,
  page_views INTEGER,
  events INTEGER,
  duration INTEGER,
  referrer TEXT,
  user_agent TEXT,
  device_type VARCHAR(50),
  device_os VARCHAR(50),
  device_browser VARCHAR(50),
  screen_width INTEGER,
  screen_height INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Konfigurácia

### Analytics Config

```typescript
interface AnalyticsConfig {
  enabled: boolean; // Enable/disable analytics
  debug: boolean; // Debug mode
  batchSize: number; // Events per batch (default: 10)
  flushInterval: number; // Flush interval in ms (default: 30000)
  endpoint: string; // API endpoint (default: '/api/analytics')
  sessionTimeout: number; // Session timeout in ms (default: 30min)
}
```

### Environment Variables

```env
# Analytics configuration
ANALYTICS_ENABLED=true
ANALYTICS_DEBUG=false
ANALYTICS_BATCH_SIZE=10
ANALYTICS_FLUSH_INTERVAL=30000
```

## Výhody

### 1. Komplexné Sledovanie

- Všetky typy user interactions
- Performance metrics
- Business events
- Error tracking

### 2. Real-time Processing

- Okamžité data updates
- Live session tracking
- Active users monitoring

### 3. Offline Podpora

- Offline event storage
- Automatic sync
- Reliable data collection

### 4. Business Intelligence

- Stock interaction tracking
- User behavior analysis
- Performance insights
- Error monitoring

### 5. Scalable Architecture

- Batch processing
- Redis caching
- Database storage
- API endpoints

## Monitoring a Reporting

### Console Logging

```typescript
// Debug mode logging
📊 Analytics Event: {
  id: "abc123",
  name: "user_click",
  category: "user",
  action: "click",
  label: "Export Button",
  timestamp: 1705123456789
}
```

### Real-time Dashboard

- Live session count
- Today's statistics
- Device breakdown
- Performance metrics

### Data Export

- CSV export functionality
- Historical data analysis
- Custom date ranges
- Filtered reports

## Optimalizácie

### 1. Performance

- Batch processing
- Efficient storage
- Minimal overhead
- Background processing

### 2. Privacy

- No PII collection
- Session-based tracking
- Configurable data retention
- GDPR compliance ready

### 3. Reliability

- Offline support
- Error handling
- Retry mechanisms
- Data validation

## Budúce rozšírenia

### 1. Advanced Analytics

- User journey tracking
- Conversion funnels
- A/B testing support
- Cohort analysis

### 2. Machine Learning

- User behavior prediction
- Anomaly detection
- Personalized recommendations
- Performance optimization

### 3. Integration

- Google Analytics
- Mixpanel
- Amplitude
- Custom webhooks

### 4. Visualization

- Interactive charts
- Real-time graphs
- Custom dashboards
- Export capabilities

## Záver

Analytics Setup poskytuje komplexný systém pre sledovanie a analýzu používateľského správania. Kombinuje real-time processing s offline podporou pre reliable data collection.

### Kľúčové výhody:

- ✅ Komplexné event tracking všetkých typov
- ✅ Real-time analytics a monitoring
- ✅ Offline podpora s automatic sync
- ✅ Business-specific tracking methods
- ✅ Scalable architecture s batch processing
- ✅ Privacy-focused design
- ✅ Vizuálne dashboard pre easy monitoring
- ✅ Configurable a extensible system
