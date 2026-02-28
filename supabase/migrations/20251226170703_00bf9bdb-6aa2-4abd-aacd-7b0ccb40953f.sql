-- Create enums for roles and class levels
CREATE TYPE public.app_role AS ENUM ('director', 'principal', 'headmaster', 'teacher', 'admin_staff', 'non_teaching_staff', 'parent', 'student');
CREATE TYPE public.class_level AS ENUM ('nursery_1', 'nursery_2', 'nursery_3', 'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6', 'jss_1', 'jss_2', 'jss_3', 'ss_1', 'ss_2', 'ss_3');
CREATE TYPE public.staff_category AS ENUM ('academic', 'non_academic');
CREATE TYPE public.term AS ENUM ('first', 'second', 'third');
CREATE TYPE public.gender AS ENUM ('male', 'female');
CREATE TYPE public.notice_status AS ENUM ('draft', 'pending_approval', 'approved', 'published');

-- School Settings Table (for branding customization)
CREATE TABLE public.school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'School Management System',
  school_motto TEXT,
  school_address TEXT,
  school_phone TEXT,
  school_email TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#2d5a3d',
  accent_color TEXT DEFAULT '#d4a84b',
  google_maps_embed_url TEXT,
  school_latitude DECIMAL(10, 8),
  school_longitude DECIMAL(11, 8),
  current_session TEXT DEFAULT '2024/2025',
  current_term term DEFAULT 'first',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  gender gender,
  address TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Roles Table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Job Titles Table (custom job roles created by Director)
CREATE TABLE public.job_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  category staff_category NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Staff Table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  staff_id TEXT UNIQUE NOT NULL,
  job_title_id UUID REFERENCES public.job_titles(id),
  category staff_category NOT NULL DEFAULT 'academic',
  date_employed DATE,
  salary DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Classes Table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level class_level NOT NULL,
  section TEXT DEFAULT 'A',
  class_teacher_id UUID REFERENCES public.staff(id),
  capacity INTEGER DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level, section)
);

-- Students Table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  admission_number TEXT UNIQUE NOT NULL,
  class_id UUID REFERENCES public.classes(id),
  date_of_admission DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  blood_group TEXT,
  medical_conditions TEXT,
  previous_school TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Parents/Guardians Table
CREATE TABLE public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  occupation TEXT,
  relationship TEXT DEFAULT 'parent',
  workplace TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student-Guardian Relationship
CREATE TABLE public.student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  UNIQUE(student_id, guardian_id)
);

-- Subjects Table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Class Subjects (which subjects are taught in which class)
CREATE TABLE public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.staff(id),
  UNIQUE(class_id, subject_id)
);

-- Attendance Table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_present BOOLEAN DEFAULT true,
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Staff Attendance
CREATE TABLE public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIME,
  check_out TIME,
  is_present BOOLEAN DEFAULT true,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- Grades Table
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  term term NOT NULL,
  session TEXT NOT NULL,
  ca_score DECIMAL(5, 2) DEFAULT 0,
  exam_score DECIMAL(5, 2) DEFAULT 0,
  total_score DECIMAL(5, 2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade_letter TEXT,
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject_id, term, session)
);

-- Fee Types Table
CREATE TABLE public.fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Payments Table
CREATE TABLE public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  fee_type_id UUID REFERENCES public.fee_types(id) NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  term term NOT NULL,
  session TEXT NOT NULL,
  receipt_number TEXT UNIQUE,
  payment_method TEXT DEFAULT 'cash',
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notices Table
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status notice_status DEFAULT 'draft',
  priority TEXT DEFAULT 'normal',
  target_audience TEXT[] DEFAULT ARRAY['all'],
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages Table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- School Clubs Table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  patron_id UUID REFERENCES public.staff(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Club Memberships
CREATE TABLE public.club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, student_id)
);

-- Timetable Table
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.staff(id),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 5),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Library Books Table
CREATE TABLE public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT UNIQUE,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  available INTEGER DEFAULT 1,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Book Loans Table
CREATE TABLE public.book_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.library_books(id) ON DELETE CASCADE NOT NULL,
  borrower_id UUID REFERENCES auth.users(id) NOT NULL,
  borrowed_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  returned_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory Table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pieces',
  unit_price DECIMAL(12, 2),
  location TEXT,
  reorder_level INTEGER DEFAULT 10,
  last_restocked DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documents Table (for hierarchy-based access)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  access_level app_role[] NOT NULL DEFAULT ARRAY['director']::app_role[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'director' THEN 1
      WHEN 'principal' THEN 2
      WHEN 'headmaster' THEN 3
      WHEN 'teacher' THEN 4
      WHEN 'admin_staff' THEN 5
      WHEN 'non_teaching_staff' THEN 6
      WHEN 'parent' THEN 7
      WHEN 'student' THEN 8
    END
  LIMIT 1
$$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_school_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- School Settings (readable by all authenticated, writable by director)
CREATE POLICY "School settings viewable by authenticated" ON public.school_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "School settings editable by director" ON public.school_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'director'));

