import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';

interface ProcessingStats {
  overall: {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    avgProcessingTime: number;
  };
  stages: Array<{
    stage: string;
    count: number;
    successCount: number;
    failureCount: number;
    avgProcessingTime: number;
  }>;
  recentErrors: Array<{
    id: number;
    email_id: string;
    filename: string;
    processing_stage: string;
    error_message: string;
    processed_at: string;
  }>;
}

const ProcessingDashboard: React.FC = () => {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch processing stats
  const fetchProcessingStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/processing-stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch processing statistics');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch processing statistics');
      }
      
      setStats(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error fetching processing stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Effect to fetch data on mount
  useEffect(() => {
    if (session) {
      fetchProcessingStats();
    }
  }, [session]);
  
  // Format time in milliseconds to a readable format
  const formatTime = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Get status color class
  const getStatusColorClass = (successRate: number) => {
    if (successRate >= 90) return 'bg-green-500';
    if (successRate >= 70) return 'bg-yellow-400';
    return 'bg-red-500';
  };
  
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the processing dashboard.</p>
          <a 
            href="/email-auth-flow/signin" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Processing Dashboard | Email Demo</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Processing Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor receipt processing status and statistics
          </p>
        </div>
        
        {/* Error alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg mb-8"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        ) : stats ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-sm font-medium text-gray-500 mb-1">Total Documents Processed</h2>
                <div className="text-3xl font-bold text-gray-900">{stats.overall.totalProcessed}</div>
                <div className="mt-2 flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Success Rate:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getStatusColorClass(
                        stats.overall.totalProcessed > 0 
                          ? (stats.overall.successCount / stats.overall.totalProcessed) * 100 
                          : 0
                      )}`}
                      style={{ 
                        width: `${stats.overall.totalProcessed > 0 
                          ? (stats.overall.successCount / stats.overall.totalProcessed) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-700">
                    {stats.overall.totalProcessed > 0 
                      ? ((stats.overall.successCount / stats.overall.totalProcessed) * 100).toFixed(0) 
                      : 0}%
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-sm font-medium text-gray-500 mb-1">Average Processing Time</h2>
                <div className="text-3xl font-bold text-gray-900">
                  {formatTime(stats.overall.avgProcessingTime || 0)}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {stats.overall.successCount} successful / {stats.overall.failureCount} failed
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-sm font-medium text-gray-500 mb-1">Processing Status</h2>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.overall.failureCount === 0 ? 'All Good' : `${stats.overall.failureCount} Issues`}
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    stats.overall.failureCount === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {stats.overall.failureCount === 0 ? 'Healthy' : 'Needs Attention'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Processing stages */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Processing Stages
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stage
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg. Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.stages.map((stage) => (
                      <tr key={stage.stage}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stage.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stage.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className={`h-2 rounded-full ${getStatusColorClass(
                                  stage.count > 0 
                                    ? (stage.successCount / stage.count) * 100 
                                    : 0
                                )}`}
                                style={{ 
                                  width: `${stage.count > 0 
                                    ? (stage.successCount / stage.count) * 100 
                                    : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-700">
                              {stage.count > 0 
                                ? ((stage.successCount / stage.count) * 100).toFixed(0) 
                                : 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(stage.avgProcessingTime || 0)}
                        </td>
                      </tr>
                    ))}
                    
                    {stats.stages.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 italic">
                          No processing stages found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Recent errors */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Errors
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stage
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentErrors.map((error) => (
                      <tr key={error.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {error.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {error.processing_stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                          {error.error_message}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(error.processed_at)}
                        </td>
                      </tr>
                    ))}
                    
                    {stats.recentErrors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 italic">
                          No errors found - Everything is running smoothly!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={fetchProcessingStats}
                >
                  Refresh
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Processing Data</h3>
            <p className="text-yellow-700">
              No document processing has been performed yet. Start processing documents to see statistics.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default ProcessingDashboard;
