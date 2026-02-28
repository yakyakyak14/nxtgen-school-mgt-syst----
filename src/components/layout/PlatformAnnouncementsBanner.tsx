import React from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  created_at: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'error':
      return <AlertCircle className="h-5 w-5" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />;
    case 'success':
      return <CheckCircle className="h-5 w-5" />;
    case 'maintenance':
      return <Wrench className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getStyles = (type: string, priority: string) => {
  const baseStyles = 'border-l-4 p-4 mb-4 rounded-r-lg';
  
  switch (type) {
    case 'error':
      return `${baseStyles} bg-red-50 border-red-500 text-red-800 dark:bg-red-950 dark:text-red-200`;
    case 'warning':
      return `${baseStyles} bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950 dark:text-amber-200`;
    case 'success':
      return `${baseStyles} bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200`;
    case 'maintenance':
      return `${baseStyles} bg-purple-50 border-purple-500 text-purple-800 dark:bg-purple-950 dark:text-purple-200`;
    default:
      return `${baseStyles} bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950 dark:text-blue-200`;
  }
};

export const PlatformAnnouncementsBanner: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements } = useQuery({
    queryKey: ['active-announcements', user?.id],
    queryFn: async () => {
      // Get all active announcements
      const { data: allAnnouncements, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get dismissed announcements for this user
      const { data: dismissals } = await supabase
        .from('announcement_dismissals')
        .select('announcement_id')
        .eq('user_id', user?.id || '');

      const dismissedIds = new Set(dismissals?.map(d => d.announcement_id) || []);
      
      // Filter out dismissed announcements
      return (allAnnouncements as Announcement[])?.filter(a => !dismissedIds.has(a.id)) || [];
    },
    enabled: !!user,
  });

  const dismissMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from('announcement_dismissals')
        .insert({
          announcement_id: announcementId,
          user_id: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-announcements'] });
    },
  });

  if (!announcements?.length) return null;

  return (
    <div className="space-y-2 mb-4">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={getStyles(announcement.announcement_type, announcement.priority)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {getIcon(announcement.announcement_type)}
              <div>
                <p className="font-semibold">{announcement.title}</p>
                <p className="text-sm mt-1 opacity-90">{announcement.content}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 hover:bg-black/10"
              onClick={() => dismissMutation.mutate(announcement.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
