import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';
import { UserPlus, Loader2, Mail, Send, Eye, School, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const DEFAULT_INVITE_TEMPLATE = `Dear {director_name},

We are pleased to invite you to join our School Management Platform as the Director of {school_name}.

As Director, you will have complete administrative control over your school, including:

• Full access to all school data and analytics
• Ability to appoint and manage all staff roles (Principals, Headmasters, Teachers, Admin Staff, Non-Teaching Staff)
• Fee management and financial oversight
• Student enrollment and academic records
• Staff payroll and HR management
• Communication tools for parents and staff

To get started, please click the link in this email to create your account and begin setting up your school.

We look forward to having {school_name} on our platform.

Best regards,
{platform_name} Team`;

export const DirectorOnboardingInvite: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { data: schools } = useSchools();

  const [isOpen, setIsOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [directorName, setDirectorName] = useState('');
  const [directorEmail, setDirectorEmail] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [customMessage, setCustomMessage] = useState(DEFAULT_INVITE_TEMPLATE);
  const [subject, setSubject] = useState('');

  // Fetch existing invitations for directors
  const { data: invitations, refetch: refetchInvitations } = useQuery({
    queryKey: ['director-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, schools(name)')
        .eq('role', 'director')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedSchool = schools?.find(s => s.id === selectedSchoolId);

  const getProcessedMessage = () => {
    const inviterName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : 'Platform Administrator';
    return customMessage
      .replace(/{director_name}/g, directorName || '[Director Name]')
      .replace(/{school_name}/g, selectedSchool?.name || '[School Name]')
      .replace(/{platform_name}/g, 'School Management Platform')
      .replace(/{inviter_name}/g, inviterName);
  };

  const getProcessedSubject = () => {
    return (subject || `You've been invited to direct {school_name} on our platform`)
      .replace(/{school_name}/g, selectedSchool?.name || '[School Name]');
  };

  const handleResetTemplate = () => {
    setCustomMessage(DEFAULT_INVITE_TEMPLATE);
  };

  const handleSendInvite = async () => {
    if (!directorEmail || !selectedSchoolId || !directorName) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(directorEmail)) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const inviterName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : 'Platform Administrator';

      const response = await supabase.functions.invoke('send-director-onboarding', {
        body: {
          email: directorEmail,
          directorName,
          schoolId: selectedSchoolId,
          schoolName: selectedSchool?.name || '',
          inviterName,
          customMessage: getProcessedMessage(),
          subject: getProcessedSubject(),
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: 'Invitation sent!',
        description: `Onboarding invitation sent to ${directorName} at ${directorEmail}.`,
      });

      setIsOpen(false);
      setDirectorName('');
      setDirectorEmail('');
      setSelectedSchoolId('');
      setSubject('');
      setCustomMessage(DEFAULT_INVITE_TEMPLATE);
      setIsPreview(false);
      refetchInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to send invitation',
        description: error.message || 'An error occurred while sending the invitation.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'accepted':
        return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Accepted</Badge>;
      case 'expired':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Director Onboarding
            </CardTitle>
            <CardDescription>
              Invite school directors to join the platform. Directors will have full administrative control over their assigned school, including the ability to appoint all staff roles.
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setIsPreview(false); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Send className="h-4 w-4" />
                Invite Director
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invite School Director</DialogTitle>
                <DialogDescription>
                  Send a customized onboarding invitation to a new school director.
                </DialogDescription>
              </DialogHeader>

              {!isPreview ? (
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Director's Full Name *</Label>
                      <Input
                        value={directorName}
                        onChange={(e) => setDirectorName(e.target.value)}
                        placeholder="e.g. Dr. Adebayo Johnson"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Director's Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={directorEmail}
                          onChange={(e) => setDirectorEmail(e.target.value)}
                          placeholder="director@school.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Assign to School *</Label>
                    <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools?.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4" />
                              <span>{school.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={`You've been invited to direct {school_name} on our platform`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {'{school_name}'} as a placeholder. Leave blank for default.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Invitation Letter</Label>
                      <Button variant="ghost" size="sm" onClick={handleResetTemplate} className="text-xs">
                        Reset to Default
                      </Button>
                    </div>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={14}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Placeholders: {'{director_name}'}, {'{school_name}'}, {'{platform_name}'}, {'{inviter_name}'}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h4 className="font-medium text-sm mb-2">Director Privileges</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Full access to all school modules and data</li>
                      <li>✓ Appoint & manage Principals, Headmasters, Teachers, Admin Staff</li>
                      <li>✓ Financial oversight (fees, payroll, billing)</li>
                      <li>✓ Student and staff enrollment management</li>
                      <li>✓ School branding and settings configuration</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">To:</span>
                      <span>{directorName} &lt;{directorEmail}&gt;</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">Subject:</span>
                      <span>{getProcessedSubject()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">School:</span>
                      <Badge variant="outline" className="gap-1"><School className="h-3 w-3" />{selectedSchool?.name}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-muted-foreground">Role:</span>
                      <Badge>Director</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-6">
                    <div className="bg-gradient-to-r from-primary to-primary/80 rounded-t-lg p-6 -mx-6 -mt-6 mb-6 text-center">
                      <h2 className="text-primary-foreground text-xl font-bold">You're Invited!</h2>
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {getProcessedMessage()}
                    </div>
                    <div className="text-center mt-6">
                      <div className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold">
                        Accept Invitation & Set Up Your School
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      This invitation will expire in 7 days.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {isPreview ? (
                  <>
                    <Button variant="outline" onClick={() => setIsPreview(false)}>
                      Back to Edit
                    </Button>
                    <Button onClick={handleSendInvite} disabled={isLoading} className="gap-2">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Invitation
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setIsPreview(true)}
                      disabled={!directorName || !directorEmail || !selectedSchoolId}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview Email
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Director</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations?.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-muted-foreground" />
                      {inv.schools?.name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(inv.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(inv.expires_at), 'MMM dd, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
              {!invitations?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No director invitations sent yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
