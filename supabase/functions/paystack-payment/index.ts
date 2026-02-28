import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log(`Paystack action: ${action}`, params);

    switch (action) {
      case 'initialize':
        return await initializeTransaction(params);
      case 'verify':
        return await verifyTransaction(params);
      case 'create-subaccount':
        return await createSubaccount(params);
      case 'create-split':
        return await createTransactionSplit(params);
      case 'list-banks':
        return await listBanks();
      case 'verify-account':
        return await verifyAccountNumber(params);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Paystack function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Initialize a transaction with split payments (5% platform, 95% school)
async function initializeTransaction(params: {
  email: string;
  amount: number;
  studentId: string;
  feeTypeId: string;
  session: string;
  term: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}) {
  // Get payment gateway settings for split code
  const { data: gatewaySettings } = await supabase
    .from('payment_gateway_settings')
    .select('*')
    .eq('is_active', true)
    .single();

  const splitCode = gatewaySettings?.split_code;
  
  // Calculate amounts
  const totalAmount = params.amount;
  const platformFee = Math.round(totalAmount * 0.05); // 5%
  const schoolAmount = totalAmount - platformFee; // 95%

  const payload: Record<string, any> = {
    email: params.email,
    amount: Math.round(totalAmount * 100), // Paystack uses kobo
    currency: 'NGN',
    callback_url: params.callbackUrl || `${SUPABASE_URL}/functions/v1/paystack-payment/callback`,
    metadata: {
      custom_fields: [
        { display_name: 'Student ID', variable_name: 'student_id', value: params.studentId },
        { display_name: 'Fee Type', variable_name: 'fee_type_id', value: params.feeTypeId },
        { display_name: 'Session', variable_name: 'session', value: params.session },
        { display_name: 'Term', variable_name: 'term', value: params.term },
        { display_name: 'Platform Fee', variable_name: 'platform_fee', value: platformFee.toString() },
        { display_name: 'School Amount', variable_name: 'school_amount', value: schoolAmount.toString() },
      ],
      ...params.metadata
    }
  };

  // Add split code if configured
  if (splitCode) {
    payload.split_code = splitCode;
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log('Initialize transaction response:', data);

  if (!data.status) {
    throw new Error(data.message || 'Failed to initialize transaction');
  }

  return new Response(
    JSON.stringify({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      platform_fee: platformFee,
      school_amount: schoolAmount,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Verify a transaction and record payment
async function verifyTransaction(params: { reference: string }) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${params.reference}`, {
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const data = await response.json();
  console.log('Verify transaction response:', data);

  if (!data.status) {
    throw new Error(data.message || 'Failed to verify transaction');
  }

  const transaction = data.data;
  
  if (transaction.status === 'success') {
    // Extract metadata
    const metadata = transaction.metadata?.custom_fields || [];
    const getMetaValue = (name: string) => 
      metadata.find((f: any) => f.variable_name === name)?.value;

    const studentId = getMetaValue('student_id');
    const feeTypeId = getMetaValue('fee_type_id');
    const session = getMetaValue('session');
    const term = getMetaValue('term');
    const platformFee = parseFloat(getMetaValue('platform_fee') || '0');
    const schoolAmount = parseFloat(getMetaValue('school_amount') || '0');

    // Record the payment in the database
    const { data: payment, error } = await supabase
      .from('fee_payments')
      .insert({
        student_id: studentId,
        fee_type_id: feeTypeId,
        session: session,
        term: term,
        amount_paid: transaction.amount / 100, // Convert from kobo
        payment_method: 'paystack',
        paystack_reference: params.reference,
        transaction_reference: transaction.reference,
        platform_fee: platformFee,
        school_amount: schoolAmount,
        receipt_number: `RCT-${Date.now()}`,
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording payment:', error);
      throw new Error('Payment verified but failed to record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        payment: payment,
        transaction: {
          reference: transaction.reference,
          amount: transaction.amount / 100,
          currency: transaction.currency,
          paid_at: transaction.paid_at,
          channel: transaction.channel,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      verified: false,
      status: transaction.status,
      message: `Transaction ${transaction.status}`,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Create a subaccount for the school
async function createSubaccount(params: {
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number;
}) {
  const response = await fetch('https://api.paystack.co/subaccount', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      business_name: params.business_name,
      bank_code: params.bank_code,
      account_number: params.account_number,
      percentage_charge: params.percentage_charge || 95, // 95% goes to school
    }),
  });

  const data = await response.json();
  console.log('Create subaccount response:', data);

  if (!data.status) {
    throw new Error(data.message || 'Failed to create subaccount');
  }

  // Save subaccount code to settings
  await supabase
    .from('payment_gateway_settings')
    .upsert({
      gateway_name: 'paystack',
      school_subaccount_code: data.data.subaccount_code,
      school_bank_name: data.data.settlement_bank,
      school_account_number: params.account_number,
      school_account_name: data.data.business_name,
      school_percentage: params.percentage_charge || 95,
      platform_percentage: 100 - (params.percentage_charge || 95),
      is_active: true,
    });

  return new Response(
    JSON.stringify({
      success: true,
      subaccount_code: data.data.subaccount_code,
      business_name: data.data.business_name,
      bank: data.data.settlement_bank,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Create a transaction split for 5%/95% distribution
async function createTransactionSplit(params: {
  subaccount_code: string;
}) {
  // Get platform account info (if needed)
  const response = await fetch('https://api.paystack.co/split', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'School Fee Split',
      type: 'percentage',
      currency: 'NGN',
      subaccounts: [
        {
          subaccount: params.subaccount_code,
          share: 95, // School gets 95%
        }
      ],
      bearer_type: 'account',
      bearer_subaccount: params.subaccount_code,
    }),
  });

  const data = await response.json();
  console.log('Create split response:', data);

  if (!data.status) {
    throw new Error(data.message || 'Failed to create transaction split');
  }

  // Save split code to settings
  await supabase
    .from('payment_gateway_settings')
    .update({
      split_code: data.data.split_code,
    })
    .eq('gateway_name', 'paystack');

  return new Response(
    JSON.stringify({
      success: true,
      split_code: data.data.split_code,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// List Nigerian banks
async function listBanks() {
  const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
    headers: {
      'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || 'Failed to fetch banks');
  }

  return new Response(
    JSON.stringify({
      success: true,
      banks: data.data.map((bank: any) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug,
      })),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Verify bank account number
async function verifyAccountNumber(params: {
  account_number: string;
  bank_code: string;
}) {
  const response = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${params.account_number}&bank_code=${params.bank_code}`,
    {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const data = await response.json();
  console.log('Verify account response:', data);

  if (!data.status) {
    throw new Error(data.message || 'Failed to verify account');
  }

  return new Response(
    JSON.stringify({
      success: true,
      account_name: data.data.account_name,
      account_number: data.data.account_number,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
