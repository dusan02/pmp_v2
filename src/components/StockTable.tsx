'use client';

import { Star } from 'lucide-react';

export default function StockTable({ stocks, favorites, toggleFavorite }: any) {
  // Add null check to prevent map error
  if (!stocks || !Array.isArray(stocks)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No stock data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
          <tr>
            {['Ticker', 'Pre-Market Price', 'Close Price', '% Change', 'Market Cap Diff (B)', 'Favorite'].map((header) => (
              <th key={header} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {stocks.map((stock: any) => {
            const isFavorite = favorites.includes(stock.ticker);
            const isPositive = stock.percentChange >= 0;

            return (
              <tr key={stock.ticker} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <td className="px-4 py-3 font-medium">{stock.ticker}</td>
                <td className="px-4 py-3">${stock.preMarketPrice?.toFixed(2) || '0.00'}</td>
                <td className="px-4 py-3">${stock.closePrice?.toFixed(2) || '0.00'}</td>
                <td className={`px-4 py-3 font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? '+' : ''}
                  {stock.percentChange?.toFixed(2) || '0.00'}%
                </td>
                <td className="px-4 py-3 text-green-500">
                  +${stock.marketCapDiff?.toFixed(2) || '0.00'}B
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleFavorite(stock.ticker)}>
                    <Star size={16} className={isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 