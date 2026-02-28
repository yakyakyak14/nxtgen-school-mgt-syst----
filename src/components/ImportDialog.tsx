import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as XLSX from 'xlsx';

export interface ImportError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

interface ImportDialogProps {
  onImport: (data: Record<string, any>[]) => Promise<ImportResult>;
  expectedColumns: string[];
  requiredColumns?: string[];
  templateData?: Record<string, any>[];
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  validators?: Record<string, (value: any, row: Record<string, any>, rowIndex: number) => ImportError | null>;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  onImport,
  expectedColumns,
  requiredColumns = [],
  templateData,
  trigger,
  title = 'Import Data',
  description = 'Upload an Excel, CSV, Word, or PDF file to import data',
  validators = {},
}) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateRow = (row: Record<string, any>, rowIndex: number): ImportError[] => {
    const errors: ImportError[] = [];

    for (const col of requiredColumns) {
      const value = row[col];
      if (value === undefined || value === null || value === '') {
        errors.push({
          row: rowIndex + 1,
          column: col,
          message: `Missing required value for "${col}"`,
          severity: 'error',
        });
      }
    }

    for (const [column, validator] of Object.entries(validators)) {
      const error = validator(row[column], row, rowIndex);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  };

  const parseWordFile = async (file: File): Promise<Record<string, any>[]> => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    // Parse HTML tables
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');

    if (tables.length > 0) {
      return parseHtmlTable(tables[0]);
    }

    // Fallback: try to parse line-by-line text as tab/comma separated
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    return parseTextToRecords(textResult.value);
  };

  const parsePdfFile = async (file: File): Promise<Record<string, any>[]> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return parseTextToRecords(fullText);
  };

  const parseHtmlTable = (table: Element): Record<string, any>[] => {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) return [];

    const headers: string[] = [];
    rows[0].querySelectorAll('th, td').forEach(cell => {
      headers.push(cell.textContent?.trim().toLowerCase().replace(/\s+/g, '_') || '');
    });

    const data: Record<string, any>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      const row: Record<string, any> = {};
      cells.forEach((cell, idx) => {
        if (idx < headers.length) {
          row[headers[idx]] = cell.textContent?.trim() || '';
        }
      });
      if (Object.values(row).some(v => v !== '')) {
        data.push(row);
      }
    }
    return data;
  };

  const parseTextToRecords = (text: string): Record<string, any>[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) throw new Error('File does not contain enough data. Please ensure it has a header row and at least one data row.');

    // Try tab separator first, then comma, then multiple spaces
    let separator = '\t';
    if (!lines[0].includes('\t')) {
      if (lines[0].includes(',')) {
        separator = ',';
      } else {
        separator = /\s{2,}/g as any; // multiple spaces
      }
    }

    const splitLine = (line: string) => {
      if (typeof separator === 'string') {
        return line.split(separator).map(s => s.trim());
      }
      return line.split(/\s{2,}/).map(s => s.trim());
    };

    const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const data: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitLine(lines[i]);
      const row: Record<string, any> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      if (Object.values(row).some(v => v !== '')) {
        data.push(row);
      }
    }

    return data;
  };

  const readFile = async (file: File): Promise<Record<string, any>[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'docx' || ext === 'doc') {
      return parseWordFile(file);
    }

    if (ext === 'pdf') {
      return parsePdfFile(file);
    }

    // Excel/CSV - existing logic
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData as Record<string, any>[]);
        } catch (err) {
          reject(new Error('Failed to parse file. Please ensure it is a valid Excel or CSV file.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setValidationErrors([]);
    setImportResult(null);
    setIsParsing(true);

    try {
      const data = await readFile(selectedFile);

      if (data.length > 0) {
        const fileColumns = Object.keys(data[0]);
        const missingColumns = expectedColumns.filter(col => !fileColumns.includes(col));

        if (missingColumns.length > 0) {
          setParseError(`Missing columns: ${missingColumns.join(', ')}. Found columns: ${fileColumns.join(', ')}`);
          setPreviewData([]);
          setIsParsing(false);
          return;
        }

        const allErrors: ImportError[] = [];
        data.forEach((row, index) => {
          const rowErrors = validateRow(row, index);
          allErrors.push(...rowErrors);
        });

        setValidationErrors(allErrors);
      } else {
        setParseError('No data found in file. Ensure the file has a header row with column names matching the expected format.');
      }

      setPreviewData(data.slice(0, 10));
    } catch (err: any) {
      setParseError(err.message || 'Failed to read file');
      setPreviewData([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const criticalErrors = validationErrors.filter(e => e.severity === 'error');
    if (criticalErrors.length > 0) {
      setImportResult({
        success: false,
        successCount: 0,
        errorCount: criticalErrors.length,
        errors: criticalErrors,
      });
      return;
    }

    setIsImporting(true);
    try {
      const data = await readFile(file);
      const result = await onImport(data);
      setImportResult(result);

      if (result.success && result.errorCount === 0) {
        setTimeout(() => {
          setOpen(false);
          resetState();
        }, 2000);
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        successCount: 0,
        errorCount: 1,
        errors: [{ row: 0, message: err.message || 'Import failed', severity: 'error' }],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const data = templateData || [
      expectedColumns.reduce((acc, col) => ({ ...acc, [col]: '' }), {}),
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'import_template.xlsx');
  };

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    setImportResult(null);
    setParseError(null);
    setIsParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetState(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4 pr-4">
            <div className="space-y-2">
              <Label>File Upload</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.docx,.doc,.pdf"
                  onChange={handleFileChange}
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: Excel (.xlsx, .xls), CSV, Word (.docx), PDF
              </p>
              <p className="text-xs text-muted-foreground">
                For Word/PDF files, ensure data is in a table format with headers matching the expected columns.
              </p>
            </div>

            {isParsing && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Parsing file...
              </div>
            )}

            <Button variant="link" className="p-0 h-auto" onClick={downloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template (Excel)
            </Button>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {/* Validation Summary */}
            {previewData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  {errorCount === 0 && warningCount === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle className="h-4 w-4" />
                      All {previewData.length} rows validated successfully
                    </div>
                  ) : (
                    <>
                      {errorCount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          {errorCount} error{errorCount > 1 ? 's' : ''}
                        </div>
                      )}
                      {warningCount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          {warningCount} warning{warningCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {validationErrors.length > 0 && (
                  <div className="border rounded-lg p-3 bg-muted/50 max-h-40 overflow-auto">
                    <p className="text-sm font-medium mb-2">Validation Issues:</p>
                    <ul className="text-xs space-y-1">
                      {validationErrors.slice(0, 20).map((err, idx) => (
                        <li key={idx} className={`flex items-start gap-2 ${err.severity === 'error' ? 'text-destructive' : 'text-warning'}`}>
                          {err.severity === 'error' ? (
                            <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          )}
                          <span>
                            Row {err.row}{err.column ? `, "${err.column}"` : ''}: {err.message}
                          </span>
                        </li>
                      ))}
                      {validationErrors.length > 20 && (
                        <li className="text-muted-foreground">
                          ... and {validationErrors.length - 20} more issues
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Preview Table */}
            {previewData.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (first 10 rows)</Label>
                <div className="border rounded-lg overflow-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-xs">#</th>
                        {Object.keys(previewData[0]).map((col) => (
                          <th key={col} className="px-2 py-2 text-left font-medium text-xs">
                            {col}
                            {requiredColumns.includes(col) && <span className="text-destructive ml-1">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => {
                        const rowErrors = validationErrors.filter(e => e.row === idx + 1);
                        const hasError = rowErrors.some(e => e.severity === 'error');
                        return (
                          <tr key={idx} className={`border-t ${hasError ? 'bg-destructive/5' : ''}`}>
                            <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                            {Object.entries(row).map(([col, val], i) => {
                              const cellError = rowErrors.find(e => e.column === col);
                              return (
                                <td 
                                  key={i} 
                                  className={`px-2 py-1 ${cellError ? (cellError.severity === 'error' ? 'text-destructive font-medium' : 'text-warning') : ''}`}
                                  title={cellError?.message}
                                >
                                  {String(val || '')}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <Alert variant={importResult.success && importResult.errorCount === 0 ? 'default' : 'destructive'}>
                {importResult.success && importResult.errorCount === 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {importResult.success && importResult.errorCount === 0 ? (
                    `Successfully imported ${importResult.successCount} records!`
                  ) : (
                    <div className="space-y-2">
                      <p>
                        Import completed with issues: {importResult.successCount} succeeded, {importResult.errorCount} failed
                      </p>
                      {importResult.errors.length > 0 && (
                        <ul className="text-xs space-y-1">
                          {importResult.errors.slice(0, 10).map((err, idx) => (
                            <li key={idx}>
                              Row {err.row}: {err.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label>Expected Columns</Label>
              <p className="text-sm text-muted-foreground">
                {expectedColumns.map((col, idx) => (
                  <span key={col}>
                    {col}
                    {requiredColumns.includes(col) && <span className="text-destructive">*</span>}
                    {idx < expectedColumns.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> Required fields
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || isParsing || !file || previewData.length === 0 || errorCount > 0}
          >
            {isImporting ? 'Importing...' : `Import ${previewData.length} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;