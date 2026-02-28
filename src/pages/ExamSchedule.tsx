import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { 
  CalendarClock, Plus, AlertTriangle, Check, Clock, 
  Calendar, Users, BookOpen, Wand2, Download, Trash2
} from 'lucide-react';
import { format, parseISO, addDays, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExamSchedule {
  id: string;
  session: string;
  term: string;
  exam_name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface ExamEntry {
  id: string;
  exam_schedule_id: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  venue: string | null;
  invigilator_id: string | null;
  classes?: { name: string };
  subjects?: { name: string };
  staff?: { profiles?: { first_name: string; last_name: string } };
}

interface Conflict {
  type: 'teacher' | 'venue';
  message: string;
  entries: ExamEntry[];
}

const ExamSchedule: React.FC = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useSchoolSettings();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  
  // Form states
  const [examName, setExamName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Entry form
  const [entryClassId, setEntryClassId] = useState('');
  const [entrySubjectId, setEntrySubjectId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [entryStartTime, setEntryStartTime] = useState('09:00');
  const [entryEndTime, setEntryEndTime] = useState('11:00');
  const [entryVenue, setEntryVenue] = useState('');
  const [entryInvigilatorId, setEntryInvigilatorId] = useState('');

  const isAdmin = ['director', 'principal', 'headmaster'].includes(role || '');

  // Fetch exam schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ['exam-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ExamSchedule[];
    }
  });

  // Fetch exam entries for selected schedule
  const { data: entries = [] } = useQuery<any[]>({
    queryKey: ['exam-entries', selectedSchedule?.id],
    queryFn: async () => {
      if (!selectedSchedule) return [];
      const { data, error } = await supabase
        .from('exam_timetable')
        .select(`
          *,
          classes(name),
          subjects(name)
        `)
        .eq('exam_schedule_id', selectedSchedule.id)
        .order('exam_date')
        .order('start_time');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSchedule
  });

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch teachers for invigilators
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, staff_id, profiles:user_id(first_name, last_name)')
        .eq('category', 'academic')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('exam_schedules')
        .insert({
          session: settings?.current_session || '2024/2025',
          term: settings?.current_term || 'first',
          exam_name: examName,
          start_date: startDate,
          end_date: endDate,
          status: 'draft',
          created_by: user?.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Exam schedule created' });
      setShowCreateDialog(false);
      setExamName('');
      setStartDate('');
      setEndDate('');
      queryClient.invalidateQueries({ queryKey: ['exam-schedules'] });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to create schedule' });
    }
  });

  // Add entry mutation
  const addEntryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchedule) return;
      const { error } = await supabase
        .from('exam_timetable')
        .insert({
          exam_schedule_id: selectedSchedule.id,
          class_id: entryClassId,
          subject_id: entrySubjectId,
          exam_date: entryDate,
          start_time: entryStartTime,
          end_time: entryEndTime,
          venue: entryVenue || null,
          invigilator_id: entryInvigilatorId || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Exam entry added' });
      setShowEntryDialog(false);
      resetEntryForm();
      queryClient.invalidateQueries({ queryKey: ['exam-entries', selectedSchedule?.id] });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to add entry' });
    }
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('exam_timetable')
        .delete()
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Entry deleted' });
      queryClient.invalidateQueries({ queryKey: ['exam-entries', selectedSchedule?.id] });
    }
  });

  const resetEntryForm = () => {
    setEntryClassId('');
    setEntrySubjectId('');
    setEntryDate('');
    setEntryStartTime('09:00');
    setEntryEndTime('11:00');
    setEntryVenue('');
    setEntryInvigilatorId('');
  };

  // Conflict detection
  const detectConflicts = () => {
    const newConflicts: Conflict[] = [];
    
    // Check teacher conflicts (same teacher, same time slot, same date)
    const teacherMap = new Map<string, ExamEntry[]>();
    entries.forEach(entry => {
      if (entry.invigilator_id) {
        const key = `${entry.invigilator_id}-${entry.exam_date}-${entry.start_time}`;
        if (!teacherMap.has(key)) {
          teacherMap.set(key, []);
        }
        teacherMap.get(key)!.push(entry);
      }
    });
    
    teacherMap.forEach((entryList, key) => {
      if (entryList.length > 1) {
        const teacher = entryList[0].staff?.profiles;
        newConflicts.push({
          type: 'teacher',
          message: `${teacher?.first_name} ${teacher?.last_name} is assigned to multiple exams at the same time`,
          entries: entryList
        });
      }
    });

    // Check venue conflicts (same venue, same time, same date)
    const venueMap = new Map<string, ExamEntry[]>();
    entries.forEach(entry => {
      if (entry.venue) {
        const key = `${entry.venue}-${entry.exam_date}-${entry.start_time}`;
        if (!venueMap.has(key)) {
          venueMap.set(key, []);
        }
        venueMap.get(key)!.push(entry);
      }
    });

    venueMap.forEach((entryList, key) => {
      if (entryList.length > 1) {
        newConflicts.push({
          type: 'venue',
          message: `Venue "${entryList[0].venue}" is double-booked`,
          entries: entryList
        });
      }
    });

    setConflicts(newConflicts);
    
    if (newConflicts.length === 0) {
      toast({ title: 'No conflicts detected', description: 'The timetable is ready to publish.' });
    } else {
      toast({ 
        variant: 'destructive', 
        title: `${newConflicts.length} conflict(s) found`,
        description: 'Please resolve conflicts before publishing.'
      });
    }
  };

  // Auto-generate timetable
  const autoGenerateTimetable = async () => {
    if (!selectedSchedule || classes.length === 0 || subjects.length === 0) return;

    const start = parseISO(selectedSchedule.start_date);
    const end = parseISO(selectedSchedule.end_date);
    const timeSlots = ['09:00', '11:30', '14:00'];
    const endTimes = ['11:00', '13:30', '16:00'];
    const venues = ['Hall A', 'Hall B', 'Classroom Block'];
    
    const newEntries: any[] = [];
    let currentDate = start;
    let slotIndex = 0;
    let venueIndex = 0;

    // Get class-subject combinations
    const { data: classSubjects } = await supabase
      .from('class_subjects')
      .select('class_id, subject_id');

    if (!classSubjects || classSubjects.length === 0) {
      // If no class subjects defined, create combinations
      for (const cls of classes) {
        for (const subject of subjects.slice(0, 5)) { // Limit to 5 subjects per class
          if (currentDate > end) break;
          
          newEntries.push({
            exam_schedule_id: selectedSchedule.id,
            class_id: cls.id,
            subject_id: subject.id,
            exam_date: format(currentDate, 'yyyy-MM-dd'),
            start_time: timeSlots[slotIndex],
            end_time: endTimes[slotIndex],
            venue: venues[venueIndex % venues.length]
          });

          slotIndex++;
          if (slotIndex >= timeSlots.length) {
            slotIndex = 0;
            currentDate = addDays(currentDate, 1);
            // Skip weekends
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
              currentDate = addDays(currentDate, 1);
            }
          }
          venueIndex++;
        }
      }
    } else {
      // Use defined class subjects
      for (const cs of classSubjects) {
        if (currentDate > end) break;
        
        newEntries.push({
          exam_schedule_id: selectedSchedule.id,
          class_id: cs.class_id,
          subject_id: cs.subject_id,
          exam_date: format(currentDate, 'yyyy-MM-dd'),
          start_time: timeSlots[slotIndex],
          end_time: endTimes[slotIndex],
          venue: venues[venueIndex % venues.length]
        });

        slotIndex++;
        if (slotIndex >= timeSlots.length) {
          slotIndex = 0;
          currentDate = addDays(currentDate, 1);
          while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate = addDays(currentDate, 1);
          }
        }
        venueIndex++;
      }
    }

    if (newEntries.length > 0) {
      const { error } = await supabase.from('exam_timetable').insert(newEntries);
      if (error) {
        toast({ variant: 'destructive', title: 'Failed to generate timetable' });
      } else {
        toast({ title: 'Timetable generated', description: `${newEntries.length} exam entries created` });
        queryClient.invalidateQueries({ queryKey: ['exam-entries', selectedSchedule.id] });
      }
    }
  };

  // Generate PDF
  const generatePDF = () => {
    if (!selectedSchedule || entries.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.text(settings?.school_name || 'School Name', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${selectedSchedule.exam_name} Timetable`, pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${selectedSchedule.term.charAt(0).toUpperCase() + selectedSchedule.term.slice(1)} Term | ${selectedSchedule.session}`, pageWidth / 2, 38, { align: 'center' });

    // Group entries by date
    const groupedByDate: Record<string, any[]> = entries.reduce((acc: Record<string, any[]>, entry: any) => {
      const date = entry.exam_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    }, {});

    let yPos = 50;

    Object.entries(groupedByDate).forEach(([date, dayEntries]) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(format(parseISO(date), 'EEEE, MMMM d, yyyy'), 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Time', 'Class', 'Subject', 'Venue', 'Invigilator']],
        body: dayEntries.map(entry => [
          `${entry.start_time} - ${entry.end_time}`,
          entry.classes?.name || 'N/A',
          entry.subjects?.name || 'N/A',
          entry.venue || 'TBA',
          entry.staff?.profiles 
            ? `${entry.staff.profiles.first_name} ${entry.staff.profiles.last_name}`
            : 'TBA'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`${selectedSchedule.exam_name.replace(/\s+/g, '-').toLowerCase()}-timetable.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'draft': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center">
            <CalendarClock className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="page-title">Exam Scheduling</h1>
            <p className="page-subtitle">Create and manage examination timetables</p>
          </div>
        </div>
        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Exam Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Exam Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Exam Name</Label>
                  <Input
                    placeholder="e.g., First Term Examination 2024"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button 
                  onClick={() => createScheduleMutation.mutate()}
                  disabled={!examName || !startDate || !endDate}
                >
                  Create Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedules List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Exam Schedules</CardTitle>
            <CardDescription>Select a schedule to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {schedules.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No schedules created</p>
            ) : (
              schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  onClick={() => setSelectedSchedule(schedule)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedSchedule?.id === schedule.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{schedule.exam_name}</span>
                    <Badge className={getStatusColor(schedule.status)}>{schedule.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(schedule.start_date), 'MMM d')} - {format(parseISO(schedule.end_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {schedule.term.charAt(0).toUpperCase() + schedule.term.slice(1)} Term • {schedule.session}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Timetable Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedSchedule ? selectedSchedule.exam_name : 'Select a Schedule'}
                </CardTitle>
                {selectedSchedule && (
                  <CardDescription>
                    {entries.length} exam entries • {format(parseISO(selectedSchedule.start_date), 'MMM d')} - {format(parseISO(selectedSchedule.end_date), 'MMM d')}
                  </CardDescription>
                )}
              </div>
              {selectedSchedule && isAdmin && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={autoGenerateTimetable}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Auto-Generate
                  </Button>
                  <Button variant="outline" size="sm" onClick={detectConflicts}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Check Conflicts
                  </Button>
                  <Button variant="outline" size="sm" onClick={generatePDF}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Exam Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Class</Label>
                            <Select value={entryClassId} onValueChange={setEntryClassId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.map((cls: any) => (
                                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select value={entrySubjectId} onValueChange={setEntrySubjectId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((sub: any) => (
                                  <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Exam Date</Label>
                          <Input
                            type="date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            min={selectedSchedule?.start_date}
                            max={selectedSchedule?.end_date}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={entryStartTime}
                              onChange={(e) => setEntryStartTime(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={entryEndTime}
                              onChange={(e) => setEntryEndTime(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Venue</Label>
                          <Input
                            placeholder="e.g., Hall A, Classroom 101"
                            value={entryVenue}
                            onChange={(e) => setEntryVenue(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Invigilator</Label>
                          <Select value={entryInvigilatorId} onValueChange={setEntryInvigilatorId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select invigilator" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map((t: any) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.profiles?.first_name} {t.profiles?.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEntryDialog(false)}>Cancel</Button>
                        <Button 
                          onClick={() => addEntryMutation.mutate()}
                          disabled={!entryClassId || !entrySubjectId || !entryDate}
                        >
                          Add Entry
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Conflict Alerts */}
            {conflicts.length > 0 && (
              <div className="space-y-2 mb-4">
                {conflicts.map((conflict, idx) => (
                  <Alert key={idx} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{conflict.type === 'teacher' ? 'Teacher Conflict' : 'Venue Conflict'}</AlertTitle>
                    <AlertDescription>{conflict.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {!selectedSchedule ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarClock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select an exam schedule to view and manage entries</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No exam entries yet</p>
                <p className="text-sm">Add entries manually or use auto-generate</p>
              </div>
            ) : (
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Invigilator</TableHead>
                      {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(parseISO(entry.exam_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {entry.start_time} - {entry.end_time}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.classes?.name || 'N/A'}</TableCell>
                        <TableCell>{entry.subjects?.name || 'N/A'}</TableCell>
                        <TableCell>{entry.venue || 'TBA'}</TableCell>
                        <TableCell>
                          {entry.staff?.profiles 
                            ? `${entry.staff.profiles.first_name} ${entry.staff.profiles.last_name}`
                            : 'TBA'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteEntryMutation.mutate(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExamSchedule;