import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || apiKey === 'your_polygon_api_key_here') {
      return NextResponse.json({ error: 'No API key found' }, { status: 400 });
    }

    // Problematic companies that show 0.00 price
    const problematicTickers = [
      'ROP', 'BDX', 'PAYX', 'FOX', 'SPG', 'WCN', 'TRP', 'FB', 'ITW',
      'INTU', 'BKNG', 'TMO', 'DHR', 'PGR', 'UNP', 'VRTX', 'SNPS', 'WELL', 'TT'
    ];

    const results = [];
    console.log(`Testing ${problematicTickers.length} problematic companies...`);

    for (const ticker of problematicTickers) {
      try {
        const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apikey=${apiKey}`;
        console.log(`Testing ${ticker}...`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
          console.log(`❌ ${ticker}: API error ${response.status} - ${data.error || 'Unknown error'}`);
          results.push({
            ticker,
            status: 'error',
            error: `${response.status}: ${data.error || 'Unknown error'}`,
            data: data
          });
          continue;
        }
        
        if (!data?.ticker) {
          console.log(`❌ ${ticker}: No ticker data returned`);
          results.push({
            ticker,
            status: 'no_data',
            error: 'No ticker data returned',
            data: data
          });
          continue;
        }
        
        const tickerData = data.ticker;
        const currentPrice = tickerData.lastTrade?.p || 0;
        const prevClose = tickerData.prevDay?.c || 0;
        const percentChange = tickerData.todaysChangePerc || 0;
        
        console.log(`✅ ${ticker}: $${currentPrice} (${percentChange.toFixed(2)}%)`);
        
        results.push({
          ticker,
          status: 'success',
          currentPrice,
          prevClose,
          percentChange,
          lastTrade: tickerData.lastTrade,
          prevDay: tickerData.prevDay
        });
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ ${ticker}: Exception -`, error.message);
        results.push({
          ticker,
          status: 'exception',
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status !== 'success').length;
    
    return NextResponse.json({
      results,
      summary: {
        total: problematicTickers.length,
        success: successCount,
        errors: errorCount,
        successRate: `${((successCount / problematicTickers.length) * 100).toFixed(1)}%`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to test companies' }, { status: 500 });
  }
} 