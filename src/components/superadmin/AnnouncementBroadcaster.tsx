import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Megaphone, Plus, Edit, Trash2, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, isPast } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  target_schools: string[] | null;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: 'Information', color: 'bg-blue-500' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-500' },
  { value: 'success', label: 'Success', color: 'bg-emerald-500' },
  { value: 'error', label: 'Critical', color: 'bg-red-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-purple-500' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const AnnouncementBroadcaster: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: schools } = useSchools();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [announcementType, setAnnouncementType] = useState('info');
  const [priority, setPriority] = useState('normal');
  const [targetAllSchools, setTargetAllSchools] = useState(true);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['platform-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Announcement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('platform_announcements')
        .insert({
          title,
          content,
          announcement_type: announcementType,
          priority,
          target_schools: targetAllSchools ? null : selectedSchools,
          starts_at: startsAt || null,
          expires_at: expiresAt || null,
          created_by: user?.id,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: 'Announcement created',
        description: 'Your announcement has been published.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create announcement.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingAnnouncement) return;
      const { error } = await supabase
        .from('platform_announcements')
        .update({
          title,
          content,
          announcement_type: announcementType,
          priority,
          target_schools: targetAllSchools ? null : selectedSchools,
          starts_at: startsAt || null,
          expires_at: expiresAt || null,
        })
        .eq('id', editingAnnouncement.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      resetForm();
      setEditingAnnouncement(null);
      setIsDialogOpen(false);
      toast({
        title: 'Announcement updated',
        description: 'Your changes have been saved.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update announcement.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      toast({
        title: 'Announcement deleted',
        description: 'The announcement has been removed.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete announcement.',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('platform_announcements')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to toggle announcement.',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setAnnouncementType('info');
    setPriority('normal');
    setTargetAllSchools(true);
    setSelectedSchools([]);
    setStartsAt('');
    setExpiresAt('');
  };

  const openEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setAnnouncementType(announcement.announcement_type);
    setPriority(announcement.priority);
    setTargetAllSchools(!announcement.target_schools);
    setSelectedSchools(announcement.target_schools || []);
    setStartsAt(announcement.starts_at ? announcement.starts_at.slice(0, 16) : '');
    setExpiresAt(announcement.expires_at ? announcement.expires_at.slice(0, 16) : '');
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingAnnouncement) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const getTypeColor = (type: string) => {
    return ANNOUNCEMENT_TYPES.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const getStatusBadge = (announcement: Announcement) => {
    if (!announcement.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (announcement.expires_at && isPast(new Date(announcement.expires_at))) {
      return <Badge variant="outline">Expired</Badge>;
    }
    if (announcement.starts_at && new Date(announcement.starts_at) > new Date()) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    return <Badge className="bg-emerald-500">Live</Badge>;
  };

  const getTargetLabel = (announcement: Announcement) => {
    if (!announcement.target_schools) return 'All Schools';
    return `${announcement.target_schools.length} school(s)`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Announcement Broadcasting
          </CardTitle>
          <CardDescription>
            Send platform-wide announcements to all or selected schools
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingAnnouncement(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </DialogTitle>
              <DialogDescription>
                {editingAnnouncement ? 'Update the announcement details' : 'Broadcast a message to schools on the platform'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                />
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement message..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={announcementType} onValueChange={setAnnouncementType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Starts At (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires At (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allSchools"
                    checked={targetAllSchools}
                    onCheckedChange={(checked) => setTargetAllSchools(checked as boolean)}
                  />
                  <Label htmlFor="allSchools">Broadcast to all schools</Label>
                </div>
                {!targetAllSchools && (
                  <ScrollArea className="h-[150px] border rounded-md p-4">
                    <div className="space-y-2">
                      {schools?.map((school) => (
                        <div key={school.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={school.id}
                            checked={selectedSchools.includes(school.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSchools([...selectedSchools, school.id]);
                              } else {
                                setSelectedSchools(selectedSchools.filter(id => id !== school.id));
                              }
                            }}
                          />
                          <Label htmlFor={school.id} className="font-normal">
                            {school.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title || !content || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Send className="h-4 w-4 mr-2" />
                {editingAnnouncement ? 'Update' : 'Publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !announcements?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No announcements yet</p>
            <p className="text-sm">Create your first platform announcement</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Announcement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {announcement.content}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getTypeColor(announcement.announcement_type)}`} />
                        <span className="capitalize text-sm">{announcement.announcement_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {getTargetLabel(announcement)}
                    </TableCell>
                    <TableCell>{getStatusBadge(announcement)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: announcement.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(announcement.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
