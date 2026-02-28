import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ToggleLeft, Save, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';
import { useToast } from '@/hooks/use-toast';

interface SchoolFeature {
  id: string;
  school_id: string;
  feature_key: string;
  is_enabled: boolean;
  config: any;
}

const AVAILABLE_FEATURES = [
  { key: 'students', label: 'Students Management', description: 'Manage student records and enrollments' },
  { key: 'staff', label: 'Staff Management', description: 'Manage staff records and roles' },
  { key: 'attendance', label: 'Attendance', description: 'Track student and staff attendance' },
  { key: 'fees', label: 'Fee Management', description: 'Manage fee types, payments, and collections' },
  { key: 'grades', label: 'Gradebook', description: 'Record and manage student grades' },
  { key: 'timetable', label: 'Timetable', description: 'Create and manage class schedules' },
  { key: 'library', label: 'Library', description: 'Manage library books and loans' },
  { key: 'inventory', label: 'Inventory', description: 'Track school inventory and assets' },
  { key: 'payroll', label: 'Payroll', description: 'Manage staff salaries and payments' },
  { key: 'alumni', label: 'Alumni Portal', description: 'Alumni network and donations' },
  { key: 'parents_portal', label: 'Parents Portal', description: 'Parent access to student info' },
  { key: 'weekly_reports', label: 'Weekly Reports', description: 'Weekly progress reports for parents' },
  { key: 'report_cards', label: 'Report Cards', description: 'Generate and manage report cards' },
  { key: 'exam_schedule', label: 'Exam Schedule', description: 'Manage examination schedules' },
  { key: 'notices', label: 'Notices', description: 'School notices and announcements' },
  { key: 'messages', label: 'Messaging', description: 'Internal messaging system' },
  { key: 'clubs', label: 'Clubs & Activities', description: 'Manage extracurricular activities' },
  { key: 'ai_assistant', label: 'AI Assistant', description: 'AI-powered assistant for queries' },
];

export const FeatureFlagsManager: React.FC = () => {
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: schools } = useSchools();

  const { data: features, isLoading, refetch } = useQuery({
    queryKey: ['school-features', selectedSchool],
    queryFn: async () => {
      if (!selectedSchool) return [];
      const { data, error } = await supabase
        .from('school_features')
        .select('*')
        .eq('school_id', selectedSchool);
      
      if (error) throw error;
      
      // Initialize local state with current values
      const featureMap: Record<string, boolean> = {};
      AVAILABLE_FEATURES.forEach(f => {
        const existing = (data as SchoolFeature[])?.find(sf => sf.feature_key === f.key);
        featureMap[f.key] = existing ? existing.is_enabled : true; // Default to enabled
      });
      setLocalFeatures(featureMap);
      setHasChanges(false);
      
      return data as SchoolFeature[];
    },
    enabled: !!selectedSchool,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchool) return;

      // Upsert all features
      const upsertData = Object.entries(localFeatures).map(([key, enabled]) => ({
        school_id: selectedSchool,
        feature_key: key,
        is_enabled: enabled,
      }));

      const { error } = await supabase
        .from('school_features')
        .upsert(upsertData, { onConflict: 'school_id,feature_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-features'] });
      setHasChanges(false);
      toast({
        title: 'Features saved',
        description: 'School feature flags have been updated.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save feature flags.',
      });
    },
  });

  const handleToggle = (featureKey: string, enabled: boolean) => {
    setLocalFeatures(prev => ({ ...prev, [featureKey]: enabled }));
    setHasChanges(true);
  };

  const enableAll = () => {
    const allEnabled: Record<string, boolean> = {};
    AVAILABLE_FEATURES.forEach(f => { allEnabled[f.key] = true; });
    setLocalFeatures(allEnabled);
    setHasChanges(true);
  };

  const disableAll = () => {
    const allDisabled: Record<string, boolean> = {};
    AVAILABLE_FEATURES.forEach(f => { allDisabled[f.key] = false; });
    setLocalFeatures(allDisabled);
    setHasChanges(true);
  };

  const selectedSchoolName = schools?.find(s => s.id === selectedSchool)?.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          Feature Flags & Toggles
        </CardTitle>
        <CardDescription>
          Control which modules are available for each school
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* School Selector */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select a school to manage" />
            </SelectTrigger>
            <SelectContent>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSchool && (
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={enableAll}>
                Enable All
              </Button>
              <Button variant="outline" size="sm" onClick={disableAll}>
                Disable All
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={!hasChanges || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {!selectedSchool ? (
          <div className="text-center py-12 text-muted-foreground">
            <ToggleLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a school to manage its features</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Feature</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AVAILABLE_FEATURES.map((feature) => (
                  <TableRow key={feature.key}>
                    <TableCell className="font-medium">{feature.label}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {feature.description}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={localFeatures[feature.key] ? 'default' : 'secondary'}>
                        {localFeatures[feature.key] ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={localFeatures[feature.key] || false}
                        onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {hasChanges && selectedSchool && (
          <div className="bg-muted/50 border rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes for <strong>{selectedSchoolName}</strong>
            </p>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
