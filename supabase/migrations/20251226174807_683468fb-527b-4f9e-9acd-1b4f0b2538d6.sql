-- Add payment gateway settings table for Paystack integration
CREATE TABLE public.payment_gateway_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_name text NOT NULL DEFAULT 'paystack',
    is_active boolean DEFAULT true,
    school_subaccount_code text,
    school_bank_name text,
    school_account_number text,
    school_account_name text,
    split_code text,
    platform_percentage numeric DEFAULT 5,
    school_percentage numeric DEFAULT 95,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Only director can manage payment settings
CREATE POLICY "Payment settings manageable by director" 
ON public.payment_gateway_settings 
FOR ALL 
USING (has_role(auth.uid(), 'director'));

-- All authenticated users can view (for payment processing)
CREATE POLICY "Payment settings viewable by authenticated" 
ON public.payment_gateway_settings 
FOR SELECT 
USING (true);

-- Add transaction_reference to fee_payments for Paystack tracking
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS transaction_reference text;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS paystack_reference text;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_amount numeric DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fee_payments_transaction_ref ON public.fee_payments(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON public.students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);