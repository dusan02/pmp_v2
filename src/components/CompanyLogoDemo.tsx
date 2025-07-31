'use client';

import React, { useState, useEffect } from 'react';
import CompanyLogo, { clearLogoCache, getLogoCacheStats, preloadCompanyLogos } from './CompanyLogo';
import { getLogoSourceStats, preloadLogos } from '@/lib/getLogoUrl';

interface CompanyLogoDemoProps {
  className?: string;
}

export default function CompanyLogoDemo({ className = '' }: CompanyLogoDemoProps) {
  const [showStats, setShowStats] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [sourceStats, setSourceStats] = useState<any[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);

  const demoCompanies = [
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'MSFT', name: 'Microsoft Corporation' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.' },
    { ticker: 'TSLA', name: 'Tesla Inc.' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.' },
    { ticker: 'META', name: 'Meta Platforms Inc.' },
    { ticker: 'NFLX', name: 'Netflix Inc.' },
    { ticker: 'UBER', name: 'Uber Technologies Inc.' },
    { ticker: 'SPOT', name: 'Spotify Technology S.A.' },
    { ticker: 'COIN', name: 'Coinbase Global Inc.' },
    { ticker: 'PLTR', name: 'Palantir Technologies Inc.' }
  ];

  const logoVariants = [
    { name: 'Default (Circular)', variant: 'default' as const },
    { name: 'Square', variant: 'square' as const },
    { name: 'Rounded', variant: 'rounded' as const }
  ];

  const logoSizes = [24, 32, 48, 64, 96];

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setCacheStats(getLogoCacheStats());
      setSourceStats(getLogoSourceStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePreloadLogos = async () => {
    setIsPreloading(true);
    try {
      const tickers = demoCompanies.map(company => company.ticker);
      await preloadLogos(tickers, 32);
      console.log('✅ Logos preloaded successfully');
    } catch (error) {
      console.error('❌ Failed to preload logos:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  const handleClearCache = () => {
    clearLogoCache();
    setCacheStats(getLogoCacheStats());
    console.log('🧹 Logo cache cleared');
  };

  return (
    <div className={`company-logo-demo ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🏢 Company Logo Optimization Demo
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {showStats ? 'Hide' : 'Show'} Stats
            </button>
            <button
              onClick={handlePreloadLogos}
              disabled={isPreloading}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isPreloading ? 'Preloading...' : 'Preload Logos'}
            </button>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Performance Stats */}
        {showStats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cache Stats */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Cache Statistics
              </h3>
              {cacheStats && (
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p>Total cached: {cacheStats.total}</p>
                  <p>Successful: {cacheStats.successful}</p>
                  <p>Failed: {cacheStats.failed}</p>
                  <p>Success rate: {cacheStats.successRate.toFixed(1)}%</p>
                  <p>Avg load time: {cacheStats.averageLoadTime.toFixed(1)}ms</p>
                </div>
              )}
            </div>

            {/* Source Stats */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                Source Performance
              </h3>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                {sourceStats.map((stat, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{stat.source.split('/')[2]}:</span>
                    <span>{stat.successRate.toFixed(1)}% ({stat.totalAttempts})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logo Variants */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Logo Variants
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logoVariants.map((variant) => (
              <div key={variant.variant} className="space-y-4">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  {variant.name}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {demoCompanies.slice(0, 6).map((company) => (
                    <div key={company.ticker} className="flex items-center space-x-2">
                      <CompanyLogo
                        ticker={company.ticker}
                        size={32}
                        variant={variant.variant}
                        priority={false}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {company.ticker}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logo Sizes */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Logo Sizes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {logoSizes.map((size) => (
              <div key={size} className="text-center space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  {size}px
                </h4>
                <div className="flex justify-center">
                  <CompanyLogo
                    ticker="AAPL"
                    size={size}
                    priority={size <= 48}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Apple Inc.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Company Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Company Logo Grid
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {demoCompanies.map((company) => (
              <div key={company.ticker} className="text-center space-y-2">
                <CompanyLogo
                  ticker={company.ticker}
                  size={48}
                  priority={false}
                  onLoad={() => console.log(`✅ ${company.ticker} logo loaded`)}
                  onError={() => console.log(`❌ ${company.ticker} logo failed`)}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {company.ticker}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {company.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Features */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 dark:text-green-400">
                ✅ Optimized Features
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Intelligent caching with 24h TTL</li>
                <li>• Performance-based source ordering</li>
                <li>• Automatic retry with exponential backoff</li>
                <li>• Multiple fallback sources</li>
                <li>• Load time tracking</li>
                <li>• Priority preloading</li>
                <li>• Variant support (circular, square, rounded)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600 dark:text-blue-400">
                🔧 Advanced Features
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Global cache management</li>
                <li>• Source performance tracking</li>
                <li>• Batch preloading</li>
                <li>• Custom cache keys</li>
                <li>• Analytics integration</li>
                <li>• Development indicators</li>
                <li>• Error tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Usage Examples
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p><strong>Basic usage:</strong> <code>&lt;CompanyLogo ticker="AAPL" /&gt;</code></p>
              <p><strong>With priority:</strong> <code>&lt;CompanyLogo ticker="AAPL" priority={true} /&gt;</code></p>
              <p><strong>Custom size:</strong> <code>&lt;CompanyLogo ticker="AAPL" size={64} /&gt;</code></p>
              <p><strong>Square variant:</strong> <code>&lt;CompanyLogo ticker="AAPL" variant="square" /&gt;</code></p>
              <p><strong>With callbacks:</strong> <code>&lt;CompanyLogo ticker="AAPL" onLoad={() => console.log('Loaded')} /&gt;</code></p>
              <p><strong>Preload logos:</strong> <code>preloadCompanyLogos(['AAPL', 'MSFT'], 32)</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 