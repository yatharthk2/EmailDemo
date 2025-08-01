import pdfParse from 'pdf-parse';
import { ProcessingResult } from '../types/receipt-types';

export class PdfProcessor {
  /**
   * Extract text from a PDF buffer
   * @param pdfBuffer - The PDF file as a Buffer
   * @returns Promise<ProcessingResult> with the extracted text
   */
  static async extractText(pdfBuffer: Buffer): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Basic options for PDF parsing
      const options = {
        // Limit pages to parse in case of very large PDFs
        max: 10,
        // Skip images during parsing for faster processing
        pagerender: (pageData: any) => Promise.resolve(),
      };
      
      // Parse the PDF
      const pdfData = await pdfParse(pdfBuffer, options);
      
      // If no text was extracted, return an error
      if (!pdfData.text || pdfData.text.trim() === '') {
        return {
          success: false,
          stage: 'pdf_extraction',
          message: 'No text found in PDF',
          processingTime: Date.now() - startTime
        };
      }
      
      return {
        success: true,
        stage: 'pdf_extraction',
        message: 'Text successfully extracted from PDF',
        data: {
          text: pdfData.text,
          pageCount: pdfData.numpages,
          info: pdfData.info
        },
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return {
        success: false,
        stage: 'pdf_extraction',
        message: 'Failed to extract text from PDF',
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Clean and normalize extracted PDF text
   * @param text - The raw text extracted from PDF
   * @returns string - Cleaned and normalized text
   */
  static cleanText(text: string): string {
    if (!text) return '';
    
    return text
      // Replace multiple spaces with a single space
      .replace(/\s+/g, ' ')
      // Replace multiple newlines with a single newline
      .replace(/\n+/g, '\n')
      // Remove non-printable characters
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim leading/trailing whitespace
      .trim();
  }
  
  /**
   * Detect if PDF text might be from a scanned document (image-based)
   * @param text - Extracted text from PDF
   * @returns boolean - True if likely scanned, false if proper text
   */
  static isLikelyScannedDocument(text: string): boolean {
    if (!text) return true;
    
    // Very little text suggests a scanned document with poor OCR
    if (text.length < 100) return true;
    
    // Calculate the ratio of whitespace to total length
    const whitespaceRatio = (text.match(/\s/g) || []).length / text.length;
    
    // If text has very few whitespaces, it might be a scanning artifact
    if (whitespaceRatio < 0.05) return true;
    
    // Check for common OCR artifacts
    const hasOcrArtifacts = /[^\w\s.,;:!?@#$%^&*()_+\-=[\]{};':"\\|,.<>/?€£¥©®™]/.test(text);
    
    return hasOcrArtifacts;
  }
}
