import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptEmailRequest {
  studentName: string;
  studentEmail?: string;
  parentEmail?: string;
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
    const data: ReceiptEmailRequest = await req.json();

    const recipientEmail = data.parentEmail || data.studentEmail;
    if (!recipientEmail) {
      console.log('No recipient email provided, skipping email');
      return new Response(JSON.stringify({ success: true, skipped: true, message: 'No email address provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const primaryColor = data.schoolInfo.primaryColor || '#1e3a5f';
    const accentColor = '#d4a84b';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
        ${data.schoolInfo.logoUrl ? `<img src="${data.schoolInfo.logoUrl}" alt="${data.schoolInfo.name}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${data.schoolInfo.name}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${data.schoolInfo.address}</p>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 13px;">Tel: ${data.schoolInfo.phone} | ${data.schoolInfo.email}</p>
      </td>
    </tr>
    
    <!-- Receipt Title -->
    <tr>
      <td style="padding: 25px 30px; text-align: center; border-bottom: 2px solid ${accentColor};">
        <h2 style="margin: 0; color: ${primaryColor}; font-size: 20px;">PAYMENT RECEIPT</h2>
        <p style="margin: 10px 0 0; color: #666; font-size: 14px;">Receipt No: <strong>${data.receiptNumber}</strong></p>
      </td>
    </tr>
    
    <!-- Student Details -->
    <tr>
      <td style="padding: 25px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #333; display: inline-block; width: 140px;">Student Name:</strong>
              <span style="color: #555;">${data.studentName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #333; display: inline-block; width: 140px;">Admission No:</strong>
              <span style="color: #555;">${data.admissionNumber}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #333; display: inline-block; width: 140px;">Class:</strong>
              <span style="color: #555;">${data.className}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #333; display: inline-block; width: 140px;">Session/Term:</strong>
              <span style="color: #555;">${data.session} - ${data.term}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Payment Details Box -->
    <tr>
      <td style="padding: 0 30px 25px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffaf0; border: 1px solid ${accentColor}; border-radius: 8px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Fee Type:</strong>
                    <span style="color: #555;">${data.feeType}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Payment Method:</strong>
                    <span style="color: #555; text-transform: capitalize;">${data.paymentMethod}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Payment Date:</strong>
                    <span style="color: #555;">${data.paymentDate}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0 5px;">
                    <strong style="color: #333; display: inline-block; width: 140px; font-size: 16px;">Amount Paid:</strong>
                    <span style="color: #0a7b0a; font-size: 20px; font-weight: bold;">₦${data.amount.toLocaleString()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #888; font-size: 13px; font-style: italic; margin: 0;">This is a computer-generated receipt.</p>
        <p style="color: #666; font-size: 14px; margin: 10px 0 0;">Thank you for your payment!</p>
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

    console.log('Sending receipt email to:', recipientEmail);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${data.schoolInfo.name} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: `Payment Receipt - ${data.receiptNumber}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    console.log('Email sent successfully:', emailResult);

    return new Response(JSON.stringify({ success: true, emailId: emailResult?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-receipt-email:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
