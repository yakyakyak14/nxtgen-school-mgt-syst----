import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Obligation {
  id: string;
  student_id: string;
  fee_type_id: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  session: string;
  term: string;
}

interface Student {
  id: string;
  admission_number: string;
  user_id: string | null;
  classes: { name: string }[] | null;
}

interface FeeType {
  id: string;
  name: string;
}

interface SchoolSettings {
  school_name: string;
  school_address: string | null;
  school_phone: string | null;
  school_email: string | null;
  primary_color: string | null;
  logo_url: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    console.log('Starting scheduled fee reminder job...');

    // Get school settings
    const { data: schoolSettings } = await supabase
      .from('school_settings')
      .select('*')
      .single();

    const school: SchoolSettings = schoolSettings || {
      school_name: 'School Management System',
      school_address: '',
      school_phone: '',
      school_email: '',
      primary_color: '#1e3a5f',
      logo_url: null,
    };

    // Get all outstanding obligations (pending or partial)
    const { data: obligations, error: obError } = await supabase
      .from('student_fee_obligations')
      .select('*')
      .in('status', ['pending', 'partial'])
      .gt('balance', 0);

    if (obError) {
      console.error('Error fetching obligations:', obError);
      throw obError;
    }

    if (!obligations || obligations.length === 0) {
      console.log('No outstanding obligations found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No outstanding obligations to remind',
        sent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${obligations.length} outstanding obligations`);

    // Get unique student IDs and fee type IDs
    const studentIds = [...new Set(obligations.map((o: Obligation) => o.student_id))];
    const feeTypeIds = [...new Set(obligations.map((o: Obligation) => o.fee_type_id))];

    // Fetch students
    const { data: students } = await supabase
      .from('students')
      .select('id, admission_number, user_id, classes(name)')
      .in('id', studentIds);

    // Fetch fee types
    const { data: feeTypes } = await supabase
      .from('fee_types')
      .select('id, name')
      .in('id', feeTypeIds);

    // Get user IDs for profiles
    const userIds = (students || []).map((s: any) => s.user_id).filter(Boolean);

    // Fetch profiles with email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    // Create lookup maps
    const studentsMap = new Map((students || []).map((s: any) => [s.id, s]));
    const feeTypesMap = new Map((feeTypes || []).map((f: FeeType) => [f.id, f]));
    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    let sentCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each obligation
    for (const obligation of obligations) {
      try {
        const student = studentsMap.get(obligation.student_id);
        if (!student || !student.user_id) {
          console.log(`Skipping obligation ${obligation.id}: No student or user_id found`);
          continue;
        }

        const profile = profilesMap.get(student.user_id);
        if (!profile || !profile.email) {
          console.log(`Skipping obligation ${obligation.id}: No email found for student ${student.admission_number}`);
          continue;
        }

        const feeType = feeTypesMap.get(obligation.fee_type_id);
        const studentName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || student.admission_number;

        const primaryColor = school.primary_color || '#1e3a5f';
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
    <tr>
      <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
        ${school.logo_url ? `<img src="${school.logo_url}" alt="${school.school_name}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${school.school_name}</h1>
        ${school.school_address ? `<p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${school.school_address}</p>` : ''}
      </td>
    </tr>
    
    <tr>
      <td style="padding: 20px 30px; background-color: #fef3c7; border-left: 4px solid ${warningColor};">
        <h2 style="margin: 0; color: ${warningColor}; font-size: 18px;">⚠️ Fee Payment Reminder</h2>
        <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">This is a friendly reminder about outstanding school fees.</p>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 25px 30px;">
        <p style="margin: 0 0 20px; color: #333; font-size: 15px;">Dear Parent/Guardian,</p>
        <p style="margin: 0 0 20px; color: #555; font-size: 14px; line-height: 1.6;">
          We would like to bring to your attention that there is an outstanding balance on your child's school fees account.
        </p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Student Name:</strong>
                    <span style="color: #555;">${studentName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Admission No:</strong>
                    <span style="color: #555;">${student.admission_number}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Class:</strong>
                    <span style="color: #555;">${student.classes?.[0]?.name || 'N/A'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <strong style="color: #333; display: inline-block; width: 140px;">Session/Term:</strong>
                    <span style="color: #555;">${obligation.session} - ${obligation.term.charAt(0).toUpperCase() + obligation.term.slice(1)} Term</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 0 30px 25px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border: 2px solid ${warningColor}; border-radius: 8px;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 15px; color: ${warningColor}; font-size: 16px;">Payment Summary - ${feeType?.name || 'School Fees'}</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">
                    <span style="color: #333;">Total Amount Due:</span>
                    <span style="color: #333; float: right; font-weight: 600;">₦${obligation.total_amount.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">
                    <span style="color: #22c55e;">Amount Paid:</span>
                    <span style="color: #22c55e; float: right; font-weight: 600;">₦${obligation.amount_paid.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 5px;">
                    <span style="color: #dc2626; font-size: 16px; font-weight: 600;">Outstanding Balance:</span>
                    <span style="color: #dc2626; float: right; font-size: 20px; font-weight: 700;">₦${(obligation.balance || 0).toLocaleString()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 0 30px 25px; text-align: center;">
        <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 15px;">
          We kindly request that you make arrangements to clear the outstanding balance at your earliest convenience.
        </p>
        <p style="color: #555; font-size: 14px; margin: 0;">If you have already made the payment, please disregard this reminder.</p>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 20px 30px; background-color: #f8f9fa;">
        <p style="color: #666; font-size: 13px; margin: 0; text-align: center;">
          For any inquiries, please contact us at:<br>
          ${school.school_phone ? `<strong>Tel:</strong> ${school.school_phone}` : ''} 
          ${school.school_email ? `| <strong>Email:</strong> ${school.school_email}` : ''}
        </p>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 15px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e5e5e5;">
        <p style="color: #888; font-size: 12px; margin: 0;">This is an automated reminder from ${school.school_name}.</p>
      </td>
    </tr>
    
    <tr>
      <td style="height: 5px; background-color: ${primaryColor};"></td>
    </tr>
  </table>
</body>
</html>`;

        const { error: emailError } = await resend.emails.send({
          from: `${school.school_name} <onboarding@resend.dev>`,
          to: [profile.email],
          subject: `Fee Payment Reminder - ${studentName} (${student.admission_number})`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          errorCount++;
          errors.push(`${profile.email}: ${emailError.message}`);
        } else {
          console.log(`Reminder sent to ${profile.email} for ${studentName}`);
          sentCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error processing obligation ${obligation.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Scheduled reminders complete. Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: sentCount, 
      errors: errorCount,
      errorDetails: errors.slice(0, 10), // Only first 10 errors
      message: `Sent ${sentCount} reminder emails` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in scheduled-fee-reminders:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
