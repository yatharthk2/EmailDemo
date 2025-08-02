import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AppHeader from './components/AppHeader';
import Footer from './components/Footer';

interface SystemStats {
  totalEmails: number;
  processedReceipts: number;
  bankTransactions: number;
  matchedTransactions: number;
  reconciliationRate: number;
  recentActivity: ActivityItem[];
  systemHealth: {
    dbConnection: boolean;
    geminiApi: boolean;
    gmailApi: boolean;
    overallStatus: 'healthy' | 'warning' | 'error';
  };
}

interface ActivityItem {
  id: string;
  type: 'email_processed' | 'bank_upload' | 'manual_match' | 'system_test';
  description: string;
  timestamp: string;
  success: boolean;
}

export default function SystemDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/email-auth-flow/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchSystemStats();
    }
  }, [status, router]);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/system-status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const runSystemTest = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-system', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        // Refresh stats after test
        await fetchSystemStats();
      } else {
        setError(`System test failed: ${result.message}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <>
      <Head>
        <title>System Dashboard - EmailDemo</title>
        <meta name="description" content="System overview and health monitoring dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader />
        
        <main className="flex-1 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-bold text-gray-900">
                    System Dashboard
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Complete overview of your email receipt processing system
                  </p>
                </div>
                <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
                  <button
                    onClick={runSystemTest}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Running...' : 'Run System Test'}
                  </button>
                  <button
                    onClick={fetchSystemStats}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">System Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* System Health Status */}
            {stats?.systemHealth && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                      stats.systemHealth.overallStatus === 'healthy' ? 'bg-green-100 text-green-600' :
                      stats.systemHealth.overallStatus === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {stats.systemHealth.overallStatus === 'healthy' ? '✓' : 
                       stats.systemHealth.overallStatus === 'warning' ? '⚠' : '✗'}
                    </div>
                    <p className="text-sm font-medium text-gray-900">Overall Status</p>
                    <p className={`text-xs ${
                      stats.systemHealth.overallStatus === 'healthy' ? 'text-green-600' :
                      stats.systemHealth.overallStatus === 'warning' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {stats.systemHealth.overallStatus.toUpperCase()}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                      stats.systemHealth.dbConnection ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {stats.systemHealth.dbConnection ? '✓' : '✗'}
                    </div>
                    <p className="text-sm font-medium text-gray-900">Database</p>
                    <p className={`text-xs ${stats.systemHealth.dbConnection ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.systemHealth.dbConnection ? 'CONNECTED' : 'DISCONNECTED'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                      stats.systemHealth.geminiApi ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {stats.systemHealth.geminiApi ? '✓' : '✗'}
                    </div>
                    <p className="text-sm font-medium text-gray-900">Gemini AI</p>
                    <p className={`text-xs ${stats.systemHealth.geminiApi ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.systemHealth.geminiApi ? 'CONNECTED' : 'DISCONNECTED'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                      stats.systemHealth.gmailApi ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {stats.systemHealth.gmailApi ? '✓' : '⚠'}
                    </div>
                    <p className="text-sm font-medium text-gray-900">Gmail API</p>
                    <p className={`text-xs ${stats.systemHealth.gmailApi ? 'text-green-600' : 'text-yellow-600'}`}>
                      {stats.systemHealth.gmailApi ? 'CONNECTED' : 'OPTIONAL'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Emails</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalEmails}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Processed Receipts</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.processedReceipts}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Bank Transactions</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.bankTransactions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Reconciliation Rate</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.reconciliationRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/receipt-processing/dashboard"
                  className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Process Emails
                </Link>
                <Link
                  href="/bank-reconciliation"
                  className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Bank Reconciliation
                </Link>
                <Link
                  href="/receipt-processing/ledger"
                  className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Ledger
                </Link>
                <Link
                  href="/processing-logs"
                  className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Logs
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            {stats?.recentActivity && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                {stats.recentActivity.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {stats.recentActivity.map((activity, index) => (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {index !== stats.recentActivity.length - 1 && (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                  activity.success ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    {activity.success ? (
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    ) : (
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    )}
                                  </svg>
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500">{activity.description}</p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  {new Date(activity.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
