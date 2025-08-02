import React, { useState } from 'react';
import Link from 'next/link';

const SystemTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{[key: string]: any}>({});

  const runTest = async (testType: string, testName: string) => {
    setTesting(true);
    try {
      const response = await fetch('/api/test-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType })
      });

      const result = await response.json();
      setResults(prev => ({
        ...prev,
        [testType]: result
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testType]: {
          success: false,
          message: 'Test failed to execute',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setTesting(false);
    }
  };

  const tests = [
    { key: 'groq-connection', name: 'Groq API Connection', description: 'Test connection to Groq LLM API' },
    { key: 'db-init', name: 'Database Initialization', description: 'Test SQLite database setup' },
    { key: 'classify-sample', name: 'Receipt Classification', description: 'Test AI classification with sample receipt' },
    { key: 'extract-sample', name: 'Data Extraction', description: 'Test AI data extraction from sample receipt' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <Link href="/loginplatform/dashboard">
                <button className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-medium">Back to Dashboard</span>
                </button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  System Tests
                </h1>
                <p className="text-sm text-gray-600 font-medium">Validate receipt processing pipeline components</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Receipt Processing Pipeline Tests</h2>
          
          <div className="space-y-6">
            {tests.map((test) => (
              <div key={test.key} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                    <p className="text-gray-600">{test.description}</p>
                  </div>
                  <button
                    onClick={() => runTest(test.key, test.name)}
                    disabled={testing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Testing...
                      </>
                    ) : (
                      'Run Test'
                    )}
                  </button>
                </div>

                {results[test.key] && (
                  <div className={`p-4 rounded-lg ${results[test.key].success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center mb-2">
                      {results[test.key].success ? (
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`font-medium ${results[test.key].success ? 'text-green-800' : 'text-red-800'}`}>
                        {results[test.key].success ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <p className={`text-sm ${results[test.key].success ? 'text-green-700' : 'text-red-700'}`}>
                      {results[test.key].message}
                    </p>
                    
                    {results[test.key].data && (
                      <details className="mt-3">
                        <summary className={`cursor-pointer text-sm font-medium ${results[test.key].success ? 'text-green-800' : 'text-red-800'}`}>
                          View Details
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(results[test.key].data, null, 2)}
                        </pre>
                      </details>
                    )}

                    {results[test.key].error && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-800">Error:</p>
                        <p className="text-sm text-red-700">{results[test.key].error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Run All Tests Button */}
          <div className="mt-8 text-center">
            <button
              onClick={async () => {
                for (const test of tests) {
                  await runTest(test.key, test.name);
                  // Small delay between tests
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }}
              disabled={testing}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/loginplatform/dashboard">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                  Email Dashboard
                </button>
              </Link>
              <Link href="/receipt-processing/ledger">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                  View Ledger
                </button>
              </Link>
              <Link href="/receipt-processing/dashboard">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                  Processing Stats
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SystemTest;
