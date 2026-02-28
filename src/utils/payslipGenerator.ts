import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StaffInfo {
  name: string;
  staffId: string;
  jobTitle: string;
  category: string;
  email: string;
}

interface Deduction {
  name: string;
  amount: number;
  isPercentage: boolean;
  percentageValue?: number;
}

interface PayslipData {
  staff: StaffInfo;
  month: number;
  year: number;
  basicSalary: number;
  grossSalary: number;
  deductions: Deduction[];
  totalDeductions: number;
  netSalary: number;
  paymentStatus: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

interface SchoolSettings {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  logoUrl?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const generatePayslip = async (
  data: PayslipData,
  schoolSettings: SchoolSettings
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function for centered text
  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // School Header
  doc.setFont('helvetica', 'bold');
  centerText(schoolSettings.schoolName.toUpperCase(), yPos, 18);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (schoolSettings.schoolAddress) {
    centerText(schoolSettings.schoolAddress, yPos);
    yPos += 5;
  }
  if (schoolSettings.schoolPhone || schoolSettings.schoolEmail) {
    centerText(
      [schoolSettings.schoolPhone, schoolSettings.schoolEmail].filter(Boolean).join(' | '),
      yPos
    );
    yPos += 5;
  }

  // Payslip Title
  yPos += 10;
  doc.setFillColor(30, 58, 95);
  doc.rect(14, yPos - 5, pageWidth - 28, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  centerText('PAYSLIP', yPos + 3, 14);
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // Period
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  centerText(`For the month of ${MONTHS[data.month - 1]} ${data.year}`, yPos);
  yPos += 15;

  // Employee Information Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, yPos, pageWidth - 28, 35, 3, 3, 'FD');
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EMPLOYEE INFORMATION', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  const infoData = [
    ['Employee Name:', data.staff.name],
    ['Staff ID:', data.staff.staffId],
    ['Position:', data.staff.jobTitle],
    ['Category:', data.staff.category === 'academic' ? 'Academic Staff' : 'Non-Academic Staff'],
  ];

  const col1X = 20;
  const col2X = 70;
  const col3X = 110;
  const col4X = 160;

  doc.text(infoData[0][0], col1X, yPos);
  doc.text(infoData[0][1], col2X, yPos);
  doc.text(infoData[1][0], col3X, yPos);
  doc.text(infoData[1][1], col4X, yPos);
  yPos += 6;

  doc.text(infoData[2][0], col1X, yPos);
  doc.text(infoData[2][1], col2X, yPos);
  doc.text(infoData[3][0], col3X, yPos);
  doc.text(infoData[3][1], col4X, yPos);
  yPos += 20;

  // Earnings Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EARNINGS', 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount (₦)']],
    body: [
      ['Basic Salary', data.basicSalary.toLocaleString('en-NG', { minimumFractionDigits: 2 })],
      ['Gross Salary', data.grossSalary.toLocaleString('en-NG', { minimumFractionDigits: 2 })],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Deductions Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DEDUCTIONS', 14, yPos);
  yPos += 5;

  const deductionRows = data.deductions.map(d => [
    d.isPercentage ? `${d.name} (${d.percentageValue}%)` : d.name,
    d.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
  ]);

  if (deductionRows.length === 0) {
    deductionRows.push(['No deductions', '0.00']);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount (₦)']],
    body: deductionRows,
    foot: [['Total Deductions', data.totalDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })]],
    theme: 'grid',
    headStyles: { fillColor: [180, 80, 80], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Net Salary Box
  doc.setFillColor(45, 90, 61);
  doc.roundedRect(14, yPos, pageWidth - 28, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NET SALARY:', 20, yPos + 13);
  doc.text(
    `₦${data.netSalary.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
    pageWidth - 20,
    yPos + 13,
    { align: 'right' }
  );
  doc.setTextColor(0, 0, 0);
  yPos += 30;

  // Payment Information
  if (data.paymentStatus === 'paid') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PAYMENT DETAILS', 14, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    if (data.paidAt) {
      doc.text(`Payment Date: ${new Date(data.paidAt).toLocaleDateString('en-NG')}`, 14, yPos);
      yPos += 5;
    }
    if (data.paymentMethod) {
      doc.text(`Payment Method: ${data.paymentMethod}`, 14, yPos);
      yPos += 5;
    }
    if (data.paymentReference) {
      doc.text(`Reference: ${data.paymentReference}`, 14, yPos);
      yPos += 5;
    }
    yPos += 10;
  }

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  centerText('This is a computer-generated payslip and does not require a signature.', yPos);
  yPos += 5;
  centerText(`Generated on: ${new Date().toLocaleString('en-NG')}`, yPos);

  // Save the PDF
  const fileName = `Payslip_${data.staff.staffId}_${MONTHS[data.month - 1]}_${data.year}.pdf`;
  doc.save(fileName);
};

export const generateBulkPayslips = async (
  payslips: PayslipData[],
  schoolSettings: SchoolSettings
): Promise<void> => {
  for (const payslip of payslips) {
    await generatePayslip(payslip, schoolSettings);
  }
};
