import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Building, Palette, Users, Globe, Banknote, Loader2 } from 'lucide-react';
import { useCurrentSchool, useUpdateSchool } from '@/hooks/useSchools';
import { useToast } from '@/hooks/use-toast';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { AddressAutocomplete } from '@/components/settings/AddressAutocomplete';
import { UsersManagement } from '@/components/settings/UsersManagement';
import { BankAccountSettings } from '@/components/settings/BankAccountSettings';
import { InviteUserDialog } from '@/components/invitations/InviteUserDialog';
import { InvitationsManagement } from '@/components/settings/InvitationsManagement';
import { TERMS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

const Settings: React.FC = () => {
  const { data: school, isLoading } = useCurrentSchool();
  const updateSchool = useUpdateSchool();
  const { toast } = useToast();
  const { role } = useAuth();
  const isDirector = role === 'director' || role === 'super_admin';

  // Form states
  const [schoolName, setSchoolName] = useState('');
  const [schoolMotto, setSchoolMotto] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e3a5f');
  const [secondaryColor, setSecondaryColor] = useState('#2d5a3d');
  const [accentColor, setAccentColor] = useState('#d4a84b');
  const [currentSession, setCurrentSession] = useState('2024/2025');
  const [currentTerm, setCurrentTerm] = useState<'first' | 'second' | 'third'>('first');
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState('');

  // Load settings from schools table
  useEffect(() => {
    if (school) {
      setSchoolName(school.name || '');
      setSchoolMotto(school.motto || '');
      setSchoolEmail(school.email || '');
      setSchoolPhone(school.phone || '');
      setSchoolAddress(school.address || '');
      setLogoUrl(school.logo_url || '');
      setPrimaryColor(school.primary_color || '#1e3a5f');
      setSecondaryColor(school.secondary_color || '#2d5a3d');
      setAccentColor(school.accent_color || '#d4a84b');
      setCurrentSession(school.current_session || '2024/2025');
      setCurrentTerm(school.current_term || 'first');
      setGoogleMapsEmbedUrl(school.google_maps_embed_url || '');
    }
  }, [school]);

  // Apply branding colors to CSS variables
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--school-primary', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--school-secondary', secondaryColor);
    }
    if (accentColor) {
      document.documentElement.style.setProperty('--school-accent', accentColor);
    }
  }, [primaryColor, secondaryColor, accentColor]);

  const handleSaveGeneral = async () => {
    if (!school) return;
    try {
      await updateSchool.mutateAsync({
        id: school.id,
        name: schoolName,
        motto: schoolMotto,
        email: schoolEmail,
        phone: schoolPhone,
        address: schoolAddress,
      });
      toast({
        title: 'Settings saved',
        description: 'School information has been updated.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings.',
      });
    }
  };

  const handleSaveBranding = async () => {
    if (!school) return;
    try {
      await updateSchool.mutateAsync({
        id: school.id,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
      });
      toast({
        title: 'Branding saved',
        description: 'Your branding changes have been applied.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save branding.',
      });
    }
  };

  const handleSaveAcademic = async () => {
    if (!school) return;
    try {
      await updateSchool.mutateAsync({
        id: school.id,
        current_session: currentSession,
        current_term: currentTerm,
      });
      toast({
        title: 'Academic settings saved',
        description: 'Session and term have been updated.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save academic settings.',
      });
    }
  };

  const handleSaveIntegrations = async () => {
    if (!school) return;
    try {
      await updateSchool.mutateAsync({
        id: school.id,
        google_maps_embed_url: googleMapsEmbedUrl,
      });
      toast({
        title: 'Integration saved',
        description: 'Google Maps integration has been updated.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save integration settings.',
      });
    }
  };

  if (isLoading) {
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
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage school configuration and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Academic</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          {isDirector && (
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Update your school's basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Enter school name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolMotto">School Motto</Label>
                  <Input
                    id="schoolMotto"
                    value={schoolMotto}
                    onChange={(e) => setSchoolMotto(e.target.value)}
                    placeholder="Enter school motto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">Email Address</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    placeholder="school@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">Phone Number</Label>
                  <Input
                    id="schoolPhone"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>School Address</Label>
                <AddressAutocomplete
                  value={schoolAddress}
                  onChange={(value) => setSchoolAddress(value)}
                  placeholder="Start typing your school address..."
                />
              </div>
              <Button 
                onClick={handleSaveGeneral}
                disabled={updateSchool.isPending}
              >
                {updateSchool.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Appearance</CardTitle>
              <CardDescription>Customize your school's visual identity. Changes will reflect across the entire interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>School Logo</Label>
                <LogoUpload
                  currentLogoUrl={logoUrl}
                  onUpload={setLogoUrl}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1e3a5f"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Main brand color for headers</p>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-14 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#2d5a3d"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Accent color for buttons</p>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-14 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#d4a84b"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Highlight color for links</p>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-lg border">
                <p className="text-sm font-medium mb-3">Color Preview</p>
                <div className="flex gap-2">
                  <div 
                    className="h-12 w-12 rounded-lg" 
                    style={{ backgroundColor: primaryColor }}
                    title="Primary"
                  />
                  <div 
                    className="h-12 w-12 rounded-lg" 
                    style={{ backgroundColor: secondaryColor }}
                    title="Secondary"
                  />
                  <div 
                    className="h-12 w-12 rounded-lg" 
                    style={{ backgroundColor: accentColor }}
                    title="Accent"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSaveBranding}
                disabled={updateSchool.isPending}
              >
                {updateSchool.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-6">
            {isDirector && school && (
              <div className="flex justify-end">
                <InviteUserDialog schoolId={school.id} schoolName={school.name} />
              </div>
            )}
            {isDirector && <InvitationsManagement />}
            <UsersManagement />
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <CardTitle>Academic Settings</CardTitle>
              <CardDescription>Configure academic year and term settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Current Session</Label>
                  <Select value={currentSession} onValueChange={setCurrentSession}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2023/2024">2023/2024</SelectItem>
                      <SelectItem value="2024/2025">2024/2025</SelectItem>
                      <SelectItem value="2025/2026">2025/2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Term</Label>
                  <Select value={currentTerm} onValueChange={(v) => setCurrentTerm(v as 'first' | 'second' | 'third')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERMS.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleSaveAcademic}
                disabled={updateSchool.isPending}
              >
                {updateSchool.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Academic Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Google Maps Integration</CardTitle>
              <CardDescription>Display your school location on the homepage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mapsUrl">Google Maps Embed URL</Label>
                <Input
                  id="mapsUrl"
                  value={googleMapsEmbedUrl}
                  onChange={(e) => setGoogleMapsEmbedUrl(e.target.value)}
                  placeholder="https://www.google.com/maps/embed?..."
                />
                <p className="text-xs text-muted-foreground">
                  Go to Google Maps → Share → Embed a map → Copy the src URL from the iframe code
                </p>
              </div>
              
              {googleMapsEmbedUrl && (
                <div className="aspect-video rounded-lg overflow-hidden border">
                  <iframe
                    src={googleMapsEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}

              <Button 
                onClick={handleSaveIntegrations}
                disabled={updateSchool.isPending}
              >
                {updateSchool.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Integration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isDirector && (
          <TabsContent value="payments">
            <BankAccountSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
