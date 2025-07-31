import { NextResponse } from 'next/server';

export async function GET() {
  const demoStocks = [
    { ticker: 'NVDA', preMarketPrice: 176.36, closePrice: 176.75, percentChange: -0.22, marketCapDiff: -9.52, marketCap: 4231, lastUpdated: new Date() },
    { ticker: 'MSFT', preMarketPrice: 512.09, closePrice: 512.50, percentChange: -0.08, marketCapDiff: -3.06, marketCap: 3818, lastUpdated: new Date() },
    { ticker: 'AAPL', preMarketPrice: 212.14, closePrice: 214.04, percentChange: -0.89, marketCapDiff: -28.60, marketCap: 3194, lastUpdated: new Date() },
    { ticker: 'AMZN', preMarketPrice: 231.47, closePrice: 232.80, percentChange: -0.57, marketCapDiff: -14.01, marketCap: 2457, lastUpdated: new Date() },
    { ticker: 'GOOGL', preMarketPrice: 195.13, closePrice: 192.58, percentChange: 1.32, marketCapDiff: 14.84, marketCap: 2336, lastUpdated: new Date() },
    { ticker: 'META', preMarketPrice: 709.81, closePrice: 717.64, percentChange: -1.09, marketCapDiff: -16.98, marketCap: 1792, lastUpdated: new Date() },
    { ticker: 'AVGO', preMarketPrice: 298.67, closePrice: 294.31, percentChange: 1.48, marketCapDiff: 20.55, marketCap: 1365, lastUpdated: new Date() },
    { ticker: 'BRK.B', preMarketPrice: 380.40, closePrice: 378.88, percentChange: 0.40, marketCapDiff: 1.6, marketCap: 300, lastUpdated: new Date() }
  ];

  return NextResponse.json({
    data: demoStocks,
    message: 'Demo data loaded successfully',
    timestamp: new Date().toISOString()
  });
} 