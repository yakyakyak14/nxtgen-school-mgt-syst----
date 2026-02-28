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
    const { action, school_id, plan_id, billing_cycle, email, callback_url } = await req.json();

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Paystack not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'initialize') {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ success: false, error: 'Plan not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amount = billing_cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
      const amountInKobo = Math.round(amount * 100);

      // Initialize Paystack transaction
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          callback_url,
          metadata: {
            type: 'subscription',
            school_id,
            plan_id,
            billing_cycle,
            plan_name: plan.name,
          },
        }),
      });

      const paystackData = await paystackResponse.json();

      if (!paystackData.status) {
        console.error('Paystack initialization failed:', paystackData);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to initialize payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Subscription payment initialized:', paystackData.data.reference);

      return new Response(
        JSON.stringify({
          success: true,
          authorization_url: paystackData.data.authorization_url,
          reference: paystackData.data.reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      const { reference } = await req.json();

      const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.status || verifyData.data?.status !== 'success') {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment verification failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const metadata = verifyData.data.metadata;
      const periodEnd = new Date();
      
      if (metadata.billing_cycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Create or update subscription
      const { data: existingSub } = await supabase
        .from('school_subscriptions')
        .select('id')
        .eq('school_id', metadata.school_id)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('school_subscriptions')
          .update({
            plan_id: metadata.plan_id,
            status: 'active',
            billing_cycle: metadata.billing_cycle,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            paystack_customer_code: verifyData.data.customer.customer_code,
          })
          .eq('id', existingSub.id);
      } else {
        await supabase
          .from('school_subscriptions')
          .insert({
            school_id: metadata.school_id,
            plan_id: metadata.plan_id,
            status: 'active',
            billing_cycle: metadata.billing_cycle,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            paystack_customer_code: verifyData.data.customer.customer_code,
          });
      }

      // Create invoice
      const amount = verifyData.data.amount / 100;
      await supabase
        .from('billing_invoices')
        .insert({
          school_id: metadata.school_id,
          amount,
          status: 'paid',
          description: `${metadata.plan_name} - ${metadata.billing_cycle} subscription`,
          paid_at: new Date().toISOString(),
          paystack_reference: reference,
          paystack_transaction_id: verifyData.data.id.toString(),
        });

      console.log('Subscription activated for school:', metadata.school_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Subscription activated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subscription payment error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
