import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Settings, MapPin } from 'lucide-react';

interface BankStatementUploaderProps {
  onUploadComplete?: (data: any) => void;
  className?: string;
}

interface UploadedFile {
  file: File;
  preview?: string[][];
  error?: string;
  detectedFormat?: CSVFormat;
  headers?: string[];
}

interface CSVFormat {
  separator: string;
  separatorName: string;
  columnCount: number;
  confidence: number;
}

interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  reference?: string;
  account?: string;
}

interface BankTemplate {
  name: string;
  columns: ColumnMapping;
  dateFormat: string;
  example: string;
  description: string;
}

const BANK_TEMPLATES: Record<string, BankTemplate> = {
  chase: {
    name: "Chase Bank",
    columns: {
      date: "Transaction Date",
      description: "Description", 
      amount: "Amount",
      reference: "Check or Slip #"
    },
    dateFormat: "MM/DD/YYYY",
    example: "01/15/2024,TARGET STORE,-45.67,12345",
    description: "Standard Chase bank statement format"
  },
  wellsfargo: {
    name: "Wells Fargo", 
    columns: {
      date: "Date",
      description: "Description",
      amount: "Amount",
      reference: "Reference Number"
    },
    dateFormat: "MM/DD/YYYY",
    example: "01/15/2024,TARGET STORE,-45.67,REF123",
    description: "Wells Fargo CSV export format"
  },
  bankofamerica: {
    name: "Bank of America",
    columns: {
      date: "Posted Date",
      description: "Payee",
      amount: "Amount",
      reference: "Reference"
    },
    dateFormat: "MM/DD/YYYY",
    example: "01/15/2024,TARGET STORE,-45.67,TXN123",
    description: "Bank of America statement format"
  },
  citi: {
    name: "Citibank",
    columns: {
      date: "Date",
      description: "Description",
      amount: "Debit",
      reference: "Reference"
    },
    dateFormat: "MM/DD/YYYY",
    example: "01/15/2024,TARGET STORE,45.67,REF123",
    description: "Citibank CSV format"
  },
  generic: {
    name: "Generic Format",
    columns: {
      date: "Date",
      description: "Description", 
      amount: "Amount",
      reference: "Reference"
    },
    dateFormat: "YYYY-MM-DD",
    example: "2024-01-15,TARGET STORE,-45.67,REF123",
    description: "Standard CSV format"
  }
};

