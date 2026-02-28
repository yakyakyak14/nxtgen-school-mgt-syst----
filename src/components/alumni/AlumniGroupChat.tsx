import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  MessageSquare, Plus, Users, Send, LogIn, LogOut, Hash
} from 'lucide-react';

interface ChatGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

const AlumniGroupChat: React.FC = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ['alumni-chat-groups'],
    queryFn: async () => {
      const { data: groupsData, error } = await supabase
        .from('alumni_chat_groups')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get member counts and membership status
      const enriched = await Promise.all(
        (groupsData || []).map(async (g: any) => {
          const { count } = await supabase
            .from('alumni_chat_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', g.id);

          const { data: membership } = await supabase
            .from('alumni_chat_members')
            .select('id')
            .eq('group_id', g.id)
            .eq('user_id', user?.id)
            .maybeSingle();

          return { ...g, member_count: count || 0, is_member: !!membership };
        })
      );
      return enriched as ChatGroup[];
    },
    enabled: !!user,
  });

  // Fetch messages for selected group
  const { data: messages = [] } = useQuery({
    queryKey: ['alumni-chat-messages', selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const { data, error } = await supabase
        .from('alumni_chat_messages')
        .select('*')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Get sender names
      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown']));

      return (data || []).map((m: any) => ({
        ...m,
        sender_name: profileMap.get(m.sender_id) || 'Unknown',
      })) as ChatMessage[];
    },
    enabled: !!selectedGroup?.is_member,
    refetchInterval: 3000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!selectedGroup?.is_member) return;
    const channel = supabase
      .channel(`alumni-chat-${selectedGroup.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alumni_chat_messages',
        filter: `group_id=eq.${selectedGroup.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['alumni-chat-messages', selectedGroup.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create group
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const { data: group, error } = await supabase
        .from('alumni_chat_groups')
        .insert({ name: newGroupName, description: newGroupDesc || null, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      // Auto-join creator
      await supabase.from('alumni_chat_members').insert({ group_id: group.id, user_id: user!.id });
      return group;
    },
    onSuccess: () => {
      toast.success('Group created!');
      setNewGroupName('');
      setNewGroupDesc('');
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['alumni-chat-groups'] });
    },
    onError: () => toast.error('Failed to create group'),
  });

  // Join group
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('alumni_chat_members')
        .insert({ group_id: groupId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Joined group!');
      queryClient.invalidateQueries({ queryKey: ['alumni-chat-groups'] });
    },
    onError: () => toast.error('Failed to join group'),
  });

  // Leave group
  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('alumni_chat_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Left group');
      setSelectedGroup(null);
      queryClient.invalidateQueries({ queryKey: ['alumni-chat-groups'] });
    },
    onError: () => toast.error('Failed to leave group'),
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !selectedGroup) return;
      const { error } = await supabase
        .from('alumni_chat_messages')
        .insert({ group_id: selectedGroup.id, sender_id: user!.id, message: newMessage.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['alumni-chat-messages', selectedGroup?.id] });
    },
    onError: () => toast.error('Failed to send message'),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) sendMessageMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Groups List */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Groups</CardTitle>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />New</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Group Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Group Name</Label>
                    <Input placeholder="e.g. Class of 2010" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea placeholder="What's this group about?" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={() => createGroupMutation.mutate()} disabled={!newGroupName.trim() || createGroupMutation.isPending}>
                    Create Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-1 p-2">
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No groups yet. Create one!</p>
              )}
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedGroup?.id === group.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm truncate">{group.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{group.member_count} members</span>
                    {group.is_member ? (
                      <Badge variant="secondary" className="text-xs">Joined</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Not joined</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedGroup ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    {selectedGroup.name}
                  </CardTitle>
                  {selectedGroup.description && (
                    <CardDescription className="text-xs mt-1">{selectedGroup.description}</CardDescription>
                  )}
                </div>
                {selectedGroup.is_member ? (
                  <Button size="sm" variant="outline" onClick={() => leaveGroupMutation.mutate(selectedGroup.id)}>
                    <LogOut className="h-4 w-4 mr-1" />Leave
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => joinGroupMutation.mutate(selectedGroup.id)}>
                    <LogIn className="h-4 w-4 mr-1" />Join
                  </Button>
                )}
              </div>
            </CardHeader>
            {selectedGroup.is_member ? (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
                    )}
                    {messages.map(msg => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            {!isOwn && <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name}</p>}
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-3 border-t">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Join this group to see messages and chat</p>
                  <Button onClick={() => joinGroupMutation.mutate(selectedGroup.id)}>
                    <LogIn className="h-4 w-4 mr-2" />Join Group
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Select a group to start chatting</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AlumniGroupChat;
