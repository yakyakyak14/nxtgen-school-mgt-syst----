import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NewsSection: React.FC = () => {
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['public-notices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, content, priority, published_at, target_audience')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'normal': return 'bg-primary text-primary-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Newspaper className="h-4 w-4" />
              <span className="text-sm font-medium">Latest Updates</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              News & Announcements
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (notices.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Newspaper className="h-4 w-4" />
            <span className="text-sm font-medium">Latest Updates</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            News & Announcements
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay informed with the latest news, events, and important announcements from our school.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {notices.map((notice, index) => (
            <Card 
              key={notice.id} 
              className={`group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up stagger-${index + 1} overflow-hidden`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={getPriorityColor(notice.priority || 'normal')}>
                    {notice.priority === 'high' ? 'Important' : notice.priority}
                  </Badge>
                  {notice.published_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(notice.published_at), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {notice.title}
                </h3>
                
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                  {notice.content}
                </p>
                
                {notice.target_audience && notice.target_audience.length > 0 && !notice.target_audience.includes('all') && (
                  <div className="flex flex-wrap gap-1">
                    {notice.target_audience.slice(0, 3).map((audience) => (
                      <Badge key={audience} variant="outline" className="text-xs">
                        {audience}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {notices.length >= 6 && (
          <div className="text-center mt-10">
            <Button variant="outline" asChild className="group">
              <Link to="/auth" className="flex items-center gap-2">
                View All Announcements
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsSection;
