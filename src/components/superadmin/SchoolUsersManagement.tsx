import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Shield, Mail, Loader2, Building2, UserPlus } from 'lucide-react';
import { SCHOOL_LEVEL_ROLES } from '@/lib/constants';
import { useSchools } from '@/hooks/useSchools';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role?: AppRole;
  school_id?: string | null;
  school_name?: string | null;
  created_at: string;
}

export const SchoolUsersManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: schools } = useSchools();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [newSchoolId, setNewSchoolId] = useState<string>('');
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users-with-roles'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, created_at, school_id')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, school_id');

      if (rolesError) throw rolesError;

      // Get all schools for mapping
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name');

      const schoolMap = new Map(schoolsData?.map(s => [s.id, s.name]) || []);

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role,
          school_id: userRole?.school_id || profile.school_id,
          school_name: userRole?.school_id ? schoolMap.get(userRole.school_id) : 
                       profile.school_id ? schoolMap.get(profile.school_id) : null,
        };
      }) || [];

      return usersWithRoles;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, schoolId }: { userId: string; role: AppRole; schoolId: string | null }) => {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role, school_id: schoolId })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role, school_id: schoolId });
        if (error) throw error;
      }

      // Also update profile school_id
      if (schoolId) {
        await supabase
          .from('profiles')
          .update({ school_id: schoolId })
          .eq('id', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-with-roles'] });
      setSelectedUser(null);
      setNewRole('');
      setNewSchoolId('');
      setIsRoleDialogOpen(false);
      setIsAssignDialogOpen(false);
      toast({
        title: 'Role Updated',
        description: 'User role and school assignment have been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update user role.',
      });
    },
  });

  const filteredUsers = users?.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      user.email.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower);
    
    const matchesSchool = selectedSchoolFilter === 'all' || 
      user.school_id === selectedSchoolFilter ||
      (selectedSchoolFilter === 'unassigned' && !user.school_id);
    
    return matchesSearch && matchesSchool;
  });

  const getRoleBadgeVariant = (role?: AppRole) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'director':
        return 'destructive';
      case 'principal':
      case 'headmaster':
        return 'default';
      case 'teacher':
        return 'secondary';
      case 'admin_staff':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatRoleName = (role?: AppRole) => {
    if (!role) return 'No Role';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleOpenRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role || '');
    setNewSchoolId(user.school_id || '');
    setIsRoleDialogOpen(true);
  };

  const handleOpenAssignDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole('director');
    setNewSchoolId('');
    setIsAssignDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              School User Management
            </CardTitle>
            <CardDescription>Assign users to schools and manage their roles</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedSchoolFilter} onValueChange={setSelectedSchoolFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by school" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}`
                                : 'No Name'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.school_name ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{user.school_name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {formatRoleName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!user.school_id && user.role !== 'super_admin' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenAssignDialog(user)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Assign to School
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleOpenRoleDialog(user)}
                            disabled={user.role === 'super_admin'}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Change Role
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Change Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUser?.first_name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>School</Label>
                <Select value={newSchoolId} onValueChange={setNewSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={newRole} 
                  onValueChange={(value) => setNewRole(value as AppRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_LEVEL_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser && newRole) {
                    updateRoleMutation.mutate({ 
                      userId: selectedUser.id, 
                      role: newRole as AppRole,
                      schoolId: newSchoolId || null,
                    });
                  }
                }}
                disabled={updateRoleMutation.isPending || !newRole}
              >
                {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign to School Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign User to School</DialogTitle>
              <DialogDescription>
                Assign {selectedUser?.first_name || selectedUser?.email} as a director to a school
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select School</Label>
                <Select value={newSchoolId} onValueChange={setNewSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {school.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select 
                  value={newRole} 
                  onValueChange={(value) => setNewRole(value as AppRole)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_LEVEL_ROLES.filter(r => ['director', 'principal', 'headmaster', 'admin_staff'].includes(r.value)).map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser && newRole && newSchoolId) {
                    updateRoleMutation.mutate({ 
                      userId: selectedUser.id, 
                      role: newRole as AppRole,
                      schoolId: newSchoolId,
                    });
                  }
                }}
                disabled={updateRoleMutation.isPending || !newRole || !newSchoolId}
              >
                {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Assign to School
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};