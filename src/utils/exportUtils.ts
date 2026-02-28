import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  schoolName?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
}

// Export to CSV
export const exportToCSV = (options: ExportOptions): void => {
  const { filename, columns, data } = options;
  
  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    })
  );
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

// Export to Excel
export const exportToExcel = (options: ExportOptions): void => {
  const { filename, title, columns, data } = options;
  
  const wsData = [
    columns.map(col => col.header),
    ...data.map(row => columns.map(col => row[col.key] ?? ''))
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title || 'Data');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Export to PDF
export const exportToPDF = (options: ExportOptions): void => {
  const { filename, title, subtitle, schoolName, columns, data } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let yPosition = 20;
  
  // School name header
  if (schoolName) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
  }
  
  // Title
  if (title) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
  }
  
  // Table
  autoTable(doc, {
    startY: yPosition,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.key] ?? '')),
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 58, 95], // Primary color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 10, right: 10 },
  });
  
  // Footer with date
  const today = new Date().toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Generated on: ${today}`, 10, doc.internal.pageSize.getHeight() - 10);
  
  doc.save(`${filename}.pdf`);
};

// Helper function to download blob
const downloadBlob = (blob: Blob, filename: string): void => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Export dialog component data
export type ExportFormat = 'csv' | 'excel' | 'pdf';

export const exportData = (format: ExportFormat, options: ExportOptions): void => {
  switch (format) {
    case 'csv':
      exportToCSV(options);
      break;
    case 'excel':
      exportToExcel(options);
      break;
    case 'pdf':
      exportToPDF(options);
      break;
  }
};
