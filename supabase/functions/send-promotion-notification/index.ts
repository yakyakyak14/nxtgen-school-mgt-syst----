import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromotionNotificationRequest {
  parentEmail: string;
  parentName: string;
  studentName: string;
  previousClass: string;
  newClass: string;
  action: 'promoted' | 'retained' | 'graduated';
  session: string;
  schoolInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      parentEmail,
      parentName,
      studentName,
      previousClass,
      newClass,
      action,
      session,
      schoolInfo,
    }: PromotionNotificationRequest = await req.json();

    console.log(`Sending ${action} notification for ${studentName} to ${parentEmail}`);

    const actionText = {
      promoted: `has been promoted from ${previousClass} to ${newClass}`,
      retained: `will be repeating ${previousClass} for the upcoming academic session`,
      graduated: `has successfully completed their studies and graduated from ${previousClass}`,
    };

    const actionColor = {
      promoted: '#22c55e',
      retained: '#f59e0b',
      graduated: '#3b82f6',
    };

    const actionTitle = {
      promoted: 'Promotion Notification',
      retained: 'Academic Status Update',
      graduated: 'Graduation Notification',
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">${schoolInfo.name}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${actionTitle[action]}</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Dear ${parentName},</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                We are pleased to inform you that your ward, <strong>${studentName}</strong>, 
                ${actionText[action]} for the ${session} academic session.
              </p>
              
              <div style="background: ${actionColor[action]}15; border-left: 4px solid ${actionColor[action]}; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #374151;">
                  <strong>Student:</strong> ${studentName}<br>
                  <strong>Previous Class:</strong> ${previousClass}<br>
                  ${action !== 'retained' ? `<strong>New Status:</strong> ${newClass}` : `<strong>Status:</strong> Repeating ${previousClass}`}
                </p>
              </div>
              
              ${action === 'promoted' ? `
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  We congratulate you and your ward on this achievement. We look forward to continued 
                  academic excellence in the new class.
                </p>
              ` : action === 'retained' ? `
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  This decision was made after careful consideration and in the best interest of your 
                  ward's academic development. We believe this will help strengthen their foundation 
                  for future success.
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Please feel free to contact the school for a meeting to discuss your ward's 
                  academic progress and how we can work together to support them.
                </p>
              ` : `
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Congratulations on this milestone achievement! We wish your ward all the best 
                  in their future endeavors.
                </p>
              `}
              
              <p style="color: #374151; font-size: 16px; margin-top: 25px;">
                Best regards,<br>
                <strong>${schoolInfo.name}</strong>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                For inquiries, please contact us at ${schoolInfo.email} or ${schoolInfo.phone}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${schoolInfo.name} <onboarding@resend.dev>`,
        to: [parentEmail],
        subject: `${actionTitle[action]} - ${studentName}`,
        html: emailHtml,
      }),
    });

    const result = await emailResponse.json();

    console.log("Promotion notification sent successfully:", result);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending promotion notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
