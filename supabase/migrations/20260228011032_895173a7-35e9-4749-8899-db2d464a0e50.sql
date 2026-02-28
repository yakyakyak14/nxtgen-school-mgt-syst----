
CREATE TABLE public.alumni_chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  school_id uuid REFERENCES public.schools(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.alumni_chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.alumni_chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.alumni_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.alumni_chat_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alumni_chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view groups" ON public.alumni_chat_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create groups" ON public.alumni_chat_groups
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group creators can update" ON public.alumni_chat_groups
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Members can view group members" ON public.alumni_chat_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join groups" ON public.alumni_chat_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups" ON public.alumni_chat_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Group members can view messages" ON public.alumni_chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.alumni_chat_members
      WHERE group_id = alumni_chat_messages.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages" ON public.alumni_chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.alumni_chat_members
      WHERE group_id = alumni_chat_messages.group_id
      AND user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni_chat_messages;
