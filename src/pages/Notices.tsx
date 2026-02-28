import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Plus, Pin, Calendar, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  status: string | null;
  created_at: string | null;
  published_at: string | null;
  created_by: string;
}

const Notices: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isPinned = (notice: Notice) => notice.priority === 'high';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notice Board</h1>
          <p className="page-subtitle">School announcements and notices</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Post Notice
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notices found</p>
              <p className="text-sm mt-1">Post a notice to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notices.map((notice) => (
            <Card key={notice.id} className={isPinned(notice) ? 'border-accent' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {isPinned(notice) && (
                      <Pin className="h-4 w-4 text-accent" />
                    )}
                    <CardTitle className="text-lg">{notice.title}</CardTitle>
                  </div>
                  <Badge variant={notice.priority === 'high' ? 'destructive' : 'secondary'}>
                    {notice.priority === 'high' ? 'Important' : 'General'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Status: {notice.status || 'Draft'}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {notice.created_at 
                      ? formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })
                      : 'Unknown date'
                    }
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{notice.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notices;
