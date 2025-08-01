import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CSVLink } from "react-csv";
import Head from 'next/head';
import LedgerDataTable from '../components/receipts/LedgerDataTable';
import LedgerSummary from '../components/receipts/LedgerSummary';

const LedgerPage: React.FC = () => {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'table' | 'summary'>('table');
  
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
          <p className="text-gray-600 mb-4">Please sign in to access the receipt ledger.</p>
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
        <title>Receipt Ledger | Email Demo</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Receipt Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your processed receipts
          </p>
        </div>
        
        {/* Tab navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('table')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'table'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Ledger Table
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Summary Dashboard
            </button>
          </nav>
        </div>
        
        {/* Tab content */}
        <div className="mb-6">
          {activeTab === 'table' && (
            <div>
              <div className="flex justify-end mb-4">
                <CSVLink
                  data={[]}
                  filename="receipt-ledger-export.csv"
                  target="_blank"
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
                  asyncOnClick={true}
                  onClick={(_, done) => {
                    fetch('/api/export/csv')
                      .then((response) => {
                        if (!response.ok) throw new Error('Export failed');
                        return response.text();
                      })
                      .then((csv) => {
                        // This is a hack to make CSVLink download the dynamically generated CSV
                        // We're just setting the data prop to a dummy array because the actual
                        // download happens via the href attribute that the component sets up
                        done(true);
                      })
                      .catch((error) => {
                        console.error('Error exporting CSV:', error);
                        done(false);
                      });
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Export to CSV
                </CSVLink>
              </div>
              <LedgerDataTable />
            </div>
          )}
          
          {activeTab === 'summary' && (
            <LedgerSummary />
          )}
        </div>
      </div>
    </>
  );
};

export default LedgerPage;
