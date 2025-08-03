import React, { useState } from "react";
import Link from "next/link";

const Docs = () => {
  const [activeTab, setActiveTab] = useState<'user' | 'developer'>('user');

  const userDocs = [
    {
      title: "Getting Started",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      content: (
        <div className="space-y-3">
          <p>Connect your Gmail account using secure OAuth 2.0 authentication. The platform automatically scans your incoming emails for PDF attachments and uses AI to identify receipts.</p>
          <div className="bg-teal-100 p-3 rounded-lg">
            <p className="text-sm"><span className="font-bold text-teal-800">No manual setup required</span> - everything happens automatically once you&apos;re connected!</p>
          </div>
        </div>
      )
    },
    {
      title: "How Receipt Processing Works",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <h4 className="font-bold text-slate-800">Email Monitoring</h4>
              <p className="text-sm text-slate-600">Platform continuously watches your Gmail for new messages</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <h4 className="font-bold text-slate-800">PDF Detection</h4>
              <p className="text-sm text-slate-600">Automatically finds emails with PDF attachments</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <h4 className="font-bold text-slate-800">AI Classification</h4>
              <p className="text-sm text-slate-600">Gemini AI analyzes PDFs to determine if they&apos;re receipts</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
            <div>
              <h4 className="font-bold text-slate-800">Data Extraction</h4>
              <p className="text-sm text-slate-600">Extracts merchant name, amount, date, and line items</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
            <div>
              <h4 className="font-bold text-slate-800">Ledger Entry</h4>
              <p className="text-sm text-slate-600">Organized data is saved to your personal ledger</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Understanding Your Dashboard",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: (
        <div className="space-y-4">
          <p className="mb-4">Your dashboard shows the processing status of each email with visual indicators:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="font-bold text-green-800">Completed</span>
              </div>
              <p className="text-sm text-green-700">Receipt successfully processed</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="font-bold text-yellow-800">Processing</span>
              </div>
              <p className="text-sm text-yellow-700">AI is analyzing the document</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span className="font-bold text-gray-800">Not Processed</span>
              </div>
              <p className="text-sm text-gray-600">Waiting to be analyzed</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="font-bold text-red-800">Failed</span>
              </div>
              <p className="text-sm text-red-700">Could not process document</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Managing Your Ledger",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      content: (
        <div className="space-y-4">
          <p className="mb-4">Access your complete financial data with powerful management tools:</p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h4 className="font-bold text-blue-800">Filter & Sort</h4>
              <p className="text-xs text-blue-600">By date, merchant, amount</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <svg className="w-8 h-8 text-purple-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="font-bold text-purple-800">Export Data</h4>
              <p className="text-xs text-purple-600">Download as CSV</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h4 className="font-bold text-emerald-800">Reconcile</h4>
              <p className="text-xs text-emerald-600">Compare with bank</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Privacy & Security",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      content: (
        <div className="space-y-3">
          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
            <h4 className="font-bold text-green-800 mb-1">Your Data Stays Private</h4>
            <p className="text-sm text-green-700">All receipt data is stored locally on your device. Nothing is shared or uploaded to external servers.</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-bold text-blue-800 mb-1">Limited Email Access</h4>
            <p className="text-sm text-blue-700">We only access emails with PDF attachments - no other email content is ever viewed.</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
            <h4 className="font-bold text-purple-800 mb-1">Secure Authentication</h4>
            <p className="text-sm text-purple-700">OAuth 2.0 with Google means we never see your password. Revoke access anytime in your Google settings.</p>
          </div>
        </div>
      )
    },
    {
      title: "Troubleshooting",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-3">
          <div className="bg-amber-50 p-3 rounded-lg border-l-4 border-amber-400">
            <h4 className="font-bold text-amber-800">No Receipts Showing?</h4>
            <p className="text-sm text-amber-700">Check if emails have PDF attachments and try refreshing your dashboard</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
            <h4 className="font-bold text-red-800">Processing Failed?</h4>
            <p className="text-sm text-red-700">Some PDFs may be scanned images - AI works best with text-based PDFs</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-bold text-blue-800">Connection Issues?</h4>
            <p className="text-sm text-blue-700">Re-authenticate with Gmail if emails stop syncing</p>
          </div>
        </div>
      )
    }
  ];

  const developerDocs = [
    {
      title: "Architecture Overview",
      icon: "🏗️",
      content: "Built with Next.js 13+ using App Router, integrated with Gmail API for email access, Gemini multimodal AI for receipt processing, and SQLite for local data storage. Real-time processing pipeline with automatic retry mechanisms and comprehensive error handling."
    },
    {
      title: "Gemini Multimodal AI Pipeline",
      icon: "🧠",
      content: "No OCR Required: Gemini directly processes PDF files using multimodal capabilities\nClassification Step: First determines if PDF is a receipt vs other document type\nData Extraction: Structured prompts extract merchant, amount, date, line items\nJSON Response: AI returns structured data in predefined JSON schema\nValidation: Response validation ensures data integrity before storage\nError Handling: Graceful fallbacks for malformed AI responses"
    },
    {
      title: "SQLite Database Schema",
      icon: "🗄️",
      content: `processed_files table:\n- id (INTEGER PRIMARY KEY AUTOINCREMENT)\n- email_id (TEXT NOT NULL) -- Gmail message ID\n- filename (TEXT NOT NULL) -- PDF filename\n- attachment_id (TEXT NOT NULL) -- Gmail attachment ID\n- file_size (INTEGER) -- PDF file size in bytes\n- processed_at (DATETIME DEFAULT CURRENT_TIMESTAMP)\n- processing_status (TEXT DEFAULT 'pending') -- pending|processing|completed|failed\n- is_receipt (BOOLEAN DEFAULT 0) -- AI classification result\n- confidence_score (REAL) -- AI confidence in classification\n- merchant_name (TEXT) -- Extracted merchant name\n- total_amount (REAL) -- Extracted total amount\n- receipt_date (DATE) -- Extracted receipt date\n- currency (TEXT DEFAULT 'USD') -- Currency code\n- line_items (TEXT) -- JSON array of individual items\n- raw_ai_response (TEXT) -- Full AI response for debugging\n- error_message (TEXT) -- Error details if processing failed\n- created_at (DATETIME DEFAULT CURRENT_TIMESTAMP)\n- updated_at (DATETIME DEFAULT CURRENT_TIMESTAMP)\n\nIndexes:\n- idx_email_id ON processed_files(email_id)\n- idx_processed_at ON processed_files(processed_at)\n- idx_processing_status ON processed_files(processing_status)\n- idx_is_receipt ON processed_files(is_receipt)`
    },
    {
      title: "Key API Endpoints",
      icon: "🔌",
      content: "Authentication:\n/api/auth/[...nextauth] - NextAuth.js OAuth flow\n\nEmail Processing:\n/api/emails-auto-process - Fetch and auto-process emails\n/api/process-pdf - Manual PDF processing\n\nData Retrieval:\n/api/processed-files - Get processed receipt data\n/api/ledger-export - Export ledger data\n\nSystem Monitoring:\n/api/test-system - Validate system components\n/api/processing-logs - View processing history"
    },
    {
      title: "Error Handling & Monitoring",
      icon: "⚠️",
      content: "Structured Logging: Comprehensive logging at each processing step\nRetry Logic: Automatic retries for transient API failures\nStatus Tracking: Detailed status for each processing attempt\nAI Response Validation: Validates JSON structure and required fields\nGraceful Degradation: Continues processing other files if one fails\nDebug Information: Stores raw AI responses for troubleshooting"
    },
    {
      title: "Configuration & Environment",
      icon: "⚙️",
      content: "Required Environment Variables:\n- GOOGLE_CLIENT_ID - OAuth client ID\n- GOOGLE_CLIENT_SECRET - OAuth client secret\n- NEXTAUTH_SECRET - Session encryption key\n- GROQ_API_KEY - Gemini API access\n- NEXTAUTH_URL - Application base URL\n\nOptional Configuration:\n- DATABASE_PATH - SQLite file location\n- LOG_LEVEL - Logging verbosity\n- MAX_CONCURRENT_PROCESSING - Parallel processing limit"
    }
  ];

  return (
    <div id="Docs" className="px-8 md:px-32 py-20 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 tracking-wider mb-4">
          Documentation
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Comprehensive guides for users and developers working with Receiptify
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-lg p-1 shadow-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('user')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'user'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>User Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('developer')}
            className={`px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center space-x-2 ${
              activeTab === 'developer'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span>Developer Guide</span>
          </button>
        </div>
      </div>

      {/* Documentation Content */}
      <div className="max-w-5xl mx-auto">
        {activeTab === 'user' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">User Documentation</h2>
              </div>
              
              <div className="grid gap-8">
                {userDocs.map((doc, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mr-4">
                        {doc.icon}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">{doc.title}</h3>
                    </div>
                    <div className="text-slate-700 leading-relaxed">
                      {doc.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Start Guide */}
              <div className="mt-12 p-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Quick Start Guide</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6 text-white/90">
                  <div className="flex items-start space-x-3">
                    <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <div>
                      <div className="font-bold">Click &quot;Try Demo!&quot; to begin</div>
                      <div className="text-sm text-white/80">Start the authentication process</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <div>
                      <div className="font-bold">Sign in with Gmail</div>
                      <div className="text-sm text-white/80">Grant permission to access PDF attachments only</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    <div>
                      <div className="font-bold">Watch automatic processing</div>
                      <div className="text-sm text-white/80">AI analyzes your receipts and builds your ledger</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                    <div>
                      <div className="font-bold">Review and export</div>
                      <div className="text-sm text-white/80">Access your ledger and export for accounting</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'developer' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Developer Documentation</h2>
              </div>
              
              <div className="grid gap-6">
                {developerDocs.map((doc, index) => (
                  <div key={index} className="border-l-4 border-l-amber-500 pl-6 py-4 bg-amber-50 rounded-r-lg">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">{doc.icon}</span>
                      <h3 className="text-lg font-bold text-slate-800">{doc.title}</h3>
                    </div>
                    <div className="text-slate-700 whitespace-pre-line leading-relaxed font-mono text-sm">
                      {doc.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tech Stack */}
              <div className="mt-8 p-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-4">Technology Stack</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white/90">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-lg font-bold">N</span>
                    </div>
                    <div className="text-sm font-bold">Next.js 13+</div>
                    <div className="text-xs text-white/70">React Framework</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-lg font-bold">G</span>
                    </div>
                    <div className="text-sm font-bold">Gmail API</div>
                    <div className="text-xs text-white/70">Email Access</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-lg font-bold">AI</span>
                    </div>
                    <div className="text-sm font-bold">Gemini</div>
                    <div className="text-xs text-white/70">Multimodal AI</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-lg font-bold">DB</span>
                    </div>
                    <div className="text-sm font-bold">SQLite</div>
                    <div className="text-xs text-white/70">Local Database</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Resources */}
      
    </div>
  );
};

export default Docs;
