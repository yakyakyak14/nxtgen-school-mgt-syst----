import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Award, Heart, Users, Calendar, Target, 
  Gift, GraduationCap, MessageSquare,
  Building, Clock, Bell, Megaphone, Settings, Loader2
} from 'lucide-react';
import AlumniGroupChat from '@/components/alumni/AlumniGroupChat';
import DonationDialog from '@/components/donations/DonationDialog';
import { formatDistanceToNow } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AlumniPortal: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch alumni profile for current user
  const { data: alumniProfile } = useQuery({
    queryKey: ['alumni-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .eq('user_id', user?.id || '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Alumni profile settings state
  const [editGradYear, setEditGradYear] = useState('');
  const [editGradClass, setEditGradClass] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [editEmployer, setEditEmployer] = useState('');
  const [editBio, setEditBio] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { graduation_year?: number; graduation_class?: string; current_occupation?: string; current_employer?: string; bio?: string }) => {
      if (!alumniProfile) throw new Error('No alumni profile found');
      const { error } = await supabase
        .from('alumni')
        .update(data)
        .eq('id', alumniProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Profile updated', description: 'Your alumni profile has been updated.' });
      queryClient.invalidateQueries({ queryKey: ['alumni-profile'] });
    },
  });

  // Fetch alumni projects
  const { data: projects = [] } = useQuery({
    queryKey: ['alumni-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alumni_projects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent donations
  const { data: donations = [] } = useQuery({
    queryKey: ['alumni-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alumni_donations')
        .select('*')
        .eq('payment_status', 'completed')
        .order('donated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch school notices (published only)
  const { data: notices = [], isLoading: noticesLoading } = useQuery({
    queryKey: ['school-notices-alumni'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  // Fetch platform announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['platform-announcements-alumni'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch alumni members from DB
  const { data: alumniMembers = [] } = useQuery({
    queryKey: ['alumni-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alumni')
        .select('*, profiles:user_id(first_name, last_name, email, avatar_url)')
        .eq('is_verified', true)
        .order('graduation_year', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Floating Donate Button - top right */}
      <div className="fixed top-20 right-6 z-40">
        <DonationDialog
          trigger={
            <Button variant="default" size="lg" className="shadow-lg rounded-full gap-2">
              <Gift className="h-5 w-5" />
              Donate
            </Button>
          }
          context="alumni"
        />
      </div>

      <div className="page-header">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-purple-500 flex items-center justify-center">
            <Award className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="page-title">Alumni Portal</h1>
            <p className="page-subtitle">Stay connected and give back to your alma mater</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alumniMembers.length}</p>
              <p className="text-sm text-muted-foreground">Alumni Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{projects.length}</p>
              <p className="text-sm text-muted-foreground">Active Projects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notices.length}</p>
              <p className="text-sm text-muted-foreground">School Notices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notices" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="notices">School Notices</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="projects">Projects & Donate</TabsTrigger>
          <TabsTrigger value="group-chat">Group Chat</TabsTrigger>
          <TabsTrigger value="network">Alumni Network</TabsTrigger>
          <TabsTrigger value="settings">My Profile</TabsTrigger>
        </TabsList>

        {/* School Notices Tab */}
        <TabsContent value="notices" className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            School Notice Board
          </h2>
          {noticesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No school notices at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {notices.map((notice: any) => (
                <Card key={notice.id} className={notice.priority === 'high' ? 'border-destructive/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{notice.title}</CardTitle>
                      <Badge variant={notice.priority === 'high' ? 'destructive' : 'secondary'}>
                        {notice.priority === 'high' ? 'Important' : 'General'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {notice.created_at
                        ? formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })
                        : 'Unknown date'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{notice.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Platform Announcements
          </h2>
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No announcements at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {announcements.map((ann: any) => (
                <Card key={ann.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{ann.title}</CardTitle>
                      <Badge variant={ann.priority === 'critical' ? 'destructive' : 'outline'}>
                        {ann.announcement_type || 'info'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ann.created_at
                        ? formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })
                        : ''}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{ann.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects & Donate Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Active Fundraising Projects</h2>
            <DonationDialog
              trigger={
                <Button>
                  <Gift className="h-4 w-4 mr-2" />
                  Quick Donate
                </Button>
              }
              context="alumni"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active projects at the moment</p>
                  <p className="text-sm mt-1">Check back later for fundraising opportunities</p>
                </CardContent>
              </Card>
            ) : (
              projects.map((project: any) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary">{project.category || 'General'}</Badge>
                      <Badge className="bg-green-500">{project.status}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{project.title}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Raised</span>
                        <span className="font-medium">
                          {formatCurrency(project.current_amount || 0)} / {formatCurrency(project.target_amount)}
                        </span>
                      </div>
                      <Progress 
                        value={((project.current_amount || 0) / project.target_amount) * 100} 
                        className="h-2" 
                      />
                    </div>
                    <DonationDialog
                      trigger={<Button className="w-full"><Gift className="h-4 w-4 mr-2" />Donate to Project</Button>}
                      projectId={project.id}
                      context="alumni"
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Recent Donations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Thank you to our generous donors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {donations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No donations yet. Be the first to contribute!</p>
                ) : (
                  donations.map((donation: any) => (
                    <div key={donation.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Heart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{donation.donor_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(donation.donated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(donation.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group-chat" className="space-y-6">
          <AlumniGroupChat />
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alumni Network</CardTitle>
              <CardDescription>Connect with fellow alumni</CardDescription>
            </CardHeader>
            <CardContent>
              {alumniMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No verified alumni members yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {alumniMembers.map((alumni: any) => {
                    const p = alumni.profiles;
                    return (
                      <Card key={alumni.id}>
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {p?.first_name || ''} {p?.last_name || ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Class of {alumni.graduation_year}
                              {alumni.graduation_class ? ` • ${alumni.graduation_class}` : ''}
                            </p>
                            {alumni.current_occupation && (
                              <p className="text-xs text-muted-foreground truncate">
                                {alumni.current_occupation}
                                {alumni.current_employer ? ` at ${alumni.current_employer}` : ''}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alumni Profile Settings */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                My Alumni Profile
              </CardTitle>
              <CardDescription>Update your graduation details and profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Graduation Year</Label>
                  <Select
                    value={editGradYear || alumniProfile?.graduation_year?.toString() || ''}
                    onValueChange={setEditGradYear}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select graduation year" />
                    </SelectTrigger>
                    <SelectContent>
                      {graduationYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Graduation Class</Label>
                  <Input
                    placeholder="e.g., SS3A, Class of 2015"
                    value={editGradClass || alumniProfile?.graduation_class || ''}
                    onChange={(e) => setEditGradClass(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Occupation</Label>
                  <Input
                    placeholder="e.g., Software Engineer"
                    value={editOccupation || alumniProfile?.current_occupation || ''}
                    onChange={(e) => setEditOccupation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Employer</Label>
                  <Input
                    placeholder="e.g., Google"
                    value={editEmployer || alumniProfile?.current_employer || ''}
                    onChange={(e) => setEditEmployer(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  placeholder="Tell us about yourself..."
                  value={editBio || alumniProfile?.bio || ''}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={() => {
                  const updates: any = {};
                  if (editGradYear) updates.graduation_year = parseInt(editGradYear);
                  if (editGradClass) updates.graduation_class = editGradClass;
                  if (editOccupation) updates.current_occupation = editOccupation;
                  if (editEmployer) updates.current_employer = editEmployer;
                  if (editBio) updates.bio = editBio;
                  if (Object.keys(updates).length > 0) {
                    updateProfileMutation.mutate(updates);
                  }
                }}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                ) : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlumniPortal;
