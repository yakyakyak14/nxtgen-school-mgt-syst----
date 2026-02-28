import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceStats {
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  classesPending: number;
}

const Attendance: React.FC = () => {
  const [stats, setStats] = useState<AttendanceStats>({
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    classesPending: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceStats();
  }, []);

  const fetchAttendanceStats = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [presentResult, absentResult, totalClassesResult] = await Promise.all([
        supabase.from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('date', today)
          .eq('is_present', true),
        supabase.from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('date', today)
          .eq('is_present', false),
        supabase.from('classes')
          .select('id', { count: 'exact', head: true }),
      ]);

      const presentToday = presentResult.count || 0;
      const absentToday = absentResult.count || 0;
      const totalAttendance = presentToday + absentToday;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentToday / totalAttendance) * 100 * 10) / 10 : 0;

      // Calculate classes that haven't taken attendance today
      const { data: classesWithAttendance } = await supabase
        .from('attendance')
        .select('student_id, students(class_id)')
        .eq('date', today);

      const classesMarked = new Set(
        classesWithAttendance
          ?.filter(a => (a.students as any)?.class_id)
          .map(a => (a.students as any).class_id) || []
      );
      
      const totalClasses = totalClassesResult.count || 0;
      const classesPending = totalClasses - classesMarked.size;

      setStats({
        presentToday,
        absentToday,
        attendanceRate,
        classesPending: Math.max(0, classesPending),
      });
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track daily student and staff attendance</p>
        </div>
        <Button>
          <ClipboardList className="h-4 w-4 mr-2" />
          Take Attendance
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.presentToday.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Present Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.absentToday.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Absent Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
                    <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <ClipboardList className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.classesPending}</p>
                    <p className="text-sm text-muted-foreground">Classes Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle>Today's Attendance</CardTitle>
            <div className="flex gap-3">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="nursery">Nursery</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="jss">Junior Secondary</SelectItem>
                  <SelectItem value="ss">Senior Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a class to view or take attendance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
