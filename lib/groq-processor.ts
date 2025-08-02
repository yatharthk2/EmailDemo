import { LLMClassificationResult, LLMExtractionResult } from '../types/receipt-processing';

export class GroqLLMProcessor {
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private model = 'llama-3.1-8b-instant'; // Updated model name

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async classifyDocument(text: string): Promise<LLMClassificationResult> {
    const startTime = Date.now();
    
    try {
      const truncatedText = text.substring(0, 2000); // Limit text size for API
      
      const messages = [{
        role: "user" as const,
        content: `Analyze this document and determine if it's a retail receipt or purchase receipt.

Look for these key indicators:
- Store/merchant name
- Purchase date and time
- Individual item listings with prices
- Subtotal, tax, and total amounts
- Payment method information
- Receipt-specific formatting

Document text: "${truncatedText}"

Respond with valid JSON only (no additional text):
{
  "isReceipt": boolean,
  "confidence": number (0-100),
  "documentType": "receipt" | "invoice" | "statement" | "other",
  "reasoning": "brief explanation of classification decision",
  "keyIndicators": ["specific phrases or elements that indicate this is/isn't a receipt"]
}`
      }];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq API');
      }

      // Parse JSON response
      let result: LLMClassificationResult;
      try {
        // Clean the response to extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        result = JSON.parse(jsonStr);
      } catch (parseError) {
        throw new Error(`Failed to parse LLM response as JSON: ${parseError}`);
      }

      // Validate the result structure
      if (typeof result.isReceipt !== 'boolean' || 
          typeof result.confidence !== 'number' ||
          !result.documentType ||
          !result.reasoning) {
        throw new Error('Invalid response structure from LLM');
      }

      console.log(`Classification completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('Error in document classification:', error);
      throw error;
    }
  }

  async extractReceiptData(text: string): Promise<LLMExtractionResult> {
    const startTime = Date.now();
    
    try {
      const messages = [{
        role: "user" as const,
        content: `Extract structured data from this receipt text. Be precise with numbers and dates.

Receipt text: "${text}"

Extract the following information and return as valid JSON only:
{
  "merchantName": "string (store/business name)",
  "transactionDate": "YYYY-MM-DD format",
  "totalAmount": number (final total paid),
  "taxAmount": number (tax amount if shown),
  "subtotal": number (pre-tax subtotal if shown),
  "lineItems": [
    {"name": "item name", "price": number, "quantity": number (default 1)}
  ],
  "paymentMethod": "string (cash, card, etc.)",
  "confidence": number (0-100, how confident you are in the extraction),
  "extractionIssues": ["list any problems or uncertainties in the data"]
}

Rules:
- Extract amounts as numbers without currency symbols
- Use YYYY-MM-DD format for dates
- If information is unclear or missing, omit the field or note in extractionIssues
- Be conservative with confidence scores`
      }];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from Groq API');
      }

      // Parse JSON response
      let result: LLMExtractionResult;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        result = JSON.parse(jsonStr);
      } catch (parseError) {
        throw new Error(`Failed to parse LLM response as JSON: ${parseError}`);
      }

      // Validate required fields
      if (typeof result.confidence !== 'number') {
        result.confidence = 50; // Default confidence
      }

      if (!Array.isArray(result.extractionIssues)) {
        result.extractionIssues = [];
      }

      console.log(`Extraction completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('Error in receipt data extraction:', error);
      // Return a minimal result with error info
      return {
        confidence: 0,
        extractionIssues: [`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple chat completion request instead of models endpoint
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5,
          temperature: 0
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
