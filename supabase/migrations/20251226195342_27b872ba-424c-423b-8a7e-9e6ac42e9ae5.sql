-- Create academic calendar table for term dates, holidays, and events
CREATE TABLE public.academic_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event', -- 'term_start', 'term_end', 'holiday', 'event', 'exam'
  start_date DATE NOT NULL,
  end_date DATE,
  session TEXT NOT NULL,
  term public.term,
  description TEXT,
  is_school_closed BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Calendar viewable by authenticated" 
ON public.academic_calendar 
FOR SELECT 
USING (true);

CREATE POLICY "Calendar manageable by admin" 
ON public.academic_calendar 
FOR ALL 
USING (has_role(auth.uid(), 'director'::app_role) OR has_role(auth.uid(), 'principal'::app_role) OR has_role(auth.uid(), 'headmaster'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_academic_calendar_updated_at
BEFORE UPDATE ON public.academic_calendar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();