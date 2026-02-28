import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, TrendingUp, TrendingDown, Minus, Trophy, Users, DollarSign, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';

interface SchoolMetrics {
  school_id: string;
  school_name: string;
  student_count: number;
  staff_count: number;
  fee_collection_rate: number;
  attendance_rate: number;
  grade_average: number;
}

export const ComparativeAnalytics: React.FC = () => {
  const [sortBy, setSortBy] = useState<string>('fee_collection_rate');
  const { data: schools } = useSchools();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['comparative-analytics', schools?.map(s => s.id)],
    queryFn: async () => {
      if (!schools?.length) return [];

      const results: SchoolMetrics[] = [];

      for (const school of schools) {
        // Get student count
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('is_active', true);

        // Get staff count
        const { count: staffCount } = await supabase
          .from('staff')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('is_active', true);

        // Calculate fee collection rate
        const { data: obligations } = await supabase
          .from('student_fee_obligations')
          .select('total_amount, amount_paid')
          .in('student_id', (
            await supabase.from('students').select('id').eq('school_id', school.id)
          ).data?.map(s => s.id) || []);

        let feeCollectionRate = 0;
        if (obligations?.length) {
          const totalOwed = obligations.reduce((sum, o) => sum + o.total_amount, 0);
          const totalPaid = obligations.reduce((sum, o) => sum + o.amount_paid, 0);
          feeCollectionRate = totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0;
        }

        // Calculate attendance rate (simplified)
        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('is_present', true)
          .in('student_id', (
            await supabase.from('students').select('id').eq('school_id', school.id)
          ).data?.map(s => s.id) || []);

        const { count: totalAttendance } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .in('student_id', (
            await supabase.from('students').select('id').eq('school_id', school.id)
          ).data?.map(s => s.id) || []);

        const attendanceRate = totalAttendance && totalAttendance > 0 
          ? ((presentCount || 0) / totalAttendance) * 100 
          : 0;

        // Get average grades
        const { data: grades } = await supabase
          .from('grades')
          .select('total_score')
          .in('student_id', (
            await supabase.from('students').select('id').eq('school_id', school.id)
          ).data?.map(s => s.id) || []);

        let gradeAverage = 0;
        if (grades?.length) {
          const validGrades = grades.filter(g => g.total_score !== null);
          gradeAverage = validGrades.length > 0
            ? validGrades.reduce((sum, g) => sum + (g.total_score || 0), 0) / validGrades.length
            : 0;
        }

        results.push({
          school_id: school.id,
          school_name: school.name,
          student_count: studentCount || 0,
          staff_count: staffCount || 0,
          fee_collection_rate: Math.round(feeCollectionRate * 10) / 10,
          attendance_rate: Math.round(attendanceRate * 10) / 10,
          grade_average: Math.round(gradeAverage * 10) / 10,
        });
      }

      return results;
    },
    enabled: !!schools?.length,
  });

  const sortedMetrics = React.useMemo(() => {
    if (!metrics) return [];
    return [...metrics].sort((a, b) => {
      switch (sortBy) {
        case 'fee_collection_rate':
          return b.fee_collection_rate - a.fee_collection_rate;
        case 'attendance_rate':
          return b.attendance_rate - a.attendance_rate;
        case 'grade_average':
          return b.grade_average - a.grade_average;
        case 'student_count':
          return b.student_count - a.student_count;
        default:
          return 0;
      }
    });
  }, [metrics, sortBy]);

  // Calculate platform averages
  const platformAverages = React.useMemo(() => {
    if (!metrics?.length) return { fee: 0, attendance: 0, grade: 0 };
    return {
      fee: metrics.reduce((sum, m) => sum + m.fee_collection_rate, 0) / metrics.length,
      attendance: metrics.reduce((sum, m) => sum + m.attendance_rate, 0) / metrics.length,
      grade: metrics.reduce((sum, m) => sum + m.grade_average, 0) / metrics.length,
    };
  }, [metrics]);

  const getComparisonIcon = (value: number, average: number) => {
    const diff = value - average;
    if (diff > 5) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (diff < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getPerformanceBadge = (rank: number, total: number) => {
    if (rank === 0) return <Badge className="bg-amber-500"><Trophy className="h-3 w-3 mr-1" /> Top Performer</Badge>;
    if (rank < total * 0.25) return <Badge className="bg-emerald-500">Excellent</Badge>;
    if (rank < total * 0.5) return <Badge variant="secondary">Good</Badge>;
    if (rank < total * 0.75) return <Badge variant="outline">Average</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparative Analytics
          </CardTitle>
          <CardDescription>
            Compare performance metrics across all schools
          </CardDescription>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fee_collection_rate">Fee Collection Rate</SelectItem>
            <SelectItem value="attendance_rate">Attendance Rate</SelectItem>
            <SelectItem value="grade_average">Grade Average</SelectItem>
            <SelectItem value="student_count">Student Count</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Platform Averages */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Fee Collection</p>
                  <p className="text-xl font-bold">{platformAverages.fee.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-xl font-bold">{platformAverages.attendance.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Grade</p>
                  <p className="text-xl font-bold">{platformAverages.grade.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !sortedMetrics?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available for comparison</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Fee Collection</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center">Grade Avg</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMetrics.map((school, index) => (
                  <TableRow key={school.school_id}>
                    <TableCell className="font-medium">
                      {index === 0 ? (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Trophy className="h-4 w-4" /> #{index + 1}
                        </span>
                      ) : (
                        `#${index + 1}`
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{school.school_name}</TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {school.student_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        {school.fee_collection_rate}%
                        {getComparisonIcon(school.fee_collection_rate, platformAverages.fee)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        {school.attendance_rate}%
                        {getComparisonIcon(school.attendance_rate, platformAverages.attendance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        {school.grade_average}%
                        {getComparisonIcon(school.grade_average, platformAverages.grade)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(index, sortedMetrics.length)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
