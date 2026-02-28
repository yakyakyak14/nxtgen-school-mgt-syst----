import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Grade {
  session: string;
  term: string;
  subject: string;
  ca_score: number;
  exam_score: number;
  total_score: number;
  grade_letter: string;
}

interface TranscriptData {
  studentName: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: string;
  dateOfAdmission: string;
  currentClass: string;
  grades: Grade[];
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
  };
}

export const generateTranscript = async (data: TranscriptData): Promise<void> => {
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
  doc.text('ACADEMIC TRANSCRIPT', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(212, 168, 75);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
  y += 10;

  // Student Information Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, pageWidth - 20, 32, 3, 3, 'FD');
  
  y += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  const col1X = 15;
  const col2X = pageWidth / 2 + 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentName, col1X + 35, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Admission No:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.admissionNumber, col2X + 35, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Birth:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateOfBirth || 'N/A', col1X + 35, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Gender:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.gender || 'N/A', col2X + 35, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Admission:', col1X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.dateOfAdmission || 'N/A', col1X + 45, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Current Class:', col2X, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.currentClass, col2X + 35, y);
  
  y += 15;

  // Group grades by session and term
  const groupedGrades: { [key: string]: Grade[] } = {};
  data.grades.forEach(grade => {
    const key = `${grade.session} - ${grade.term.charAt(0).toUpperCase() + grade.term.slice(1)} Term`;
    if (!groupedGrades[key]) groupedGrades[key] = [];
    groupedGrades[key].push(grade);
  });

  // Sort sessions chronologically
  const sortedSessions = Object.keys(groupedGrades).sort();

  // Create tables for each session/term
  for (const sessionTerm of sortedSessions) {
    const sessionGrades = groupedGrades[sessionTerm];
    
    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }

    // Session header
    doc.setFillColor(30, 58, 95);
    doc.rect(10, y, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(sessionTerm, 15, y + 5.5);
    y += 10;

    // Grade table
    const tableData = sessionGrades.map(g => [
      g.subject,
      g.ca_score.toString(),
      g.exam_score.toString(),
      g.total_score.toString(),
      g.grade_letter,
    ]);

    // Calculate average
    const totalScore = sessionGrades.reduce((sum, g) => sum + g.total_score, 0);
    const average = (totalScore / sessionGrades.length).toFixed(1);

    autoTable(doc, {
      startY: y,
      head: [['Subject', 'CA Score', 'Exam Score', 'Total', 'Grade']],
      body: tableData,
      foot: [[
        { content: 'Term Average', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: average, styles: { fontStyle: 'bold' } },
        { content: getGradeLetter(parseFloat(average)), styles: { fontStyle: 'bold' } },
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [45, 90, 61],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
      },
      footStyles: {
        fillColor: [248, 250, 252],
        textColor: [0, 0, 0],
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
      },
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page for summary
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 20;
  }

  // Overall Summary
  if (data.grades.length > 0) {
    const overallTotal = data.grades.reduce((sum, g) => sum + g.total_score, 0);
    const overallAverage = (overallTotal / data.grades.length).toFixed(1);

    doc.setFillColor(212, 168, 75);
    doc.roundedRect(10, y, pageWidth - 20, 15, 3, 3, 'F');
    y += 10;
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Cumulative Average: ${overallAverage}%`, pageWidth / 2 - 30, y);
    doc.text(`Grade: ${getGradeLetter(parseFloat(overallAverage))}`, pageWidth / 2 + 40, y);
    y += 15;
  }

  // Grading Key
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Grading Key:', 10, y);
  doc.setFont('helvetica', 'normal');
  doc.text('A (75-100): Excellent | B (65-74): Very Good | C (55-64): Good | D (45-54): Pass | E (40-44): Fair | F (0-39): Fail', 35, y);

  // Footer
  y = pageHeight - 25;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 65, y);
  doc.line(pageWidth - 65, y, pageWidth - 15, y);
  y += 4;
  doc.setFontSize(8);
  doc.text('Principal\'s Signature', 40, y, { align: 'center' });
  doc.text('Date & School Stamp', pageWidth - 40, y, { align: 'center' });

  y += 10;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on ${format(new Date(), 'dd MMMM yyyy')}`, pageWidth / 2, y, { align: 'center' });

  // Watermark
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  doc.text('TRANSCRIPT', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });

  // Save
  const filename = `Transcript_${data.studentName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename);
};

const getGradeLetter = (score: number): string => {
  if (score >= 75) return 'A';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'F';
};
