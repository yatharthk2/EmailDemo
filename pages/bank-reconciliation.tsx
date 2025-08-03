import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppHeader from './components/AppHeader';
import Footer from './components/Footer';
import BankStatementUploader from './components/BankStatementUploader';
import ReconciliationDashboard from './components/ReconciliationDashboard';

export default function BankReconciliation() {
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const handleUploadComplete = (data: any) => {
    console.log('Upload completed:', data);
    // Trigger reconciliation dashboard refresh
    setRefreshKey(prev => prev + 1);
  };

  const handleBackToDashboard = () => {
    router.push('/loginplatform/dashboard');
  };

  return (
    <>
      <Head>
        <title>Bank Reconciliation - Email Receipt Processing</title>
        <meta name="description" content="Bank statement reconciliation with receipt processing" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        
        <main className="container mx-auto px-4 py-8">
          {/* Back Button and Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={handleBackToDashboard}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-4"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bank Reconciliation
            </h1>
            <p className="text-gray-600">
              Upload bank statements and reconcile with processed email receipts
            </p>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <BankStatementUploader 
              onUploadComplete={handleUploadComplete}
              className="mb-6"
            />
          </div>

          {/* Reconciliation Dashboard */}
          <ReconciliationDashboard key={refreshKey} />
        </main>

        <Footer />
      </div>
    </>
  );
}
