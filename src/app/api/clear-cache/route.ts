import { NextResponse } from 'next/server';
import { stockDataCache } from '@/lib/cache';

export async function GET() {
  try {
    console.log('🧹 Clearing cache and reloading all data...');
    
    // Clear the cache
    await stockDataCache.clearCache();
    
    // Start fresh background load
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || apiKey === 'your_polygon_api_key_here') {
      return NextResponse.json({ error: 'No API key found' }, { status: 400 });
    }

    const allTickers = stockDataCache.getAllTickers();
    console.log(`🔄 Starting fresh load of ${allTickers.length} companies...`);

    // Start background process
    setTimeout(async () => {
      const results = [];
      
      for (const ticker of allTickers) {
        try {
          const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${apiKey}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            console.log(`❌ API call failed for ${ticker}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (!data?.ticker) {
            console.log(`❌ No data returned for ${ticker}`);
            continue;
          }
          
          const tickerData = data.ticker;
          const currentPrice = tickerData.lastTrade?.p || 0;
          const prevClose = tickerData.prevDay?.c || 0;
          const percentChange = tickerData.todaysChangePerc || 0;
          
          // Calculate current market cap (yesterday market cap * (1 + percentChange / 100))
          const shares = stockDataCache.getShareCount(ticker) || 1000000000;
          const yesterdayMarketCap = (prevClose * shares) / 1000000000;
          const currentMarketCap = yesterdayMarketCap * (1 + percentChange / 100);
          const marketCapDiff = currentMarketCap - yesterdayMarketCap;
          
          const stockData = {
            ticker,
            preMarketPrice: currentPrice,
            closePrice: prevClose,
            percentChange,
            marketCapDiff: Math.round(marketCapDiff * 100) / 100,
            currentMarketCap: Math.round(currentMarketCap * 100) / 100,
            lastUpdated: new Date()
          };
          
          results.push(stockData);
          console.log(`✅ ${ticker}: $${currentPrice} (${percentChange.toFixed(2)}%)`);
          
          // Minimal delay
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`❌ Error fetching ${ticker}:`, error);
        }
      }
      
      if (results.length > 0) {
        // Update cache with fresh data
        await stockDataCache.updateCacheWithData(results);
        console.log(`🎉 Fresh load completed: ${results.length} companies loaded`);
      }
    }, 1000);

    return NextResponse.json({
      message: `Cache cleared and fresh load started for ${allTickers.length} companies`,
      status: 'reloading',
      totalCompanies: allTickers.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
} 