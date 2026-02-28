import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GraduationCap, ArrowRight, Users, CheckCircle, AlertCircle, Loader2, RotateCcw, FileText } from 'lucide-react';
import { ALL_CLASS_LEVELS } from '@/lib/constants';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { generatePromotionReport } from '@/utils/promotionReportGenerator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Student {
  id: string;
  admission_number: string;
  class_id: string;
  is_active: boolean;
  profile: {
    first_name: string;
    last_name: string;
  };
  class: {
    id: string;
    name: string;
    level: string;
  };
  guardians?: {
    guardian: {
      user: {
        email: string;
      };
      profile: {
        first_name: string;
        last_name: string;
      };
    };
  }[];
}

interface ClassData {
  id: string;
  name: string;
  level: string;
}

const StudentPromotion: React.FC = () => {
  const { data: settings } = useSchoolSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [retainedStudents, setRetainedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'promote' | 'retain'>('promote');

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
            class_id,
            is_active,
            profile:profiles!students_user_id_fkey(first_name, last_name),
            class:classes(id, name, level)
          `)
          .eq('is_active', true)
          .order('admission_number'),
        supabase
          .from('classes')
          .select('id, name, level')
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

  const getNextClass = (currentLevel: string): string | null => {
    const levelOrder = ALL_CLASS_LEVELS.map(l => l.value);
    const currentIndex = levelOrder.findIndex(l => l === currentLevel);
    
    if (currentIndex === -1 || currentIndex >= levelOrder.length - 1) {
      return null; // Already at highest level or not found
    }
    
    return levelOrder[currentIndex + 1];
  };

  const getNextClassName = (currentLevel: string): string => {
    const nextLevel = getNextClass(currentLevel);
    if (!nextLevel) return 'Graduated';
    
    const nextClass = ALL_CLASS_LEVELS.find(l => l.value === nextLevel);
    return nextClass?.label || 'Unknown';
  };

  const filteredStudents = selectedClass === 'all' 
    ? students 
    : students.filter(s => s.class_id === selectedClass);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleToggleRetain = (studentId: string) => {
    const newRetained = new Set(retainedStudents);
    if (newRetained.has(studentId)) {
      newRetained.delete(studentId);
    } else {
      newRetained.add(studentId);
    }
    setRetainedStudents(newRetained);
  };

  const openConfirmDialog = (type: 'promote' | 'retain') => {
    setActionType(type);
    setShowConfirmDialog(true);
  };

  const sendPromotionNotifications = async () => {
    if (!settings) return;

    for (const studentId of selectedStudents) {
      const student = students.find(s => s.id === studentId);
      if (!student) continue;

      const isRetained = retainedStudents.has(studentId);
      const nextLevel = getNextClass(student.class?.level || '');
      const isGraduating = !nextLevel && !isRetained;
      
      let action: 'promoted' | 'retained' | 'graduated' = 'promoted';
      if (isRetained) action = 'retained';
      else if (isGraduating) action = 'graduated';

      const nextClassName = isRetained 
        ? student.class?.name 
        : getNextClassName(student.class?.level || '');

      // Get parent email - for now we'll skip if no guardian data
      // In a full implementation, you'd fetch guardian info
      try {
        // Call the edge function to send notification
        await supabase.functions.invoke('send-promotion-notification', {
          body: {
            parentEmail: 'parent@example.com', // Placeholder - would need actual parent email
            parentName: 'Parent',
            studentName: `${student.profile?.first_name || ''} ${student.profile?.last_name || ''}`.trim(),
            previousClass: student.class?.name || 'N/A',
            newClass: nextClassName,
            action,
            session: settings.current_session,
            schoolInfo: {
              name: settings.school_name,
              email: settings.school_email || '',
              phone: settings.school_phone || '',
            },
          },
        });
      } catch (error) {
        console.error('Error sending notification for student:', student.id, error);
      }
    }
  };

  const handlePromoteStudents = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select students to promote');
      return;
    }

    setPromoting(true);
    let promoted = 0;
    let graduated = 0;
    let retained = 0;
    let failed = 0;

    try {
      for (const studentId of selectedStudents) {
        const student = students.find(s => s.id === studentId);
        if (!student || !student.class?.level) continue;

        // Check if student is marked for retention
        if (retainedStudents.has(studentId)) {
          retained++;
          continue; // Skip promotion for retained students
        }

        const nextLevel = getNextClass(student.class.level);
        
        if (!nextLevel) {
          // Student is graduating (SS3 -> graduate)
          const { error } = await supabase
            .from('students')
            .update({ is_active: false })
            .eq('id', studentId);
          
          if (error) {
            failed++;
            console.error('Error graduating student:', error);
          } else {
            graduated++;
          }
        } else {
          // Find the class with the next level
          const nextClass = classes.find(c => c.level === nextLevel);
          
          if (nextClass) {
            const { error } = await supabase
              .from('students')
              .update({ class_id: nextClass.id })
              .eq('id', studentId);
            
            if (error) {
              failed++;
              console.error('Error promoting student:', error);
            } else {
              promoted++;
            }
          } else {
            failed++;
          }
        }
      }

      // Send notification emails
      if (settings && (promoted > 0 || graduated > 0 || retained > 0)) {
        toast.info('Sending notification emails to parents...');
        await sendPromotionNotifications();
      }

      const messages: string[] = [];
      if (promoted > 0) messages.push(`${promoted} promoted`);
      if (graduated > 0) messages.push(`${graduated} graduated`);
      if (retained > 0) messages.push(`${retained} retained`);
      
      if (messages.length > 0) {
        toast.success(`Successfully: ${messages.join(', ')}`);
        fetchData();
        setSelectedStudents(new Set());
        setRetainedStudents(new Set());
      }
      
      if (failed > 0) {
        toast.error(`Failed to process ${failed} students`);
      }
    } catch (error) {
      console.error('Error during promotion:', error);
      toast.error('An error occurred during promotion');
    } finally {
      setPromoting(false);
      setShowConfirmDialog(false);
    }
  };

  const promotionSummary = () => {
    const summary: { [key: string]: number } = {};
    
    selectedStudents.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (student?.class?.level) {
        const nextClass = getNextClassName(student.class.level);
        summary[nextClass] = (summary[nextClass] || 0) + 1;
      }
    });
    
    return summary;
  };

  const handleGenerateReport = () => {
    if (!settings) {
      toast.error('School settings not loaded');
      return;
    }

    if (selectedStudents.size === 0) {
      toast.error('Please select students to include in the report');
      return;
    }

    // Group students by class
    const classSummaries: { [key: string]: { 
      className: string; 
      promoted: number; 
      retained: number; 
      graduated: number; 
      students: { studentName: string; admissionNumber: string; previousClass: string; newClass: string; action: 'promoted' | 'retained' | 'graduated' }[] 
    }} = {};

    selectedStudents.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      const className = student.class?.name || 'Unknown';
      const isRetained = retainedStudents.has(studentId);
      const nextLevel = getNextClass(student.class?.level || '');
      const isGraduating = !nextLevel && !isRetained;
      
      let action: 'promoted' | 'retained' | 'graduated' = 'promoted';
      if (isRetained) action = 'retained';
      else if (isGraduating) action = 'graduated';

      const newClass = isRetained ? className : getNextClassName(student.class?.level || '');

      if (!classSummaries[className]) {
        classSummaries[className] = {
          className,
          promoted: 0,
          retained: 0,
          graduated: 0,
          students: [],
        };
      }

      classSummaries[className].students.push({
        studentName: `${student.profile?.first_name || ''} ${student.profile?.last_name || ''}`.trim(),
        admissionNumber: student.admission_number,
        previousClass: className,
        newClass,
        action,
      });

      if (action === 'promoted') classSummaries[className].promoted++;
      else if (action === 'retained') classSummaries[className].retained++;
      else if (action === 'graduated') classSummaries[className].graduated++;
    });

    generatePromotionReport({
      session: settings.current_session || '2024/2025',
      generatedDate: new Date().toISOString(),
      classSummaries: Object.values(classSummaries),
      schoolInfo: {
        name: settings.school_name,
        address: settings.school_address || '',
        phone: settings.school_phone || '',
        email: settings.school_email || '',
      },
    });

    toast.success('Promotion report generated successfully');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Promotion</h1>
          <p className="page-subtitle">Promote students to the next class at the end of academic year</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleGenerateReport}
          disabled={selectedStudents.size === 0}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-2xl font-bold">{selectedStudents.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <GraduationCap className="h-6 w-6 text-info" />
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
              <div className="p-3 rounded-xl bg-accent/10">
                <ArrowRight className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Filtered</p>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Action */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Select Students to Promote
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setShowConfirmDialog(true)}
                disabled={selectedStudents.size === 0 || promoting}
              >
                {promoting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Promote Selected ({selectedStudents.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-muted-foreground">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Current Class</TableHead>
                    <TableHead>Next Class</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const nextClass = getNextClassName(student.class?.level || '');
                    const isGraduating = nextClass === 'Graduated';
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.has(student.id)}
                            onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{student.admission_number}</TableCell>
                        <TableCell className="font-medium">
                          {student.profile?.first_name} {student.profile?.last_name}
                        </TableCell>
                        <TableCell>{student.class?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className={isGraduating ? 'text-success font-medium' : ''}>
                              {nextClass}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isGraduating ? 'default' : 'secondary'}>
                            {isGraduating ? 'Graduating' : 'Promoting'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Confirm Student Promotion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>You are about to promote {selectedStudents.size} students. This action will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {Object.entries(promotionSummary()).map(([nextClass, count]) => (
                    <li key={nextClass}>
                      Move <strong>{count}</strong> student(s) to <strong>{nextClass}</strong>
                    </li>
                  ))}
                </ul>
                <p className="text-destructive font-medium">This action cannot be undone!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromoteStudents} disabled={promoting}>
              {promoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Promotion
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentPromotion;
