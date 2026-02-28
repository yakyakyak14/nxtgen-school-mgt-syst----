import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface ChatContact {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role?: string;
  unread_count: number;
  last_message?: string;
  last_message_time?: string;
}

export const useChat = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all staff contacts
  const fetchContacts = useCallback(async () => {
    if (!user) return;

    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .neq('id', user.id);

      if (profilesError) throw profilesError;

      // Get roles for each profile
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get unread message counts
      const { data: unreadCounts, error: unreadError } = await supabase
        .from('chat_messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (unreadError) throw unreadError;

      // Get last messages
      const { data: lastMessages, error: lastMsgError } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (lastMsgError) throw lastMsgError;

      // Build contacts with metadata
      const contactsWithMeta: ChatContact[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const unreadFromUser = unreadCounts?.filter(m => m.sender_id === profile.id).length || 0;
        const lastMsg = lastMessages?.find(
          m => m.sender_id === profile.id || m.receiver_id === profile.id
        );

        return {
          id: profile.id,
          user_id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          role: userRole?.role,
          unread_count: unreadFromUser,
          last_message: lastMsg?.message,
          last_message_time: lastMsg?.created_at,
        };
      });

      // Sort by last message time
      contactsWithMeta.sort((a, b) => {
        if (!a.last_message_time && !b.last_message_time) return 0;
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setContacts(contactsWithMeta);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [user]);

  // Fetch messages for selected contact
  const fetchMessages = useCallback(async (contactId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Map to ChatMessage type
      const messagesWithSender: ChatMessage[] = (data || []).map(msg => ({
        ...msg,
        sender: undefined,
      }));
      
      setMessages(messagesWithSender);

      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender_id', contactId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Update unread count in contacts
      setContacts(prev =>
        prev.map(c =>
          c.id === contactId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Send a message
  const sendMessage = async (receiverId: string, message: string) => {
    if (!user || !message.trim()) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message: message.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update local messages
      setMessages(prev => [...prev, { ...data, sender: null }]);

      // Update last message in contacts
      setContacts(prev =>
        prev.map(c =>
          c.id === receiverId
            ? { ...c, last_message: message, last_message_time: new Date().toISOString() }
            : c
        )
      );

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          // If currently chatting with this person, add message and mark as read
          if (selectedContact?.id === newMessage.sender_id) {
            setMessages(prev => [...prev, newMessage]);
            
            await supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMessage.id);
          } else {
            // Update unread count
            setContacts(prev =>
              prev.map(c =>
                c.id === newMessage.sender_id
                  ? {
                      ...c,
                      unread_count: c.unread_count + 1,
                      last_message: newMessage.message,
                      last_message_time: newMessage.created_at,
                    }
                  : c
              )
            );

            // Show notification
            const sender = contacts.find(c => c.id === newMessage.sender_id);
            if (sender) {
              toast.info(`New message from ${sender.first_name || sender.email}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedContact, contacts]);

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Fetch messages when contact is selected
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    } else {
      setMessages([]);
    }
  }, [selectedContact, fetchMessages]);

  return {
    contacts,
    messages,
    selectedContact,
    setSelectedContact,
    sendMessage,
    isLoading,
    refreshContacts: fetchContacts,
  };
};
