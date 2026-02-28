import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { format } from 'date-fns';

interface PaymentRecord {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  term: string;
  session: string;
  fee_type: { name: string };
  student: {
    admission_number: string;
    profile: { first_name: string; last_name: string };
    class: { name: string };
  };
}

interface SchoolSettings {
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
}

const generateSingleReceiptBlob = (payment: PaymentRecord, schoolInfo: SchoolSettings): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [148, 210],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setFillColor(212, 168, 75);
  doc.rect(0, 32, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.school_name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (schoolInfo.school_address) {
    doc.text(schoolInfo.school_address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  const contactLine = [schoolInfo.school_phone, schoolInfo.school_email].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
  }

  y = 42;

  // Receipt title
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(212, 168, 75);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
  y += 8;

  // Receipt details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(8, y, pageWidth - 16, 16, 2, 2, 'FD');
  
  y += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', 12, y);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.receipt_number || 'N/A', 40, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth / 2 + 10, y);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(payment.payment_date), 'dd MMMM yyyy'), pageWidth / 2 + 25, y);
  y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Session:', 12, y);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.session, 35, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Term:', pageWidth / 2 + 10, y);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.term.charAt(0).toUpperCase() + payment.term.slice(1) + ' Term', pageWidth / 2 + 25, y);
  
  y += 16;

  // Student Info Section
  doc.setFillColor(30, 58, 95);
  doc.rect(8, y, pageWidth - 16, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT INFORMATION', 12, y + 5);
  y += 10;

  const labelX = 12;
  const valueX = 50;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const studentName = `${payment.student?.profile?.first_name || ''} ${payment.student?.profile?.last_name || ''}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(studentName || 'N/A', valueX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Admission No:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.student?.admission_number || 'N/A', valueX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Class:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.student?.class?.name || 'N/A', valueX, y);
  y += 10;

  // Payment Details Section
  doc.setFillColor(30, 58, 95);
  doc.rect(8, y, pageWidth - 16, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', 12, y + 5);
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Fee Type:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.fee_type?.name || 'School Fee', valueX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text((payment.payment_method || 'Cash').charAt(0).toUpperCase() + (payment.payment_method || 'cash').slice(1), valueX, y);
  y += 10;

  // Amount box
  doc.setFillColor(212, 168, 75);
  doc.roundedRect(8, y, pageWidth - 16, 20, 2, 2, 'F');
  
  y += 8;
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT PAID', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(14);
  doc.setTextColor(0, 80, 0);
  doc.text(`₦${payment.amount_paid.toLocaleString()}`, pageWidth / 2, y, { align: 'center' });

  y += 20;

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated receipt.', pageWidth / 2, y, { align: 'center' });

  // Watermark
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(40);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID', pageWidth / 2, 120, { align: 'center', angle: 45 });

  return doc.output('blob');
};

export const downloadBulkReceipts = async (
  payments: PaymentRecord[],
  schoolInfo: SchoolSettings,
  term: string,
  session: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  const zip = new JSZip();
  const folder = zip.folder(`Receipts_${session.replace('/', '-')}_${term}_Term`);
  
  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }

  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    const blob = generateSingleReceiptBlob(payment, schoolInfo);
    
    const studentName = `${payment.student?.profile?.first_name || 'Unknown'}_${payment.student?.profile?.last_name || 'Student'}`;
    const filename = `Receipt_${studentName}_${payment.receipt_number || payment.id.slice(0, 8)}.pdf`;
    
    folder.file(filename, blob);
    
    if (onProgress) {
      onProgress(i + 1, payments.length);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Download the ZIP file
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = `Receipts_${session.replace('/', '-')}_${term}_Term_${format(new Date(), 'yyyyMMdd')}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
