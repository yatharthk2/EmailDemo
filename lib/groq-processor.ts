import axios from 'axios';
import { LLMClassificationResult, LLMExtractionResult } from '../types/receipt-types';

export class GroqLLMProcessor {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';
  private model: string = 'meta-llama/llama-4-scout-17b-16e-instruct';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async classifyDocument(text: string): Promise<LLMClassificationResult> {
    const startTime = Date.now();

    try {
      // Truncate text if it's too long to fit in context window
      const truncatedText = text.length > 6000 ? text.substring(0, 6000) : text;
      
      const messages = [{
        role: "user" as const,
        content: `Analyze this document and determine if it's a retail receipt.
        
        Document text: "${truncatedText}"
        
        Respond with JSON only:
        {
          "isReceipt": boolean,
          "confidence": number (0-100),
          "documentType": "receipt" | "invoice" | "statement" | "other",
          "reasoning": "brief explanation",
          "keyIndicators": ["indicator1", "indicator2"]
        }`
      }];
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.1, // Low temperature for factual responses
          max_tokens: 1000, // Limit token usage
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Parse the response content
      const content = response.data.choices[0].message.content;
      const jsonResponse = JSON.parse(content);
      
      // Validate the response format
      const result: LLMClassificationResult = {
        isReceipt: jsonResponse.isReceipt === true,
        confidence: Math.min(100, Math.max(0, jsonResponse.confidence || 0)),
        documentType: jsonResponse.documentType || 'other',
        reasoning: jsonResponse.reasoning || 'No reasoning provided',
        keyIndicators: Array.isArray(jsonResponse.keyIndicators) ? jsonResponse.keyIndicators : []
      };
      
      console.log(`Document classification completed in ${Date.now() - startTime}ms`);
      return result;
      
    } catch (error) {
      console.error('Error in document classification:', error);
      // Return default response in case of error
      return {
        isReceipt: false,
        confidence: 0,
        documentType: 'other',
        reasoning: `Error during classification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        keyIndicators: []
      };
    }
  }

  async extractReceiptData(text: string): Promise<LLMExtractionResult> {
    const startTime = Date.now();

    try {
      // Truncate text if it's too long to fit in context window
      const truncatedText = text.length > 6000 ? text.substring(0, 6000) : text;
      
      const messages = [{
        role: "user" as const,
        content: `Extract structured data from this receipt text.
        
        Receipt text: "${truncatedText}"
        
        Return JSON only:
        {
          "merchantName": string,
          "transactionDate": "YYYY-MM-DD",
          "totalAmount": number,
          "taxAmount": number,
          "subtotal": number,
          "lineItems": [{"name": string, "price": number, "quantity": number}],
          "paymentMethod": string,
          "confidence": number (0-100),
          "extractionIssues": ["issue1", "issue2"]
        }`
      }];
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.1,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Parse the response content
      const content = response.data.choices[0].message.content;
      const jsonResponse = JSON.parse(content);
      
      // Validate and transform line items
      let lineItems = [];
      if (jsonResponse.lineItems && Array.isArray(jsonResponse.lineItems)) {
        lineItems = jsonResponse.lineItems.map((item: any) => ({
          name: item.name || 'Unknown Item',
          price: parseFloat(item.price) || 0,
          quantity: item.quantity ? parseFloat(item.quantity) : 1
        }));
      }
      
      // Create and validate the result
      const result: LLMExtractionResult = {
        merchantName: jsonResponse.merchantName || 'Unknown Merchant',
        transactionDate: jsonResponse.transactionDate || new Date().toISOString().split('T')[0],
        totalAmount: parseFloat(jsonResponse.totalAmount) || 0,
        taxAmount: parseFloat(jsonResponse.taxAmount) || 0,
        subtotal: parseFloat(jsonResponse.subtotal) || 0,
        lineItems,
        paymentMethod: jsonResponse.paymentMethod || 'Unknown',
        confidence: Math.min(100, Math.max(0, jsonResponse.confidence || 0)),
        extractionIssues: Array.isArray(jsonResponse.extractionIssues) ? jsonResponse.extractionIssues : []
      };
      
      console.log(`Receipt extraction completed in ${Date.now() - startTime}ms`);
      return result;
      
    } catch (error) {
      console.error('Error in receipt extraction:', error);
      // Return default response in case of error
      return {
        merchantName: 'Error',
        transactionDate: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        taxAmount: 0,
        subtotal: 0,
        lineItems: [],
        paymentMethod: 'Unknown',
        confidence: 0,
        extractionIssues: [`Error during extraction: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}
