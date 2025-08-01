import React, { useState } from 'react';
import { LineItem } from '../../types/receipt-types';

interface ReceiptDetailModalProps {
  receipt: {
    id: number;
    merchantName: string;
    transactionDate: string;
    totalAmount: number;
    taxAmount: number;
    subtotal: number;
    paymentMethod: string;
    lineItems: LineItem[];
    llmConfidence: number;
    llmExtractionIssues?: string[];
    rawText: string;
    createdAt: string;
    emailId: string;
    filename: string;
  };
  onClose: () => void;
}

const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({ receipt, onClose }) => {
  const [showRawText, setShowRawText] = useState(false);
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h3 className="text-xl font-bold text-gray-800">Receipt Details</h3>
          <button 
            className="text-gray-500 hover:text-gray-700 text-2xl"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Receipt summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div>
              <h4 className="text-sm text-gray-500 font-medium">Merchant</h4>
              <p className="text-lg font-bold">{receipt.merchantName}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 font-medium">Date</h4>
              <p className="text-lg">{formatDate(receipt.transactionDate)}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 font-medium">Total</h4>
              <p className="text-lg font-bold text-green-600">{formatCurrency(receipt.totalAmount)}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 font-medium">Subtotal</h4>
              <p className="text-lg">{formatCurrency(receipt.subtotal)}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 font-medium">Tax</h4>
              <p className="text-lg">{formatCurrency(receipt.taxAmount)}</p>
            </div>
            <div>
              <h4 className="text-sm text-gray-500 font-medium">Payment Method</h4>
              <p className="text-lg">{receipt.paymentMethod}</p>
            </div>
          </div>
          
          {/* Confidence indicator */}
          <div className="mb-6">
            <h4 className="text-sm text-gray-500 font-medium mb-1">Extraction Confidence</h4>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  receipt.llmConfidence >= 80 ? 'bg-green-500' : 
                  receipt.llmConfidence >= 60 ? 'bg-yellow-400' : 
                  'bg-red-500'
                }`}
                style={{ width: `${receipt.llmConfidence}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">0%</span>
              <span className="text-xs text-gray-500">
                {receipt.llmConfidence}%
              </span>
              <span className="text-xs text-gray-500">100%</span>
            </div>
          </div>
          
          {/* Line items */}
          <div className="mb-6">
            <h4 className="text-sm text-gray-500 font-medium mb-2">Line Items</h4>
            
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              {receipt.lineItems && receipt.lineItems.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receipt.lineItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity || 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-6 py-4 text-sm text-gray-500 italic">No line items found</p>
              )}
            </div>
          </div>
          
          {/* Extraction issues */}
          {receipt.llmExtractionIssues && receipt.llmExtractionIssues.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm text-gray-500 font-medium mb-2">Extraction Issues</h4>
              <div className="bg-red-50 rounded-lg p-4">
                <ul className="list-disc pl-5 space-y-1">
                  {receipt.llmExtractionIssues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-700">{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Metadata */}
          <div className="mb-6">
            <h4 className="text-sm text-gray-500 font-medium mb-2">Metadata</h4>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500">Email ID:</span>
                  <span className="ml-2">{receipt.emailId}</span>
                </div>
                <div>
                  <span className="text-gray-500">Filename:</span>
                  <span className="ml-2">{receipt.filename}</span>
                </div>
                <div>
                  <span className="text-gray-500">Processed On:</span>
                  <span className="ml-2">{formatDate(receipt.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Receipt ID:</span>
                  <span className="ml-2">{receipt.id}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Raw Text Toggle */}
          <div className="mb-2">
            <button
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              onClick={() => setShowRawText(!showRawText)}
            >
              {showRawText ? 'Hide Raw Text' : 'Show Raw Text'}
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showRawText ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </button>
          </div>
          
          {/* Raw Text */}
          {showRawText && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {receipt.rawText}
                </pre>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptDetailModal;
