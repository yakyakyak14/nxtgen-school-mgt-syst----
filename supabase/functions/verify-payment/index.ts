import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Paystack not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment reference:', reference);

    // Verify payment with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const verifyData = await verifyResponse.json();
    console.log('Paystack verification response:', verifyData);

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment not successful',
          status: verifyData.data?.status || 'unknown',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = verifyData.data;
    const metadata = paymentData.metadata || {};

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if payment already recorded
    const { data: existingPayment } = await supabase
      .from('fee_payments')
      .select('id')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (existingPayment) {
      console.log('Payment already recorded:', reference);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already recorded',
          alreadyRecorded: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate receipt number and calculate fees
    const receiptNumber = `RCP${Date.now().toString(36).toUpperCase()}`;
    const amount = paymentData.amount / 100; // Convert from kobo
    const platformFee = amount * 0.05;
    const schoolAmount = amount * 0.95;

    // Record the payment
    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .insert({
        student_id: metadata.student_id,
        fee_type_id: metadata.fee_type_id,
        amount_paid: amount,
        payment_method: 'online',
        term: metadata.term || 'first',
        session: metadata.session || '2024/2025',
        receipt_number: receiptNumber,
        paystack_reference: reference,
        transaction_reference: reference,
        platform_fee: platformFee,
        school_amount: schoolAmount,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment verified and recorded:', receiptNumber);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and recorded',
        receipt_number: receiptNumber,
        amount: amount,
        payment_id: payment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
