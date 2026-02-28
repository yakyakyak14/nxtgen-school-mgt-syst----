import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Users, 
  UserCog, 
  Wallet, 
  BookOpen,
  Calendar,
  Bell,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import SchoolLocationMap from '@/components/dashboard/SchoolLocationMap';
import FeeCollectionChart from '@/components/dashboard/FeeCollectionChart';
import { PlatformAnnouncementsBanner } from '@/components/layout/PlatformAnnouncementsBanner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  totalGuardians: number;
  totalFeesCollected: number;
}

interface ClassOverview {
  level: string;
  count: number;
  classes: number;
}

interface RecentActivity {
  id: string;
  action: string;
  details: string;
  time: string;
  type: 'success' | 'info' | 'warning';
}

const Dashboard: React.FC = () => {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalStaff: 0,
    totalGuardians: 0,
    totalFeesCollected: 0,
  });
  const [classOverview, setClassOverview] = useState<ClassOverview[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const firstName = profile?.first_name || 'User';

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        studentsResult,
        staffResult,
        guardiansResult,
        feesResult,
        classesResult,
        recentPaymentsResult,
        recentStudentsResult,
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('guardians').select('id', { count: 'exact', head: true }),
        supabase.from('fee_payments').select('amount_paid'),
        supabase.from('classes').select('id, level, name'),
        supabase.from('fee_payments').select('id, amount_paid, payment_date, students(admission_number)').order('payment_date', { ascending: false }).limit(3),
        supabase.from('students').select('id, admission_number, created_at, classes(name)').order('created_at', { ascending: false }).limit(2),
      ]);

      // Calculate total fees
      const totalFees = feesResult.data?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;

      setStats({
        totalStudents: studentsResult.count || 0,
        totalStaff: staffResult.count || 0,
        totalGuardians: guardiansResult.count || 0,
        totalFeesCollected: totalFees,
      });

      // Calculate class overview
      if (classesResult.data) {
        const levelGroups: Record<string, { count: number; classes: number }> = {};
        
        for (const cls of classesResult.data) {
          let levelName = '';
          if (cls.level.startsWith('nursery')) levelName = 'Nursery';
          else if (cls.level.startsWith('primary_1') || cls.level.startsWith('primary_2') || cls.level.startsWith('primary_3')) levelName = 'Primary 1-3';
          else if (cls.level.startsWith('primary_4') || cls.level.startsWith('primary_5') || cls.level.startsWith('primary_6')) levelName = 'Primary 4-6';
          else if (cls.level.startsWith('jss')) levelName = 'JSS 1-3';
          else if (cls.level.startsWith('ss')) levelName = 'SS 1-3';

          if (levelName) {
            if (!levelGroups[levelName]) {
              levelGroups[levelName] = { count: 0, classes: 0 };
            }
            levelGroups[levelName].classes += 1;
          }
        }

        // Get student counts per class level
        const { data: studentCounts } = await supabase
          .from('students')
          .select('classes(level)')
          .eq('is_active', true);

        if (studentCounts) {
          for (const student of studentCounts) {
            const level = (student.classes as any)?.level;
            if (!level) continue;
            
            let levelName = '';
            if (level.startsWith('nursery')) levelName = 'Nursery';
            else if (level.startsWith('primary_1') || level.startsWith('primary_2') || level.startsWith('primary_3')) levelName = 'Primary 1-3';
            else if (level.startsWith('primary_4') || level.startsWith('primary_5') || level.startsWith('primary_6')) levelName = 'Primary 4-6';
            else if (level.startsWith('jss')) levelName = 'JSS 1-3';
            else if (level.startsWith('ss')) levelName = 'SS 1-3';

            if (levelName && levelGroups[levelName]) {
              levelGroups[levelName].count += 1;
            }
          }
        }

        const overview = Object.entries(levelGroups).map(([level, data]) => ({
          level,
          count: data.count,
          classes: data.classes,
        }));
        setClassOverview(overview);
      }

      // Build recent activity
      const activities: RecentActivity[] = [];
      
      if (recentStudentsResult.data) {
        for (const student of recentStudentsResult.data) {
          activities.push({
            id: `student-${student.id}`,
            action: 'New student enrolled',
            details: `${student.admission_number} - ${(student.classes as any)?.name || 'No class'}`,
            time: student.created_at ? formatDistanceToNow(new Date(student.created_at), { addSuffix: true }) : 'Recently',
            type: 'success',
          });
        }
      }

      if (recentPaymentsResult.data) {
        for (const payment of recentPaymentsResult.data) {
          activities.push({
            id: `payment-${payment.id}`,
            action: 'Fee payment received',
            details: `₦${payment.amount_paid.toLocaleString()} from ${(payment.students as any)?.admission_number || 'Student'}`,
            time: payment.payment_date ? formatDistanceToNow(new Date(payment.payment_date), { addSuffix: true }) : 'Recently',
            type: 'success',
          });
        }
      }

      // Sort by most recent (approximation based on time string)
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role !== 'super_admin' && role !== 'alumni') {
      fetchDashboardData();
    }
  }, [role]);

  // Redirect super admins to their dedicated panel
  if (role === 'super_admin') {
    return <Navigate to="/super-admin" replace />;
  }

  // Redirect alumni to their portal
  if (role === 'alumni') {
    return <Navigate to="/alumni" replace />;
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Platform Announcements */}
      <PlatformAnnouncementsBanner />

      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {firstName}!
          </h1>
          <p className="page-subtitle">
            Here's what's happening at your school today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/notices">
              <Bell className="h-4 w-4 mr-2" />
              View Notices
            </Link>
          </Button>
          {(role === 'director' || role === 'principal' || role === 'headmaster') && (
            <Button asChild>
              <Link to="/students/new">
                <GraduationCap className="h-4 w-4 mr-2" />
                Add Student
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <StatCard
              title="Total Students"
              value={stats.totalStudents.toLocaleString()}
              subtitle="Active enrollments"
              icon={GraduationCap}
              variant="primary"
              className="stagger-1"
            />
            <StatCard
              title="Total Staff"
              value={stats.totalStaff.toLocaleString()}
              subtitle="Academic & Non-Academic"
              icon={UserCog}
              variant="secondary"
              className="stagger-2"
            />
            <StatCard
              title="Parents/Guardians"
              value={stats.totalGuardians.toLocaleString()}
              subtitle="Registered accounts"
              icon={Users}
              variant="accent"
              className="stagger-3"
            />
            <StatCard
              title="Fees Collected"
              value={formatCurrency(stats.totalFeesCollected)}
              subtitle="Total payments"
              icon={Wallet}
              variant="success"
              className="stagger-4"
            />
          </>
        )}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/attendance">
                <BookOpen className="h-4 w-4 mr-3" />
                Take Attendance
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/gradebook">
                <GraduationCap className="h-4 w-4 mr-3" />
                Enter Grades
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/fees">
                <Wallet className="h-4 w-4 mr-3" />
                Record Payment
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/notices/new">
                <Bell className="h-4 w-4 mr-3" />
                Post Notice
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`h-2 w-2 rounded-full mt-2 ${
                      item.type === 'success' ? 'bg-success' :
                      item.type === 'warning' ? 'bg-warning' : 'bg-info'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {item.action}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.details}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fee Collection Chart */}
      <FeeCollectionChart />

      {/* Class Overview & School Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Class Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : classOverview.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No classes found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {classOverview.map((item) => (
                  <div 
                    key={item.level}
                    className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center"
                  >
                    <p className="text-2xl font-bold text-foreground">{item.count}</p>
                    <p className="text-sm font-medium text-foreground">{item.level}</p>
                    <p className="text-xs text-muted-foreground">{item.classes} classes</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* School Location Map */}
        <SchoolLocationMap />
      </div>
    </div>
  );
};

export default Dashboard;
