'use client';

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance-api';
import { analytics } from '@/lib/analytics';
import { 
  Activity, 
  Memory, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  Zap,
  Gauge,
  Shield,
  RefreshCw
} from 'lucide-react';

interface PerformanceOptimizerDemoProps {
  className?: string;
}

interface OptimizationStatus {
  memoryManagement: boolean;
  resourceOptimization: boolean;
  errorBoundary: boolean;
  performanceBudget: boolean;
  advancedOptimizations: boolean;
}

export default function PerformanceOptimizerDemo({ className = '' }: PerformanceOptimizerDemoProps) {
  const [performanceData, setPerformanceData] = useState<any>({});
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus>({
    memoryManagement: true,
    resourceOptimization: true,
    errorBoundary: true,
    performanceBudget: true,
    advancedOptimizations: true,
  });
  const [budgetViolations, setBudgetViolations] = useState<string[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [testResults, setTestResults] = useState<any>({});

  // Simulate performance monitoring
  useEffect(() => {
    const updatePerformanceData = () => {
      if (typeof window !== 'undefined') {
        const summary = performanceMonitor.getPerformanceSummary();
        setPerformanceData(summary);
        
        // Check memory usage
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          setMemoryUsage(memory.usedJSHeapSize);
        }
        
        // Simulate budget violations
        const violations: string[] = [];
        if (summary.navigation.totalTime > 3000) {
          violations.push('Load time exceeds 3s budget');
        }
        if (memoryUsage > 50 * 1024 * 1024) {
          violations.push('Memory usage exceeds 50MB budget');
        }
        setBudgetViolations(violations);
      }
    };

    const interval = setInterval(updatePerformanceData, 2000);
    updatePerformanceData();

    return () => clearInterval(interval);
  }, [memoryUsage]);

  // Test performance optimizations
  const runPerformanceTests = async () => {
    setIsOptimizing(true);
    setTestResults({});

    const tests = {
      memoryTest: async () => {
        // Simulate memory-intensive operation
        const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const largeArray = new Array(1000000).fill('test');
        await new Promise(resolve => setTimeout(resolve, 100));
        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
        largeArray.length = 0; // Clear array
        
        return {
          success: true,
          memoryIncrease: endMemory - startMemory,
          message: `Memory test completed. Increase: ${Math.round((endMemory - startMemory) / 1024)}KB`
        };
      },
      
      imageOptimizationTest: async () => {
        // Simulate image optimization
        const images = document.querySelectorAll('img');
        const optimizedCount = Array.from(images).filter(img => img.loading === 'lazy').length;
        
        return {
          success: true,
          optimizedCount,
          message: `${optimizedCount} images optimized with lazy loading`
        };
      },
      
      tableOptimizationTest: async () => {
        // Simulate table optimization
        const tables = document.querySelectorAll('table');
        const optimizedCount = Array.from(tables).filter(table => 
          table.classList.contains('optimized')
        ).length;
        
        return {
          success: true,
          optimizedCount,
          message: `${optimizedCount} tables optimized`
        };
      },
      
      errorBoundaryTest: async () => {
        // Simulate error boundary test
        try {
          // Simulate a potential error
          const testFunction = () => {
            throw new Error('Test error for boundary');
          };
          
          // This should be caught by error boundary
          if (Math.random() > 0.8) {
            testFunction();
          }
          
          return {
            success: true,
            message: 'Error boundary test passed'
          };
        } catch (error) {
          return {
            success: false,
            message: 'Error boundary test failed'
          };
        }
      }
    };

    const results: any = {};
    
    for (const [testName, testFunction] of Object.entries(tests)) {
      try {
        results[testName] = await testFunction();
        analytics.track('performance', 'optimization_test', testName, results[testName]);
      } catch (error) {
        results[testName] = {
          success: false,
          message: `Test failed: ${error}`
        };
      }
    }

    setTestResults(results);
    setIsOptimizing(false);
  };

  // Toggle optimization features
  const toggleOptimization = (feature: keyof OptimizationStatus) => {
    setOptimizationStatus(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
    
    analytics.track('performance', 'toggle_optimization', feature, {
      enabled: !optimizationStatus[feature]
    });
  };

  // Force memory optimization
  const forceMemoryOptimization = () => {
    setIsOptimizing(true);
    
    // Simulate memory optimization
    setTimeout(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryUsage(memory.usedJSHeapSize);
      }
      setIsOptimizing(false);
      
      analytics.track('performance', 'force_memory_optimization', 'Manual optimization triggered');
    }, 1000);
  };

  const getPerformanceRating = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`performance-optimizer-demo ${className}`}>
      <div className="demo-header">
        <h2 className="demo-title">
          <Zap className="demo-icon" />
          Performance Optimizer Demo
        </h2>
        <p className="demo-description">
          Advanced performance monitoring and optimization wrapper with memory management, 
          resource optimization, error boundaries, and performance budgets.
        </p>
      </div>

      <div className="demo-grid">
        {/* Performance Metrics */}
        <div className="demo-card">
          <div className="card-header">
            <Activity className="card-icon" />
            <h3>Performance Metrics</h3>
          </div>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Load Time</span>
              <span className={`metric-value ${getRatingColor(getPerformanceRating(performanceData.navigation?.totalTime || 0, { good: 2000, poor: 4000 }))}`}>
                {Math.round(performanceData.navigation?.totalTime || 0)}ms
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Memory Usage</span>
              <span className={`metric-value ${getRatingColor(getPerformanceRating(memoryUsage / 1024 / 1024, { good: 20, poor: 50 }))}`}>
                {Math.round(memoryUsage / 1024 / 1024)}MB
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Resource Count</span>
              <span className="metric-value">
                {performanceData.resources?.total || 0}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">TTFB</span>
              <span className={`metric-value ${getRatingColor(getPerformanceRating(performanceData.navigation?.ttfb || 0, { good: 200, poor: 600 }))}`}>
                {Math.round(performanceData.navigation?.ttfb || 0)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Optimization Status */}
        <div className="demo-card">
          <div className="card-header">
            <Settings className="card-icon" />
            <h3>Optimization Status</h3>
          </div>
          <div className="status-list">
            {Object.entries(optimizationStatus).map(([feature, enabled]) => (
              <div key={feature} className="status-item">
                <div className="status-info">
                  <span className="status-label">
                    {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                  <span className={`status-indicator ${enabled ? 'enabled' : 'disabled'}`}>
                    {enabled ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  </span>
                </div>
                <button
                  onClick={() => toggleOptimization(feature as keyof OptimizationStatus)}
                  className={`toggle-button ${enabled ? 'enabled' : 'disabled'}`}
                >
                  {enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Violations */}
        <div className="demo-card">
          <div className="card-header">
            <AlertTriangle className="card-icon" />
            <h3>Budget Violations</h3>
          </div>
          <div className="violations-list">
            {budgetViolations.length === 0 ? (
              <div className="no-violations">
                <CheckCircle className="success-icon" />
                <span>No budget violations detected</span>
              </div>
            ) : (
              budgetViolations.map((violation, index) => (
                <div key={index} className="violation-item">
                  <AlertTriangle className="violation-icon" />
                  <span>{violation}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Test Results */}
        <div className="demo-card">
          <div className="card-header">
            <Gauge className="card-icon" />
            <h3>Optimization Tests</h3>
          </div>
          <div className="test-results">
            {Object.keys(testResults).length === 0 ? (
              <div className="no-tests">
                <span>No tests run yet</span>
              </div>
            ) : (
              Object.entries(testResults).map(([testName, result]: [string, any]) => (
                <div key={testName} className={`test-result ${result.success ? 'success' : 'failure'}`}>
                  <div className="test-header">
                    <span className="test-name">
                      {testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    {result.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <span className="test-message">{result.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="demo-actions">
        <button
          onClick={runPerformanceTests}
          disabled={isOptimizing}
          className="action-button primary"
        >
          {isOptimizing ? (
            <>
              <RefreshCw className="spinning" />
              Running Tests...
            </>
          ) : (
            <>
              <Gauge />
              Run Performance Tests
            </>
          )}
        </button>
        
        <button
          onClick={forceMemoryOptimization}
          disabled={isOptimizing}
          className="action-button secondary"
        >
          <Memory />
          Force Memory Optimization
        </button>
      </div>

      {/* Features Overview */}
      <div className="features-overview">
        <h3>Key Features</h3>
        <div className="features-grid">
          <div className="feature-item">
            <Shield className="feature-icon" />
            <div className="feature-content">
              <h4>Error Boundary</h4>
              <p>Catches React errors and provides graceful fallbacks with detailed error reporting.</p>
            </div>
          </div>
          
          <div className="feature-item">
            <Memory className="feature-icon" />
            <div className="feature-content">
              <h4>Memory Management</h4>
              <p>Monitors memory usage and automatically optimizes when thresholds are exceeded.</p>
            </div>
          </div>
          
          <div className="feature-item">
            <Settings className="feature-icon" />
            <div className="feature-content">
              <h4>Resource Optimization</h4>
              <p>Automatically optimizes images, tables, and animations for better performance.</p>
            </div>
          </div>
          
          <div className="feature-item">
            <Clock className="feature-icon" />
            <div className="feature-content">
              <h4>Performance Budgets</h4>
              <p>Enforces performance budgets for load time, memory usage, and bundle size.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 