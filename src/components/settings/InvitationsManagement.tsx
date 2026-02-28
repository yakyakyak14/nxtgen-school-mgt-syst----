import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Mail, Trash2, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentSchool } from '@/hooks/useSchools';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast } from 'date-fns';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string;
  token: string;
}

export const InvitationsManagement: React.FC = () => {
  const { data: school } = useCurrentSchool();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['invitations', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('school_id', school.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!school?.id,
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been cancelled successfully.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel the invitation.',
      });
    },
  });

  const resendInvitation = async (invitation: Invitation) => {
    if (!school || !user) return;

    setResendingId(invitation.id);
    try {
      // Get inviter's profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const inviterName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'School Administrator'
        : 'School Administrator';

      // First, update the expiration date
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error: updateError } = await supabase
        .from('invitations')
        .update({ 
          expires_at: newExpiresAt.toISOString(),
          status: 'pending',
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Call the send-invitation function to resend the email
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            schoolName: school.name,
            inviterName,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend invitation');
      }

      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({
        title: 'Invitation resent',
        description: `A new invitation email has been sent to ${invitation.email}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to resend the invitation.',
      });
    } finally {
      setResendingId(null);
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.status === 'accepted') {
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    }
    if (invitation.status === 'cancelled') {
      return (
        <Badge variant="secondary">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      );
    }
    if (isPast(new Date(invitation.expires_at))) {
      return (
        <Badge variant="destructive">
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const canManageInvitation = (invitation: Invitation) => {
    return invitation.status === 'pending' && !isPast(new Date(invitation.expires_at));
  };

  const canResendInvitation = (invitation: Invitation) => {
    return invitation.status !== 'accepted' && invitation.status !== 'cancelled';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = invitations?.filter(i => i.status === 'pending' && !isPast(new Date(i.expires_at))).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          {pendingCount} pending invitation{pendingCount !== 1 ? 's' : ''} • Manage user invitations to your school
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!invitations?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invitations sent yet</p>
            <p className="text-sm">Use the "Invite User" button above to send invitations</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>{formatRole(invitation.role)}</TableCell>
                  <TableCell>{getStatusBadge(invitation)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canResendInvitation(invitation) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendInvitation(invitation)}
                          disabled={resendingId === invitation.id}
                        >
                          {resendingId === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">Resend</span>
                        </Button>
                      )}
                      {canManageInvitation(invitation) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                              <span className="ml-1 hidden sm:inline">Cancel</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel the invitation for {invitation.email}? 
                                They will no longer be able to use the invitation link to join.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelInvitation.mutate(invitation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancel Invitation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
