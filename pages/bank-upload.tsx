import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Database, TrendingUp } from 'lucide-react';
import BankStatementUploader from './components/BankStatementUploader';

export default function BankUpload() {
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [bankStats, setBankStats] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchBankStats();
  }, [refreshKey]);

  const fetchBankStats = async () => {
    try {
      const response = await fetch('/api/bank/stats');
      if (response.ok) {
        const data = await response.json();
        setBankStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch bank stats:', error);
    }
  };

  const handleUploadComplete = (result: any) => {
    console.log('Upload completed:', result);
    setRefreshKey(prev => prev + 1);
    
    // Add to recent uploads
    setRecentUploads(prev => [
      {
        filename: 'Bank Statement',
        transactionsCount: result.transactionsProcessed,
        uploadedAt: new Date().toISOString(),
        status: result.success ? 'success' : 'error'
      },
      ...prev.slice(0, 4) // Keep only 5 recent uploads
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Bank Statement Upload
            </h1>
          </div>
          <p className="text-gray-600">
            Upload CSV bank statements to automatically match with your receipt transactions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <BankStatementUploader 
              onUploadComplete={handleUploadComplete}
              className="mb-8"
            />

            {/* Recent Uploads */}
            {recentUploads.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Uploads</h3>
                <div className="space-y-3">
                  {recentUploads.map((upload, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Upload className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-sm">{upload.filename}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(upload.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {upload.transactionsCount} transactions
                        </p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          upload.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {upload.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Bank Statistics */}
            {bankStats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Bank Data Overview
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {bankStats.totalTransactions || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-xl font-semibold text-gray-900">
                      ${Math.abs(bankStats.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date Range</p>
                    <p className="text-sm text-gray-900">
                      {bankStats.dateRange?.start || 'N/A'} to {bankStats.dateRange?.end || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/reconciliation"
                  className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  View Reconciliation
                </Link>
                <Link
                  href="/test-reconciliation"
                  className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Run Test Data
                </Link>
                <Link
                  href="/receipt-processing/ledger"
                  className="block w-full bg-gray-600 text-white text-center py-2 px-4 rounded-lg hover:bg-gray-700"
                >
                  View Receipt Ledger
                </Link>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
              <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                <li>Upload your bank statement CSV</li>
                <li>Process receipt emails (if not done)</li>
                <li>Run reconciliation to match transactions</li>
                <li>Review and manually match remaining items</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
