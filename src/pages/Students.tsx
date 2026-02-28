import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Filter, MoreHorizontal, Download, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ExportDialog from '@/components/ExportDialog';
import ImportDialog, { ImportResult } from '@/components/ImportDialog';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import StudentEnrollmentForm from '@/components/students/StudentEnrollmentForm';
import { toast } from 'sonner';

interface Student {
  id: string;
  admission_number: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  is_active: boolean;
  class_id: string | null;
  user_id: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  classes?: {
    name: string;
  };
}

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { data: settings } = useSchoolSettings();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes(name)
        `)
        .order('admission_number');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (data: Record<string, any>[]): Promise<ImportResult> => {
    const errors: { row: number; column?: string; message: string; severity: 'error' | 'warning' }[] = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Validate required fields
      if (!row.first_name || !row.last_name) {
        errors.push({ row: i + 1, column: 'first_name', message: 'First name and last name are required', severity: 'error' });
        continue;
      }

      // Validate gender
      const gender = row.gender?.toLowerCase();
      if (gender && !['male', 'female'].includes(gender)) {
        errors.push({ row: i + 1, column: 'gender', message: 'Gender must be "male" or "female"', severity: 'warning' });
      }

      // Find class by name
      let classId = null;
      if (row.class) {
        const { data: classData } = await supabase
          .from('classes')
          .select('id')
          .eq('name', row.class)
          .maybeSingle();

        if (!classData) {
          errors.push({ row: i + 1, column: 'class', message: `Class not found: ${row.class}`, severity: 'warning' });
        } else {
          classId = classData.id;
        }
      }

      try {
        errors.push({ 
          row: i + 1, 
          message: `Student "${row.first_name} ${row.last_name}" would be imported. Full import requires admin setup.`, 
          severity: 'warning' 
        });
      } catch (error: any) {
        errors.push({ row: i + 1, message: error.message, severity: 'error' });
      }
    }

    toast.info('Bulk student import requires auth user creation. Please use the Add Student form for now.');

    return {
      success: true,
      successCount,
      errorCount: errors.filter(e => e.severity === 'error').length,
      errors,
    };
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return student.admission_number.toLowerCase().includes(term) || fullName.includes(term);
  });

  const exportColumns = [
    { header: 'Admission No.', key: 'admission_number', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Class', key: 'class_name', width: 15 },
    { header: 'Guardian', key: 'guardian_name', width: 20 },
    { header: 'Status', key: 'status', width: 10 },
  ];

  const exportData = filteredStudents.map(s => ({
    admission_number: s.admission_number,
    name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'N/A',
    class_name: s.classes?.name || 'N/A',
    guardian_name: s.guardian_name || 'N/A',
    status: s.is_active ? 'Active' : 'Inactive',
  }));

  const importTemplateData = [
    { first_name: 'John', last_name: 'Doe', gender: 'male', date_of_birth: '2015-03-15', class: 'Primary 1A', guardian_name: 'Jane Doe', guardian_phone: '08012345678' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Manage student enrollments and profiles</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDialog
            filename="students_list"
            options={{
              title: 'Student List',
              schoolName: settings?.school_name,
              columns: exportColumns,
              data: exportData,
            }}
          />
          <ImportDialog
            onImport={handleImport}
            expectedColumns={['first_name', 'last_name', 'gender', 'date_of_birth', 'class', 'guardian_name', 'guardian_phone']}
            requiredColumns={['first_name', 'last_name']}
            templateData={importTemplateData}
            title="Import Students"
            description="Upload student data from Excel, CSV, Word, or PDF files"
          />
          <StudentEnrollmentForm onSuccess={fetchStudents} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="search-input flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search students by name or admission number..."
                className="border-0 bg-transparent h-8 focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading students...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.admission_number}</TableCell>
                      <TableCell>{`${student.first_name || ''} ${student.last_name || ''}`.trim() || 'N/A'}</TableCell>
                      <TableCell>{student.classes?.name || 'N/A'}</TableCell>
                      <TableCell>{student.guardian_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={student.is_active ? 'default' : 'secondary'}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Students;
