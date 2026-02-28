import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText, Download, Search, GraduationCap, Users, Loader2 } from 'lucide-react';
import { generateTranscript } from '@/utils/transcriptGenerator';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';

interface Student {
  id: string;
  admission_number: string;
  date_of_admission: string;
  profile: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
  };
  class: {
    name: string;
  };
}

interface Grade {
  session: string;
  term: string;
  ca_score: number;
  exam_score: number;
  total_score: number;
  grade_letter: string;
  subject: {
    name: string;
  };
}

const StudentTranscripts: React.FC = () => {
  const { data: settings } = useSchoolSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        supabase
          .from('students')
          .select(`
            id,
            admission_number,
            date_of_admission,
            profile:profiles!students_user_id_fkey(first_name, last_name, date_of_birth, gender),
            class:classes(name)
          `)
          .eq('is_active', true)
          .order('admission_number'),
        supabase
          .from('classes')
          .select('id, name')
          .order('name'),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (classesRes.error) throw classesRes.error;

      setStudents(studentsRes.data as unknown as Student[] || []);
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTranscript = async (student: Student) => {
    if (!settings) {
      toast.error('School settings not loaded');
      return;
    }

    setGeneratingId(student.id);

    try {
      // Fetch all grades for this student
      const { data: gradesData, error } = await supabase
        .from('grades')
        .select(`
          session,
          term,
          ca_score,
          exam_score,
          total_score,
          grade_letter,
          subject:subjects(name)
        `)
        .eq('student_id', student.id)
        .order('session')
        .order('term');

      if (error) throw error;

      if (!gradesData || gradesData.length === 0) {
        toast.error('No grades found for this student');
        setGeneratingId(null);
        return;
      }

      const grades = (gradesData as unknown as Grade[]).map(g => ({
        session: g.session,
        term: g.term,
        subject: g.subject?.name || 'Unknown',
        ca_score: g.ca_score || 0,
        exam_score: g.exam_score || 0,
        total_score: g.total_score || 0,
        grade_letter: g.grade_letter || 'N/A',
      }));

      await generateTranscript({
        studentName: `${student.profile?.first_name || ''} ${student.profile?.last_name || ''}`.trim(),
        admissionNumber: student.admission_number,
        dateOfBirth: student.profile?.date_of_birth 
          ? format(new Date(student.profile.date_of_birth), 'dd MMMM yyyy') 
          : 'N/A',
        gender: student.profile?.gender?.charAt(0).toUpperCase() + (student.profile?.gender?.slice(1) || '') || 'N/A',
        dateOfAdmission: student.date_of_admission 
          ? format(new Date(student.date_of_admission), 'dd MMMM yyyy') 
          : 'N/A',
        currentClass: student.class?.name || 'N/A',
        grades,
        schoolInfo: {
          name: settings.school_name,
          address: settings.school_address || '',
          phone: settings.school_phone || '',
          email: settings.school_email || '',
        },
      });

      toast.success('Transcript generated successfully');
    } catch (error) {
      console.error('Error generating transcript:', error);
      toast.error('Failed to generate transcript');
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredStudents = students.filter(student => {
    const name = `${student.profile?.first_name || ''} ${student.profile?.last_name || ''}`.toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || student.class?.name === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Transcripts</h1>
          <p className="page-subtitle">Generate academic transcripts for students</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <GraduationCap className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <FileText className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filtered</p>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Date of Admission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">{student.admission_number}</TableCell>
                      <TableCell className="font-medium">
                        {student.profile?.first_name} {student.profile?.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{student.class?.name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{student.profile?.gender || 'N/A'}</TableCell>
                      <TableCell>
                        {student.date_of_admission 
                          ? format(new Date(student.date_of_admission), 'dd MMM yyyy')
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateTranscript(student)}
                          disabled={generatingId === student.id}
                        >
                          {generatingId === student.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Generate Transcript
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

export default StudentTranscripts;
