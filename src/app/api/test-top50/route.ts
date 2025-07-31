import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || apiKey === 'your_polygon_api_key_here') {
      return NextResponse.json({ error: 'No API key found' }, { status: 400 });
    }

    // Get first 50 tickers from the full list
    const top50Tickers = [
      'NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'BRK.B', 'JPM',
      'LLY', 'V', 'WMT', 'XOM', 'UNH', 'JNJ', 'PG', 'HD', 'MA', 'CVX',
      'ORCL', 'NFLX', 'COST', 'ABBV', 'BAC', 'KO', 'AMD', 'GE', 'CSCO', 'TMUS',
      'WFC', 'CRM', 'PM', 'IBM', 'MS', 'GS', 'INTU', 'LIN', 'ABT', 'AXP',
      'BX', 'DIS', 'MCD', 'RTX', 'NOW', 'MRK', 'CAT', 'T', 'PEP', 'UBER'
    ];

    const results = [];
    console.log(`Fetching data for ${top50Tickers.length} companies...`);

    for (const ticker of top50Tickers) {
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
        
        const stockData = {
          ticker,
          currentPrice,
          prevClose,
          percentChange,
          lastUpdated: new Date()
        };
        
        results.push(stockData);
        console.log(`${ticker}: $${currentPrice} (${percentChange.toFixed(2)}%)`);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
      }
    }
    
    return NextResponse.json({
      data: results,
      totalFetched: results.length,
      message: `Successfully fetched ${results.length} out of ${top50Tickers.length} companies`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
} 