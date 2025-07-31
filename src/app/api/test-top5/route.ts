import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || apiKey === 'your_polygon_api_key_here') {
      return NextResponse.json({ error: 'No API key found' }, { status: 400 });
    }

    const top5Tickers = ['NVDA', 'MSFT', 'AAPL', 'AMZN', 'META'];
    const results = [];

    for (const ticker of top5Tickers) {
      try {
        const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${apiKey}`;
        console.log(`Fetching ${ticker} data...`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
          console.error(`${ticker} API error:`, data);
          continue;
        }

        const tickerData = data.ticker;
        const currentPrice = tickerData.lastTrade.p;
        const prevClose = tickerData.prevDay.c;
        const percentChange = tickerData.todaysChangePerc;

        const result = {
          ticker,
          currentPrice,
          prevClose,
          percentChange,
          lastUpdated: new Date()
        };

        results.push(result);
        console.log(`${ticker}: $${currentPrice} (${percentChange.toFixed(2)}%)`);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
      }
    }

    return NextResponse.json({
      data: results,
      message: `Successfully fetched ${results.length}/5 stocks`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-top5:', error);
    return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
  }
} 