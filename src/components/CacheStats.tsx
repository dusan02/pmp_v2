'use client';
import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Trash2, Zap, Target, TrendingUp } from 'lucide-react';
import { swManager, type CacheStats } from '@/lib/sw-register';

interface CacheStatsProps {
  className?: string;
}

export default function CacheStats({ className = '' }: CacheStatsProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const cacheStats = await swManager.getCacheStats();
      if (cacheStats) {
        setStats(cacheStats);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    setLoading(true);
    try {
      await swManager.clearCache();
      await fetchStats(); // Refresh stats after clearing
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const warmCache = async () => {
    setLoading(true);
    try {
      await swManager.warmCache();
      console.log('Cache warming initiated');
    } catch (error) {
      console.error('Failed to warm cache:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Update stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className={`cache-stats-container ${className}`}>
        <div className="cache-stats-header">
          <Activity className="w-5 h-5" />
          <span>Cache Performance</span>
        </div>
        <div className="cache-stats-content">
          <p>Loading cache statistics...</p>
        </div>
      </div>
    );
  }

  const { hits, misses, errors, strategyStats, priorityStats, contentTypeStats } = stats;
  const total = hits + misses;
  const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : '0';

  // Calculate strategy-specific metrics
  const strategyMetrics = Object.entries(strategyStats).map(([strategy, stats]) => {
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0';
    return { strategy, hitRate, hits: stats.hits, misses: stats.misses };
  });

  // Calculate priority-specific metrics
  const priorityMetrics = Object.entries(priorityStats).map(([priority, stats]) => {
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0';
    return { priority, hitRate, hits: stats.hits, misses: stats.misses };
  });

  return (
    <div className={`cache-stats-container ${className}`}>
      <div className="cache-stats-header">
        <Activity className="w-5 h-5" />
        <span>Cache Performance</span>
        <div className="cache-stats-actions">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="cache-stats-btn"
            title="Refresh stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={warmCache}
            disabled={loading}
            className="cache-stats-btn"
            title="Warm cache"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={clearCache}
            disabled={loading}
            className="cache-clear-btn"
            title="Clear all caches"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="cache-stats-content">
        {/* Overall Stats */}
        <div className="cache-stats-section">
          <h4 className="cache-stats-section-title">Overall Performance</h4>
          <div className="cache-stats-grid">
            <div className="cache-stat-item">
              <span className="cache-stat-label">Hit Rate</span>
              <span className="cache-stat-value cache-hit">{hitRate}%</span>
            </div>
            <div className="cache-stat-item">
              <span className="cache-stat-label">Hits</span>
              <span className="cache-stat-value cache-hit">{hits}</span>
            </div>
            <div className="cache-stat-item">
              <span className="cache-stat-label">Misses</span>
              <span className="cache-stat-value cache-miss">{misses}</span>
            </div>
            <div className="cache-stat-item">
              <span className="cache-stat-label">Errors</span>
              <span className="cache-stat-value cache-error">{errors}</span>
            </div>
          </div>
        </div>

        {/* Strategy Performance */}
        <div className="cache-stats-section">
          <h4 className="cache-stats-section-title">
            <Target className="w-4 h-4" />
            Strategy Performance
          </h4>
          <div className="cache-stats-grid">
            {strategyMetrics.map(({ strategy, hitRate, hits, misses }) => (
              <div key={strategy} className="cache-stat-item">
                <span className="cache-stat-label">{strategy.replace('-', ' ')}</span>
                <div className="cache-stat-details">
                  <span className="cache-stat-value cache-hit">{hitRate}%</span>
                  <span className="cache-stat-subtext">({hits}/{hits + misses})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Performance */}
        <div className="cache-stats-section">
          <h4 className="cache-stats-section-title">
            <TrendingUp className="w-4 h-4" />
            Priority Performance
          </h4>
          <div className="cache-stats-grid">
            {priorityMetrics.map(({ priority, hitRate, hits, misses }) => (
              <div key={priority} className="cache-stat-item">
                <span className="cache-stat-label">{priority}</span>
                <div className="cache-stat-details">
                  <span className="cache-stat-value cache-hit">{hitRate}%</span>
                  <span className="cache-stat-subtext">({hits}/{hits + misses})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Type Performance */}
        {Object.keys(contentTypeStats).length > 0 && (
          <div className="cache-stats-section">
            <h4 className="cache-stats-section-title">Content Type Performance</h4>
            <div className="cache-stats-grid">
              {Object.entries(contentTypeStats).map(([contentType, stats]) => {
                const total = stats.hits + stats.misses;
                const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(1) : '0';
                return (
                  <div key={contentType} className="cache-stat-item">
                    <span className="cache-stat-label">{contentType}</span>
                    <div className="cache-stat-details">
                      <span className="cache-stat-value cache-hit">{hitRate}%</span>
                      <span className="cache-stat-subtext">({stats.hits}/{total})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="cache-stats-footer">
        {lastUpdate && (
          <span className="cache-stats-timestamp">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        <span className="cache-stats-version">v3.0.0</span>
      </div>
    </div>
  );
} 