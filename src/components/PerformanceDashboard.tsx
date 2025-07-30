'use client';

import React, { useState, useEffect } from 'react';
import { performanceMonitor, type PerformanceData } from '@/lib/performance-api';
import { Activity, Clock, HardDrive, Memory, Network, Zap } from 'lucide-react';

interface PerformanceDashboardProps {
  className?: string;
}

export default function PerformanceDashboard({ className = '' }: PerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const updatePerformanceData = () => {
      const data = performanceMonitor.getPerformanceSummary();
      setPerformanceData(data);
      setLastUpdate(new Date());
    };

    // Initial update
    updatePerformanceData();

    // Update every 5 seconds
    const interval = setInterval(updatePerformanceData, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; poor: number }): string => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.poor) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!performanceData) {
    return (
      <div className={`performance-dashboard ${className}`}>
        <div className="performance-header">
          <Activity className="w-5 h-5 text-gray-400 animate-pulse" />
          <span className="text-gray-500">Načítavam performance dáta...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-dashboard ${className}`}>
      <div className="performance-header">
        <div className="performance-title">
          <Zap className="w-5 h-5 text-blue-500" />
          <span className="performance-title-text">Performance Monitor</span>
        </div>
        
        <div className="performance-actions">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="performance-toggle-btn"
            title={isExpanded ? 'Skryť detaily' : 'Zobraziť detaily'}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="performance-details">
          {/* Navigation Metrics */}
          <div className="performance-section">
            <h4 className="performance-section-title">
              <Network className="w-4 h-4" />
              Navigácia
            </h4>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="performance-label">DNS Lookup</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.navigation.dns, { good: 100, poor: 300 })}`}>
                  {formatTime(performanceData.navigation.dns)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">TCP Connection</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.navigation.tcp, { good: 200, poor: 600 })}`}>
                  {formatTime(performanceData.navigation.tcp)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">TTFB</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.navigation.ttfb, { good: 800, poor: 1800 })}`}>
                  {formatTime(performanceData.navigation.ttfb)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">DOM Ready</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.navigation.domContentLoaded, { good: 2000, poor: 4000 })}`}>
                  {formatTime(performanceData.navigation.domContentLoaded)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Load Complete</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.navigation.loadComplete, { good: 3000, poor: 6000 })}`}>
                  {formatTime(performanceData.navigation.loadComplete)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Total Time</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.navigation.totalTime, { good: 5000, poor: 10000 })}`}>
                  {formatTime(performanceData.navigation.totalTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Resource Metrics */}
          <div className="performance-section">
            <h4 className="performance-section-title">
              <HardDrive className="w-4 h-4" />
              Zdroje
            </h4>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="performance-label">Total Resources</span>
                <span className="performance-value">{performanceData.resources.total}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Cached</span>
                <span className="performance-value text-green-500">{performanceData.resources.cached}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Network</span>
                <span className="performance-value text-blue-500">{performanceData.resources.network}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Avg Size</span>
                <span className="performance-value">{formatBytes(performanceData.resources.averageSize)}</span>
              </div>
            </div>
          </div>

          {/* Memory Metrics */}
          <div className="performance-section">
            <h4 className="performance-section-title">
              <Memory className="w-4 h-4" />
              Pamäť
            </h4>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="performance-label">Used</span>
                <span className="performance-value">{formatBytes(performanceData.memory.used)}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Total</span>
                <span className="performance-value">{formatBytes(performanceData.memory.total)}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Limit</span>
                <span className="performance-value">{formatBytes(performanceData.memory.limit)}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">Usage %</span>
                <span className={`performance-value ${getPerformanceColor((performanceData.memory.used / performanceData.memory.limit) * 100, { good: 50, poor: 80 })}`}>
                  {((performanceData.memory.used / performanceData.memory.limit) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Paint Metrics */}
          <div className="performance-section">
            <h4 className="performance-section-title">
              <Clock className="w-4 h-4" />
              Paint
            </h4>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="performance-label">First Paint</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.paint.firstPaint, { good: 1000, poor: 3000 })}`}>
                  {formatTime(performanceData.paint.firstPaint)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">FCP</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.paint.firstContentfulPaint, { good: 1800, poor: 3000 })}`}>
                  {formatTime(performanceData.paint.firstContentfulPaint)}
                </span>
              </div>
              <div className="performance-item">
                <span className="performance-label">LCP</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.paint.largestContentfulPaint, { good: 2500, poor: 4000 })}`}>
                  {formatTime(performanceData.paint.largestContentfulPaint)}
                </span>
              </div>
            </div>
          </div>

          {/* Layout Metrics */}
          <div className="performance-section">
            <h4 className="performance-section-title">
              <Activity className="w-4 h-4" />
              Layout
            </h4>
            <div className="performance-grid">
              <div className="performance-item">
                <span className="performance-label">Layout Shifts</span>
                <span className="performance-value">{performanceData.layout.layoutShifts}</span>
              </div>
              <div className="performance-item">
                <span className="performance-label">CLS Score</span>
                <span className={`performance-value ${getPerformanceColor(performanceData.layout.cumulativeLayoutShift, { good: 0.1, poor: 0.25 })}`}>
                  {performanceData.layout.cumulativeLayoutShift.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          {/* Last Update */}
          <div className="performance-footer">
            <span className="performance-update-time">
              Posledná aktualizácia: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 