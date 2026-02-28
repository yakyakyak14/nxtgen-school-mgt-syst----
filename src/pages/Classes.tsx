import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, Plus, Users, Loader2 } from 'lucide-react';
import { ALL_CLASS_LEVELS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

interface ClassData {
  id: string;
  name: string;
  level: string;
  studentCount: number;
}

interface ClassGroup {
  name: string;
  prefix: string;
  color: string;
  classes: ClassData[];
}

const Classes: React.FC = () => {
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClassData();
  }, []);

  const fetchClassData = async () => {
    setIsLoading(true);
    try {
      // Fetch classes with student counts
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, level')
        .order('name');

      if (classesError) throw classesError;

      // Fetch student counts per class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('class_id')
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      // Count students per class
      const studentCountMap: Record<string, number> = {};
      studentsData?.forEach(student => {
        if (student.class_id) {
          studentCountMap[student.class_id] = (studentCountMap[student.class_id] || 0) + 1;
        }
      });

      // Build class data with counts
      const classesWithCounts: ClassData[] = (classesData || []).map(cls => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        studentCount: studentCountMap[cls.id] || 0,
      }));

      // Group classes
      const groups: ClassGroup[] = [
        { name: 'Nursery', prefix: 'nursery', color: 'bg-accent/10 text-accent', classes: [] },
        { name: 'Primary', prefix: 'primary', color: 'bg-primary/10 text-primary', classes: [] },
        { name: 'Junior Secondary', prefix: 'jss', color: 'bg-secondary/10 text-secondary', classes: [] },
        { name: 'Senior Secondary', prefix: 'ss', color: 'bg-info/10 text-info', classes: [] },
      ];

      // If we have real classes, group them
      if (classesWithCounts.length > 0) {
        classesWithCounts.forEach(cls => {
          const group = groups.find(g => cls.level.startsWith(g.prefix));
          if (group) {
            group.classes.push(cls);
          }
        });
      } else {
        // Show available levels from constants when no classes exist
        ALL_CLASS_LEVELS.forEach(level => {
          const group = groups.find(g => level.value.startsWith(g.prefix));
          if (group) {
            group.classes.push({
              id: level.value,
              name: level.label,
              level: level.value,
              studentCount: 0,
            });
          }
        });
      }

      setClassGroups(groups.filter(g => g.classes.length > 0));
    } catch (error) {
      console.error('Error fetching class data:', error);
      // Fallback to show empty state with level options
      const fallbackGroups: ClassGroup[] = [
        { 
          name: 'Nursery', 
          prefix: 'nursery', 
          color: 'bg-accent/10 text-accent', 
          classes: ALL_CLASS_LEVELS.filter(c => c.value.startsWith('nursery')).map(l => ({
            id: l.value, name: l.label, level: l.value, studentCount: 0
          }))
        },
        { 
          name: 'Primary', 
          prefix: 'primary', 
          color: 'bg-primary/10 text-primary', 
          classes: ALL_CLASS_LEVELS.filter(c => c.value.startsWith('primary')).map(l => ({
            id: l.value, name: l.label, level: l.value, studentCount: 0
          }))
        },
        { 
          name: 'Junior Secondary', 
          prefix: 'jss', 
          color: 'bg-secondary/10 text-secondary', 
          classes: ALL_CLASS_LEVELS.filter(c => c.value.startsWith('jss')).map(l => ({
            id: l.value, name: l.label, level: l.value, studentCount: 0
          }))
        },
        { 
          name: 'Senior Secondary', 
          prefix: 'ss', 
          color: 'bg-info/10 text-info', 
          classes: ALL_CLASS_LEVELS.filter(c => c.value.startsWith('ss')).map(l => ({
            id: l.value, name: l.label, level: l.value, studentCount: 0
          }))
        },
      ];
      setClassGroups(fallbackGroups);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Classes</h1>
            <p className="page-subtitle">Manage class levels and sections</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Classes</h1>
          <p className="page-subtitle">Manage class levels and sections</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      <div className="grid gap-6">
        {classGroups.map((group) => (
          <Card key={group.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                {group.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {group.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className={`p-4 rounded-xl ${group.color} hover:scale-105 transition-transform cursor-pointer`}
                  >
                    <p className="font-semibold text-center">{cls.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm opacity-80">
                      <Users className="h-3 w-3" />
                      <span>{cls.studentCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Classes;
