import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { School, Users, GraduationCap, DollarSign, Loader2, TrendingUp, Building2, UserCheck } from 'lucide-react';

export const PlatformAnalytics: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: async () => {
      // Get total schools
      const { count: totalSchools } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });

      // Get active schools
      const { count: activeSchools } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total students
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // Get active students
      const { count: activeStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total staff
      const { count: totalStaff } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      // Get active staff
      const { count: activeStaff } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total fee payments
      const { data: feePayments } = await supabase
        .from('fee_payments')
        .select('amount_paid, platform_fee, school_amount');

      const totalRevenue = feePayments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
      const platformRevenue = feePayments?.reduce((sum, p) => sum + (p.platform_fee || 0), 0) || 0;

      // Get pending invitations
      const { count: pendingInvitations } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get school breakdown
      const { data: schoolsData } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          is_active,
          students:students(count),
          staff:staff(count)
        `)
        .eq('is_active', true)
        .limit(10);

      return {
        totalSchools: totalSchools || 0,
        activeSchools: activeSchools || 0,
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        totalStaff: totalStaff || 0,
        activeStaff: activeStaff || 0,
        totalUsers: totalUsers || 0,
        totalRevenue,
        platformRevenue,
        pendingInvitations: pendingInvitations || 0,
        schoolsBreakdown: schoolsData || [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeSchools}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalSchools} total registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalStudents} total enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeStaff}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalStaff} total registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.platformRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analytics?.totalRevenue || 0)} total collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered on platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.pendingInvitations}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Students/School</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.activeSchools ? Math.round((analytics?.activeStudents || 0) / analytics.activeSchools) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per active school
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schools Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Schools Overview</CardTitle>
          <CardDescription>Student and staff distribution across schools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.schoolsBreakdown.map((school: any) => (
              <div key={school.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <School className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{school.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {school.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold">{school.students?.[0]?.count || 0}</p>
                    <p className="text-muted-foreground">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{school.staff?.[0]?.count || 0}</p>
                    <p className="text-muted-foreground">Staff</p>
                  </div>
                </div>
              </div>
            ))}
            {!analytics?.schoolsBreakdown.length && (
              <p className="text-center text-muted-foreground py-4">
                No schools registered yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};