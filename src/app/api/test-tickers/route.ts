import { NextResponse } from 'next/server';
import { stockDataCache } from '@/lib/cache';

export async function GET() {
  try {
    const tickers = stockDataCache.getAllTickers();
    return NextResponse.json({
      totalTickers: tickers.length,
      first10: tickers.slice(0, 10),
      last10: tickers.slice(-10),
      message: `Total tickers available: ${tickers.length}`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get tickers' }, { status: 500 });
  }
} 