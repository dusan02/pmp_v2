import { NextResponse } from 'next/server';
import { stockDataCache } from '@/lib/cache';

export async function GET() {
  try {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || apiKey === 'your_polygon_api_key_here') {
      return NextResponse.json({ error: 'No API key found' }, { status: 400 });
    }

    // Get current cache data
    const currentData = await stockDataCache.getAllStocks();
    const zeroPriceStocks = currentData.filter(stock => stock.preMarketPrice === 0);
    
    console.log(`🔧 Fixing ${zeroPriceStocks.length} stocks with 0 prices...`);

    const fixedResults = [];
    
    for (const stock of zeroPriceStocks) {
      try {
        const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${stock.ticker}?apikey=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.log(`❌ API call failed for ${stock.ticker}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (!data?.ticker) {
          console.log(`❌ No data returned for ${stock.ticker}`);
          continue;
        }
        
        const tickerData = data.ticker;
        const currentPrice = tickerData.lastTrade?.p || 0;
        const prevClose = tickerData.prevDay?.c || 0;
        const percentChange = tickerData.todaysChangePerc || 0;
        
        if (currentPrice > 0) {
          // Calculate market cap (simplified)
          const shares = stockDataCache.getShareCount(stock.ticker) || 1000000000;
          const marketCap = (currentPrice * shares) / 1000000000;
          const prevMarketCap = (prevClose * shares) / 1000000000;
          const marketCapDiff = marketCap - prevMarketCap;
          
          const fixedStock = {
            ticker: stock.ticker,
            preMarketPrice: currentPrice,
            closePrice: prevClose,
            percentChange,
            marketCapDiff,
            marketCap,
            lastUpdated: new Date()
          };
          
          fixedResults.push(fixedStock);
          console.log(`✅ Fixed ${stock.ticker}: $${currentPrice} (${percentChange.toFixed(2)}%)`);
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error fixing ${stock.ticker}:`, error);
      }
    }
    
    if (fixedResults.length > 0) {
      // Merge fixed results with existing valid data
      const validExistingData = currentData.filter(stock => stock.preMarketPrice > 0);
      const allValidData = [...validExistingData, ...fixedResults];
      
      // Update cache with all valid data
      await stockDataCache.updateCacheWithData(allValidData);
      
      return NextResponse.json({
        message: `Fixed ${fixedResults.length} stocks with 0 prices`,
        fixedCount: fixedResults.length,
        totalValidStocks: allValidData.length,
        fixedStocks: fixedResults.map(s => ({ ticker: s.ticker, price: s.preMarketPrice }))
      });
    } else {
      return NextResponse.json({
        message: 'No stocks with 0 prices found or all fixes failed',
        fixedCount: 0
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fix zero prices' }, { status: 500 });
  }
} 