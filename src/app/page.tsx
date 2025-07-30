'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Download, Table, User, LogOut, Clock, AlertCircle } from 'lucide-react';
import { useSortableData } from '@/hooks/useSortableData';
import { formatBillions } from '@/lib/format';
// Remove cache import - it's server-side only

import CompanyLogo from '@/components/CompanyLogo';
import MarketIndicators from '@/components/MarketIndicators';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/AuthModal';
import { Activity } from 'lucide-react';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

interface StockData {
  ticker: string;
  preMarketPrice: number;
  percentChange: number;
  marketCapDiff: number;
  marketCap: number;
}

type SortKey = 'ticker' | 'marketCap' | 'preMarketPrice' | 'percentChange' | 'marketCapDiff';

// Function to check if market is open
const isMarketOpen = (): { isOpen: boolean; message: string; nextOpen: string } => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const est = new Date(utc + (3600000 * -5)); // EST is UTC-5
  
  const day = est.getDay();
  const hour = est.getHours();
  const minute = est.getMinutes();
  const currentTime = hour * 100 + minute;
  
  // Market hours: 9:30 AM - 4:00 PM EST, Monday-Friday
  const marketOpen = 930; // 9:30 AM
  const marketClose = 1600; // 4:00 PM
  
  // Check if it's a weekday
  if (day === 0 || day === 6) {
    const nextMonday = new Date(est);
    nextMonday.setDate(est.getDate() + (day === 0 ? 1 : 2));
    nextMonday.setHours(9, 30, 0, 0);
    return {
      isOpen: false,
      message: 'Market closed (Weekend)',
      nextOpen: nextMonday.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }
  
  // Check if market is open
  if (currentTime >= marketOpen && currentTime < marketClose) {
    return {
      isOpen: true,
      message: 'Market Open',
      nextOpen: ''
    };
  }
  
  // Market is closed
  const nextOpen = new Date(est);
  if (currentTime >= marketClose) {
    // After market close, next open is tomorrow
    nextOpen.setDate(est.getDate() + 1);
  }
  nextOpen.setHours(9, 30, 0, 0);
  
  return {
    isOpen: false,
    message: 'Market Closed',
    nextOpen: nextOpen.toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
};

export default function HomePage() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [marketStatus, setMarketStatus] = useState<{ isOpen: boolean; message: string; nextOpen: string } | null>(null);
  const [backgroundStatus, setBackgroundStatus] = useState<{
    isRunning: boolean;
    lastUpdate: string;
    nextUpdate: string;
  } | null>(null);
  
  // Authentication
  const { user, loading: authLoading, logout } = useAuth();
  
  // Use database-backed favorites with user ID
  const { favorites, toggleFavorite, isFavorite } = useFavorites(user?.id || 'default');

  // Update market status every minute
  useEffect(() => {
    const updateMarketStatus = () => {
      setMarketStatus(isMarketOpen());
    };
    
    // Only calculate market status on client side to avoid hydration mismatch
    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch background service status
  useEffect(() => {
    const fetchBackgroundStatus = async () => {
      try {
        const response = await fetch('/api/background/status');
        const data = await response.json();
        if (data.success && data.data.status) {
          setBackgroundStatus(data.data.status);
        }
      } catch (error) {
        console.error('Failed to fetch background status:', error);
      }
    };

    fetchBackgroundStatus();
    const interval = setInterval(fetchBackgroundStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);


  // Mock data for demonstration
  const mockStocks: StockData[] = [
    { ticker: 'NVDA', preMarketPrice: 176.36, percentChange: -0.22, marketCapDiff: -9.52, marketCap: 4231 },
    { ticker: 'MSFT', preMarketPrice: 512.09, percentChange: -0.08, marketCapDiff: -3.06, marketCap: 3818 },
    { ticker: 'AAPL', preMarketPrice: 212.14, percentChange: -0.89, marketCapDiff: -28.60, marketCap: 3194 },
    { ticker: 'AMZN', preMarketPrice: 231.47, percentChange: -0.57, marketCapDiff: -14.01, marketCap: 2457 },
    { ticker: 'GOOGL', preMarketPrice: 195.13, percentChange: 1.32, marketCapDiff: 14.84, marketCap: 2336 },
    { ticker: 'META', preMarketPrice: 709.81, percentChange: -1.09, marketCapDiff: -16.98, marketCap: 1792 },
    { ticker: 'AVGO', preMarketPrice: 298.67, percentChange: 1.48, marketCapDiff: 20.55, marketCap: 1365 },
    { ticker: 'BRK.B', preMarketPrice: 380.40, percentChange: 0.40, marketCapDiff: 1.6, marketCap: 300 }
  ];

  useEffect(() => {
    // Fetch real data on startup
    fetchStockData(false);
  }, []);

  const fetchStockData = async (refresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Use cached API endpoint
      const response = await fetch(`/api/prices/cached?refresh=${refresh}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      console.log('API response:', result);
      console.log('Stock data length:', result.data?.length);
      
      // Check if we have valid data
      if (result.data && result.data.length > 0) {
        setStockData(result.data);
      } else {
        // No data from API, use mock data
        console.log('No data from API, using mock data');
        setStockData(mockStocks);
        setError('Using demo data - API temporarily unavailable. To get live data, please set up your Polygon.io API key in .env.local file.');
      }
      
      // Log cache status
      if (result.cacheStatus) {
        console.log('Cache status:', result.cacheStatus);
      }
    } catch (err) {
      console.log('API error, using mock data:', err);
      setError('Using demo data - API temporarily unavailable. To get live data, please set up your Polygon.io API key in .env.local file.');
      // Fallback to mock data
      setStockData(mockStocks);
    } finally {
      setLoading(false);
    }
  };

  const favoriteStocks = stockData.filter(stock => favorites.some(fav => fav.ticker === stock.ticker));
  
  // Company name mapping for search
  const getCompanyName = (ticker: string): string => {
    const companyNames: Record<string, string> = {
      'NVDA': 'NVIDIA', 'MSFT': 'Microsoft', 'AAPL': 'Apple', 'AMZN': 'Amazon', 'GOOGL': 'Alphabet', 'GOOG': 'Alphabet',
      'META': 'Meta', 'AVGO': 'Broadcom', 'BRK.A': 'Berkshire Hathaway', 'BRK.B': 'Berkshire Hathaway', 'TSLA': 'Tesla', 'JPM': 'JPMorgan Chase',
      'WMT': 'Walmart', 'LLY': 'Eli Lilly', 'ORCL': 'Oracle', 'V': 'Visa', 'MA': 'Mastercard', 'NFLX': 'Netflix',
      'XOM': 'ExxonMobil', 'COST': 'Costco', 'JNJ': 'Johnson & Johnson', 'HD': 'Home Depot', 'PLTR': 'Palantir',
      'PG': 'Procter & Gamble', 'BAC': 'Bank of America', 'ABBV': 'AbbVie', 'CVX': 'Chevron', 'KO': 'Coca-Cola',
      'AMD': 'Advanced Micro Devices', 'GE': 'General Electric', 'CSCO': 'Cisco', 'TMUS': 'T-Mobile', 'WFC': 'Wells Fargo',
      'CRM': 'Salesforce', 'PM': 'Philip Morris', 'IBM': 'IBM', 'UNH': 'UnitedHealth', 'MS': 'Morgan Stanley',
      'GS': 'Goldman Sachs', 'INTU': 'Intuit', 'LIN': 'Linde', 'ABT': 'Abbott', 'AXP': 'American Express',
      'BX': 'Blackstone', 'DIS': 'Disney', 'MCD': 'McDonald\'s', 'RTX': 'Raytheon', 'NOW': 'ServiceNow',
      'MRK': 'Merck', 'CAT': 'Caterpillar', 'T': 'AT&T', 'PEP': 'PepsiCo', 'UBER': 'Uber', 'BKNG': 'Booking',
      'TMO': 'Thermo Fisher', 'VZ': 'Verizon', 'SCHW': 'Charles Schwab', 'ISRG': 'Intuitive Surgical',
      'QCOM': 'Qualcomm', 'C': 'Citigroup', 'TXN': 'Texas Instruments', 'BA': 'Boeing', 'BLK': 'BlackRock',
      'GEV': 'GE Vernova', 'ACN': 'Accenture', 'SPGI': 'S&P Global', 'AMGN': 'Amgen', 'ADBE': 'Adobe',
      'BSX': 'Boston Scientific', 'SYK': 'Stryker', 'ETN': 'Eaton', 'AMAT': 'Applied Materials', 'ANET': 'Arista Networks',
      'NEE': 'NextEra Energy', 'DHR': 'Danaher', 'HON': 'Honeywell', 'TJX': 'TJX Companies', 'PGR': 'Progressive',
      'GILD': 'Gilead Sciences', 'DE': 'Deere', 'PFE': 'Pfizer', 'COF': 'Capital One', 'KKR': 'KKR',
      'PANW': 'Palo Alto Networks', 'UNP': 'Union Pacific', 'APH': 'Amphenol', 'LOW': 'Lowe\'s', 'LRCX': 'Lam Research',
      'MU': 'Micron Technology', 'ADP': 'Automatic Data Processing', 'CMCSA': 'Comcast', 'COP': 'ConocoPhillips',
      'KLAC': 'KLA Corporation', 'VRTX': 'Vertex Pharmaceuticals', 'MDT': 'Medtronic', 'SNPS': 'Synopsys',
      'NKE': 'Nike', 'CRWD': 'CrowdStrike', 'ADI': 'Analog Devices', 'WELL': 'Welltower', 'CB': 'Chubb',
      'ICE': 'Intercontinental Exchange', 'SBUX': 'Starbucks', 'TT': 'Trane Technologies', 'SO': 'Southern Company',
      'CEG': 'Constellation Energy', 'PLD': 'Prologis', 'DASH': 'DoorDash', 'AMT': 'American Tower',
      'MO': 'Altria', 'MMC': 'Marsh & McLennan', 'CME': 'CME Group', 'CDNS': 'Cadence Design Systems',
      'LMT': 'Lockheed Martin', 'BMY': 'Bristol-Myers Squibb', 'WM': 'Waste Management', 'PH': 'Parker-Hannifin',
      'COIN': 'Coinbase', 'DUK': 'Duke Energy', 'RCL': 'Royal Caribbean', 'MCO': 'Moody\'s', 'MDLZ': 'Mondelez',
      'DELL': 'Dell Technologies', 'TDG': 'TransDigm', 'CTAS': 'Cintas', 'INTC': 'Intel', 'MCK': 'McKesson',
      'ABNB': 'Airbnb', 'GD': 'General Dynamics', 'ORLY': 'O\'Reilly Automotive', 'APO': 'Apollo Global Management',
      'SHW': 'Sherwin-Williams', 'HCA': 'HCA Healthcare', 'EMR': 'Emerson Electric', 'NOC': 'Northrop Grumman',
      'MMM': '3M', 'FTNT': 'Fortinet', 'EQIX': 'Equinix', 'CI': 'Cigna', 'UPS': 'United Parcel Service',
      'FI': 'Fiserv', 'HWM': 'Howmet Aerospace', 'AON': 'Aon', 'PNC': 'PNC Financial', 'CVS': 'CVS Health',
      'RSG': 'Republic Services', 'AJG': 'Arthur J. Gallagher', 'ITW': 'Illinois Tool Works', 'MAR': 'Marriott',
      'ECL': 'Ecolab', 'MSI': 'Motorola Solutions', 'USB': 'U.S. Bancorp', 'WMB': 'Williams Companies',
      'BK': 'Bank of New York Mellon', 'CL': 'Colgate-Palmolive', 'NEM': 'Newmont', 'PYPL': 'PayPal',
      'JCI': 'Johnson Controls', 'ZTS': 'Zoetis', 'VST': 'Vistra', 'EOG': 'EOG Resources', 'CSX': 'CSX',
      'ELV': 'Elevance Health', 'ADSK': 'Autodesk', 'APD': 'Air Products', 'AZO': 'AutoZone', 'HLT': 'Hilton',
      'WDAY': 'Workday', 'SPG': 'Simon Property Group', 'NSC': 'Norfolk Southern', 'KMI': 'Kinder Morgan',
      'TEL': 'TE Connectivity', 'FCX': 'Freeport-McMoRan', 'CARR': 'Carrier Global', 'PWR': 'Quanta Services',
      'REGN': 'Regeneron Pharmaceuticals', 'ROP': 'Roper Technologies', 'CMG': 'Chipotle Mexican Grill',
      'DLR': 'Digital Realty Trust', 'MNST': 'Monster Beverage', 'TFC': 'Truist Financial', 'TRV': 'Travelers',
      'AEP': 'American Electric Power', 'NXPI': 'NXP Semiconductors', 'AXON': 'Axon Enterprise', 'URI': 'United Rentals',
      'COR': 'Cencora', 'FDX': 'FedEx', 'NDAQ': 'Nasdaq', 'AFL': 'Aflac', 'GLW': 'Corning', 'FAST': 'Fastenal',
      'MPC': 'Marathon Petroleum', 'SLB': 'Schlumberger', 'SRE': 'Sempra Energy', 'PAYX': 'Paychex',
      'PCAR': 'PACCAR', 'MET': 'MetLife', 'BDX': 'Becton Dickinson', 'OKE': 'ONEOK', 'DDOG': 'Datadog',
      // International companies
      'TSM': 'Taiwan Semiconductor', 'SAP': 'SAP SE', 'ASML': 'ASML Holding', 'BABA': 'Alibaba Group', 'TM': 'Toyota Motor',
      'AZN': 'AstraZeneca', 'HSBC': 'HSBC Holdings', 'NVS': 'Novartis', 'SHEL': 'Shell',
      'HDB': 'HDFC Bank', 'RY': 'Royal Bank of Canada', 'NVO': 'Novo Nordisk', 'ARM': 'ARM Holdings',
      'SHOP': 'Shopify', 'MUFG': 'Mitsubishi UFJ Financial', 'PDD': 'Pinduoduo', 'UL': 'Unilever',
      'SONY': 'Sony Group', 'TTE': 'TotalEnergies', 'BHP': 'BHP Group', 'SAN': 'Banco Santander', 'TD': 'Toronto-Dominion Bank',
      'SPOT': 'Spotify', 'UBS': 'UBS Group', 'IBN': 'ICICI Bank', 'SNY': 'Sanofi',
      'BUD': 'Anheuser-Busch InBev', 'BTI': 'British American Tobacco', 'BN': 'Brookfield',
      'SMFG': 'Sumitomo Mitsui Financial', 'ENB': 'Enbridge', 'RELX': 'RELX Group', 'TRI': 'Thomson Reuters', 'RACE': 'Ferrari',
      'BBVA': 'Banco Bilbao Vizcaya', 'SE': 'Sea Limited', 'BP': 'BP', 'NTES': 'NetEase', 'BMO': 'Bank of Montreal',
      'RIO': 'Rio Tinto', 'GSK': 'GlaxoSmithKline', 'MFG': 'Mizuho Financial', 'INFY': 'Infosys',
      'CP': 'Canadian Pacific', 'BCS': 'Barclays', 'NGG': 'National Grid', 'BNS': 'Bank of Nova Scotia', 'ING': 'ING Group',
      'EQNR': 'Equinor', 'CM': 'Canadian Imperial Bank', 'CNQ': 'Canadian Natural Resources', 'LYG': 'Lloyds Banking Group',
      'AEM': 'Agnico Eagle Mines', 'DB': 'Deutsche Bank', 'NU': 'Nu Holdings', 'CNI': 'Canadian National Railway',
      'DEO': 'Diageo', 'NWG': 'NatWest Group', 'AMX': 'America Movil', 'MFC': 'Manulife Financial',
      'E': 'Eni', 'WCN': 'Waste Connections', 'SU': 'Suncor Energy', 'TRP': 'TC Energy', 'PBR': 'Petrobras',
      'HMC': 'Honda Motor', 'GRMN': 'Garmin', 'CCEP': 'Coca-Cola Europacific', 'ALC': 'Alcon', 'TAK': 'Takeda Pharmaceutical'
    };
    return companyNames[ticker] || ticker;
  };

  // Filter by search term
  const filteredStocks = stockData.filter(stock => 
    stock.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCompanyName(stock.ticker).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const { sorted: favoriteStocksSorted, sortKey: favSortKey, ascending: favAscending, requestSort: requestFavSort } = 
    useSortableData(favoriteStocks, "marketCap", false);
  const { sorted: allStocksSorted, sortKey: allSortKey, ascending: allAscending, requestSort: requestAllSort } = 
    useSortableData(filteredStocks, "marketCap", false);



  const renderSortIcon = (key: SortKey, currentSortKey: SortKey, ascending: boolean) => {
    if (key === currentSortKey) {
      return ascending ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
    }
    return null;
  };

  const exportToCSV = () => {
    const headers = ['Ticker', 'Company', 'Market Cap (B)', 'Current Price ($)', '% Change', 'Market Cap Diff (B $)'];
    const csvContent = [
      headers.join(','),
      ...allStocksSorted.map(stock => [
        stock.ticker,
        getCompanyName(stock.ticker),
        stock.marketCap,
        stock.preMarketPrice?.toFixed(2) || '0.00',
        stock.percentChange?.toFixed(2) || '0.00',
        stock.marketCapDiff?.toFixed(2) || '0.00'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `premarket-stocks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="header">
        {/* Top Row: Brand + Market Indicators */}
        <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
          <div className="brand-section" style={{ flex: 1, maxWidth: '60%' }}>
            <h1 className="brand-heading">
              <span className="brand-dark">Pre</span>
              <span className="brand-gradient">Market</span>
              <span className="brand-dark">Price</span><span className="brand-dark">.com</span>
            </h1>
            <div className="trading-hours-info">
              <p><strong>Live prices available from 4:00 AM to 8:00 PM EST daily</strong> • Pre-market (4:00-9:30 AM) • Market hours (9:30 AM-4:00 PM) • After-hours (4:00-8:00 PM)</p>
            </div>
            {/* Market Status Indicator */}
            {marketStatus && (
              <div className={`market-status ${marketStatus.isOpen ? 'market-open' : 'market-closed'}`}>
                <div className="market-status-icon">
                  {marketStatus.isOpen ? <Activity size={16} /> : <Clock size={16} />}
                </div>
                <div className="market-status-text">
                  <span className="market-status-label">{marketStatus.message}</span>
                  {!marketStatus.isOpen && marketStatus.nextOpen && (
                    <span className="market-status-next">Next open: {marketStatus.nextOpen}</span>
                  )}
                </div>
              </div>
            )}
            <div className="description-section">
              <p>Track real-time pre-market movements of the top 300 largest companies traded globally. Monitor percentage changes, market cap fluctuations, and build your personalized watchlist.</p>
            </div>
          </div>
          <div className="actions-section">
            {/* Auth Section */}
            <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {user ? (
                <div className="user-info">
                  <div className="user-details">
                    <p className="user-name">{user.name || user.email}</p>
                    <p className="user-status">Signed in</p>
                  </div>
                  <button onClick={logout} className="header-btn">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="header-btn">
                  <User size={16} />
                  Sign In
                </button>
              )}
              {/* Action Buttons */}
              <button onClick={() => fetchStockData(false)} disabled={loading} className="header-btn">
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button onClick={exportToCSV} className="header-btn export-btn">
                <Table size={16} />
                Export CSV
              </button>
            </div>
            {/* Background Status */}
            {backgroundStatus && (
              <div className="background-status">
                <Activity size={14} className={backgroundStatus.isRunning ? 'text-green-600' : 'text-red-600'} />
                <span className="text-xs text-gray-600">
                  {backgroundStatus.isRunning ? 'Auto-updating' : 'Manual mode'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
          <br />
          <small>Showing demo data for testing purposes.</small>
        </div>
      )}

      {favoriteStocks.length > 0 && (
        <section className="favorites">
          <h2 data-icon="⭐">Favorites</h2>
                  <table>
          <thead>
            <tr>
              <th>Logo</th>
              <th onClick={() => requestFavSort("ticker" as SortKey)} className="sortable">
                Ticker
                {renderSortIcon("ticker", favSortKey, favAscending)}
              </th>
              <th>Company Name</th>
              <th onClick={() => requestFavSort("marketCap" as SortKey)} className="sortable">
                Market Cap&nbsp;(B)
                {renderSortIcon("marketCap", favSortKey, favAscending)}
              </th>
              <th onClick={() => requestFavSort("preMarketPrice" as SortKey)} className="sortable">
                Current Price ($)
                {renderSortIcon("preMarketPrice", favSortKey, favAscending)}
              </th>
              <th onClick={() => requestFavSort("percentChange" as SortKey)} className="sortable">
                % Change
                {renderSortIcon("percentChange", favSortKey, favAscending)}
              </th>
              <th onClick={() => requestFavSort("marketCapDiff" as SortKey)} className="sortable">
                Market Cap Diff (B $)
                {renderSortIcon("marketCapDiff", favSortKey, favAscending)}
              </th>
              <th>Favorites</th>
              </tr>
            </thead>
            <tbody>
              {favoriteStocksSorted.map((stock) => (
                <tr key={stock.ticker}>
                  <td>
                    <CompanyLogo ticker={stock.ticker} size={32} />
                  </td>
                  <td><strong>{stock.ticker}</strong></td>
                  <td className="company-name">{getCompanyName(stock.ticker)}</td>
                  <td>{formatBillions(stock.marketCap)}</td>
                  <td>{stock.preMarketPrice?.toFixed(2) || '0.00'}</td>
                  <td className={stock.percentChange >= 0 ? 'positive' : 'negative'}>
                    {stock.percentChange >= 0 ? '+' : ''}{stock.percentChange?.toFixed(2) || '0.00'}%
                  </td>
                  <td className={stock.marketCapDiff >= 0 ? 'positive' : 'negative'}>
                    {stock.marketCapDiff >= 0 ? '+' : ''}{stock.marketCapDiff?.toFixed(2) || '0.00'}
                  </td>
                  <td>
                    <button 
                      className={`favorite-btn ${isFavorite(stock.ticker) ? 'favorited' : ''}`}
                      onClick={() => toggleFavorite(stock.ticker)}
                      title={isFavorite(stock.ticker) ? "Remove from favorites" : "Add to favorites"}
                    >
                      {isFavorite(stock.ticker) ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="all-stocks">
        <div className="section-header">
          <h2 data-icon="📊">All Stocks</h2>
          <div className="search-container">
            <input
              type="text"
              placeholder="Find company"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Market Closed Notice */}
        {marketStatus && !marketStatus.isOpen && (
          <div className="market-closed-notice">
            <AlertCircle size={16} />
            <span>
              <strong>Market is currently closed.</strong> Prices shown are from the last trading session. 
              {marketStatus.nextOpen && ` Market reopens ${marketStatus.nextOpen}.`}
            </span>
          </div>
        )}



        <table>
          <thead>
            <tr>
              <th>Logo</th>
              <th onClick={() => requestAllSort("ticker" as SortKey)} className="sortable">
                Ticker
                {renderSortIcon("ticker", allSortKey, allAscending)}
              </th>
              <th>Company Name</th>
              <th onClick={() => requestAllSort("marketCap" as SortKey)} className="sortable">
                Market Cap&nbsp;(B)
                {renderSortIcon("marketCap", allSortKey, allAscending)}
              </th>
              <th onClick={() => requestAllSort("preMarketPrice" as SortKey)} className="sortable">
                Current Price ($)
                {renderSortIcon("preMarketPrice", allSortKey, allAscending)}
              </th>
              <th onClick={() => requestAllSort("percentChange" as SortKey)} className="sortable">
                % Change
                {renderSortIcon("percentChange", allSortKey, allAscending)}
              </th>
              <th onClick={() => requestAllSort("marketCapDiff" as SortKey)} className="sortable">
                Market Cap Diff (B $)
                {renderSortIcon("marketCapDiff", allSortKey, allAscending)}
              </th>
              <th>Favorites</th>
            </tr>
          </thead>
          <tbody>
            {allStocksSorted.map((stock) => {
              const isFavorited = isFavorite(stock.ticker);
              return (
                <tr key={stock.ticker}>
                  <td>
                    <CompanyLogo ticker={stock.ticker} size={32} />
                  </td>
                  <td><strong>{stock.ticker}</strong></td>
                  <td className="company-name">{getCompanyName(stock.ticker)}</td>
                  <td>{formatBillions(stock.marketCap)}</td>
                  <td>{stock.preMarketPrice?.toFixed(2) || '0.00'}</td>
                  <td className={stock.percentChange >= 0 ? 'positive' : 'negative'}>
                    {stock.percentChange >= 0 ? '+' : ''}{stock.percentChange?.toFixed(2) || '0.00'}%
                  </td>
                  <td className={stock.marketCapDiff >= 0 ? 'positive' : 'negative'}>
                    {stock.marketCapDiff >= 0 ? '+' : ''}{stock.marketCapDiff?.toFixed(2) || '0.00'}
                  </td>
                  <td>
                    <button 
                      className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
                      onClick={() => toggleFavorite(stock.ticker)}
                      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFavorited ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>


      </section>

      <div className="footer">
        <p>Data provided by Polygon.io • Powered by Next.js</p>
        <p>
          <a
            href="https://kiddobank.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Kiddobank.com
          </a>
        </p>
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setShowAuthModal(false);
          // Refresh favorites after login
          window.location.reload();
        }}
      />

      {/* Performance Dashboard */}
      <div className="mb-6">
        <PerformanceDashboard />
      </div>

      {/* Analytics Dashboard */}
      <div className="mb-6">
        <AnalyticsDashboard />
      </div>
    </div>
  );
} 