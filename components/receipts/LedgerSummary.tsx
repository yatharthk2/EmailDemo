import React, { useState, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { LedgerSummaryData } from '../../types/receipt-types';

// Register Chart.js components
Chart.register(...registerables);

// Loading skeleton component
const SummarySkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const LedgerSummary: React.FC = () => {
  // State
  const [summaryData, setSummaryData] = useState<LedgerSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch summary data
  const fetchSummaryData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ledger/summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch summary data');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch summary data');
      }
      
      setSummaryData(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error fetching summary data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Effect to fetch data on mount
  useEffect(() => {
    fetchSummaryData();
  }, []);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Prepare chart data
  const getMonthlySpendingChartData = () => {
    if (!summaryData || !summaryData.monthlySpending) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Monthly Spending',
            data: [],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          }
        ]
      };
    }
    
    // Format month labels
    const labels = summaryData.monthlySpending.map(item => {
      const [year, month] = item.month.split('-');
      return `${new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' })} ${year}`;
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Monthly Spending',
          data: summaryData.monthlySpending.map(item => item.amount),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }
      ]
    };
  };
  
  // Document type chart data
  const getDocumentTypeChartData = () => {
    if (!summaryData || !summaryData.documentTypes) {
      return {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [
              'rgba(59, 130, 246, 0.5)',  // Blue
              'rgba(16, 185, 129, 0.5)',  // Green
              'rgba(245, 158, 11, 0.5)',  // Yellow
              'rgba(239, 68, 68, 0.5)',   // Red
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(16, 185, 129)',
              'rgb(245, 158, 11)',
              'rgb(239, 68, 68)',
            ],
            borderWidth: 1
          }
        ]
      };
    }
    
    return {
      labels: summaryData.documentTypes.map(item => item.type.charAt(0).toUpperCase() + item.type.slice(1)),
      datasets: [
        {
          data: summaryData.documentTypes.map(item => item.count),
          backgroundColor: [
            'rgba(59, 130, 246, 0.5)',  // Blue
            'rgba(16, 185, 129, 0.5)',  // Green
            'rgba(245, 158, 11, 0.5)',  // Yellow
            'rgba(239, 68, 68, 0.5)',   // Red
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 1
        }
      ]
    };
  };
  
  // Chart options
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };
  
  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      }
    }
  };

  return (
    <div>
      {loading ? (
        <SummarySkeleton />
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      ) : summaryData ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Receipts</h3>
              <div className="mt-1 text-2xl font-bold text-gray-900">{summaryData.totalReceipts}</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Spent</h3>
              <div className="mt-1 text-2xl font-bold text-green-600">
                {formatCurrency(summaryData.totalAmount)}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Average Transaction</h3>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(summaryData.averageAmount)}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Top Merchant</h3>
              <div className="mt-1 text-2xl font-bold text-gray-900 truncate" title={summaryData.topMerchant}>
                {summaryData.topMerchant}
              </div>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly spending chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Monthly Spending</h3>
              <div className="h-64">
                <Bar data={getMonthlySpendingChartData()} options={barChartOptions} />
              </div>
            </div>
            
            {/* Document types chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Document Types</h3>
              <div className="h-64">
                <Doughnut data={getDocumentTypeChartData()} options={doughnutChartOptions} />
              </div>
            </div>
          </div>
          
          {/* Top merchants list */}
          <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Top Merchants
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {summaryData.topMerchants && summaryData.topMerchants.map((merchant, index) => (
                <li key={index} className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">{index + 1}</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{merchant.name}</div>
                      <div className="text-sm text-gray-500">{merchant.count} transactions</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    {formatCurrency(merchant.amount)}
                  </div>
                </li>
              ))}
              
              {(!summaryData.topMerchants || summaryData.topMerchants.length === 0) && (
                <li className="px-4 py-4 text-center text-gray-500 italic">
                  No merchant data available
                </li>
              )}
            </ul>
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-md">
          <p className="text-yellow-700">No data available. Start processing receipts to see summary information.</p>
        </div>
      )}
    </div>
  );
};

export default LedgerSummary;
