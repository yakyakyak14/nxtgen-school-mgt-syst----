
-- Function to generate student registration number from school name acronym
CREATE OR REPLACE FUNCTION public.generate_school_reg_number(_school_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  school_name text;
  acronym text;
  word text;
  words text[];
  next_seq int;
  current_year text;
BEGIN
  -- Get school name
  SELECT name INTO school_name FROM public.schools WHERE id = _school_id;
  
  IF school_name IS NULL THEN
    acronym := 'SCH';
  ELSE
    -- Build acronym from first letter of each word (max 3 letters)
    words := string_to_array(upper(trim(school_name)), ' ');
    acronym := '';
    FOR i IN 1..LEAST(array_length(words, 1), 3) LOOP
      acronym := acronym || left(words[i], 1);
    END LOOP;
    -- Pad to 3 chars if needed
    IF length(acronym) < 3 THEN
      acronym := rpad(acronym, 3, left(upper(school_name), 3 - length(acronym)));
    END IF;
    acronym := left(acronym, 3);
  END IF;
  
  current_year := to_char(now(), 'YYYY');
  
  -- Get next sequence number for this school
  SELECT COALESCE(MAX(
    CASE 
      WHEN admission_number ~ (acronym || '/' || current_year || '/[0-9]+')
      THEN substring(admission_number from '[0-9]+$')::int
      ELSE 0
    END
  ), 0) + 1 INTO next_seq
  FROM public.students
  WHERE school_id = _school_id;
  
  RETURN acronym || '/' || current_year || '/' || lpad(next_seq::text, 4, '0');
END;
$$;

-- Function to setup parent profile and link to students
CREATE OR REPLACE FUNCTION public.setup_parent_profile(
  _user_id uuid,
  _student_identifiers text[] -- array of admission numbers
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _guardian_id uuid;
  _student_id uuid;
  _identifier text;
BEGIN
  -- Insert parent role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'parent')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create guardian record if not exists
  INSERT INTO public.guardians (user_id, relationship)
  VALUES (_user_id, 'parent')
  ON CONFLICT DO NOTHING;
  
  -- Get guardian id
  SELECT id INTO _guardian_id FROM public.guardians WHERE user_id = _user_id LIMIT 1;
  
  IF _guardian_id IS NULL THEN
    RETURN;
  END IF;

  -- Link each student
  FOREACH _identifier IN ARRAY _student_identifiers LOOP
    SELECT id INTO _student_id FROM public.students 
    WHERE admission_number = trim(_identifier);
    
    IF _student_id IS NOT NULL THEN
      INSERT INTO public.student_guardians (student_id, guardian_id, is_primary)
      VALUES (_student_id, _guardian_id, true)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Allow guardians to be inserted by authenticated users (for parent signup)
CREATE POLICY "Authenticated can create guardian profile"
ON public.guardians
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
