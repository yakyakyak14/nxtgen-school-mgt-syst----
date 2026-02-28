import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  feeType: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  session: string;
  term: string;
  balance?: number;
  installmentInfo?: string;
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
  };
}

export const generateReceipt = (receipt: ReceiptData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [148, 210], // A5 size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header with gradient effect
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 32, 'F');
  
  // Add accent line
  doc.setFillColor(212, 168, 75);
  doc.rect(0, 32, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(receipt.schoolInfo.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (receipt.schoolInfo.address) {
    doc.text(receipt.schoolInfo.address, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  const contactLine = [receipt.schoolInfo.phone, receipt.schoolInfo.email].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
  }

  y = 42;

  // Receipt title with decorative elements
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, y, { align: 'center' });
  y += 4;
  
  // Underline
  doc.setDrawColor(212, 168, 75);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
  y += 8;

  // Receipt details box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(8, y, pageWidth - 16, 16, 2, 2, 'FD');
  
  y += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', 12, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.receiptNumber, 40, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth / 2 + 10, y);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(receipt.paymentDate), 'dd MMMM yyyy'), pageWidth / 2 + 25, y);
  y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Session:', 12, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.session, 35, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Term:', pageWidth / 2 + 10, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.term.charAt(0).toUpperCase() + receipt.term.slice(1) + ' Term', pageWidth / 2 + 25, y);
  
  y += 16;

  // Student Information Section
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

  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.studentName, valueX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Admission No:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.admissionNumber, valueX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Class:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.className, valueX, y);
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
  doc.text(receipt.feeType, valueX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(receipt.paymentMethod.charAt(0).toUpperCase() + receipt.paymentMethod.slice(1), valueX, y);
  y += 6;

  if (receipt.installmentInfo) {
    doc.setFont('helvetica', 'bold');
    doc.text('Installment:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(receipt.installmentInfo, valueX, y);
    y += 6;
  }

  y += 4;

  // Amount box with highlight
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
  doc.text(`₦${receipt.amount.toLocaleString()}`, pageWidth / 2, y, { align: 'center' });

  y += 12;

  // Balance display if applicable
  if (receipt.balance !== undefined && receipt.balance > 0) {
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(220, 38, 38);
    doc.roundedRect(8, y, pageWidth - 16, 10, 2, 2, 'FD');
    y += 7;
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Outstanding Balance: ₦${receipt.balance.toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

  y += 5;

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated receipt and requires no signature.', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Thank you for your payment. Please keep this receipt for your records.', pageWidth / 2, y, { align: 'center' });

  // Signature lines
  y += 12;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(15, y, 55, y);
  doc.line(pageWidth - 55, y, pageWidth - 15, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(7);
  doc.text('Authorized Signature', 35, y, { align: 'center' });
  doc.text('School Stamp', pageWidth - 35, y, { align: 'center' });

  // Watermark
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(40);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID', pageWidth / 2, 120, { align: 'center', angle: 45 });

  // Save
  const filename = `Receipt_${receipt.receiptNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename);
};
