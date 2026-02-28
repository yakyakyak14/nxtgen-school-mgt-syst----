import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface PromotionRecord {
  studentName: string;
  admissionNumber: string;
  previousClass: string;
  newClass: string;
  action: 'promoted' | 'retained' | 'graduated';
}

interface ClassPromotionSummary {
  className: string;
  promoted: number;
  retained: number;
  graduated: number;
  students: PromotionRecord[];
}

interface PromotionReportData {
  session: string;
  generatedDate: string;
  classSummaries: ClassPromotionSummary[];
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export const generatePromotionReport = (data: PromotionReportData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setFillColor(212, 168, 75);
  doc.rect(0, 35, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.schoolInfo.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.schoolInfo.address) {
    doc.text(data.schoolInfo.address, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  doc.text(`Tel: ${data.schoolInfo.phone} | Email: ${data.schoolInfo.email}`, pageWidth / 2, y, { align: 'center' });

  y = 45;

  // Title
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT PROMOTION REPORT', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Academic Session: ${data.session}`, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(212, 168, 75);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 50, y, pageWidth / 2 + 50, y);
  y += 10;

  // Overall Summary
  const totalPromoted = data.classSummaries.reduce((sum, c) => sum + c.promoted, 0);
  const totalRetained = data.classSummaries.reduce((sum, c) => sum + c.retained, 0);
  const totalGraduated = data.classSummaries.reduce((sum, c) => sum + c.graduated, 0);
  const totalStudents = totalPromoted + totalRetained + totalGraduated;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, pageWidth - 20, 25, 3, 3, 'FD');

  y += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERALL SUMMARY', 15, y);
  y += 8;

  doc.setFontSize(10);
  const colWidth = (pageWidth - 30) / 4;
  
  // Summary boxes
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Students: ${totalStudents}`, 15, y);
  doc.setTextColor(34, 197, 94);
  doc.text(`Promoted: ${totalPromoted}`, 15 + colWidth, y);
  doc.setTextColor(245, 158, 11);
  doc.text(`Retained: ${totalRetained}`, 15 + colWidth * 2, y);
  doc.setTextColor(59, 130, 246);
  doc.text(`Graduated: ${totalGraduated}`, 15 + colWidth * 3, y);

  y += 15;

  // Class-wise Summary Table
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLASS-WISE SUMMARY', 10, y);
  y += 5;

  const summaryTableData = data.classSummaries.map(c => [
    c.className,
    c.students.length.toString(),
    c.promoted.toString(),
    c.retained.toString(),
    c.graduated.toString(),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Class', 'Total', 'Promoted', 'Retained', 'Graduated']],
    body: summaryTableData,
    foot: [['TOTAL', totalStudents.toString(), totalPromoted.toString(), totalRetained.toString(), totalGraduated.toString()]],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [212, 168, 75],
      textColor: [30, 58, 95],
      fontSize: 10,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: 10, right: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Detailed Class Reports
  for (const classSummary of data.classSummaries) {
    if (classSummary.students.length === 0) continue;

    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    // Class header
    doc.setFillColor(45, 90, 61);
    doc.rect(10, y, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${classSummary.className} - ${classSummary.students.length} Students`, 15, y + 5.5);
    y += 10;

    // Students table
    const studentTableData = classSummary.students.map(s => [
      s.admissionNumber,
      s.studentName,
      s.previousClass,
      s.newClass,
      s.action.charAt(0).toUpperCase() + s.action.slice(1),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Admission No.', 'Student Name', 'Previous Class', 'New Status', 'Action']],
      body: studentTableData,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
      },
      margin: { left: 10, right: 10 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const action = data.cell.raw as string;
          if (action === 'Promoted') {
            data.cell.styles.textColor = [34, 197, 94];
            data.cell.styles.fontStyle = 'bold';
          } else if (action === 'Retained') {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          } else if (action === 'Graduated') {
            data.cell.styles.textColor = [59, 130, 246];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer on last page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Page number
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    if (i === totalPages) {
      // Signature lines on last page
      const sigY = pageHeight - 35;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.line(15, sigY, 70, sigY);
      doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
      doc.line(pageWidth - 70, sigY, pageWidth - 15, sigY);
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(7);
      doc.text('Class Teacher', 42.5, sigY + 4, { align: 'center' });
      doc.text('Principal', pageWidth / 2, sigY + 4, { align: 'center' });
      doc.text('Director', pageWidth - 42.5, sigY + 4, { align: 'center' });
      
      // Generation info
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated on ${format(new Date(), 'dd MMMM yyyy HH:mm')}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    }
  }

  // Save
  const filename = `Promotion_Report_${data.session.replace('/', '-')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename);
};
