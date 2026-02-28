import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Printer, Download, Loader2, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { generateReportCard, StudentReportCard, StudentGrade } from '@/utils/reportCardGenerator';
import { useToast } from '@/hooks/use-toast';
import { TERMS, getGrade } from '@/lib/constants';

const ReportCards: React.FC = () => {
  const { toast } = useToast();
  const { data: schoolSettings } = useSchoolSettings();
  const [selectedSession, setSelectedSession] = useState('2024/2025');
  const [selectedTerm, setSelectedTerm] = useState<'first' | 'second' | 'third'>('first');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, section, level')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch students with grades for selected class
  const { data: studentsWithGrades, isLoading: loadingStudents } = useQuery({
    queryKey: ['students-grades', selectedClass, selectedSession, selectedTerm],
    queryFn: async () => {
      if (!selectedClass) return [];

      // Get students in the class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          user_id,
          profiles:user_id (first_name, last_name, gender, date_of_birth)
        `)
        .eq('class_id', selectedClass)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      // Get grades for these students
      const studentIds = students?.map(s => s.id) || [];
      
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select(`
          id,
          student_id,
          subject_id,
          ca_score,
          exam_score,
          total_score,
          grade_letter,
          remarks,
          subjects:subject_id (name, code)
        `)
        .in('student_id', studentIds)
        .eq('session', selectedSession)
        .eq('term', selectedTerm);

      if (gradesError) throw gradesError;

      // Get subjects for the class
      const { data: classSubjects, error: subjectsError } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects:subject_id (id, name, code)')
        .eq('class_id', selectedClass);

      if (subjectsError) throw subjectsError;

      // Combine students with their grades
      return students?.map(student => {
        const studentGrades = grades?.filter(g => g.student_id === student.id) || [];
        const totalScore = studentGrades.reduce((sum, g) => sum + (g.total_score || 0), 0);
        const avgScore = studentGrades.length > 0 ? totalScore / studentGrades.length : 0;

        return {
          id: student.id,
          admissionNumber: student.admission_number,
          firstName: (student.profiles as any)?.first_name || '',
          lastName: (student.profiles as any)?.last_name || '',
          gender: (student.profiles as any)?.gender || '',
          dateOfBirth: (student.profiles as any)?.date_of_birth,
          gradesCount: studentGrades.length,
          totalSubjects: classSubjects?.length || 0,
          averageScore: avgScore,
          grades: studentGrades,
        };
      }) || [];
    },
    enabled: !!selectedClass,
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(studentsWithGrades?.map(s => s.id) || []);
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const generateReportForStudent = async (studentId: string) => {
    const student = studentsWithGrades?.find(s => s.id === studentId);
    if (!student) return;

    const selectedClassData = classes?.find(c => c.id === selectedClass);

    // Build grades array
    const studentGrades: StudentGrade[] = student.grades.map((grade: any) => {
      const subject = grade.subjects as { name: string; code: string } | null;
      return {
        subject: subject?.name || 'Unknown',
        subjectCode: subject?.code || '',
        caScore: grade.ca_score || 0,
        examScore: grade.exam_score || 0,
        totalScore: grade.total_score || 0,
        grade: grade.grade_letter || getGrade(grade.total_score || 0).grade,
        remark: grade.remarks || getGrade(grade.total_score || 0).remark,
      };
    });

    const totalMarksObtained = studentGrades.reduce((sum, g) => sum + g.totalScore, 0);
    const totalMarksPossible = studentGrades.length * 100;

    const reportData: StudentReportCard = {
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: selectedClassData?.name || '',
      section: selectedClassData?.section || 'A',
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth,
      session: selectedSession,
      term: selectedTerm,
      grades: studentGrades,
      totalMarksObtained,
      totalMarksPossible,
      averageScore: student.averageScore,
      schoolInfo: {
        name: schoolSettings?.school_name || 'School Management System',
        address: schoolSettings?.school_address || '',
        phone: schoolSettings?.school_phone || '',
        email: schoolSettings?.school_email || '',
        motto: schoolSettings?.school_motto || undefined,
        logoUrl: schoolSettings?.logo_url || undefined,
      },
      teacherComment: getTeacherComment(student.averageScore),
      principalComment: getPrincipalComment(student.averageScore),
    };

    await generateReportCard(reportData);
  };

  const handleGenerateSelected = async () => {
    if (selectedStudents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No students selected',
        description: 'Please select at least one student to generate report cards.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      for (const studentId of selectedStudents) {
        await generateReportForStudent(studentId);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: 'Report cards generated',
        description: `${selectedStudents.length} report card(s) have been downloaded.`,
      });
    } catch (error) {
      console.error('Error generating report cards:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate some report cards.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getTeacherComment = (avgScore: number): string => {
    if (avgScore >= 75) return 'Excellent performance! Keep up the outstanding work.';
    if (avgScore >= 65) return 'Very good performance. Continue to strive for excellence.';
    if (avgScore >= 55) return 'Good effort. With more dedication, you can achieve more.';
    if (avgScore >= 45) return 'Fair performance. More effort is needed to improve.';
    return 'Needs significant improvement. Please seek help from teachers.';
  };

  const getPrincipalComment = (avgScore: number): string => {
    if (avgScore >= 75) return 'Outstanding academic achievement. Well done!';
    if (avgScore >= 65) return 'Commendable performance. Keep working hard.';
    if (avgScore >= 55) return 'Satisfactory progress. Room for improvement exists.';
    if (avgScore >= 45) return 'Below average. More effort is required.';
    return 'Poor performance. Requires immediate attention and improvement.';
  };

  const getGradeBadgeColor = (avgScore: number) => {
    if (avgScore >= 75) return 'default';
    if (avgScore >= 65) return 'secondary';
    if (avgScore >= 55) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Report Cards</h1>
          <p className="page-subtitle">Generate and print student report cards</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleGenerateSelected}
            disabled={selectedStudents.length === 0 || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Selected ({selectedStudents.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate Report Cards
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedTerm} onValueChange={(v) => setSelectedTerm(v as 'first' | 'second' | 'third')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((term) => (
                    <SelectItem key={term.value} value={term.value}>
                      {term.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedClass ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">Select a class to generate report cards</p>
              <p className="text-sm">Choose a session, term, and class from the filters above</p>
            </div>
          ) : loadingStudents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : studentsWithGrades?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students found in this class</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStudents.length === studentsWithGrades?.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsWithGrades?.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {student.firstName?.[0]?.toUpperCase() || 'S'}
                            </span>
                          </div>
                          <span className="font-medium">
                            {student.firstName} {student.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        <span className={student.gradesCount < student.totalSubjects ? 'text-amber-600' : ''}>
                          {student.gradesCount}/{student.totalSubjects}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {student.averageScore.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getGradeBadgeColor(student.averageScore)}>
                          {getGrade(student.averageScore).grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateReportForStudent(student.id)}
                          disabled={student.gradesCount === 0}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportCards;
