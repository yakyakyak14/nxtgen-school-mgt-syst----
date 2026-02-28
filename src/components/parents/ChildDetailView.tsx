import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, DollarSign, BarChart3, ClipboardList } from 'lucide-react';
import {
  LinkedChild,
  ChildGrade,
  ChildFeeObligation,
  ChildWeeklyReport,
  ChildAttendanceSummary,
  fetchChildGrades,
  fetchChildFees,
  fetchChildWeeklyReports,
  fetchChildAttendance,
} from '@/hooks/useParentChildren';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface ChildDetailViewProps {
  child: LinkedChild;
}

const ChildDetailView: React.FC<ChildDetailViewProps> = ({ child }) => {
  const [grades, setGrades] = useState<ChildGrade[]>([]);
  const [fees, setFees] = useState<ChildFeeObligation[]>([]);
  const [reports, setReports] = useState<ChildWeeklyReport[]>([]);
  const [attendance, setAttendance] = useState<ChildAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [g, f, r, a] = await Promise.all([
        fetchChildGrades(child.id),
        fetchChildFees(child.id),
        fetchChildWeeklyReports(child.id),
        fetchChildAttendance(child.id),
      ]);
      setGrades(g);
      setFees(f);
      setReports(r);
      setAttendance(a);
      setIsLoading(false);
    };
    load();
  }, [child.id]);

  if (isLoading) {
    return (
      <Card className="border-t-0 rounded-t-none">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading details...
        </CardContent>
      </Card>
    );
  }

  // Group grades by session/term
  const gradesByTerm = grades.reduce((acc, g) => {
    const key = `${g.session} — ${g.term} Term`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {} as Record<string, ChildGrade[]>);

  const totalFeeOwed = fees.reduce((sum, f) => sum + f.total_amount, 0);
  const totalFeePaid = fees.reduce((sum, f) => sum + f.amount_paid, 0);

  return (
    <Card className="border-t-0 rounded-t-none">
      <CardContent className="pt-4">
        <Tabs defaultValue="grades" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="grades" className="gap-1">
              <BarChart3 className="h-3.5 w-3.5" /> Grades
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="fees" className="gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Fees
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              <FileText className="h-3.5 w-3.5" /> Reports
            </TabsTrigger>
          </TabsList>

          {/* Grades Tab */}
          <TabsContent value="grades">
            {grades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No grades recorded yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(gradesByTerm).map(([term, termGrades]) => {
                  const avg = termGrades.reduce((s, g) => s + (g.total_score || 0), 0) / termGrades.length;
                  return (
                    <div key={term} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{term}</h4>
                        <Badge variant="outline">Avg: {avg.toFixed(1)}%</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-center">CA</TableHead>
                            <TableHead className="text-center">Exam</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {termGrades.map(g => (
                            <TableRow key={g.id}>
                              <TableCell className="font-medium">{g.subject_name}</TableCell>
                              <TableCell className="text-center">{g.ca_score ?? '—'}</TableCell>
                              <TableCell className="text-center">{g.exam_score ?? '—'}</TableCell>
                              <TableCell className="text-center font-semibold">{g.total_score ?? '—'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={
                                  g.grade_letter === 'A' ? 'default' :
                                  g.grade_letter === 'B' ? 'default' :
                                  g.grade_letter === 'F' ? 'destructive' : 'secondary'
                                }>
                                  {g.grade_letter || '—'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                                {g.remarks || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            {!attendance || attendance.totalDays === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No attendance records yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-primary">{attendance.attendanceRate}%</p>
                      <p className="text-sm text-muted-foreground mt-1">Attendance Rate</p>
                      <Progress value={attendance.attendanceRate} className="mt-3" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-green-600">{attendance.presentDays}</p>
                      <p className="text-sm text-muted-foreground mt-1">Days Present</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-3xl font-bold text-destructive">{attendance.absentDays}</p>
                      <p className="text-sm text-muted-foreground mt-1">Days Absent</p>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Out of {attendance.totalDays} total school days recorded
                </p>
              </div>
            )}
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees">
            {fees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No fee obligations recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold">₦{totalFeeOwed.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total Fees</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-green-600">₦{totalFeePaid.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total Paid</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-2xl font-bold text-destructive">
                        ₦{(totalFeeOwed - totalFeePaid).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Outstanding</p>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee</TableHead>
                      <TableHead>Session / Term</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.fee_name}</TableCell>
                        <TableCell>{f.session} — {f.term}</TableCell>
                        <TableCell className="text-right">₦{f.total_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₦{f.amount_paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">₦{f.balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            f.status === 'paid' ? 'default' :
                            f.status === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {f.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Weekly Reports Tab */}
          <TabsContent value="reports">
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No weekly reports submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(r => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Week {r.week_number} Report</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{r.status}</Badge>
                          {r.submitted_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(r.submitted_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-3">
                        {r.behavior_rating && (
                          <Badge variant="outline">Behavior: {r.behavior_rating}</Badge>
                        )}
                        {r.academic_rating && (
                          <Badge variant="outline">Academic: {r.academic_rating}</Badge>
                        )}
                        {r.attendance_summary && (
                          <Badge variant="outline">Attendance: {r.attendance_summary}</Badge>
                        )}
                      </div>
                      {r.report_content && (
                        <p className="text-sm text-muted-foreground">{r.report_content}</p>
                      )}
                      {r.teacher_comments && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Teacher's Comments</p>
                          <p className="text-sm">{r.teacher_comments}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ChildDetailView;
