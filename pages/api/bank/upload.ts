import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File, Fields, Files } from 'formidable';
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { ReceiptProcessorWithDB } from '../../../lib/receipt-processor-db';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface BankTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  reference?: string;
}

interface ParsedCSVResult {
  transactions: BankTransaction[];
  errors: string[];
  totalRows: number;
  successfulRows: number;
}

/**
 * Enhanced CSV parser with robust error handling and multiple format support
 */
class CSVBankStatementParser {
  private static readonly COMMON_HEADERS = {
    date: ['date', 'transaction date', 'posting date', 'value date', 'txn date', 'posted date'],
    description: ['description', 'transaction description', 'details', 'memo', 'reference', 'payee', 'merchant', 'vendor', 'name'],
    amount: ['amount', 'transaction amount', 'value', 'debit', 'credit', 'total'],
    debit: ['debit', 'debit amount', 'withdrawal', 'out'],
    credit: ['credit', 'credit amount', 'deposit', 'in'],
    balance: ['balance', 'running balance', 'current balance'],
    reference: ['reference', 'ref', 'transaction id', 'id', 'check', 'slip', 'number']
  };

  /**
   * Parse CSV data and extract bank transactions
   */
  static async parseCSV(
    filePath: string, 
    customColumnMapping?: any, 
    separator: string = ','
  ): Promise<ParsedCSVResult> {
    const transactions: BankTransaction[] = [];
    const errors: string[] = [];
    let totalRows = 0;
    let successfulRows = 0;
    let headers: string[] = [];
    let headerMapping: { [key: string]: string } = {};

    return new Promise((resolve, reject) => {
      const csvOptions: any = {
        skipEmptyLines: true
      };
      
      // Use custom separator if provided
      if (separator && separator !== ',') {
        csvOptions.separator = separator;
      }

      const stream = createReadStream(filePath)
        .pipe(csv(csvOptions))
        .on('headers', (headerList: string[]) => {
          headers = headerList; // Keep original headers for row access
          const lowerHeaders = headerList.map(h => h.toLowerCase().trim());
          
          // Use custom column mapping if provided, otherwise auto-detect
          if (customColumnMapping) {
            headerMapping = CSVBankStatementParser.createCustomHeaderMapping(headerList, customColumnMapping);
            console.log('Using custom header mapping:', headerMapping);
          } else {
            headerMapping = CSVBankStatementParser.createHeaderMapping(headerList);
            console.log('Auto-detected header mapping:', headerMapping);
          }
          
          console.log('Original headers:', headerList);
          console.log('Lowercase headers:', lowerHeaders);
        })
        .on('data', (row: any) => {
          totalRows++;
          try {
            const transaction = CSVBankStatementParser.parseRow(row, headerMapping);
            if (transaction) {
              transactions.push(transaction);
              successfulRows++;
            }
          } catch (error) {
            const errorMsg = `Row ${totalRows}: ${error instanceof Error ? error.message : 'Parse error'}`;
            errors.push(errorMsg);
            console.warn(errorMsg);
          }
        })
        .on('end', () => {
          console.log(`CSV parsing completed: ${successfulRows}/${totalRows} rows successful`);
          resolve({
            transactions,
            errors,
            totalRows,
            successfulRows
          });
        })
        .on('error', (error) => {
          console.error('CSV parsing failed:', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });
  }

  /**
   * Create mapping from CSV headers to our standard field names
   */
  private static createHeaderMapping(headers: string[]): { [key: string]: string } {
    const mapping: { [key: string]: string } = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    for (const [fieldName, possibleHeaders] of Object.entries(CSVBankStatementParser.COMMON_HEADERS)) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const lowerHeader = lowerHeaders[i];
        
        // Check if any of the possible headers match the current header
        if (possibleHeaders.some(ph => lowerHeader.includes(ph.toLowerCase()))) {
          mapping[fieldName] = header; // Use original header name for row access
          break;
        }
      }
    }

    console.log('Header mapping result:', mapping);
    console.log('Available headers:', headers);
    return mapping;
  }

  /**
   * Create mapping from custom column mapping provided by frontend
   */
  private static createCustomHeaderMapping(headers: string[], customMapping: any): { [key: string]: string } {
    const mapping: { [key: string]: string } = {};
    
    // Find the actual header names that match the custom mapping (case-insensitive)
    if (customMapping.date) {
      const dateHeader = headers.find(h => h.toLowerCase().trim() === customMapping.date.toLowerCase().trim());
      if (dateHeader) mapping.date = dateHeader;
    }
    
    if (customMapping.description) {
      const descHeader = headers.find(h => h.toLowerCase().trim() === customMapping.description.toLowerCase().trim());
      if (descHeader) mapping.description = descHeader;
    }
    
    if (customMapping.amount) {
      const amountHeader = headers.find(h => h.toLowerCase().trim() === customMapping.amount.toLowerCase().trim());
      if (amountHeader) mapping.amount = amountHeader;
    }
    
    if (customMapping.reference) {
      const refHeader = headers.find(h => h.toLowerCase().trim() === customMapping.reference.toLowerCase().trim());
      if (refHeader) mapping.reference = refHeader;
    }

    // Fall back to auto-detection for missing mappings
    const autoMapping = CSVBankStatementParser.createHeaderMapping(headers);
    
    // Log for debugging
    console.log('Custom mapping attempt:', customMapping);
    console.log('Available headers:', headers);
    console.log('Resolved custom mapping:', mapping);
    console.log('Auto-detected fallback:', autoMapping);
    
    return {
      ...autoMapping,
      ...mapping
    };
  }

  /**
   * Parse a single CSV row into a BankTransaction
   */
  private static parseRow(row: any, headerMapping: { [key: string]: string }): BankTransaction | null {
    try {
      // Extract basic fields
      const dateField = headerMapping.date;
      const descriptionField = headerMapping.description;
      const amountField = headerMapping.amount;
      const debitField = headerMapping.debit;
      const creditField = headerMapping.credit;
      const balanceField = headerMapping.balance;
      const referenceField = headerMapping.reference;

      if (!dateField || !descriptionField) {
        throw new Error('Missing required fields: date or description');
      }

      const dateStr = row[dateField];
      const description = row[descriptionField];

      if (!dateStr || !description) {
        throw new Error('Empty date or description');
      }

      // Parse date
      const date = CSVBankStatementParser.parseDate(dateStr);

      // Parse amount - handle different formats
      let amount: number;
      let type: 'debit' | 'credit';

      if (amountField && row[amountField]) {
        // Single amount field
        const amountValue = CSVBankStatementParser.parseAmount(row[amountField]);
        amount = Math.abs(amountValue);
        
        // For single amount fields, check if description indicates income/credit
        const description = row[descriptionField] || '';
        const isIncome = /deposit|income|salary|interest|refund|credit|payment received/i.test(description);
        
        if (amountValue < 0) {
          type = 'debit'; // Negative amounts are definitely debits
        } else if (isIncome) {
          type = 'credit'; // Positive amounts that look like income
        } else {
          type = 'debit'; // Default: positive amounts are typically expenses (debits)
        }
      } else if (debitField || creditField) {
        // Separate debit/credit fields
        const debitValue = debitField ? CSVBankStatementParser.parseAmount(row[debitField] || '0') : 0;
        const creditValue = creditField ? CSVBankStatementParser.parseAmount(row[creditField] || '0') : 0;

        if (debitValue > 0) {
          amount = debitValue;
          type = 'debit';
        } else if (creditValue > 0) {
          amount = creditValue;
          type = 'credit';
        } else {
          throw new Error('No valid amount found');
        }
      } else {
        throw new Error('No amount field found');
      }

      const transaction: BankTransaction = {
        date,
        description: description.trim(),
        amount,
        type,
      };

      // Add optional fields
      if (balanceField && row[balanceField]) {
        transaction.balance = CSVBankStatementParser.parseAmount(row[balanceField]);
      }

      if (referenceField && row[referenceField]) {
        transaction.reference = row[referenceField].toString().trim();
      }

      return transaction;
    } catch (error) {
      throw new Error(`Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse date string with enhanced format support
   */
  private static parseDate(dateStr: string): string {
    if (!dateStr || typeof dateStr !== 'string') {
      throw new Error('Invalid date input');
    }

    const cleaned = dateStr.replace(/["\s]/g, '').trim();
    
    // Define date format patterns
    const formats = [
      { pattern: /^(\d{4})-(\d{2})-(\d{2})$/, group: [1, 2, 3] },
      { pattern: /^(\d{2})\/(\d{2})\/(\d{4})$/, group: [3, 1, 2] },
      { pattern: /^(\d{2})-(\d{2})-(\d{4})$/, group: [3, 1, 2] },
      { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, group: [3, 1, 2] },
      { pattern: /^(\d{4})\/(\d{2})\/(\d{2})$/, group: [1, 2, 3] },
      { pattern: /^(\d{2})\.(\d{2})\.(\d{4})$/, group: [3, 2, 1] },
    ];

    for (const { pattern, group } of formats) {
      const match = cleaned.match(pattern);
      if (match) {
        const year = match[group[0]];
        const month = match[group[1]].padStart(2, '0');
        const day = match[group[2]].padStart(2, '0');
        
        const dateObj = new Date(`${year}-${month}-${day}`);
        if (!isNaN(dateObj.getTime())) {
          return `${year}-${month}-${day}`;
        }
      }
    }

    // Fallback to native parsing
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    throw new Error(`Invalid date format: ${dateStr}`);
  }

  /**
   * Parse amount string with enhanced format support
   */
  private static parseAmount(amountStr: string): number {
    if (!amountStr || typeof amountStr !== 'string') {
      return 0;
    }

    // Clean the amount string
    let cleaned = amountStr.trim()
      .replace(/[$£€¥₹,\s]/g, '') // Remove currency symbols and commas
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/^\+/, ''); // Remove leading plus

    if (!cleaned) {
      return 0;
    }

    // Handle negative amounts (parentheses or minus sign)
    const isNegative = amountStr.includes('(') || amountStr.includes('-');
    
    const amount = parseFloat(cleaned);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: ${amountStr}`);
    }

    return isNegative ? -Math.abs(amount) : amount;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: './temp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ name, originalFilename, mimetype }) => {
        // Only allow CSV files
        return (
          name === 'file' &&
          (mimetype === 'text/csv' || 
           mimetype === 'application/csv' ||
           originalFilename?.endsWith('.csv') ||
           false)
        );
      },
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No valid CSV file uploaded' });
    }

