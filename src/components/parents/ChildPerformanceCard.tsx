import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, BookOpen, Trophy, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LinkedChild,
  fetchChildAttendance,
  fetchChildClubs,
  fetchChildSubjectCount,
  ChildAttendanceSummary,
  ChildClub,
} from '@/hooks/useParentChildren';
import ChildDetailView from './ChildDetailView';

interface ChildPerformanceCardProps {
  child: LinkedChild;
}

const ChildPerformanceCard: React.FC<ChildPerformanceCardProps> = ({ child }) => {
  const [attendance, setAttendance] = useState<ChildAttendanceSummary | null>(null);
  const [clubs, setClubs] = useState<ChildClub[]>([]);
  const [subjectCount, setSubjectCount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchChildAttendance(child.id).then(setAttendance);
    fetchChildClubs(child.id).then(setClubs);
    fetchChildSubjectCount(child.id, child.class_id).then(setSubjectCount);
  }, [child.id, child.class_id]);

  const childName = child.first_name && child.last_name
    ? `${child.first_name} ${child.last_name}`
    : child.admission_number;

  return (
    <div className="space-y-0">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{childName}</CardTitle>
              <p className="text-muted-foreground">
                {child.class_name || 'No class assigned'} • {child.admission_number}
              </p>
            </div>
            <Badge variant={child.is_active ? 'default' : 'secondary'}>
              {child.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {attendance ? `${attendance.attendanceRate}%` : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Attendance</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {attendance ? `${attendance.presentDays}/${attendance.totalDays}` : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Days Present</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{subjectCount || '—'}</p>
              <p className="text-sm text-muted-foreground">Subjects</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <Trophy className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{clubs.length || '—'}</p>
              <p className="text-sm text-muted-foreground">Clubs</p>
            </div>
          </div>

          {clubs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {clubs.map(c => (
                <Badge key={c.id} variant="outline">{c.club_name}{c.role ? ` (${c.role})` : ''}</Badge>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>Hide Details <ChevronUp className="h-4 w-4 ml-2" /></>
            ) : (
              <>View Full Report & Details <ChevronDown className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </CardContent>
      </Card>

      {expanded && <ChildDetailView child={child} />}
    </div>
  );
};

export default ChildPerformanceCard;
