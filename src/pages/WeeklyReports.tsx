import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { 
  FileText, Send, Check, Clock, Eye, Users, 
  Download, Sparkles, MessageSquare, Calendar
} from 'lucide-react';
import AIAssistant from '@/components/ai/AIAssistant';
import jsPDF from 'jspdf';

const WeeklyReports: React.FC = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useSchoolSettings();
  
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [weekNumber, setWeekNumber] = useState<string>('1');
  const [reportContent, setReportContent] = useState('');
  const [behaviorRating, setBehaviorRating] = useState('');
  const [academicRating, setAcademicRating] = useState('');
  const [teacherComments, setTeacherComments] = useState('');
  const [showAISummary, setShowAISummary] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const isTeacher = role === 'teacher';
  const isAdmin = ['director', 'principal', 'headmaster'].includes(role || '');

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch students for selected class
  const { data: students = [] } = useQuery({
    queryKey: ['students', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles:user_id(first_name, last_name)')
        .eq('class_id', selectedClass)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClass
  });

  // Fetch reports
  const { data: reports = [] } = useQuery({
    queryKey: ['weekly-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select(`
          *,
          student:student_id(admission_number, profiles:user_id(first_name, last_name)),
          class:class_id(name),
          teacher:teacher_id(profiles:user_id(first_name, last_name))
        `)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Submit report mutation
  const submitReportMutation = useMutation({
    mutationFn: async () => {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('weekly_reports')
        .insert({
          teacher_id: staffData?.id,
          class_id: selectedClass,
          student_id: selectedStudent,
          session: settings?.current_session || '2024/2025',
          term: settings?.current_term || 'first',
          week_number: parseInt(weekNumber),
          report_content: reportContent,
          behavior_rating: behaviorRating,
          academic_rating: academicRating,
          teacher_comments: teacherComments,
          status: 'pending'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Report submitted',
        description: 'Your weekly report has been submitted successfully.',
      });
      setReportContent('');
      setBehaviorRating('');
      setAcademicRating('');
      setTeacherComments('');
      setSelectedStudent('');
      queryClient.invalidateQueries({ queryKey: ['weekly-reports'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
      });
    }
  });

  // Review report mutation
  const reviewReportMutation = useMutation({
    mutationFn: async ({ reportId, status, sendEmail }: { reportId: string; status: string; sendEmail?: boolean }) => {
      const { error } = await supabase
        .from('weekly_reports')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);
      
      if (error) throw error;

      // Send email notification to parent when approved
      if (sendEmail && status === 'approved') {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-weekly-report-email', {
            body: { reportId }
          });
          if (emailError) {
            console.error('Failed to send email:', emailError);
          }
        } catch (emailErr) {
          console.error('Email sending error:', emailErr);
        }
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.sendEmail ? 'Report approved & sent' : 'Report reviewed',
        description: variables.sendEmail 
          ? 'The report has been approved and sent to the parent.' 
          : 'The report status has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['weekly-reports'] });
    }
  });

  // Generate PDF for parent
  const generateParentPDF = (report: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.text(settings?.school_name || 'School Name', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Weekly Student Report', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(12);
    let y = 50;
    
    doc.text(`Student: ${report.student?.profiles?.first_name} ${report.student?.profiles?.last_name}`, 20, y);
    y += 10;
    doc.text(`Class: ${report.class?.name}`, 20, y);
    y += 10;
    doc.text(`Week: ${report.week_number}`, 20, y);
    y += 10;
    doc.text(`Term: ${report.term} | Session: ${report.session}`, 20, y);
    y += 20;
    
    doc.setFontSize(11);
    doc.text('Report Summary:', 20, y);
    y += 10;
    
    const splitReport = doc.splitTextToSize(report.director_summary || report.report_content, pageWidth - 40);
    doc.text(splitReport, 20, y);
    y += splitReport.length * 7 + 10;
    
    if (report.behavior_rating) {
      doc.text(`Behavior: ${report.behavior_rating}`, 20, y);
      y += 10;
    }
    
    if (report.academic_rating) {
      doc.text(`Academic Performance: ${report.academic_rating}`, 20, y);
      y += 10;
    }
    
    doc.save(`weekly-report-week${report.week_number}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'sent_to_parent': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center">
            <FileText className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Weekly Reports</h1>
            <p className="page-subtitle">
              {isTeacher ? 'Submit weekly student reports' : 'Review and manage weekly reports'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAISummary(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Summarize Reports
          </Button>
        )}
      </div>

      <Tabs defaultValue={isTeacher ? 'submit' : 'review'} className="space-y-6">
        <TabsList>
          {isTeacher && <TabsTrigger value="submit">Submit Report</TabsTrigger>}
          <TabsTrigger value="review">
            {isTeacher ? 'My Reports' : 'All Reports'}
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="summary">AI Summary</TabsTrigger>}
        </TabsList>

        {isTeacher && (
          <TabsContent value="submit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Weekly Report</CardTitle>
                <CardDescription>
                  Create a weekly progress report for a student
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student: any) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.profiles?.first_name} {student.profiles?.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Week Number</Label>
                    <Select value={weekNumber} onValueChange={setWeekNumber}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select week" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 14 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            Week {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Report Content</Label>
                  <Textarea
                    placeholder="Describe the student's progress, achievements, and areas for improvement..."
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Behavior Rating</Label>
                    <Select value={behaviorRating} onValueChange={setBehaviorRating}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rate behavior" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Very Good">Very Good</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                        <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Academic Rating</Label>
                    <Select value={academicRating} onValueChange={setAcademicRating}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rate academics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Very Good">Very Good</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                        <SelectItem value="Needs Improvement">Needs Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Comments</Label>
                  <Textarea
                    placeholder="Any additional notes for parents..."
                    value={teacherComments}
                    onChange={(e) => setTeacherComments(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={() => submitReportMutation.mutate()}
                  disabled={!selectedStudent || !reportContent || submitReportMutation.isPending}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isTeacher ? 'My Submitted Reports' : 'All Weekly Reports'}</CardTitle>
              <CardDescription>
                View and manage submitted reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reports found</p>
                ) : (
                  reports.map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {report.student?.profiles?.first_name} {report.student?.profiles?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {report.class?.name} • Week {report.week_number} • {report.term} term
                          </p>
                          {report.teacher && (
                            <p className="text-xs text-muted-foreground">
                              By: {report.teacher?.profiles?.first_name} {report.teacher?.profiles?.last_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                        {isAdmin && report.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              title="Approve only"
                              onClick={() => reviewReportMutation.mutate({ reportId: report.id, status: 'approved', sendEmail: false })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="default"
                              title="Approve & send to parent"
                              onClick={() => reviewReportMutation.mutate({ reportId: report.id, status: 'approved', sendEmail: true })}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Report Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-muted-foreground">Student</Label>
                                  <p className="font-medium">
                                    {report.student?.profiles?.first_name} {report.student?.profiles?.last_name}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Class</Label>
                                  <p className="font-medium">{report.class?.name}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Behavior</Label>
                                  <p className="font-medium">{report.behavior_rating || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Academic</Label>
                                  <p className="font-medium">{report.academic_rating || 'N/A'}</p>
                                </div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Report Content</Label>
                                <p className="mt-1 p-3 bg-muted rounded-lg">{report.report_content}</p>
                              </div>
                              {report.teacher_comments && (
                                <div>
                                  <Label className="text-muted-foreground">Teacher Comments</Label>
                                  <p className="mt-1 p-3 bg-muted rounded-lg">{report.teacher_comments}</p>
                                </div>
                              )}
                              {report.director_summary && (
                                <div>
                                  <Label className="text-muted-foreground">Director Summary</Label>
                                  <p className="mt-1 p-3 bg-muted rounded-lg">{report.director_summary}</p>
                                </div>
                              )}
                              {report.status === 'approved' && (
                                <Button onClick={() => generateParentPDF(report)} className="w-full">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF for Parent
                                </Button>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="summary">
            <AIAssistant 
              context="reports"
              systemPrompt="You are an AI assistant helping school administrators summarize weekly student reports. You can help summarize multiple reports, identify trends, highlight students who need attention, and create parent-friendly summaries. Be concise, professional, and helpful."
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default WeeklyReports;