    const accountName = Array.isArray(fields.accountName) ? fields.accountName[0] : fields.accountName;
    if (!accountName) {
      return res.status(400).json({ error: 'Account name is required' });
    }

    // Get flexible options from frontend
    const columnMappingStr = Array.isArray(fields.columnMapping) ? fields.columnMapping[0] : fields.columnMapping;
    const separator = Array.isArray(fields.separator) ? fields.separator[0] : fields.separator || ',';
    
    let customColumnMapping = null;
    if (columnMappingStr) {
      try {
        customColumnMapping = JSON.parse(columnMappingStr);
        console.log('Using custom column mapping:', customColumnMapping);
      } catch (e) {
        console.warn('Failed to parse column mapping, using auto-detection:', e);
      }
    }

    console.log(`Processing bank statement: ${file.originalFilename} for account: ${accountName}`);
    console.log(`Using separator: "${separator}"`);

    // Parse the CSV file with custom options
    const parseResult = await CSVBankStatementParser.parseCSV(file.filepath, customColumnMapping, separator);
    
    if (parseResult.transactions.length === 0) {
      return res.status(400).json({ 
        error: 'No valid transactions found in CSV file',
        details: parseResult.errors,
        suggestion: 'Please check your column mapping and CSV format'
      });
    }

    // Store in database using individual transactions
    const processor = new ReceiptProcessorWithDB();
    const filename = file.originalFilename || 'uploaded_statement.csv';
    
