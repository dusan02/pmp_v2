'use client';
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Signal, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { swManager, type OfflineState } from '@/lib/sw-register';

interface OfflineStatusProps {
  className?: string;
}

export default function OfflineStatus({ className = '' }: OfflineStatusProps) {
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [offlineData, setOfflineData] = useState<Array<{ key: string; data: any; timestamp: number }>>([]);

  useEffect(() => {
    // Get initial offline state
    const getInitialState = async () => {
      const state = await swManager.getOfflineState();
      setOfflineState(state);
    };
    getInitialState();

    // Subscribe to offline state changes
    const unsubscribe = swManager.onOfflineStateChange((state) => {
      setOfflineState(state);
    });

    // Load offline data
    loadOfflineData();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadOfflineData = async () => {
    try {
      // Get all offline data keys from localStorage
      const offlineKeys = Object.keys(localStorage).filter(key => key.startsWith('offline_'));
      const data = [];

      for (const key of offlineKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.expiresAt > Date.now()) {
            data.push({
              key: key.replace('offline_', ''),
              data: parsed.data,
              timestamp: parsed.timestamp
            });
          }
        }
      }

      setOfflineData(data);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const getConnectionIcon = () => {
    if (!offlineState) return <Signal className="w-5 h-5 text-gray-400" />;
    
    switch (offlineState.connectionQuality) {
      case 'good':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'poor':
        return <Signal className="w-5 h-5 text-yellow-500" />;
      case 'offline':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      default:
        return <Signal className="w-5 h-5 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    if (!offlineState) return 'Kontrolujem pripojenie...';
    
    switch (offlineState.connectionQuality) {
      case 'good':
        return 'Online';
      case 'poor':
        return 'Slabé pripojenie';
      case 'offline':
        return 'Offline';
      default:
        return 'Neznámy stav';
    }
  };

  const getConnectionColor = () => {
    if (!offlineState) return 'text-gray-500';
    
    switch (offlineState.connectionQuality) {
      case 'good':
        return 'text-green-500';
      case 'poor':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const clearOfflineData = async (key?: string) => {
    try {
      await swManager.clearOfflineData(key);
      await loadOfflineData();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  const refreshConnection = async () => {
    try {
      // Force connection check
      const response = await fetch('/api/prices/cached', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        console.log('Connection is working');
      }
    } catch (error) {
      console.log('Connection check failed');
    }
  };

  if (!offlineState) {
    return (
      <div className={`offline-status-container ${className}`}>
        <div className="offline-status-header">
          <Signal className="w-5 h-5 text-gray-400 animate-pulse" />
          <span className="text-gray-500">Kontrolujem pripojenie...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`offline-status-container ${className}`}>
      <div className="offline-status-header">
        <div className="offline-status-main">
          {getConnectionIcon()}
          <span className={`offline-status-text ${getConnectionColor()}`}>
            {getConnectionText()}
          </span>
        </div>
        
        <div className="offline-status-actions">
          <button
            onClick={refreshConnection}
            className="offline-status-btn"
            title="Kontrolovať pripojenie"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="offline-status-btn"
            title={isExpanded ? 'Skryť detaily' : 'Zobraziť detaily'}
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="offline-status-details">
          {/* Connection Details */}
          <div className="offline-status-section">
            <h4 className="offline-status-section-title">Stav pripojenia</h4>
            <div className="offline-status-grid">
              <div className="offline-status-item">
                <span className="offline-status-label">Kvalita pripojenia</span>
                <span className={`offline-status-value ${getConnectionColor()}`}>
                  {offlineState.connectionQuality}
                </span>
              </div>
              
              {offlineState.isOffline && offlineState.offlineStartTime && (
                <div className="offline-status-item">
                  <span className="offline-status-label">Offline od</span>
                  <span className="offline-status-value">
                    {formatDuration(Date.now() - offlineState.offlineStartTime)}
                  </span>
                </div>
              )}
              
              {!offlineState.isOffline && offlineState.lastOnlineTime && (
                <div className="offline-status-item">
                  <span className="offline-status-label">Online od</span>
                  <span className="offline-status-value">
                    {new Date(offlineState.lastOnlineTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Offline Data */}
          <div className="offline-status-section">
            <h4 className="offline-status-section-title">
              Offline dáta ({offlineData.length})
            </h4>
            
            {offlineData.length > 0 ? (
              <div className="offline-data-list">
                {offlineData.map((item) => (
                  <div key={item.key} className="offline-data-item">
                    <div className="offline-data-info">
                      <span className="offline-data-key">{item.key}</span>
                      <span className="offline-data-time">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => clearOfflineData(item.key)}
                      className="offline-data-clear-btn"
                      title="Vymazať dáta"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => clearOfflineData()}
                  className="offline-clear-all-btn"
                >
                  Vymazať všetky offline dáta
                </button>
              </div>
            ) : (
              <p className="offline-no-data">Žiadne offline dáta</p>
            )}
          </div>

          {/* Pending Requests */}
          {offlineState.pendingRequests.length > 0 && (
            <div className="offline-status-section">
              <h4 className="offline-status-section-title">
                Čakajúce požiadavky ({offlineState.pendingRequests.length})
              </h4>
              <div className="offline-pending-list">
                {offlineState.pendingRequests.map((request, index) => (
                  <div key={index} className="offline-pending-item">
                    <span className="offline-pending-url">{request.url}</span>
                    <span className="offline-pending-time">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Capabilities */}
          <div className="offline-status-section">
            <h4 className="offline-status-section-title">Offline možnosti</h4>
            <div className="offline-capabilities">
              <div className="offline-capability-item">
                <span className="offline-capability-icon">✅</span>
                <span className="offline-capability-text">Zobrazenie cachovaných dát</span>
              </div>
              <div className="offline-capability-item">
                <span className="offline-capability-icon">✅</span>
                <span className="offline-capability-text">Navigácia po aplikácii</span>
              </div>
              <div className="offline-capability-item">
                <span className="offline-capability-icon">✅</span>
                <span className="offline-capability-text">Automatická synchronizácia</span>
              </div>
              <div className="offline-capability-item">
                <span className="offline-capability-icon">✅</span>
                <span className="offline-capability-text">Offline notifikácie</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 