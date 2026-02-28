import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

async function sendReceiptEmail(paymentData: {
  studentName: string;
  parentEmail: string;
  admissionNumber: string;
  className: string;
  feeType: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  receiptNumber: string;
  session: string;
  term: string;
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    primaryColor?: string;
    logoUrl?: string;
  };
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey || !paymentData.parentEmail) {
    console.log('Skipping email: no API key or recipient email');
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    const primaryColor = paymentData.schoolInfo.primaryColor || '#1e3a5f';
    const accentColor = '#d4a84b';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${paymentData.schoolInfo.name}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${paymentData.schoolInfo.address}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 25px 30px; text-align: center; border-bottom: 2px solid ${accentColor};">
        <h2 style="margin: 0; color: ${primaryColor}; font-size: 20px;">PAYMENT RECEIPT</h2>
        <p style="margin: 10px 0 0; color: #666; font-size: 14px;">Receipt No: <strong>${paymentData.receiptNumber}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 25px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Student:</strong> ${paymentData.studentName}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Admission No:</strong> ${paymentData.admissionNumber}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Class:</strong> ${paymentData.className}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Fee Type:</strong> ${paymentData.feeType}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Session/Term:</strong> ${paymentData.session} - ${paymentData.term}</td></tr>
          <tr><td style="padding: 15px 0;"><strong>Amount Paid:</strong> <span style="color: #0a7b0a; font-size: 20px; font-weight: bold;">₦${paymentData.amount.toLocaleString()}</span></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #888; font-size: 13px; font-style: italic; margin: 0;">This is a computer-generated receipt.</p>
        <p style="color: #666; font-size: 14px; margin: 10px 0 0;">Thank you for your payment!</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: `${paymentData.schoolInfo.name} <onboarding@resend.dev>`,
      to: [paymentData.parentEmail],
      subject: `Payment Receipt - ${paymentData.receiptNumber}`,
      html: emailHtml,
    });

    console.log('Receipt email sent to:', paymentData.parentEmail);
  } catch (error) {
    console.error('Failed to send receipt email:', error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Paystack not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    if (signature) {
      const hash = createHmac('sha512', paystackSecretKey)
        .update(body)
        .digest('hex');
      
      if (hash !== signature) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const event = JSON.parse(body);
    console.log('Received Paystack webhook event:', event.event);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.event) {
      case 'charge.success': {
        const data = event.data;
        const metadata = data.metadata || {};
        
        console.log('Payment successful:', {
          reference: data.reference,
          amount: data.amount / 100,
          email: data.customer?.email,
          metadata,
        });

        const receiptNumber = `RCP${Date.now().toString(36).toUpperCase()}`;
        const amount = data.amount / 100;
        const platformFee = amount * 0.05;
        const schoolAmount = amount * 0.95;

        const { error: paymentError } = await supabase
          .from('fee_payments')
          .insert({
            student_id: metadata.student_id,
            fee_type_id: metadata.fee_type_id,
            amount_paid: amount,
            payment_method: 'online',
            term: metadata.term || 'first',
            session: metadata.session || '2024/2025',
            receipt_number: receiptNumber,
            paystack_reference: data.reference,
            transaction_reference: data.reference,
            platform_fee: platformFee,
            school_amount: schoolAmount,
          });

        if (paymentError) {
          console.error('Error recording payment:', paymentError);
          return new Response(JSON.stringify({ error: 'Failed to record payment' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Payment recorded successfully:', receiptNumber);

        // Fetch student and school details for email
        if (metadata.student_id) {
          const { data: studentData } = await supabase
            .from('students')
            .select('admission_number')
            .eq('id', metadata.student_id)
            .single();

          const { data: classData } = await supabase
            .from('students')
            .select('class_id')
            .eq('id', metadata.student_id)
            .single();

          let className = 'N/A';
          if (classData?.class_id) {
            const { data: classInfo } = await supabase
              .from('classes')
              .select('name')
              .eq('id', classData.class_id)
              .single();
            className = classInfo?.name || 'N/A';
          }

          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', metadata.student_id)
            .single();

          const { data: feeTypeData } = await supabase
            .from('fee_types')
            .select('name')
            .eq('id', metadata.fee_type_id)
            .single();

          const { data: schoolData } = await supabase
            .from('school_settings')
            .select('school_name, school_address, school_phone, school_email, primary_color, logo_url')
            .limit(1)
            .single();

          // Try to get parent email from Paystack customer or guardian
          let parentEmail = data.customer?.email;
          if (!parentEmail) {
            const { data: guardianLinks } = await supabase
              .from('student_guardians')
              .select('guardian_id')
              .eq('student_id', metadata.student_id)
              .eq('is_primary', true)
              .limit(1);

            if (guardianLinks && guardianLinks.length > 0) {
              const { data: guardian } = await supabase
                .from('guardians')
                .select('user_id')
                .eq('id', guardianLinks[0].guardian_id)
                .single();

              if (guardian?.user_id) {
                const { data: guardianProfile } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', guardian.user_id)
                  .single();
                
                parentEmail = guardianProfile?.email;
              }
            }
          }

          if (studentData && schoolData && parentEmail) {
            await sendReceiptEmail({
              studentName: `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || 'Student',
              parentEmail,
              admissionNumber: studentData.admission_number,
              className,
              feeType: feeTypeData?.name || 'School Fee',
              amount,
              paymentMethod: 'Online',
              paymentDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              receiptNumber,
              session: metadata.session || '2024/2025',
              term: metadata.term || 'first',
              schoolInfo: {
                name: schoolData.school_name,
                address: schoolData.school_address || '',
                phone: schoolData.school_phone || '',
                email: schoolData.school_email || '',
                primaryColor: schoolData.primary_color,
                logoUrl: schoolData.logo_url,
              },
            });
          }
        }
        break;
      }

      case 'charge.failed':
        console.log('Payment failed:', event.data.reference);
        break;

      case 'transfer.success':
        console.log('Transfer successful:', event.data.reference);
        break;

      case 'transfer.failed':
        console.log('Transfer failed:', event.data.reference);
        break;

      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
