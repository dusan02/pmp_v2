import { NextResponse } from 'next/server';
import { stockDataCache } from '@/lib/cache';

export async function GET() {
  try {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || apiKey === 'your_polygon_api_key_here') {
      return NextResponse.json({ error: 'No API key found' }, { status: 400 });
    }

    // Get all tickers (328 companies)
    const allTickers = stockDataCache.getAllTickers();
    console.log(`Starting background load of ${allTickers.length} companies...`);

    // Start background process
    setTimeout(async () => {
      const results = [];
      
      for (const ticker of allTickers) {
        try {
          const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${apiKey}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            console.log(`API call failed for ${ticker}: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (!data?.ticker) {
            console.log(`No data returned for ${ticker}`);
            continue;
          }
          
          const tickerData = data.ticker;
          const currentPrice = tickerData.lastTrade.p;
          const prevClose = tickerData.prevDay.c;
          const percentChange = tickerData.todaysChangePerc;
          
          // Calculate market cap (simplified)
          const shares = stockDataCache.getShareCount(ticker) || 1000000000;
          const marketCap = (currentPrice * shares) / 1000000000;
          const prevMarketCap = (prevClose * shares) / 1000000000;
          const marketCapDiff = marketCap - prevMarketCap;
          
          const stockData = {
            ticker,
            preMarketPrice: currentPrice,
            closePrice: prevClose,
            percentChange,
            marketCapDiff,
            marketCap,
            lastUpdated: new Date()
          };
          
          results.push(stockData);
          console.log(`${ticker}: $${currentPrice} (${percentChange.toFixed(2)}%)`);
          
          // Minimal delay
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error(`Error fetching ${ticker}:`, error);
        }
      }
      
      if (results.length > 0) {
        // Update cache with all data
        await stockDataCache.updateCacheWithData(results);
        console.log(`✅ Background load completed: ${results.length} companies loaded`);
      }
    }, 1000);

    return NextResponse.json({
      message: `Background load started for ${allTickers.length} companies`,
      status: 'loading',
      totalCompanies: allTickers.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start background load' }, { status: 500 });
  }
} 