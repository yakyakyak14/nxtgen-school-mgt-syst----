-- Create student_fee_obligations table to track what each student owes
CREATE TABLE public.student_fee_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_type_id UUID NOT NULL REFERENCES public.fee_types(id) ON DELETE CASCADE,
  session TEXT NOT NULL,
  term public.term NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  allow_installments BOOLEAN NOT NULL DEFAULT true,
  installments_count INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, fee_type_id, session, term)
);

-- Add installment tracking to fee_payments
ALTER TABLE public.fee_payments
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS obligation_id UUID REFERENCES public.student_fee_obligations(id) ON DELETE SET NULL;

-- Enable RLS on student_fee_obligations
ALTER TABLE public.student_fee_obligations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for student_fee_obligations
CREATE POLICY "Fee obligations viewable by staff"
ON public.student_fee_obligations
FOR SELECT
USING (true);

CREATE POLICY "Fee obligations manageable by admin"
ON public.student_fee_obligations
FOR ALL
USING (
  has_role(auth.uid(), 'director'::app_role) OR 
  has_role(auth.uid(), 'principal'::app_role) OR 
  has_role(auth.uid(), 'headmaster'::app_role) OR 
  has_role(auth.uid(), 'admin_staff'::app_role)
);

-- Create function to update obligation when payment is made
CREATE OR REPLACE FUNCTION public.update_obligation_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.obligation_id IS NOT NULL THEN
    UPDATE public.student_fee_obligations
    SET 
      amount_paid = amount_paid + NEW.amount_paid,
      status = CASE 
        WHEN amount_paid + NEW.amount_paid >= total_amount THEN 'paid'
        WHEN amount_paid + NEW.amount_paid > 0 THEN 'partial'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = NEW.obligation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment updates
CREATE TRIGGER update_obligation_after_payment
AFTER INSERT ON public.fee_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_obligation_on_payment();

-- Create function to update updated_at timestamp
CREATE TRIGGER update_student_fee_obligations_updated_at
BEFORE UPDATE ON public.student_fee_obligations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();