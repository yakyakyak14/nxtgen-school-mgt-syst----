import { Resend } from 'https://esm.sh/resend@4.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyReportEmailRequest {
  reportId: string;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { reportId }: WeeklyReportEmailRequest = await req.json();
    console.log('Processing weekly report email for report:', reportId);

    // Fetch the report with all related data
    const { data: report, error: reportError } = await supabase
      .from('weekly_reports')
      .select(`
        *,
        student:student_id(
          id,
          admission_number,
          user_id,
          profiles:user_id(first_name, last_name, email)
        ),
        class:class_id(name),
        teacher:teacher_id(
          profiles:user_id(first_name, last_name)
        )
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      console.error('Error fetching report:', reportError);
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get parent email from student_guardians
    const { data: guardians } = await supabase
      .from('student_guardians')
      .select(`
        guardian:guardian_id(
          user_id,
          profiles:user_id(email, first_name, last_name)
        )
      `)
      .eq('student_id', report.student?.id)
      .eq('is_primary', true);

    // Get school settings
    const { data: schoolSettings } = await supabase
      .from('school_settings')
      .select('*')
      .limit(1)
      .single();

    const schoolName = schoolSettings?.school_name || 'School';
    const primaryColor = schoolSettings?.primary_color || '#1e3a5f';
    const accentColor = schoolSettings?.accent_color || '#d4a84b';

    // Determine recipient email
    let recipientEmail = null;
    let recipientName = 'Parent/Guardian';

    if (guardians && guardians.length > 0) {
      const guardian = guardians[0].guardian as any;
      if (guardian?.profiles?.email) {
        recipientEmail = guardian.profiles.email;
        recipientName = `${guardian.profiles.first_name || ''} ${guardian.profiles.last_name || ''}`.trim() || 'Parent/Guardian';
      }
    }

    if (!recipientEmail) {
      console.log('No parent email found for student:', report.student?.id);
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true, 
        message: 'No parent email address found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const studentName = `${report.student?.profiles?.first_name || ''} ${report.student?.profiles?.last_name || ''}`.trim();
    const teacherName = `${report.teacher?.profiles?.first_name || ''} ${report.teacher?.profiles?.last_name || ''}`.trim();
    const className = report.class?.name || 'N/A';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Student Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: ${primaryColor}; padding: 30px; text-align: center;">
        ${schoolSettings?.logo_url ? `<img src="${schoolSettings.logo_url}" alt="${schoolName}" style="max-height: 60px; margin-bottom: 15px;">` : ''}
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${schoolName}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Weekly Student Progress Report</p>
      </td>
    </tr>
    
    <!-- Greeting -->
    <tr>
      <td style="padding: 30px 30px 20px;">
        <p style="color: #333; font-size: 16px; margin: 0;">Dear ${recipientName},</p>
        <p style="color: #555; font-size: 14px; margin: 15px 0 0;">
          Please find below the weekly progress report for your child.
        </p>
      </td>
    </tr>
    
    <!-- Student Info -->
    <tr>
      <td style="padding: 0 30px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 5px 0;">
                    <strong style="color: #333; display: inline-block; width: 120px;">Student:</strong>
                    <span style="color: #555;">${studentName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;">
                    <strong style="color: #333; display: inline-block; width: 120px;">Class:</strong>
                    <span style="color: #555;">${className}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;">
                    <strong style="color: #333; display: inline-block; width: 120px;">Week:</strong>
                    <span style="color: #555;">Week ${report.week_number}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;">
                    <strong style="color: #333; display: inline-block; width: 120px;">Term/Session:</strong>
                    <span style="color: #555;">${report.term} Term, ${report.session}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Ratings -->
    ${report.behavior_rating || report.academic_rating ? `
    <tr>
      <td style="padding: 0 30px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${report.academic_rating ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
              <strong style="color: ${primaryColor};">Academic Performance:</strong>
              <span style="color: ${accentColor}; font-weight: 600; margin-left: 10px;">${report.academic_rating}</span>
            </td>
          </tr>
          ` : ''}
          ${report.behavior_rating ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
              <strong style="color: ${primaryColor};">Behavior:</strong>
              <span style="color: ${accentColor}; font-weight: 600; margin-left: 10px;">${report.behavior_rating}</span>
            </td>
          </tr>
          ` : ''}
        </table>
      </td>
    </tr>
    ` : ''}
    
    <!-- Report Content -->
    <tr>
      <td style="padding: 0 30px 20px;">
        <h3 style="color: ${primaryColor}; margin: 0 0 15px; font-size: 16px;">Weekly Summary</h3>
        <div style="color: #555; font-size: 14px; line-height: 1.6; background-color: #fffaf0; padding: 20px; border-radius: 8px; border-left: 4px solid ${accentColor};">
          ${(report.director_summary || report.report_content || '').replace(/\n/g, '<br>')}
        </div>
      </td>
    </tr>
    
    <!-- Teacher Comments -->
    ${report.teacher_comments ? `
    <tr>
      <td style="padding: 0 30px 20px;">
        <h3 style="color: ${primaryColor}; margin: 0 0 15px; font-size: 16px;">Teacher's Comments</h3>
        <p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
          "${report.teacher_comments}"
        </p>
        <p style="color: #888; font-size: 13px; margin: 10px 0 0;">— ${teacherName}</p>
      </td>
    </tr>
    ` : ''}
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px; background-color: #f8f9fa; text-align: center;">
        <p style="color: #666; font-size: 14px; margin: 0;">
          Thank you for your continued support in your child's education.
        </p>
        <p style="color: #888; font-size: 12px; margin: 15px 0 0;">
          If you have any questions, please contact the school.
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

    console.log('Sending weekly report email to:', recipientEmail);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `${schoolName} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: `Weekly Progress Report - ${studentName} (Week ${report.week_number})`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    console.log('Email sent successfully:', emailResult);

    // Update the report to mark as sent
    await supabase
      .from('weekly_reports')
      .update({
        status: 'sent_to_parent',
        summary_sent_at: new Date().toISOString()
      })
      .eq('id', reportId);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResult?.id,
      recipient: recipientEmail 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-weekly-report-email:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
