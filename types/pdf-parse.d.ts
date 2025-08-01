declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: any) => Promise<void>;
    max?: number;
    version?: string;
  }

  function parse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  
  export = parse;
}
