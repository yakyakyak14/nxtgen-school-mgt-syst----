-- Create exam schedules table
CREATE TABLE public.exam_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session TEXT NOT NULL,
  term public.term NOT NULL,
  exam_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam timetable entries table
CREATE TABLE public.exam_timetable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_schedule_id UUID NOT NULL REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT,
  invigilator_id UUID REFERENCES public.staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_timetable ENABLE ROW LEVEL SECURITY;

-- Exam schedules policies
CREATE POLICY "Exam schedules viewable by authenticated"
ON public.exam_schedules FOR SELECT
USING (true);

CREATE POLICY "Exam schedules manageable by admin"
ON public.exam_schedules FOR ALL
USING (
  has_role(auth.uid(), 'director') OR 
  has_role(auth.uid(), 'principal') OR 
  has_role(auth.uid(), 'headmaster')
);

-- Exam timetable policies  
CREATE POLICY "Exam timetable viewable by authenticated"
ON public.exam_timetable FOR SELECT
USING (true);

CREATE POLICY "Exam timetable manageable by admin"
ON public.exam_timetable FOR ALL
USING (
  has_role(auth.uid(), 'director') OR 
  has_role(auth.uid(), 'principal') OR 
  has_role(auth.uid(), 'headmaster')
);

-- Add triggers for updated_at
CREATE TRIGGER update_exam_schedules_updated_at
BEFORE UPDATE ON public.exam_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for conflict detection
CREATE INDEX idx_exam_timetable_date_time ON public.exam_timetable(exam_date, start_time, end_time);
CREATE INDEX idx_exam_timetable_invigilator ON public.exam_timetable(invigilator_id, exam_date);