import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderEmailRequest {
  studentName: string;
  parentEmail: string;
  admissionNumber: string;
  className: string;
  feeType: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(resendApiKey);
    const data: ReminderEmailRequest = await req.json();

    console.log('Sending fee reminder to:', data.parentEmail);

    const primaryColor = data.schoolInfo.primaryColor || '#1e3a5f';
    const warningColor = '#d97706';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fee Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
        ${data.schoolInfo.logoUrl ? `<img src="${data.schoolInfo.logoUrl}" alt="${data.schoolInfo.name}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${data.schoolInfo.name}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${data.schoolInfo.address}</p>
      </td>
    </tr>
    
    <!-- Warning Banner -->
    <tr>
      <td style="padding: 20px 30px; background-color: #fef3c7; border-left: 4px solid ${warningColor};">
        <h2 style="margin: 0; color: ${warningColor}; font-size: 18px; display: flex; align-items: center;">
          ⚠️ Fee Payment Reminder
        </h2>
        <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">
          This is a friendly reminder about outstanding school fees.
        </p>
      </td>
    </tr>
    
    <!-- Student Details -->
    <tr>
      <td style="padding: 25px 30px;">
        <p style="margin: 0 0 20px; color: #333; font-size: 15px;">Dear Parent/Guardian,</p>
        <p style="margin: 0 0 20px; color: #555; font-size: 14px; line-height: 1.6;">
          We would like to bring to your attention that there is an outstanding balance on your child's school fees account. 
          Please find the details below:
        </p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Student Name:</strong>
                    <span style="color: #555;">${data.studentName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Admission No:</strong>
                    <span style="color: #555;">${data.admissionNumber}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Class:</strong>
                    <span style="color: #555;">${data.className}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Session/Term:</strong>
                    <span style="color: #555;">${data.session} - ${data.term.charAt(0).toUpperCase() + data.term.slice(1)} Term</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Payment Summary -->
    <tr>
      <td style="padding: 0 30px 25px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border: 2px solid ${warningColor}; border-radius: 8px;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 15px; color: ${warningColor}; font-size: 16px;">Payment Summary - ${data.feeType}</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">
                    <span style="color: #333;">Total Amount Due:</span>
                    <span style="color: #333; float: right; font-weight: 600;">₦${data.totalAmount.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">
                    <span style="color: #22c55e;">Amount Paid:</span>
                    <span style="color: #22c55e; float: right; font-weight: 600;">₦${data.amountPaid.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 5px;">
                    <span style="color: #dc2626; font-size: 16px; font-weight: 600;">Outstanding Balance:</span>
                    <span style="color: #dc2626; float: right; font-size: 20px; font-weight: 700;">₦${data.balance.toLocaleString()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Call to Action -->
    <tr>
      <td style="padding: 0 30px 25px; text-align: center;">
        <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 15px;">
          We kindly request that you make arrangements to clear the outstanding balance at your earliest convenience. 
          You can make payment via bank transfer or visit the school's accounts department.
        </p>
        <p style="color: #555; font-size: 14px; margin: 0;">
          If you have already made the payment, please disregard this reminder.
        </p>
      </td>
    </tr>
    
    <!-- Contact Info -->
    <tr>
      <td style="padding: 20px 30px; background-color: #f8f9fa;">
        <p style="color: #666; font-size: 13px; margin: 0; text-align: center;">
          For any inquiries, please contact us at:<br>
          <strong>Tel:</strong> ${data.schoolInfo.phone} | <strong>Email:</strong> ${data.schoolInfo.email}
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 15px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e5e5e5;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          This is an automated reminder from ${data.schoolInfo.name}.
        </p>
      </td>
    </tr>
    
    <!-- Bottom Border -->
    <tr>
      <td style="height: 5px; background-color: ${primaryColor};"></td>
    </tr>
  </table>
</body>
</html>
    `;

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${data.schoolInfo.name} <onboarding@resend.dev>`,
      to: [data.parentEmail],
      subject: `Fee Payment Reminder - ${data.studentName} (${data.admissionNumber})`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    console.log('Fee reminder sent successfully:', emailResult);

    return new Response(JSON.stringify({ success: true, emailId: emailResult?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-fee-reminder:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});