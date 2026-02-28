-- Create storage buckets for documents with hierarchy-based access
INSERT INTO storage.buckets (id, name, public) VALUES ('school-documents', 'school-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('report-cards', 'report-cards', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', false);

-- Storage policies for school-documents bucket (hierarchy-based)
CREATE POLICY "Directors can access all documents"
ON storage.objects FOR ALL
USING (bucket_id = 'school-documents' AND has_role(auth.uid(), 'director'))
WITH CHECK (bucket_id = 'school-documents' AND has_role(auth.uid(), 'director'));

CREATE POLICY "Principals can access their level documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'school-documents' AND 
  (has_role(auth.uid(), 'principal') OR has_role(auth.uid(), 'headmaster'))
);

CREATE POLICY "Teachers can view shared documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'school-documents' AND 
  has_role(auth.uid(), 'teacher') AND
  (storage.foldername(name))[1] = 'shared'
);

-- Storage policies for report-cards bucket
CREATE POLICY "Staff can upload report cards"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'report-cards' AND
  (has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'principal') OR 
   has_role(auth.uid(), 'headmaster') OR has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Staff and parents can view report cards"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'report-cards' AND
  (has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'principal') OR 
   has_role(auth.uid(), 'headmaster') OR has_role(auth.uid(), 'teacher') OR
   has_role(auth.uid(), 'parent'))
);

-- Storage policies for student-photos bucket
CREATE POLICY "Staff can manage student photos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'student-photos' AND
  (has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'principal') OR 
   has_role(auth.uid(), 'headmaster') OR has_role(auth.uid(), 'admin_staff'))
)
WITH CHECK (
  bucket_id = 'student-photos' AND
  (has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'principal') OR 
   has_role(auth.uid(), 'headmaster') OR has_role(auth.uid(), 'admin_staff'))
);

CREATE POLICY "All authenticated can view student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Add index for faster chat queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Update chat_messages RLS to allow marking messages as read
CREATE POLICY "Users can update read status of received messages"
ON chat_messages FOR UPDATE
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());