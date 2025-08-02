# File Processing Tracking System

This system has been enhanced to track files that have already been processed and avoid duplicate processing.

## Overview

The enhanced system now includes:

1. **Smart Processing Detection**: Automatically detects if a file has been successfully processed before
2. **Skip Duplicate Processing**: Avoids reprocessing files unless explicitly requested
3. **Force Reprocessing**: Option to override the skip logic and reprocess files
4. **Processing Status Tracking**: Detailed tracking of processing stages and outcomes
5. **Processed Files Dashboard**: UI to view and manage processed files

## Key Features

### 1. Automatic Duplicate Detection

The system now checks if a document has been successfully processed by:
- Checking if document analysis exists
- Verifying successful processing log entries
- For receipts: ensuring extraction data exists

### 2. Processing Status Types

- **Completed**: Receipt successfully classified and extracted
- **Classified Only**: Document classified but extraction incomplete
- **Not Receipt**: Document classified as non-receipt
- **Unknown**: Processing status unclear

### 3. Force Reprocessing

When needed, you can force reprocess files by:
- Using the `forceReprocess: true` parameter in API calls
- Using the bulk reprocess feature in the UI
- Adding `?forceReprocess=true` to auto-processing endpoint

## API Endpoints

### Process Emails (Updated)
```
POST /api/process-emails
{
  "emailIds": ["email1", "email2"],
  "forceReprocess": false  // Optional, defaults to false
}
```

### Auto Process Emails (Updated)
```
GET /api/emails-auto-process?forceReprocess=true  // Optional parameter
```

### Processed Files (New)
```
GET /api/processed-files?page=1&limit=20&emailId=optional
```

### Test File Tracking (New)
```
GET /api/test-file-tracking
```

## Database Schema Updates

The system uses existing tables with enhanced logic:

- **document_analysis**: Stores classification results
- **receipt_ledger**: Stores extraction results for receipts
- **processing_log**: Tracks processing stages and success/failure

## UI Enhancements

### New Processed Files Page
- View all processed files with status
- Filter by email ID
- Bulk selection and force reprocessing
- Processing status indicators

### Dashboard Updates
- Added "Processed Files" navigation link
- Quick access to file management

## Usage Examples

### Check Processing Status (Internal)
```typescript
const status = await processor.checkDocumentProcessingStatus(emailId, filename);
if (status.alreadyProcessed) {
  console.log('File already processed, skipping');
} else {
  // Process the file
}
```

### Process with Force Option
```typescript
const result = await processor.processDocumentWithDB(
  emailId,
  filename,
  pdfBuffer,
  true  // forceReprocess = true
);
```

### API Usage
```javascript
// Regular processing (skips duplicates)
const response = await fetch('/api/process-emails', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailIds: ['email123'],
    forceReprocess: false
  })
});

// Force reprocessing
const forceResponse = await fetch('/api/process-emails', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailIds: ['email123'],
    forceReprocess: true
  })
});
```

## Benefits

1. **Efficiency**: Avoids wasteful reprocessing of already-handled files
2. **Cost Savings**: Reduces API calls to AI services
3. **Better UX**: Faster processing with skip notifications
4. **Flexibility**: Force reprocess when needed
5. **Transparency**: Clear visibility into processing status

## Migration Notes

- Existing processed files will be detected automatically
- No data migration required
- API endpoints are backward compatible
- New `forceReprocess` parameter is optional

## Testing

Use the test endpoint to verify functionality:
```bash
curl http://localhost:3000/api/test-file-tracking
```

This will test the complete tracking workflow and return detailed results.
