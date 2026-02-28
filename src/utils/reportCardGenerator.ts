import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NIGERIAN_GRADING_SYSTEM, getGrade, TERMS } from '@/lib/constants';

export interface StudentGrade {
  subject: string;
  subjectCode: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  remark: string;
}

export interface StudentReportCard {
  studentName: string;
  admissionNumber: string;
  className: string;
  section: string;
  gender: string;
  dateOfBirth?: string;
  session: string;
  term: 'first' | 'second' | 'third';
  grades: StudentGrade[];
  totalMarksObtained: number;
  totalMarksPossible: number;
  averageScore: number;
  position?: number;
  totalStudents?: number;
  attendance?: {
    present: number;
    absent: number;
    total: number;
  };
  teacherComment?: string;
  principalComment?: string;
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    motto?: string;
    logoUrl?: string;
  };
  nextTermBegins?: string;
  nextTermFee?: number;
}

export const generateReportCard = async (report: StudentReportCard): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let y = 15;
  
  // Header with school info
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(report.schoolInfo.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(report.schoolInfo.address, pageWidth / 2, y, { align: 'center' });
  y += 5;
  
  doc.text(`Tel: ${report.schoolInfo.phone} | Email: ${report.schoolInfo.email}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  
  if (report.schoolInfo.motto) {
    doc.setFont('helvetica', 'italic');
    doc.text(`"${report.schoolInfo.motto}"`, pageWidth / 2, y, { align: 'center' });
  }
  
  y = 42;
  
  // Report card title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT REPORT CARD', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  const termName = TERMS.find(t => t.value === report.term)?.label || 'First Term';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${termName} - ${report.session} Academic Session`, pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  // Student info box
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.rect(10, y, pageWidth - 20, 28);
  
  const col1 = 15;
  const col2 = 110;
  const labelWidth = 50;
  
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Name:', col1, y);
  doc.setFont('helvetica', 'normal');
  doc.text(report.studentName, col1 + labelWidth, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Admission No:', col2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(report.admissionNumber, col2 + 35, y);
  
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Class:', col1, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.className} ${report.section}`, col1 + labelWidth, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Gender:', col2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(report.gender, col2 + 35, y);
  
  y += 7;
  if (report.position && report.totalStudents) {
    doc.setFont('helvetica', 'bold');
    doc.text('Position:', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${getOrdinal(report.position)} out of ${report.totalStudents} students`, col1 + labelWidth, y);
  }
  
  if (report.attendance) {
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${report.attendance.present}/${report.attendance.total} days`, col2 + 35, y);
  }
  
  y += 15;
  
  // Grades table
  const tableData = report.grades.map(grade => [
    grade.subject,
    grade.caScore.toString(),
    grade.examScore.toString(),
    grade.totalScore.toString(),
    grade.grade,
    grade.remark
  ]);
  
  autoTable(doc, {
    startY: y,
    head: [['Subject', 'CA (40)', 'Exam (60)', 'Total (100)', 'Grade', 'Remark']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 35, halign: 'center' },
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      // Color code grades
      if (data.column.index === 4 && data.section === 'body') {
        const grade = data.cell.raw as string;
        if (grade === 'A') {
          data.cell.styles.textColor = [0, 128, 0]; // Green
        } else if (grade === 'B') {
          data.cell.styles.textColor = [0, 100, 200]; // Blue
        } else if (grade === 'C') {
          data.cell.styles.textColor = [200, 150, 0]; // Orange
        } else if (grade === 'D' || grade === 'E') {
          data.cell.styles.textColor = [200, 100, 0]; // Orange-red
        } else if (grade === 'F') {
          data.cell.styles.textColor = [200, 0, 0]; // Red
        }
      }
    }
  });
  
  y = (doc as any).lastAutoTable.finalY + 8;
  
  // Summary
  doc.setDrawColor(30, 58, 95);
  doc.rect(10, y, pageWidth - 20, 18);
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Marks: ${report.totalMarksObtained}/${report.totalMarksPossible}`, 15, y);
  doc.text(`Average Score: ${report.averageScore.toFixed(1)}%`, pageWidth / 2, y, { align: 'center' });
  
  const overallGrade = getGrade(report.averageScore);
  doc.text(`Overall Grade: ${overallGrade.grade} (${overallGrade.remark})`, pageWidth - 15, y, { align: 'right' });
  
  y += 8;
  
  // Grading key
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const gradingKey = NIGERIAN_GRADING_SYSTEM.map(g => `${g.grade}: ${g.min}-${g.max}`).join(' | ');
  doc.text(`Grading Key: ${gradingKey}`, pageWidth / 2, y, { align: 'center' });
  
  y += 10;
  
  // Comments section
  doc.setFontSize(10);
  
  if (report.teacherComment) {
    doc.setFont('helvetica', 'bold');
    doc.text("Class Teacher's Comment:", 10, y);
    y += 5;
    doc.setFont('helvetica', 'italic');
    const teacherLines = doc.splitTextToSize(report.teacherComment, pageWidth - 25);
    doc.text(teacherLines, 15, y);
    y += teacherLines.length * 5 + 5;
  }
  
  if (report.principalComment) {
    doc.setFont('helvetica', 'bold');
    doc.text("Principal's Comment:", 10, y);
    y += 5;
    doc.setFont('helvetica', 'italic');
    const principalLines = doc.splitTextToSize(report.principalComment, pageWidth - 25);
    doc.text(principalLines, 15, y);
    y += principalLines.length * 5 + 5;
  }
  
  y += 5;
  
  // Next term info
  if (report.nextTermBegins || report.nextTermFee) {
    doc.setDrawColor(212, 168, 75);
    doc.setFillColor(255, 250, 235);
    doc.rect(10, y, pageWidth - 20, 15, 'FD');
    
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    
    if (report.nextTermBegins) {
      doc.text(`Next Term Begins: ${report.nextTermBegins}`, 15, y);
    }
    if (report.nextTermFee) {
      doc.text(`Fees: ₦${report.nextTermFee.toLocaleString()}`, pageWidth - 15, y, { align: 'right' });
    }
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  // Save
  const filename = `ReportCard_${report.studentName.replace(/\s+/g, '_')}_${report.term}_${report.session.replace('/', '-')}.pdf`;
  doc.save(filename);
};

// Helper function for ordinal numbers
const getOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Generate multiple report cards as a single PDF
export const generateBulkReportCards = async (reports: StudentReportCard[]): Promise<void> => {
  if (reports.length === 0) return;
  
  for (let i = 0; i < reports.length; i++) {
    await generateReportCard(reports[i]);
  }
};
