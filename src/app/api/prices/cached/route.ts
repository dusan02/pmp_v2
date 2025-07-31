import { NextRequest, NextResponse } from 'next/server';
import { stockDataCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    // Check for API key first
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || apiKey === 'your_polygon_api_key_here') {
      console.log('No API key found, loading demo data...');
      await stockDataCache.loadDemoData();
      const results = await stockDataCache.getAllStocks();
      return NextResponse.json({
        data: results,
        cacheStatus: await stockDataCache.getCacheStatus(),
        message: 'Demo data loaded (no API key)'
      });
    }

    // If refresh is requested or cache is empty, fetch live data
    const cacheStatus = await stockDataCache.getCacheStatus();
    if (refresh || cacheStatus.count === 0) {
      console.log('Fetching live data...');
      
      // Get all tickers from cache (300+ companies)
      const allTickers = stockDataCache.getAllTickers();
      // Take all companies (328 total)
      const tickersToFetch = allTickers;
      console.log(`Fetching data for ${tickersToFetch.length} companies (all available)...`);
      
      const results = [];
      
      for (const ticker of tickersToFetch) {
        try {
          // Get snapshot data for price
          const snapshotUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${apiKey}`;
          const snapshotResponse = await fetch(snapshotUrl);
          
          if (!snapshotResponse.ok) {
            console.log(`Snapshot API call failed for ${ticker}: ${snapshotResponse.status}`);
            continue;
          }
          
          const snapshotData = await snapshotResponse.json();
          
          if (!snapshotData?.ticker) {
            console.log(`No snapshot data returned for ${ticker}`);
            continue;
          }
          
          const tickerData = snapshotData.ticker;
          const currentPrice = tickerData.lastTrade.p;
          const prevClose = tickerData.prevDay.c;
          const percentChange = tickerData.todaysChangePerc;
          
          // Get market cap data from reference endpoint
          let marketCap = 0;
          let sharesOutstanding = 0;
          
          try {
            const referenceUrl = `https://api.polygon.io/v3/reference/tickers/${ticker}?apikey=${apiKey}`;
            const referenceResponse = await fetch(referenceUrl);
            
            if (referenceResponse.ok) {
              const referenceData = await referenceResponse.json();
              
              if (referenceData?.results) {
                const tickerInfo = referenceData.results;
                marketCap = tickerInfo.market_cap / 1000000000; // Convert from cents to billions
                sharesOutstanding = tickerInfo.share_class_shares_outstanding || tickerInfo.weighted_shares_outstanding;
                console.log(`${ticker}: Using Polygon market cap: ${marketCap.toFixed(2)}B (shares: ${sharesOutstanding})`);
              }
            }
          } catch (error) {
            console.log(`${ticker}: Reference API failed, using fallback calculation`);
          }
          
          // If no market cap from reference API, calculate from shares
          if (marketCap === 0) {
            if (sharesOutstanding > 0) {
              marketCap = (currentPrice * sharesOutstanding) / 1000000000;
              console.log(`${ticker}: Calculated market cap from shares: ${marketCap.toFixed(2)}B (shares: ${sharesOutstanding})`);
            } else {
              // Fallback to our cached share count
              const shares = stockDataCache.getShareCount(ticker) || 1000000000;
              marketCap = (currentPrice * shares) / 1000000000;
              console.log(`${ticker}: Using fallback market cap: ${marketCap.toFixed(2)}B (shares: ${shares})`);
            }
          }
          
          // Calculate current market cap (yesterday market cap * (1 + percentChange / 100))
          const yesterdayMarketCap = marketCap;
          const currentMarketCap = yesterdayMarketCap * (1 + percentChange / 100);

          // Calculate market cap difference (current - yesterday)
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
          console.log(`${ticker}: $${currentPrice} (${percentChange.toFixed(2)}%) - Market Cap: ${marketCap.toFixed(2)}B`);
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 500ms to 100ms
        } catch (error) {
          console.error(`Error fetching ${ticker}:`, error);
        }
      }
      
      if (results.length > 0) {
        // Filter out stocks with 0 prices and update cache with valid data only
        const validResults = results.filter(stock => stock.preMarketPrice > 0);
        console.log(`Filtered out ${results.length - validResults.length} stocks with 0 prices`);
        
        if (validResults.length > 0) {
          await stockDataCache.updateCacheWithData(validResults);
          return NextResponse.json({
            data: validResults,
            cacheStatus: await stockDataCache.getCacheStatus(),
            message: `Live data loaded: ${validResults.length} stocks (filtered ${results.length - validResults.length} with 0 prices)`
          });
        }
      } else {
        // Fallback to demo data
        console.log('No live data available, loading demo data...');
        await stockDataCache.loadDemoData();
        const demoResults = await stockDataCache.getAllStocks();
        return NextResponse.json({
          data: demoResults,
          cacheStatus: await stockDataCache.getCacheStatus(),
          message: 'Demo data loaded (live API failed)'
        });
      }
    } else {
      // Return cached data
      const results = await stockDataCache.getAllStocks();
      return NextResponse.json({
        data: results,
        cacheStatus: await stockDataCache.getCacheStatus(),
        message: 'Data from cache'
      });
    }
  } catch (error) {
    console.error('Error in cached prices endpoint:', error);
    // Fallback to demo data
    await stockDataCache.loadDemoData();
    const results = await stockDataCache.getAllStocks();
    return NextResponse.json({
      data: results,
      cacheStatus: await stockDataCache.getCacheStatus(),
      message: 'Demo data loaded (error occurred)'
    });
  }
} 