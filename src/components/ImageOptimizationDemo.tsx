'use client';

import React, { useState } from 'react';
import OptimizedImage from './OptimizedImage';
import CompanyLogo from './CompanyLogo';

interface ImageOptimizationDemoProps {
  className?: string;
}

export default function ImageOptimizationDemo({ className = '' }: ImageOptimizationDemoProps) {
  const [showPerformance, setShowPerformance] = useState(false);

  const demoImages = [
    {
      src: 'https://picsum.photos/400/300?random=1',
      alt: 'Random demo image 1',
      width: 400,
      height: 300
    },
    {
      src: 'https://picsum.photos/400/300?random=2',
      alt: 'Random demo image 2',
      width: 400,
      height: 300
    },
    {
      src: 'https://picsum.photos/400/300?random=3',
      alt: 'Random demo image 3',
      width: 400,
      height: 300
    }
  ];

  const demoLogos = [
    { ticker: 'AAPL', size: 64 },
    { ticker: 'MSFT', size: 64 },
    { ticker: 'GOOGL', size: 64 },
    { ticker: 'TSLA', size: 64 },
    { ticker: 'NVDA', size: 64 },
    { ticker: 'AMZN', size: 64 }
  ];

  return (
    <div className={`image-optimization-demo ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🖼️ Image Optimization Demo
          </h2>
          <button
            onClick={() => setShowPerformance(!showPerformance)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            {showPerformance ? 'Hide' : 'Show'} Performance
          </button>
        </div>

        {/* Performance Info */}
        {showPerformance && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Performance Features
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Lazy loading with Intersection Observer</li>
              <li>• Automatic format detection (WebP/AVIF)</li>
              <li>• Cache status monitoring</li>
              <li>• Load time tracking</li>
              <li>• Retry logic with fallbacks</li>
              <li>• Priority preloading</li>
            </ul>
          </div>
        )}

        {/* Demo Images */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Optimized Images
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {demoImages.map((image, index) => (
              <div key={index} className="space-y-2">
                <OptimizedImage
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  className="w-full h-48 object-cover"
                  fallback={`https://picsum.photos/400/300?random=${index + 10}`}
                  onLoad={() => console.log(`Demo image ${index + 1} loaded`)}
                  onError={() => console.log(`Demo image ${index + 1} failed`)}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {image.alt}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Company Logos */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Company Logos (Auto-fallback)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {demoLogos.map((logo, index) => (
              <div key={index} className="flex flex-col items-center space-y-2">
                <CompanyLogo
                  ticker={logo.ticker}
                  size={logo.size}
                  priority={index < 3}
                  onLoad={() => console.log(`${logo.ticker} logo loaded`)}
                  onError={() => console.log(`${logo.ticker} logo failed`)}
                />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {logo.ticker}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Priority vs Lazy Loading */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Priority vs Lazy Loading
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 dark:text-green-400">
                Priority Image (Eager Loading)
              </h4>
              <OptimizedImage
                src="https://picsum.photos/300/200?random=priority"
                alt="Priority image"
                width={300}
                height={200}
                priority={true}
                className="w-full h-32 object-cover"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loads immediately with high priority
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600 dark:text-blue-400">
                Lazy Image (On View)
              </h4>
              <OptimizedImage
                src="https://picsum.photos/300/200?random=lazy"
                alt="Lazy image"
                width={300}
                height={200}
                priority={false}
                className="w-full h-32 object-cover"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loads when scrolled into view
              </p>
            </div>
          </div>
        </div>

        {/* Error Handling Demo */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Error Handling Demo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-red-600 dark:text-red-400">
                Invalid URL (with fallback)
              </h4>
              <OptimizedImage
                src="https://invalid-url-that-will-fail.com/image.jpg"
                alt="Invalid image"
                width={200}
                height={150}
                fallback="https://picsum.photos/200/150?random=fallback"
                className="w-full h-24 object-cover"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Shows fallback image on error
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-red-600 dark:text-red-400">
                Invalid URL (no fallback)
              </h4>
              <OptimizedImage
                src="https://another-invalid-url.com/image.jpg"
                alt="Invalid image no fallback"
                width={200}
                height={150}
                className="w-full h-24 object-cover"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Shows error state with retry option
              </p>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Usage Instructions
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <p>• <strong>Priority images</strong>: Use <code>priority={true}</code> for above-the-fold content</p>
            <p>• <strong>Fallbacks</strong>: Provide <code>fallback</code> prop for error handling</p>
            <p>• <strong>Performance</strong>: Check browser console for load metrics</p>
            <p>• <strong>Company logos</strong>: Use <code>CompanyLogo</code> component for automatic fallback chain</p>
          </div>
        </div>
      </div>
    </div>
  );
} 