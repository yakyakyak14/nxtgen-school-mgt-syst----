import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Globe, Plus, Settings, School, Loader2, Edit, Users, Activity, ToggleLeft, Megaphone, TicketIcon, HeartPulse, Gauge, BarChart3, CreditCard, Download, Palette, Send, GraduationCap, UserCog, Wallet, ShieldCheck } from 'lucide-react';
import { useSchools, useCreateSchool, useUpdateSchool, generateSlug, School as SchoolType } from '@/hooks/useSchools';
import { usePlatformSettings, useUpdatePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { SchoolUsersManagement } from '@/components/superadmin/SchoolUsersManagement';
import { PlatformAnalytics } from '@/components/superadmin/PlatformAnalytics';
import { AuditLogsViewer } from '@/components/superadmin/AuditLogsViewer';
import { FeatureFlagsManager } from '@/components/superadmin/FeatureFlagsManager';
import { AnnouncementBroadcaster } from '@/components/superadmin/AnnouncementBroadcaster';
import { SupportTicketsManager } from '@/components/superadmin/SupportTicketsManager';
import { SchoolHealthDashboard } from '@/components/superadmin/SchoolHealthDashboard';
import { UsageQuotasManager } from '@/components/superadmin/UsageQuotasManager';
import { ComparativeAnalytics } from '@/components/superadmin/ComparativeAnalytics';
import { SubscriptionPlansManager } from '@/components/superadmin/SubscriptionPlansManager';
import { SchoolSubscriptionsManager } from '@/components/superadmin/SchoolSubscriptionsManager';
import { DataBackupExport } from '@/components/superadmin/DataBackupExport';
import { WhiteLabelSettings } from '@/components/superadmin/WhiteLabelSettings';
import { DirectorOnboardingInvite } from '@/components/superadmin/DirectorOnboardingInvite';
import { StatCard } from '@/components/dashboard/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent, AuditActions, EntityTypes } from '@/utils/auditLog';
import { useQuery } from '@tanstack/react-query';

const SuperAdmin: React.FC = () => {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: schools, isLoading: schoolsLoading } = useSchools();
  const { data: platformSettings, isLoading: platformLoading } = usePlatformSettings();
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const updatePlatformSettings = useUpdatePlatformSettings();

  // Platform overview stats
  const { data: platformStats } = useQuery({
    queryKey: ['platform-overview-stats'],
    queryFn: async () => {
      const [schoolsRes, usersRes, rolesRes, invitationsRes] = await Promise.all([
        supabase.from('schools').select('id, is_active', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('role'),
        supabase.from('invitations').select('id, status').eq('role', 'director'),
      ]);
      
      const activeSchools = schoolsRes.data?.filter(s => s.is_active).length || 0;
      const totalSchools = schoolsRes.count || 0;
      const totalUsers = usersRes.count || 0;
      const directors = rolesRes.data?.filter(r => r.role === 'director').length || 0;
      const pendingInvites = invitationsRes.data?.filter(i => i.status === 'pending').length || 0;
      
      return { totalSchools, activeSchools, totalUsers, directors, pendingInvites };
    },
  });

  // Platform settings state
  const [platformName, setPlatformName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');

  // New school dialog state
  const [isNewSchoolOpen, setIsNewSchoolOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolSubdomain, setNewSchoolSubdomain] = useState('');
  const [newSchoolDomain, setNewSchoolDomain] = useState('');

  // Edit school dialog state
  const [editingSchool, setEditingSchool] = useState<SchoolType | null>(null);

  // Initialize platform settings
  useEffect(() => {
    if (platformSettings) {
      setPlatformName(platformSettings.platform_name || '');
      setSupportEmail(platformSettings.support_email || '');
      setSupportPhone(platformSettings.support_phone || '');
    }
  }, [platformSettings]);

  // Redirect if not super_admin
  if (role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSavePlatformSettings = async () => {
    try {
      await updatePlatformSettings.mutateAsync({
        platform_name: platformName,
        support_email: supportEmail,
        support_phone: supportPhone,
      });
      toast({
        title: 'Settings saved',
        description: 'Platform settings have been updated.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save platform settings.',
      });
    }
  };

  const handleCreateSchool = async () => {
    if (!newSchoolName) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'School name is required.',
      });
      return;
    }

    try {
      await createSchool.mutateAsync({
        name: newSchoolName,
        slug: generateSlug(newSchoolName),
        email: newSchoolEmail || null,
        phone: newSchoolPhone || null,
        subdomain: newSchoolSubdomain || null,
        domain: newSchoolDomain || null,
        logo_url: null,
        primary_color: platformSettings?.default_primary_color || '#1e3a5f',
        secondary_color: platformSettings?.default_secondary_color || '#2d5a3d',
        accent_color: platformSettings?.default_accent_color || '#d4a84b',
        motto: null,
        address: null,
        google_maps_embed_url: null,
        latitude: null,
        longitude: null,
        current_session: '2024/2025',
        current_term: 'first',
      });
      toast({
        title: 'School created',
        description: `${newSchoolName} has been added to the platform.`,
      });
      setIsNewSchoolOpen(false);
      setNewSchoolName('');
      setNewSchoolEmail('');
      setNewSchoolPhone('');
      setNewSchoolSubdomain('');
      setNewSchoolDomain('');
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create school.',
      });
    }
  };

  const handleToggleSchoolStatus = async (school: SchoolType) => {
    const newStatus = !school.is_active;
    try {
      await updateSchool.mutateAsync({
        id: school.id,
        is_active: newStatus,
      });
      
      // Send notification email to directors
      try {
        const { data: session } = await supabase.auth.getSession();
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-school-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              schoolId: school.id,
              schoolName: school.name,
              isActive: newStatus,
            }),
          }
        );
      } catch (emailError) {
        console.error('Failed to send status notification:', emailError);
        // Don't fail the entire operation if email fails
      }

      toast({
        title: 'Status updated',
        description: `${school.name} is now ${newStatus ? 'active' : 'inactive'}. Directors have been notified.`,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update school status.',
      });
    }
  };

  const handleSaveSchool = async () => {
    if (!editingSchool) return;

    try {
      await updateSchool.mutateAsync({
        id: editingSchool.id,
        name: editingSchool.name,
        email: editingSchool.email,
        phone: editingSchool.phone,
        subdomain: editingSchool.subdomain,
        domain: editingSchool.domain,
      });
      toast({
        title: 'School updated',
        description: `${editingSchool.name} has been updated.`,
      });
      setEditingSchool(null);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update school.',
      });
    }
  };

  if (schoolsLoading || platformLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Super Admin Panel</h1>
          <p className="page-subtitle">Manage all schools and platform settings</p>
        </div>
      </div>

      {/* Platform Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Schools"
          value={String(platformStats?.totalSchools || 0)}
          subtitle={`${platformStats?.activeSchools || 0} active`}
          icon={School}
          variant="primary"
        />
        <StatCard
          title="Total Users"
          value={String(platformStats?.totalUsers || 0)}
          subtitle="Registered accounts"
          icon={Users}
          variant="secondary"
        />
        <StatCard
          title="Directors"
          value={String(platformStats?.directors || 0)}
          subtitle="School directors"
          icon={ShieldCheck}
          variant="accent"
        />
        <StatCard
          title="Pending Invites"
          value={String(platformStats?.pendingInvites || 0)}
          subtitle="Awaiting acceptance"
          icon={Send}
          variant="success"
        />
        <StatCard
          title="Platform"
          value={platformSettings?.platform_name || 'Active'}
          subtitle="Status: Online"
          icon={Globe}
          variant="primary"
        />
      </div>

      <Tabs value={searchParams.get('tab') || 'schools'} className="space-y-6" onValueChange={(val) => setSearchParams({ tab: val })}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="schools" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <TicketIcon className="h-4 w-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="quotas" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Quotas
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="whitelabel" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <PlatformAnalytics />
        </TabsContent>

        <TabsContent value="schools">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Registered Schools</CardTitle>
                <CardDescription>
                  {schools?.length || 0} school(s) registered on the platform
                </CardDescription>
              </div>
              <Dialog open={isNewSchoolOpen} onOpenChange={setIsNewSchoolOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add School
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New School</DialogTitle>
                    <DialogDescription>
                      Create a new school on the platform
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>School Name *</Label>
                      <Input
                        value={newSchoolName}
                        onChange={(e) => setNewSchoolName(e.target.value)}
                        placeholder="Enter school name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newSchoolEmail}
                          onChange={(e) => setNewSchoolEmail(e.target.value)}
                          placeholder="school@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={newSchoolPhone}
                          onChange={(e) => setNewSchoolPhone(e.target.value)}
                          placeholder="+234 XXX XXX XXXX"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subdomain</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={newSchoolSubdomain}
                          onChange={(e) => setNewSchoolSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="schoolname"
                        />
                        <span className="text-muted-foreground text-sm">.yourdomain.com</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Domain</Label>
                      <Input
                        value={newSchoolDomain}
                        onChange={(e) => setNewSchoolDomain(e.target.value.toLowerCase())}
                        placeholder="school.example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional: Set a custom domain for this school (e.g., portal.schoolname.com)
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewSchoolOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSchool} disabled={createSchool.isPending}>
                      {createSchool.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create School
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Domain / Subdomain</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools?.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {school.logo_url ? (
                            <img
                              src={school.logo_url}
                              alt={school.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{school.name}</p>
                            <p className="text-xs text-muted-foreground">{school.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {school.email && <p>{school.email}</p>}
                          {school.phone && <p className="text-muted-foreground">{school.phone}</p>}
                          {!school.email && !school.phone && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {school.domain && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                {school.domain}
                              </code>
                            </div>
                          )}
                          {school.subdomain && (
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">
                              {school.subdomain}
                            </code>
                          )}
                          {!school.domain && !school.subdomain && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{school.current_session || '—'}</p>
                          <p className="text-muted-foreground capitalize">{school.current_term || '—'} term</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={school.is_active}
                            onCheckedChange={() => handleToggleSchoolStatus(school)}
                          />
                          <Badge variant={school.is_active ? 'default' : 'secondary'}>
                            {school.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSchool(school)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!schools?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No schools registered yet. Click "Add School" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit School Dialog */}
          <Dialog open={!!editingSchool} onOpenChange={(open) => !open && setEditingSchool(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit School</DialogTitle>
                <DialogDescription>
                  Update school information
                </DialogDescription>
              </DialogHeader>
              {editingSchool && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>School Name</Label>
                    <Input
                      value={editingSchool.name}
                      onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editingSchool.email || ''}
                        onChange={(e) => setEditingSchool({ ...editingSchool, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editingSchool.phone || ''}
                        onChange={(e) => setEditingSchool({ ...editingSchool, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subdomain</Label>
                    <Input
                      value={editingSchool.subdomain || ''}
                      onChange={(e) => setEditingSchool({ ...editingSchool, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Domain</Label>
                    <Input
                      value={editingSchool.domain || ''}
                      onChange={(e) => setEditingSchool({ ...editingSchool, domain: e.target.value.toLowerCase() })}
                      placeholder="school.example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      The custom domain this school is hosted on. Activities from this domain will be tracked in the Super Admin dashboard.
                    </p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingSchool(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSchool} disabled={updateSchool.isPending}>
                  {updateSchool.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="users">
          <SchoolUsersManagement />
        </TabsContent>

        <TabsContent value="features">
          <FeatureFlagsManager />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementBroadcaster />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogsViewer />
        </TabsContent>

        <TabsContent value="tickets">
          <SupportTicketsManager />
        </TabsContent>

        <TabsContent value="health">
          <SchoolHealthDashboard />
        </TabsContent>

        <TabsContent value="quotas">
          <UsageQuotasManager />
        </TabsContent>

        <TabsContent value="compare">
          <ComparativeAnalytics />
        </TabsContent>

        <TabsContent value="subscriptions">
          <Tabs defaultValue="plans" className="space-y-4">
            <TabsList>
              <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
              <TabsTrigger value="schools">School Subscriptions</TabsTrigger>
            </TabsList>
            <TabsContent value="plans">
              <SubscriptionPlansManager />
            </TabsContent>
            <TabsContent value="schools">
              <SchoolSubscriptionsManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="backup">
          <DataBackupExport />
        </TabsContent>

        <TabsContent value="whitelabel">
          <WhiteLabelSettings />
        </TabsContent>

        <TabsContent value="onboarding">
          <DirectorOnboardingInvite />
        </TabsContent>

        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
              <CardDescription>
                Global settings that apply to all schools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="School Management Platform"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@platform.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Phone</Label>
                  <Input
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Default School Colors</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border"
                        style={{ backgroundColor: platformSettings?.default_primary_color || '#1e3a5f' }}
                      />
                      <code className="text-sm">{platformSettings?.default_primary_color || '#1e3a5f'}</code>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border"
                        style={{ backgroundColor: platformSettings?.default_secondary_color || '#2d5a3d' }}
                      />
                      <code className="text-sm">{platformSettings?.default_secondary_color || '#2d5a3d'}</code>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border"
                        style={{ backgroundColor: platformSettings?.default_accent_color || '#d4a84b' }}
                      />
                      <code className="text-sm">{platformSettings?.default_accent_color || '#d4a84b'}</code>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSavePlatformSettings}
                disabled={updatePlatformSettings.isPending}
              >
                {updatePlatformSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Platform Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdmin;