-- Profiles
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Roles (viewable by authenticated, manageable by director)
CREATE POLICY "Roles viewable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Roles manageable by director" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'director'));

-- Job Titles
CREATE POLICY "Job titles viewable by authenticated" ON public.job_titles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Job titles manageable by director" ON public.job_titles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'director'));

-- Staff
CREATE POLICY "Staff viewable by authenticated" ON public.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manageable by admin" ON public.staff FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster'));

-- Classes
CREATE POLICY "Classes viewable by authenticated" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Classes manageable by admin" ON public.classes FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster'));

-- Students
CREATE POLICY "Students viewable by staff" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students manageable by admin" ON public.students FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster') OR public.has_role(auth.uid(), 'admin_staff'));

-- Guardians
CREATE POLICY "Guardians viewable by staff" ON public.guardians FOR SELECT TO authenticated USING (true);
CREATE POLICY "Guardians can view own" ON public.guardians FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Student Guardians
CREATE POLICY "Student guardians viewable by staff" ON public.student_guardians FOR SELECT TO authenticated USING (true);

-- Subjects
CREATE POLICY "Subjects viewable by authenticated" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Subjects manageable by admin" ON public.subjects FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster'));

-- Class Subjects
CREATE POLICY "Class subjects viewable by authenticated" ON public.class_subjects FOR SELECT TO authenticated USING (true);

-- Attendance
CREATE POLICY "Attendance viewable by staff" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Attendance recordable by teachers" ON public.attendance FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster') OR public.has_role(auth.uid(), 'teacher'));

-- Staff Attendance
CREATE POLICY "Staff attendance viewable by admin" ON public.staff_attendance FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster') OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

-- Grades
CREATE POLICY "Grades viewable by staff and parents" ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Grades recordable by teachers" ON public.grades FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster') OR public.has_role(auth.uid(), 'teacher'));

-- Fee Types
CREATE POLICY "Fee types viewable by authenticated" ON public.fee_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fee types manageable by admin" ON public.fee_types FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster'));

-- Fee Payments
CREATE POLICY "Fee payments viewable by staff" ON public.fee_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fee payments recordable by admin" ON public.fee_payments FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster') OR public.has_role(auth.uid(), 'admin_staff'));

-- Notices
CREATE POLICY "Published notices viewable by all" ON public.notices FOR SELECT TO authenticated USING (status = 'published' OR created_by = auth.uid());
CREATE POLICY "Notices creatable by authorized" ON public.notices FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster'));
CREATE POLICY "Notices updatable by creator or director" ON public.notices FOR UPDATE TO authenticated 
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'director'));

-- Chat Messages
CREATE POLICY "Users can view their messages" ON public.chat_messages FOR SELECT TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT TO authenticated 
  WITH CHECK (sender_id = auth.uid());

-- Clubs
CREATE POLICY "Clubs viewable by authenticated" ON public.clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clubs manageable by director" ON public.clubs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'director'));

-- Club Memberships
CREATE POLICY "Club memberships viewable by authenticated" ON public.club_memberships FOR SELECT TO authenticated USING (true);

-- Timetable
CREATE POLICY "Timetable viewable by authenticated" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Timetable manageable by admin" ON public.timetable FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster'));

-- Library Books
CREATE POLICY "Library books viewable by authenticated" ON public.library_books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Library books manageable by staff" ON public.library_books FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin_staff'));

-- Book Loans
CREATE POLICY "Book loans viewable by staff and borrower" ON public.book_loans FOR SELECT TO authenticated 
  USING (borrower_id = auth.uid() OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin_staff'));

-- Inventory
CREATE POLICY "Inventory viewable by staff" ON public.inventory FOR SELECT TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster') OR public.has_role(auth.uid(), 'admin_staff'));
CREATE POLICY "Inventory manageable by admin" ON public.inventory FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin_staff'));

-- Documents (hierarchy-based access)
CREATE POLICY "Documents viewable by authorized roles" ON public.documents FOR SELECT TO authenticated 
  USING (
    public.get_user_role(auth.uid()) = ANY(access_level) OR
    public.has_role(auth.uid(), 'director')
  );
CREATE POLICY "Documents uploadable by staff" ON public.documents FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'headmaster') OR public.has_role(auth.uid(), 'admin_staff'));

-- Insert default school settings
INSERT INTO public.school_settings (school_name, school_motto) VALUES ('School Management System', 'Excellence in Education');