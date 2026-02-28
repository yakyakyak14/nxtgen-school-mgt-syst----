-- =============================================
-- PHASE 2: SUPPORT & MONITORING TABLES
-- =============================================

-- 1. SUPPORT TICKETS
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  assigned_to UUID,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'open',
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_support_tickets_school_id ON public.support_tickets(school_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Generate ticket number function
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
WHEN (NEW.ticket_number IS NULL)
EXECUTE FUNCTION public.generate_ticket_number();

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all tickets
CREATE POLICY "Super admins can manage all tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Directors can manage their school's tickets
CREATE POLICY "Directors can manage their school tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (
  school_id = public.get_user_school_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'director')
)
WITH CHECK (
  school_id = public.get_user_school_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'director')
);

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. TICKET MESSAGES (Thread of messages on a ticket)
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all messages
CREATE POLICY "Super admins can manage all ticket messages"
ON public.ticket_messages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- School users can view non-internal messages on their tickets
CREATE POLICY "School users can view their ticket messages"
ON public.ticket_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_messages.ticket_id 
    AND school_id = public.get_user_school_id(auth.uid())
  )
  AND (is_internal = false OR public.has_role(auth.uid(), 'super_admin'))
);

-- School directors can add messages to their tickets
CREATE POLICY "Directors can add messages to their tickets"
ON public.ticket_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = ticket_messages.ticket_id 
    AND school_id = public.get_user_school_id(auth.uid())
  )
  AND public.has_role(auth.uid(), 'director')
);

-- 3. SCHOOL HEALTH METRICS (Aggregated daily metrics per school)
CREATE TABLE public.school_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_users_count INTEGER DEFAULT 0,
  total_logins INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  fee_payments_count INTEGER DEFAULT 0,
  fee_amount_collected NUMERIC(15,2) DEFAULT 0,
  attendance_rate NUMERIC(5,2),
  error_count INTEGER DEFAULT 0,
  storage_used_mb NUMERIC(10,2) DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, metric_date)
);

-- Index
CREATE INDEX idx_school_health_metrics_school_date ON public.school_health_metrics(school_id, metric_date DESC);

-- Enable RLS
ALTER TABLE public.school_health_metrics ENABLE ROW LEVEL SECURITY;

-- Super admins can view all metrics
CREATE POLICY "Super admins can view all health metrics"
ON public.school_health_metrics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can insert/update metrics
CREATE POLICY "Super admins can manage health metrics"
ON public.school_health_metrics FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Directors can view their school's metrics
CREATE POLICY "Directors can view their school metrics"
ON public.school_health_metrics FOR SELECT
TO authenticated
USING (
  school_id = public.get_user_school_id(auth.uid()) 
  AND public.has_role(auth.uid(), 'director')
);