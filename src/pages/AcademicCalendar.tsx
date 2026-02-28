import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { Calendar, Plus, Edit, Trash2, CalendarDays, GraduationCap, PartyPopper, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  session: string;
  term: string | null;
  description: string | null;
  is_school_closed: boolean;
  color: string;
}

const eventTypes = [
  { value: 'term_start', label: 'Term Start', icon: GraduationCap, color: '#22c55e' },
  { value: 'term_end', label: 'Term End', icon: GraduationCap, color: '#ef4444' },
  { value: 'holiday', label: 'Holiday', icon: PartyPopper, color: '#f59e0b' },
  { value: 'exam', label: 'Examination', icon: BookOpen, color: '#8b5cf6' },
  { value: 'event', label: 'School Event', icon: CalendarDays, color: '#3b82f6' },
];

const AcademicCalendar: React.FC = () => {
  const { role } = useAuth();
  const { data: settings, refetch: refetchSettings } = useSchoolSettings();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'event',
    start_date: '',
    end_date: '',
    session: '',
    term: '',
    description: '',
    is_school_closed: false,
    color: '#3b82f6',
  });

  const canManage = role === 'director' || role === 'principal' || role === 'headmaster';

  useEffect(() => {
    if (settings?.current_session) {
      setSelectedSession(settings.current_session);
      setFormData(prev => ({ ...prev, session: settings.current_session }));
    }
  }, [settings]);

  useEffect(() => {
    if (selectedSession) {
      fetchEvents();
    }
  }, [selectedSession]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_calendar')
        .select('*')
        .eq('session', selectedSession)
        .order('start_date');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const eventData = {
        title: formData.title,
        event_type: formData.event_type,
        start_date: formData.start_date,
        session: formData.session,
        description: formData.description || null,
        is_school_closed: formData.is_school_closed,
        color: formData.color,
        end_date: formData.end_date || null,
        term: formData.term ? (formData.term as 'first' | 'second' | 'third') : null,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('academic_calendar')
          .update(eventData)
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast.success('Event updated successfully');
      } else {
        const { error } = await supabase
          .from('academic_calendar')
          .insert([eventData]);
        if (error) throw error;
        toast.success('Event created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date || '',
      session: event.session,
      term: event.term || '',
      description: event.description || '',
      is_school_closed: event.is_school_closed,
      color: event.color,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('academic_calendar')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setFormData({
      title: '',
      event_type: 'event',
      start_date: '',
      end_date: '',
      session: selectedSession,
      term: '',
      description: '',
      is_school_closed: false,
      color: '#3b82f6',
    });
  };

  const updateSessionTerm = async () => {
    if (!settings) return;
    
    const today = new Date();
    const termStartEvents = events.filter(e => e.event_type === 'term_start');
    
    for (const event of termStartEvents) {
      const startDate = parseISO(event.start_date);
      const endEvent = events.find(e => 
        e.event_type === 'term_end' && 
        e.term === event.term && 
        e.session === event.session
      );
      
      if (endEvent) {
        const endDate = parseISO(endEvent.start_date);
        if (isWithinInterval(today, { start: startDate, end: endDate })) {
          if (settings.current_term !== event.term || settings.current_session !== event.session) {
            const { error } = await supabase
              .from('school_settings')
              .update({ 
                current_term: event.term as 'first' | 'second' | 'third',
                current_session: event.session
              })
              .eq('id', settings.id);
            
            if (!error) {
              toast.success(`Session updated to ${event.session} - ${event.term} Term`);
              refetchSettings();
            }
          }
          return;
        }
      }
    }
  };

  const getEventTypeInfo = (type: string) => {
    return eventTypes.find(t => t.value === type) || eventTypes[4];
  };

  const groupedEvents = events.reduce((acc, event) => {
    const month = format(parseISO(event.start_date), 'MMMM yyyy');
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const sessions = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic Calendar</h1>
          <p className="page-subtitle">Manage term dates, holidays, and school events</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && (
            <>
              <Button variant="outline" onClick={updateSessionTerm}>
                <CalendarDays className="h-4 w-4 mr-2" />
                Sync Current Term
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Calendar Event'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Event title"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Event Type</Label>
                        <Select 
                          value={formData.event_type} 
                          onValueChange={(v) => setFormData({ ...formData, event_type: v, color: getEventTypeInfo(v).color })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Term</Label>
                        <Select value={formData.term} onValueChange={(v) => setFormData({ ...formData, term: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first">First Term</SelectItem>
                            <SelectItem value="second">Second Term</SelectItem>
                            <SelectItem value="third">Third Term</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date (Optional)</Label>
                        <Input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Session</Label>
                      <Select value={formData.session} onValueChange={(v) => setFormData({ ...formData, session: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Event description..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_school_closed}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_school_closed: checked })}
                        />
                        <Label>School Closed</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Color</Label>
                        <Input
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-12 h-8 p-1"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Current Term Info */}
      {settings && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Academic Period</p>
                  <p className="text-xl font-bold">
                    {settings.current_session} - {settings.current_term?.charAt(0).toUpperCase()}{settings.current_term?.slice(1)} Term
                  </p>
                </div>
              </div>
              <Badge variant="default" className="text-lg px-4 py-2">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Events */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading calendar...</p>
        </div>
      ) : Object.keys(groupedEvents).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No events found for {selectedSession}</p>
            {canManage && <p className="text-sm mt-2">Click "Add Event" to create your first calendar event.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([month, monthEvents]) => (
            <Card key={month}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {month}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthEvents.map((event) => {
                    const typeInfo = getEventTypeInfo(event.event_type);
                    const Icon = typeInfo.icon;
                    
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                        style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="p-2 rounded-lg" 
                            style={{ backgroundColor: `${event.color}20` }}
                          >
                            <Icon className="h-5 w-5" style={{ color: event.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{event.title}</p>
                              {event.is_school_closed && (
                                <Badge variant="destructive" className="text-xs">School Closed</Badge>
                              )}
                              {event.term && (
                                <Badge variant="outline" className="text-xs capitalize">{event.term} Term</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(event.start_date), 'EEEE, MMMM d, yyyy')}
                              {event.end_date && ` - ${format(parseISO(event.end_date), 'MMMM d, yyyy')}`}
                            </p>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AcademicCalendar;
