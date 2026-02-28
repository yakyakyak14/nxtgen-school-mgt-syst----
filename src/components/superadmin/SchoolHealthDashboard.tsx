import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Activity, Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';

interface SchoolHealthData {
  school_id: string;
  school_name: string;
  is_active: boolean;
  student_count: number;
  staff_count: number;
  total_fee_collected: number;
  attendance_rate: number;
  last_activity: string | null;
  health_score: number;
}

export const SchoolHealthDashboard: React.FC = () => {
  const [sortBy, setSortBy] = useState<string>('health_score');
  const { data: schools } = useSchools();

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['school-health', schools?.map(s => s.id)],
    queryFn: async () => {
      if (!schools?.length) return [];

      const healthResults: SchoolHealthData[] = [];

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

        // Get fee payments total
        const { data: feeData } = await supabase
          .from('fee_payments')
          .select('amount_paid')
          .eq('student_id', school.id);

        // Note: This is a simplified query. In production, you'd want a proper aggregation
        const totalFees = 0; // Simplified for now

        // Get recent activity
        const { data: recentActivity } = await supabase
          .from('audit_logs')
          .select('created_at')
          .eq('school_id', school.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Calculate health score (0-100)
        let healthScore = 50; // Base score
        if ((studentCount || 0) > 0) healthScore += 15;
        if ((staffCount || 0) > 0) healthScore += 15;
        if (school.is_active) healthScore += 10;
        if (recentActivity?.length) {
          const daysSinceActivity = Math.floor(
            (Date.now() - new Date(recentActivity[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceActivity < 1) healthScore += 10;
          else if (daysSinceActivity < 7) healthScore += 5;
        }

        healthResults.push({
          school_id: school.id,
          school_name: school.name,
          is_active: school.is_active || false,
          student_count: studentCount || 0,
          staff_count: staffCount || 0,
          total_fee_collected: totalFees,
          attendance_rate: 0, // Would need actual calculation
          last_activity: recentActivity?.[0]?.created_at || null,
          health_score: Math.min(healthScore, 100),
        });
      }

      return healthResults;
    },
    enabled: !!schools?.length,
  });

  const sortedData = React.useMemo(() => {
    if (!healthData) return [];
    return [...healthData].sort((a, b) => {
      switch (sortBy) {
        case 'health_score':
          return b.health_score - a.health_score;
        case 'students':
          return b.student_count - a.student_count;
        case 'staff':
          return b.staff_count - a.staff_count;
        case 'name':
          return a.school_name.localeCompare(b.school_name);
        default:
          return 0;
      }
    });
  }, [healthData, sortBy]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthProgressColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const totalStudents = healthData?.reduce((sum, s) => sum + s.student_count, 0) || 0;
  const totalStaff = healthData?.reduce((sum, s) => sum + s.staff_count, 0) || 0;
  const activeSchools = healthData?.filter(s => s.is_active).length || 0;
  const avgHealthScore = healthData?.length 
    ? Math.round(healthData.reduce((sum, s) => sum + s.health_score, 0) / healthData.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Health Score</p>
                <p className={`text-2xl font-bold ${getHealthColor(avgHealthScore)}`}>
                  {avgHealthScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Schools</p>
                <p className="text-2xl font-bold">{activeSchools} / {schools?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{totalStudents.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{totalStaff.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* School Health List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              School Health Overview
            </CardTitle>
            <CardDescription>
              Monitor the health and activity of all schools
            </CardDescription>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="health_score">Health Score</SelectItem>
              <SelectItem value="students">Student Count</SelectItem>
              <SelectItem value="staff">Staff Count</SelectItem>
              <SelectItem value="name">School Name</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !sortedData?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schools to display</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedData.map((school) => (
                <div
                  key={school.school_id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${school.is_active ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        {school.is_active ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{school.school_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {school.is_active ? 'Active' : 'Inactive'}
                          {school.last_activity && (
                            <> • Last activity: {new Date(school.last_activity).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${getHealthColor(school.health_score)}`}>
                        {school.health_score}%
                      </span>
                      <p className="text-xs text-muted-foreground">Health Score</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Progress 
                      value={school.health_score} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{school.student_count} Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{school.staff_count} Staff</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {school.health_score < 40 ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className={school.health_score < 40 ? 'text-amber-600' : 'text-emerald-600'}>
                        {school.health_score < 40 ? 'Needs Attention' : 'Healthy'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
