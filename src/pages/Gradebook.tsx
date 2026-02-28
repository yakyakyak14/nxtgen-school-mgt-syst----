import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Search, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getGrade } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

interface GradeRecord {
  id: string;
  student_id: string;
  subject_id: string;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade_letter: string | null;
  term: string;
  session: string;
  students?: { 
    admission_number: string;
    profiles?: { first_name: string | null; last_name: string | null } 
  };
  subjects?: { name: string };
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

const Gradebook: React.FC = () => {
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<'first' | 'second' | 'third'>('first');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchGrades();
    }
  }, [selectedClass, selectedSubject, selectedTerm]);

  const fetchInitialData = async () => {
    try {
      const [classesResult, subjectsResult] = await Promise.all([
        supabase.from('classes').select('id, name, level').order('name'),
        supabase.from('subjects').select('id, name').eq('is_active', true).order('name'),
      ]);

      setClasses(classesResult.data || []);
      setSubjects(subjectsResult.data || []);

      // Set defaults if available
      if (classesResult.data && classesResult.data.length > 0) {
        setSelectedClass(classesResult.data[0].id);
      }
      if (subjectsResult.data && subjectsResult.data.length > 0) {
        setSelectedSubject(subjectsResult.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGrades = async () => {
    if (!selectedClass || !selectedSubject) return;
    
    setIsLoading(true);
    try {
      // Get students in the selected class
      const { data: studentsInClass } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', selectedClass)
        .eq('is_active', true);

      const studentIds = studentsInClass?.map(s => s.id) || [];

      if (studentIds.length === 0) {
        setGrades([]);
        setIsLoading(false);
        return;
      }

      // Get grades for those students
      const { data: gradesData, error } = await supabase
        .from('grades')
        .select(`
          *,
          students(admission_number),
          subjects(name)
        `)
        .in('student_id', studentIds)
        .eq('subject_id', selectedSubject)
        .eq('term', selectedTerm);

      if (error) throw error;

      setGrades(gradesData || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gradebook</h1>
          <p className="page-subtitle">Record and manage student grades</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Enter Grades
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Grade Records
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedTerm} onValueChange={(v) => setSelectedTerm(v as 'first' | 'second' | 'third')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First Term</SelectItem>
                  <SelectItem value="second">Second Term</SelectItem>
                  <SelectItem value="third">Third Term</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">CA (40)</TableHead>
                  <TableHead className="text-center">Exam (60)</TableHead>
                  <TableHead className="text-center">Total (100)</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {selectedClass && selectedSubject 
                        ? 'No grades found for the selected criteria'
                        : 'Select a class and subject to view grades'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((grade) => {
                    const total = grade.total_score || ((grade.ca_score || 0) + (grade.exam_score || 0));
                    const { grade: letterGrade, remark } = getGrade(total);
                    return (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">
                          {(grade.students as any)?.admission_number || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">{grade.ca_score || '-'}</TableCell>
                        <TableCell className="text-center">{grade.exam_score || '-'}</TableCell>
                        <TableCell className="text-center font-bold">{total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={total >= 50 ? 'default' : 'destructive'}>
                            {grade.grade_letter || letterGrade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {remark}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Gradebook;
