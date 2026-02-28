import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Gauge, Save, AlertTriangle, Users, HardDrive, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';
import { useToast } from '@/hooks/use-toast';

interface SchoolQuota {
  id: string;
  school_id: string;
  max_students: number;
  max_staff: number;
  max_storage_mb: number;
  max_api_calls_daily: number;
  current_students: number;
  current_staff: number;
  current_storage_mb: number;
  api_calls_today: number;
}

export const UsageQuotasManager: React.FC = () => {
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [editingQuota, setEditingQuota] = useState<SchoolQuota | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: schools } = useSchools();

  const { data: quotas, isLoading } = useQuery({
    queryKey: ['school-quotas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_quotas')
        .select('*');
      
      if (error) throw error;
      return data as SchoolQuota[];
    },
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async (quota: Partial<SchoolQuota> & { school_id: string }) => {
      const { error } = await supabase
        .from('school_quotas')
        .upsert({
          school_id: quota.school_id,
          max_students: quota.max_students,
          max_staff: quota.max_staff,
          max_storage_mb: quota.max_storage_mb,
          max_api_calls_daily: quota.max_api_calls_daily,
        }, { onConflict: 'school_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-quotas'] });
      setEditingQuota(null);
      toast({ title: 'Quotas updated successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to update quotas' });
    },
  });

  const getSchoolName = (schoolId: string) => {
    return schools?.find(s => s.id === schoolId)?.name || 'Unknown';
  };

  const getSchoolQuota = (schoolId: string) => {
    return quotas?.find(q => q.school_id === schoolId);
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Combine schools with their quotas
  const schoolsWithQuotas = schools?.map(school => {
    const quota = getSchoolQuota(school.id);
    return {
      ...school,
      quota: quota || {
        max_students: 500,
        max_staff: 100,
        max_storage_mb: 5000,
        max_api_calls_daily: 10000,
        current_students: 0,
        current_staff: 0,
        current_storage_mb: 0,
        api_calls_today: 0,
      },
    };
  }) || [];

  const filteredSchools = selectedSchool 
    ? schoolsWithQuotas.filter(s => s.id === selectedSchool)
    : schoolsWithQuotas;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Usage & Quotas
        </CardTitle>
        <CardDescription>
          Manage resource limits and monitor usage for each school
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* School Filter */}
        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="All Schools" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Schools</SelectItem>
            {schools?.map((school) => (
              <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !filteredSchools?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No schools found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSchools.map((school) => {
              const studentPct = getUsagePercentage(school.quota.current_students, school.quota.max_students);
              const staffPct = getUsagePercentage(school.quota.current_staff, school.quota.max_staff);
              const storagePct = getUsagePercentage(school.quota.current_storage_mb, school.quota.max_storage_mb);
              const apiPct = getUsagePercentage(school.quota.api_calls_today, school.quota.max_api_calls_daily);

              return (
                <div key={school.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{school.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {school.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingQuota({
                        id: '',
                        school_id: school.id,
                        ...school.quota,
                      })}
                    >
                      Edit Limits
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Students */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> Students
                        </span>
                        <span className={getUsageColor(studentPct)}>
                          {school.quota.current_students} / {school.quota.max_students}
                        </span>
                      </div>
                      <Progress value={studentPct} className="h-2" />
                      {studentPct >= 90 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Near limit
                        </Badge>
                      )}
                    </div>

                    {/* Staff */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> Staff
                        </span>
                        <span className={getUsageColor(staffPct)}>
                          {school.quota.current_staff} / {school.quota.max_staff}
                        </span>
                      </div>
                      <Progress value={staffPct} className="h-2" />
                    </div>

                    {/* Storage */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-4 w-4" /> Storage
                        </span>
                        <span className={getUsageColor(storagePct)}>
                          {school.quota.current_storage_mb.toFixed(0)} / {school.quota.max_storage_mb} MB
                        </span>
                      </div>
                      <Progress value={storagePct} className="h-2" />
                    </div>

                    {/* API Calls */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Zap className="h-4 w-4" /> API Calls
                        </span>
                        <span className={getUsageColor(apiPct)}>
                          {school.quota.api_calls_today} / {school.quota.max_api_calls_daily}
                        </span>
                      </div>
                      <Progress value={apiPct} className="h-2" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Quota Dialog */}
        <Dialog open={!!editingQuota} onOpenChange={(open) => !open && setEditingQuota(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Quotas</DialogTitle>
              <DialogDescription>
                Set resource limits for {editingQuota && getSchoolName(editingQuota.school_id)}
              </DialogDescription>
            </DialogHeader>
            {editingQuota && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Students</Label>
                    <Input
                      type="number"
                      value={editingQuota.max_students}
                      onChange={(e) => setEditingQuota({
                        ...editingQuota,
                        max_students: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Staff</Label>
                    <Input
                      type="number"
                      value={editingQuota.max_staff}
                      onChange={(e) => setEditingQuota({
                        ...editingQuota,
                        max_staff: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Storage (MB)</Label>
                    <Input
                      type="number"
                      value={editingQuota.max_storage_mb}
                      onChange={(e) => setEditingQuota({
                        ...editingQuota,
                        max_storage_mb: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Daily API Calls</Label>
                    <Input
                      type="number"
                      value={editingQuota.max_api_calls_daily}
                      onChange={(e) => setEditingQuota({
                        ...editingQuota,
                        max_api_calls_daily: parseInt(e.target.value) || 0,
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingQuota(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => editingQuota && updateQuotaMutation.mutate(editingQuota)}
                disabled={updateQuotaMutation.isPending}
              >
                {updateQuotaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
