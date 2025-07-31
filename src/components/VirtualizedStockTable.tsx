'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatBillions } from '@/lib/format';
import CompanyLogo from '@/components/CompanyLogo';

interface StockData {
  ticker: string;
  preMarketPrice: number;
  percentChange: number;
  marketCapDiff: number;
  currentMarketCap: number;
}

type SortKey = 'ticker' | 'currentMarketCap' | 'preMarketPrice' | 'percentChange' | 'marketCapDiff';

interface VirtualizedStockTableProps {
  stocks: StockData[];
  favorites: any[];
  isFavorite: (ticker: string) => boolean;
  toggleFavorite: (ticker: string) => void;
  getCompanyName: (ticker: string) => string;
  sortKey: SortKey;
  ascending: boolean;
  requestSort: (key: SortKey) => void;
}

const ROW_HEIGHT = 60; // Height of each table row
const BUFFER_SIZE = 5; // Number of extra rows to render above/below visible area

export default function VirtualizedStockTable({
  stocks,
  favorites,
  isFavorite,
  toggleFavorite,
  getCompanyName,
  sortKey,
  ascending,
  requestSort
}: VirtualizedStockTableProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(
    stocks.length,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_SIZE
  );

  // Get visible stocks
  const visibleStocks = stocks.slice(startIndex, endIndex);

  // Calculate total height for scrollbar
  const totalHeight = stocks.length * ROW_HEIGHT;

  // Calculate offset for visible rows
  const offsetY = startIndex * ROW_HEIGHT;

  const renderSortIcon = (key: SortKey) => {
    if (key === sortKey) {
      return ascending ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
    }
    return null;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  return (
    <div className="virtualized-table-container">
      <table className="virtualized-table">
        <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
          <tr>
            <th>Logo</th>
            <th onClick={() => requestSort("ticker" as SortKey)} className="sortable">
              Ticker
              {renderSortIcon("ticker")}
            </th>
            <th>Company Name</th>
            <th onClick={() => requestSort("currentMarketCap" as SortKey)} className="sortable">
              Current Market Cap&nbsp;(B)
              {renderSortIcon("currentMarketCap")}
            </th>
            <th onClick={() => requestSort("preMarketPrice" as SortKey)} className="sortable">
              Current Price ($)
              {renderSortIcon("preMarketPrice")}
            </th>
            <th onClick={() => requestSort("percentChange" as SortKey)} className="sortable">
              % Change
              {renderSortIcon("percentChange")}
            </th>
            <th onClick={() => requestSort("marketCapDiff" as SortKey)} className="sortable">
              Market Cap Diff (B $)
              {renderSortIcon("marketCapDiff")}
            </th>
            <th>Favorites</th>
          </tr>
        </thead>
      </table>
      
      <div 
        ref={containerRef}
        className="virtualized-table-body"
        style={{ height: '600px', overflow: 'auto' }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            <table className="virtualized-table">
              <tbody>
                {visibleStocks.map((stock, index) => {
                  const actualIndex = startIndex + index;
                  const favorited = isFavorite(stock.ticker);
                  
                  return (
                    <tr key={`${stock.ticker}-${actualIndex}`} style={{ height: ROW_HEIGHT }}>
                      <td>
                        <CompanyLogo ticker={stock.ticker} size={32} priority={false} />
                      </td>
                      <td><strong>{stock.ticker}</strong></td>
                      <td className="company-name">{getCompanyName(stock.ticker)}</td>
                      <td>{formatBillions(stock.currentMarketCap)}</td>
                      <td>{stock.preMarketPrice?.toFixed(2) || '0.00'}</td>
                      <td className={stock.percentChange >= 0 ? 'positive' : 'negative'}>
                        {stock.percentChange >= 0 ? '+' : ''}{stock.percentChange?.toFixed(2) || '0.00'}%
                      </td>
                      <td className={stock.marketCapDiff >= 0 ? 'positive' : 'negative'}>
                        {stock.marketCapDiff >= 0 ? '+' : ''}{stock.marketCapDiff?.toFixed(2) || '0.00'}
                      </td>
                      <td>
                        <button 
                          className={`favorite-btn ${favorited ? 'favorited' : ''}`}
                          onClick={() => toggleFavorite(stock.ticker)}
                          title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {favorited ? '★' : '☆'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 