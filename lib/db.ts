import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database;
  
  private constructor() {
    const dbPath = path.join(process.cwd(), 'receipts_demo.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getDb(): Database.Database {
    return this.db;
  }

  private initializeDatabase(): void {
    // Create tables if they don't exist
    const tables = [
      `CREATE TABLE IF NOT EXISTS document_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT,
        filename TEXT,
        is_receipt BOOLEAN,
        confidence_score INTEGER,
        document_type TEXT, -- 'receipt', 'invoice', 'statement', 'other'
        llm_reasoning TEXT,
        key_indicators TEXT, -- JSON array as text
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS receipt_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT,
        filename TEXT,
        merchant_name TEXT,
        transaction_date DATE,
        total_amount REAL,
        tax_amount REAL,
        subtotal REAL,
        payment_method TEXT,
        line_items TEXT, -- JSON array as text
        llm_confidence INTEGER,
        llm_extraction_issues TEXT, -- JSON array as text
        raw_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS processing_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT,
        filename TEXT,
        processing_stage TEXT, -- 'classification', 'extraction', 'validation'
        success BOOLEAN,
        error_message TEXT,
        processing_time_ms INTEGER,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    tables.forEach(table => {
      this.db.prepare(table).run();
    });
  }

  public close(): void {
    this.db.close();
  }
}

export default DatabaseManager.getInstance;
