-- Create payroll deduction types table
CREATE TABLE public.payroll_deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_percentage BOOLEAN DEFAULT false,
  default_value NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create payroll periods table
CREATE TABLE public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'paid')),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year)
);

-- Create payroll records table (individual staff payments)
CREATE TABLE public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  basic_salary NUMERIC NOT NULL,
  gross_salary NUMERIC NOT NULL,
  total_deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payroll_period_id, staff_id)
);

-- Create payroll deductions table (deductions applied to each record)
CREATE TABLE public.payroll_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES public.payroll_records(id) ON DELETE CASCADE,
  deduction_type_id UUID REFERENCES public.payroll_deduction_types(id),
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_percentage BOOLEAN DEFAULT false,
  percentage_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_deduction_types
CREATE POLICY "Deduction types manageable by director" ON public.payroll_deduction_types
  FOR ALL USING (has_role(auth.uid(), 'director'));

CREATE POLICY "Deduction types viewable by admin" ON public.payroll_deduction_types
  FOR SELECT USING (
    has_role(auth.uid(), 'director') OR 
    has_role(auth.uid(), 'principal') OR 
    has_role(auth.uid(), 'headmaster') OR
    has_role(auth.uid(), 'admin_staff')
  );

-- RLS Policies for payroll_periods
CREATE POLICY "Payroll periods manageable by director" ON public.payroll_periods
  FOR ALL USING (has_role(auth.uid(), 'director'));

CREATE POLICY "Payroll periods viewable by admin" ON public.payroll_periods
  FOR SELECT USING (
    has_role(auth.uid(), 'director') OR 
    has_role(auth.uid(), 'principal') OR 
    has_role(auth.uid(), 'headmaster') OR
    has_role(auth.uid(), 'admin_staff')
  );

-- RLS Policies for payroll_records
CREATE POLICY "Payroll records manageable by director" ON public.payroll_records
  FOR ALL USING (has_role(auth.uid(), 'director'));

CREATE POLICY "Payroll records viewable by admin or own" ON public.payroll_records
  FOR SELECT USING (
    has_role(auth.uid(), 'director') OR 
    has_role(auth.uid(), 'principal') OR 
    has_role(auth.uid(), 'headmaster') OR
    has_role(auth.uid(), 'admin_staff') OR
    staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

-- RLS Policies for payroll_deductions
CREATE POLICY "Payroll deductions manageable by director" ON public.payroll_deductions
  FOR ALL USING (has_role(auth.uid(), 'director'));

CREATE POLICY "Payroll deductions viewable by admin or own" ON public.payroll_deductions
  FOR SELECT USING (
    has_role(auth.uid(), 'director') OR 
    has_role(auth.uid(), 'principal') OR 
    has_role(auth.uid(), 'headmaster') OR
    has_role(auth.uid(), 'admin_staff') OR
    payroll_record_id IN (
      SELECT pr.id FROM public.payroll_records pr
      JOIN public.staff s ON pr.staff_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- Insert default deduction types
INSERT INTO public.payroll_deduction_types (name, description, is_percentage, default_value) VALUES
  ('Tax (PAYE)', 'Pay As You Earn tax deduction', true, 7.5),
  ('Pension', 'Employee pension contribution', true, 8),
  ('Health Insurance', 'Health insurance premium', false, 5000),
  ('Loan Repayment', 'Staff loan repayment', false, 0),
  ('Absence Deduction', 'Deduction for unauthorized absence', false, 0);