    for (const transaction of parseResult.transactions) {
      // Convert transaction format to match addBankTransaction parameters
      // Make sure debits are negative amounts (expenses)
      const signedAmount = transaction.type === 'debit' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
      
      processor.addBankTransaction(
        filename,
        transaction.date,
        transaction.description,
        signedAmount, // Use signed amount based on transaction type
        transaction.reference,
        undefined, // account_number not in our transaction interface
        transaction.balance
      );
    }

    // Run automatic reconciliation after uploading bank transactions
    console.log('Running automatic reconciliation...');
    try {
      const reconciliationResult = await processor.performReconciliation();
      console.log(`Reconciliation completed: ${reconciliationResult.totalMatches} matches found`);
    } catch (reconciliationError) {
      console.error('Reconciliation failed:', reconciliationError);
      // Don't fail the upload if reconciliation fails
    }

    processor.close();

    // Clean up uploaded file
    try {
      const fs = await import('fs');
      fs.unlinkSync(file.filepath);
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError);
    }

    res.status(200).json({
      success: true,
      message: `Successfully processed ${parseResult.transactions.length} transactions`,
      processed: parseResult.transactions.length,
      errors: parseResult.errors.length > 0 ? parseResult.errors.slice(0, 5) : undefined,
      totalErrors: parseResult.errors.length,
      filename: filename,
      parseStats: {
        totalRows: parseResult.totalRows,
        successfulRows: parseResult.successfulRows,
        columnMapping: customColumnMapping || 'auto-detected',
        separator: separator
      }
    });

  } catch (error) {
    console.error('Bank statement upload error:', error);
    
    return res.status(500).json({
      error: 'Failed to process bank statement',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
