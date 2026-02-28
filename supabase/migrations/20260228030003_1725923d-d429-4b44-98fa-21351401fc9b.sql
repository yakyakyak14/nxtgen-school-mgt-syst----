
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS guardian_name text,
ADD COLUMN IF NOT EXISTS guardian_email text,
ADD COLUMN IF NOT EXISTS guardian_phone text,
ADD COLUMN IF NOT EXISTS guardian_relationship text DEFAULT 'parent',
ADD COLUMN IF NOT EXISTS guardian_occupation text,
ADD COLUMN IF NOT EXISTS guardian_workplace text,
ADD COLUMN IF NOT EXISTS guardian_address text;
