import React, { useState } from 'react';
import Head from 'next/head';
import Header from './components/Header';
import Footer from './components/Footer';
import BankStatementUploader from './components/BankStatementUploader';
import ReconciliationDashboard from './components/ReconciliationDashboard';

export default function BankReconciliation() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = (data: any) => {
    console.log('Upload completed:', data);
    // Trigger reconciliation dashboard refresh
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <Head>
        <title>Bank Reconciliation - Email Receipt Processing</title>
        <meta name="description" content="Bank statement reconciliation with receipt processing" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
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