export default function BankStatementUploader({ onUploadComplete, className = '' }: BankStatementUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [needsMapping, setNeedsMapping] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [accountName, setAccountName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectCSVFormat = (text: string): CSVFormat => {
    const firstLine = text.split('\n')[0];
    const separators = [
      { char: ',', name: 'Comma' },
      { char: ';', name: 'Semicolon' },
      { char: '\t', name: 'Tab' },
      { char: '|', name: 'Pipe' }
    ];
    
    const detected = separators.map(sep => {
      const columns = firstLine.split(sep.char);
      return {
        separator: sep.char,
        separatorName: sep.name,
        columnCount: columns.length,
        confidence: columns.length > 1 ? Math.min(columns.length * 25, 100) : 0
      };
    }).sort((a, b) => b.confidence - a.confidence)[0];
    
    return detected;
  };

  const detectColumns = (headers: string[]): {
    dateColumns: string[];
    descriptionColumns: string[];
    amountColumns: string[];
    suggestedMapping: ColumnMapping;
  } => {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());
    
    const dateKeywords = ['date', 'posted', 'transaction', 'effective', 'process'];
    const descriptionKeywords = ['description', 'merchant', 'payee', 'details', 'memo', 'reference', 'transaction', 'vendor', 'name'];
    const amountKeywords = ['amount', 'debit', 'credit', 'withdrawal', 'deposit', 'balance', 'total'];
    
    const dateColumns = headers.filter((_, i) => 
      dateKeywords.some(keyword => lowerHeaders[i].includes(keyword))
    );
    
    const descriptionColumns = headers.filter((_, i) => 
      descriptionKeywords.some(keyword => lowerHeaders[i].includes(keyword))
    );
    
    const amountColumns = headers.filter((_, i) => 
      amountKeywords.some(keyword => lowerHeaders[i].includes(keyword))
    );

    console.log('Detected columns:', { dateColumns, descriptionColumns, amountColumns });

    return {
      dateColumns,
      descriptionColumns, 
      amountColumns,
      suggestedMapping: {
        date: dateColumns[0] || '',
        description: descriptionColumns[0] || '',
        amount: amountColumns[0] || '',
        reference: headers.find(h => 
          h.toLowerCase().includes('ref') || 
          h.toLowerCase().includes('check') || 
          h.toLowerCase().includes('number') ||
          h.toLowerCase().includes('id')
        ) || ''
      }
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadedFile({
        file,
        error: 'Please select a CSV file'
      });
      return;
    }

    setUploadedFile({ file });
    
    try {
      const text = await file.text();
      const detectedFormat = detectCSVFormat(text);
      
      // Parse with detected separator
      const lines = text.split('\n').slice(0, 6).filter(line => line.trim());
      const preview = lines.map(line => line.split(detectedFormat.separator));
      const headers = preview[0] || [];
      
      // Detect columns automatically
      const columnDetection = detectColumns(headers);
      const hasRequiredColumns = columnDetection.suggestedMapping.date && 
                                 columnDetection.suggestedMapping.description && 
                                 columnDetection.suggestedMapping.amount;
      
      console.log('Column detection result:', columnDetection);
      console.log('Has required columns:', hasRequiredColumns);
      
      if (!hasRequiredColumns) {
        setNeedsMapping(true);
        setColumnMapping({
          date: columnDetection.suggestedMapping.date,
          description: columnDetection.suggestedMapping.description,
          amount: columnDetection.suggestedMapping.amount,
          reference: columnDetection.suggestedMapping.reference
        });
      } else {
        setColumnMapping(columnDetection.suggestedMapping);
        setNeedsMapping(false);
      }
      
      setUploadedFile(prev => prev ? { 
        ...prev, 
        preview, 
        detectedFormat,
        headers
      } : null);
    } catch (error) {
      setUploadedFile(prev => prev ? { 
        ...prev, 
        error: 'Failed to read CSV file' 
      } : null);
    }
  };

  const applyTemplate = (templateKey: string) => {
    if (!templateKey || !uploadedFile?.headers) return;
    
    const template = BANK_TEMPLATES[templateKey];
    if (!template) return;
    
    setSelectedTemplate(templateKey);
    
    // Try to match template columns with actual headers
    const headers = uploadedFile.headers;
    const mapping: ColumnMapping = {
      date: headers.find(h => h === template.columns.date) || 
            headers.find(h => h.toLowerCase().includes('date')) || '',
      description: headers.find(h => h === template.columns.description) || 
                  headers.find(h => h.toLowerCase().includes('description') || h.toLowerCase().includes('payee')) || '',
      amount: headers.find(h => h === template.columns.amount) || 
             headers.find(h => h.toLowerCase().includes('amount') || h.toLowerCase().includes('debit')) || '',
      reference: headers.find(h => h === template.columns.reference) || 
                headers.find(h => h.toLowerCase().includes('reference') || h.toLowerCase().includes('check')) || ''
    };
    
    setColumnMapping(mapping);
    setNeedsMapping(!mapping.date || !mapping.description || !mapping.amount);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile?.file || uploadedFile.error || !columnMapping) return;

    if (!accountName.trim()) {
      setUploadedFile(prev => prev ? {
        ...prev,
        error: 'Account name is required'
      } : null);
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('accountName', accountName.trim());
      formData.append('columnMapping', JSON.stringify(columnMapping));
      formData.append('separator', uploadedFile.detectedFormat?.separator || ',');

      const response = await fetch('/api/bank/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

      // Reset state
      setUploadedFile(null);
      setColumnMapping(null);
      setNeedsMapping(false);
      setSelectedTemplate('');
      setAccountName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadedFile(prev => prev ? {
        ...prev,
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      } : null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setColumnMapping(null);
    setNeedsMapping(false);
    setSelectedTemplate('');
    setAccountName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canUpload = uploadedFile && 
                   !uploadedFile.error && 
                   columnMapping && 
                   columnMapping.date && 
                   columnMapping.description && 
                   columnMapping.amount &&
                   accountName.trim();

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Upload Bank Statement
          </h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Settings className="h-4 w-4" />
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
          </button>
        </div>
        
        {!uploadedFile && (
          <>
            {showAdvanced && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Bank Templates</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Select your bank format for automatic column mapping:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(BANK_TEMPLATES).map(([key, template]) => (
                    <div 
                      key={key}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-white cursor-pointer"
                      onClick={() => setSelectedTemplate(key)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{template.name}</span>
                        <input 
                          type="radio" 
                          checked={selectedTemplate === key}
                          onChange={() => setSelectedTemplate(key)}
                          className="text-blue-600"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {template.example}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Upload your bank statement
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supports any CSV format - we&apos;ll auto-detect columns or help you map them
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </>
        )}

        {uploadedFile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                    {uploadedFile.detectedFormat && (
                      <span className="ml-2">
                        • {uploadedFile.detectedFormat.separatorName} separated
                        • {uploadedFile.headers?.length || 0} columns
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleRemoveFile}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {uploadedFile.error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">{uploadedFile.error}</p>
              </div>
            )}

            {/* Account Name Input */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
                Account Name *
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Chase Checking, Wells Fargo Savings"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a name to identify this bank account in your records
              </p>
            </div>

            {/* Bank Template Selector */}
            {uploadedFile.headers && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Quick Setup</h4>
                <div className="flex items-center space-x-4">
                  <select 
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    value={selectedTemplate}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    <option value="">Auto-detect columns</option>
                    {Object.entries(BANK_TEMPLATES).map(([key, template]) => (
                      <option key={key} value={key}>{template.name}</option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <span className="text-sm text-blue-600">Template applied</span>
                  )}
                </div>
              </div>
            )}

            {/* Column Mapping */}
            {needsMapping && uploadedFile.headers && (
              <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-gray-900">Map Your CSV Columns</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Please map your CSV columns to the required fields:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Column *
                    </label>
                    <select 
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={columnMapping?.date || ''}
                      onChange={(e) => setColumnMapping(prev => prev ? {...prev, date: e.target.value} : null)}
                    >
                      <option value="">Select date column</option>
                      {uploadedFile.headers.map((header, index) => (
                        <option key={index} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description Column *
                    </label>
                    <select 
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={columnMapping?.description || ''}
                      onChange={(e) => setColumnMapping(prev => prev ? {...prev, description: e.target.value} : null)}
                    >
                      <option value="">Select description column</option>
                      {uploadedFile.headers.map((header, index) => (
                        <option key={index} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Column *
                    </label>
                    <select 
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={columnMapping?.amount || ''}
                      onChange={(e) => setColumnMapping(prev => prev ? {...prev, amount: e.target.value} : null)}
                    >
                      <option value="">Select amount column</option>
                      {uploadedFile.headers.map((header, index) => (
                        <option key={index} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Column
                    </label>
                    <select 
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={columnMapping?.reference || ''}
                      onChange={(e) => setColumnMapping(prev => prev ? {...prev, reference: e.target.value} : null)}
                    >
                      <option value="">Select reference column (optional)</option>
                      {uploadedFile.headers.map((header, index) => (
                        <option key={index} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {uploadedFile.preview && !uploadedFile.error && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">CSV Preview</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadedFile.preview.map((row, index) => (
                        <tr key={index} className={index === 0 ? 'bg-gray-50' : ''}>
                          {row.map((cell: string, cellIndex: number) => {
                            const header = uploadedFile.headers?.[cellIndex];
                            const isSelected = columnMapping && (
                              header === columnMapping.date ||
                              header === columnMapping.description ||
                              header === columnMapping.amount ||
                              header === columnMapping.reference
                            );
                            
                            return (
                              <td 
                                key={cellIndex}
                                className={`px-3 py-2 text-sm border-r border-gray-200 last:border-r-0 ${
                                  index === 0 ? 'font-medium text-gray-900' : 'text-gray-700'
                                } ${isSelected && index === 0 ? 'bg-blue-100 text-blue-900' : ''}`}
                              >
                                {cell.trim()}
                                {isSelected && index === 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    {header === columnMapping?.date && '📅 Date'}
                                    {header === columnMapping?.description && '📝 Description'}
                                    {header === columnMapping?.amount && '💰 Amount'}
                                    {header === columnMapping?.reference && '🔗 Reference'}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-2 text-sm">
                    {canUpload ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Ready to process</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Please map required columns</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || !canUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Process Bank Statement</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
