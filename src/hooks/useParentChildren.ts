import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LinkedChild {
  id: string;
  admission_number: string;
  is_active: boolean;
  class_id: string | null;
  class_name: string | null;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface ChildGrade {
  id: string;
  subject_name: string;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade_letter: string | null;
  remarks: string | null;
  term: string;
  session: string;
}

export interface ChildAttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}

export interface ChildFeeObligation {
  id: string;
  fee_name: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  term: string;
  session: string;
}

export interface ChildWeeklyReport {
  id: string;
  week_number: number;
  behavior_rating: string | null;
  academic_rating: string | null;
  report_content: string | null;
  teacher_comments: string | null;
  attendance_summary: string | null;
  submitted_at: string | null;
  status: string;
}

export interface ChildClub {
  id: string;
  club_name: string;
  role: string | null;
}

export function useParentChildren(userId: string | undefined) {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChildren = async () => {
    if (!userId) return;
    try {
      const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!guardian) {
        setChildren([]);
        setIsLoading(false);
        return;
      }

      const { data: links } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', guardian.id);

      if (!links || links.length === 0) {
        setChildren([]);
        setIsLoading(false);
        return;
      }

      const studentIds = links.map(l => l.student_id);
      const { data: students } = await supabase
        .from('students')
        .select('id, admission_number, is_active, class_id, user_id, classes(name)')
        .in('id', studentIds);

      if (students) {
        const userIds = students.filter(s => s.user_id).map(s => s.user_id!);
        const { data: profiles } = userIds.length > 0
          ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
          : { data: [] };

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        setChildren(students.map(s => ({
          id: s.id,
          admission_number: s.admission_number,
          is_active: s.is_active ?? true,
          class_id: s.class_id,
          class_name: (s.classes as any)?.name || null,
          user_id: s.user_id,
          first_name: s.user_id ? profileMap.get(s.user_id)?.first_name || null : null,
          last_name: s.user_id ? profileMap.get(s.user_id)?.last_name || null : null,
        })));
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [userId]);

  return { children, isLoading, refetch: fetchChildren };
}

export async function fetchChildGrades(studentId: string): Promise<ChildGrade[]> {
  const { data, error } = await supabase
    .from('grades')
    .select('id, ca_score, exam_score, total_score, grade_letter, remarks, term, session, subjects(name)')
    .eq('student_id', studentId)
    .order('session', { ascending: false })
    .order('term', { ascending: false });

  if (error) {
    console.error('Error fetching grades:', error);
    return [];
  }

  return (data || []).map(g => ({
    id: g.id,
    subject_name: (g.subjects as any)?.name || 'Unknown',
    ca_score: g.ca_score,
    exam_score: g.exam_score,
    total_score: g.total_score,
    grade_letter: g.grade_letter,
    remarks: g.remarks,
    term: g.term,
    session: g.session,
  }));
}

export async function fetchChildAttendance(studentId: string): Promise<ChildAttendanceSummary> {
  const { data, error } = await supabase
    .from('attendance')
    .select('is_present')
    .eq('student_id', studentId);

  if (error || !data) {
    return { totalDays: 0, presentDays: 0, absentDays: 0, attendanceRate: 0 };
  }

  const totalDays = data.length;
  const presentDays = data.filter(a => a.is_present).length;
  const absentDays = totalDays - presentDays;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return { totalDays, presentDays, absentDays, attendanceRate };
}

export async function fetchChildFees(studentId: string): Promise<ChildFeeObligation[]> {
  const { data, error } = await supabase
    .from('student_fee_obligations')
    .select('id, total_amount, amount_paid, balance, status, term, session, fee_types(name)')
    .eq('student_id', studentId)
    .order('session', { ascending: false });

  if (error) {
    console.error('Error fetching fees:', error);
    return [];
  }

  return (data || []).map(f => ({
    id: f.id,
    fee_name: (f.fee_types as any)?.name || 'Fee',
    total_amount: Number(f.total_amount),
    amount_paid: Number(f.amount_paid),
    balance: f.balance != null ? Number(f.balance) : Number(f.total_amount) - Number(f.amount_paid),
    status: f.status,
    term: f.term,
    session: f.session,
  }));
}

export async function fetchChildWeeklyReports(studentId: string): Promise<ChildWeeklyReport[]> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('id, week_number, behavior_rating, academic_rating, report_content, teacher_comments, attendance_summary, submitted_at, status')
    .eq('student_id', studentId)
    .order('week_number', { ascending: false });

  if (error) {
    console.error('Error fetching weekly reports:', error);
    return [];
  }

  return data || [];
}

export async function fetchChildClubs(studentId: string): Promise<ChildClub[]> {
  const { data, error } = await supabase
    .from('club_memberships')
    .select('id, role, clubs(name)')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error fetching clubs:', error);
    return [];
  }

  return (data || []).map(c => ({
    id: c.id,
    club_name: (c.clubs as any)?.name || 'Unknown',
    role: c.role,
  }));
}

export async function fetchChildSubjectCount(studentId: string, classId: string | null): Promise<number> {
  if (!classId) return 0;
  const { count, error } = await supabase
    .from('class_subjects')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId);

  if (error) return 0;
  return count || 0;
}
