
-- Allow authenticated users to insert student_guardians if they own the guardian record
CREATE POLICY "Parents can link children"
ON public.student_guardians
FOR INSERT
TO authenticated
WITH CHECK (
  guardian_id IN (
    SELECT id FROM public.guardians WHERE user_id = auth.uid()
  )
);

-- Allow parents to view their own student_guardians links
CREATE POLICY "Parents can view their links"
ON public.student_guardians
FOR SELECT
TO authenticated
USING (
  guardian_id IN (
    SELECT id FROM public.guardians WHERE user_id = auth.uid()
  )
);
