'use client';

import React, { useState, useEffect } from 'react';
import { analytics } from '@/lib/analytics';
import { BarChart3, Users, Eye, Activity, TrendingUp, Clock, Monitor, Smartphone, Globe } from 'lucide-react';

interface AnalyticsData {
  today: {
    totalEvents: number;
    totalSessions: number;
    totalPageViews: number;
  };
  realtime: {
    activeSessions: number;
    timestamp: number;
  };
}

interface AnalyticsDashboardProps {
  className?: string;
}

export default function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const response = await fetch('/api/analytics?type=realtime');
        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      }
    };

    const updateSession = () => {
      const currentSession = analytics.getSession();
      setSession(currentSession);
    };

    // Initial fetch
    fetchAnalyticsData();
    updateSession();

    // Update every 30 seconds
    const interval = setInterval(() => {
      fetchAnalyticsData();
      updateSession();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!analyticsData) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <div className="analytics-header">
          <BarChart3 className="w-5 h-5 text-gray-400 animate-pulse" />
          <span className="text-gray-500">Načítavam analytics dáta...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`analytics-dashboard ${className}`}>
      <div className="analytics-header">
        <div className="analytics-title">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <span className="analytics-title-text">Analytics Dashboard</span>
        </div>
        
        <div className="analytics-actions">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="analytics-toggle-btn"
            title={isExpanded ? 'Skryť detaily' : 'Zobraziť detaily'}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="analytics-details">
          {/* Today's Overview */}
          <div className="analytics-section">
            <h4 className="analytics-section-title">
              <TrendingUp className="w-4 h-4" />
              Dnešný prehľad
            </h4>
            <div className="analytics-grid">
              <div className="analytics-item">
                <div className="analytics-item-header">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="analytics-item-label">Page Views</span>
                </div>
                <span className="analytics-item-value">
                  {formatNumber(analyticsData.today.totalPageViews)}
                </span>
              </div>
              
              <div className="analytics-item">
                <div className="analytics-item-header">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="analytics-item-label">Sessions</span>
                </div>
                <span className="analytics-item-value">
                  {formatNumber(analyticsData.today.totalSessions)}
                </span>
              </div>
              
              <div className="analytics-item">
                <div className="analytics-item-header">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span className="analytics-item-label">Events</span>
                </div>
                <span className="analytics-item-value">
                  {formatNumber(analyticsData.today.totalEvents)}
                </span>
              </div>
              
              <div className="analytics-item">
                <div className="analytics-item-header">
                  <Monitor className="w-4 h-4 text-orange-500" />
                  <span className="analytics-item-label">Active Now</span>
                </div>
                <span className="analytics-item-value">
                  {analyticsData.realtime.activeSessions}
                </span>
              </div>
            </div>
          </div>

          {/* Current Session */}
          {session && (
            <div className="analytics-section">
              <h4 className="analytics-section-title">
                <Clock className="w-4 h-4" />
                Aktuálna session
              </h4>
              <div className="analytics-grid">
                <div className="analytics-item">
                  <span className="analytics-item-label">Session ID</span>
                  <span className="analytics-item-value text-sm font-mono">
                    {session.id.substring(0, 8)}...
                  </span>
                </div>
                
                <div className="analytics-item">
                  <span className="analytics-item-label">Duration</span>
                  <span className="analytics-item-value">
                    {formatDuration(session.duration)}
                  </span>
                </div>
                
                <div className="analytics-item">
                  <span className="analytics-item-label">Page Views</span>
                  <span className="analytics-item-value">
                    {session.pageViews}
                  </span>
                </div>
                
                <div className="analytics-item">
                  <span className="analytics-item-label">Events</span>
                  <span className="analytics-item-value">
                    {session.events}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Device Information */}
          {session?.deviceInfo && (
            <div className="analytics-section">
              <h4 className="analytics-section-title">
                <Smartphone className="w-4 h-4" />
                Zariadenie
              </h4>
              <div className="analytics-grid">
                <div className="analytics-item">
                  <span className="analytics-item-label">Type</span>
                  <span className="analytics-item-value capitalize">
                    {session.deviceInfo.type}
                  </span>
                </div>
                
                <div className="analytics-item">
                  <span className="analytics-item-label">OS</span>
                  <span className="analytics-item-value">
                    {session.deviceInfo.os}
                  </span>
                </div>
                
                <div className="analytics-item">
                  <span className="analytics-item-label">Browser</span>
                  <span className="analytics-item-value">
                    {session.deviceInfo.browser}
                  </span>
                </div>
                
                <div className="analytics-item">
                  <span className="analytics-item-label">Screen</span>
                  <span className="analytics-item-value">
                    {session.deviceInfo.screen.width}×{session.deviceInfo.screen.height}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Updates */}
          <div className="analytics-section">
            <h4 className="analytics-section-title">
              <Globe className="w-4 h-4" />
              Real-time
            </h4>
            <div className="analytics-grid">
              <div className="analytics-item">
                <span className="analytics-item-label">Last Update</span>
                <span className="analytics-item-value">
                  {formatTime(analyticsData.realtime.timestamp)}
                </span>
              </div>
              
              <div className="analytics-item">
                <span className="analytics-item-label">Active Sessions</span>
                <span className="analytics-item-value">
                  {analyticsData.realtime.activeSessions}
                </span>
              </div>
            </div>
          </div>

          {/* Analytics Actions */}
          <div className="analytics-section">
            <h4 className="analytics-section-title">
              <Activity className="w-4 h-4" />
              Akcie
            </h4>
            <div className="analytics-actions-grid">
              <button
                onClick={() => analytics.trackPageView(window.location.pathname, document.title)}
                className="analytics-action-btn"
              >
                Track Page View
              </button>
              
              <button
                onClick={() => analytics.track('user', 'manual_event', 'Manual Test Event')}
                className="analytics-action-btn"
              >
                Test Event
              </button>
              
              <button
                onClick={() => analytics.syncOfflineEvents()}
                className="analytics-action-btn"
              >
                Sync Offline
              </button>
            </div>
          </div>

          {/* Last Update */}
          <div className="analytics-footer">
            <span className="analytics-update-time">
              Posledná aktualizácia: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 