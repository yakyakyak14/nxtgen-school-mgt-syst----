import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SchoolStatusNotificationRequest {
  schoolId: string;
  schoolName: string;
  isActive: boolean;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user is a super_admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is super_admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (!userRole) {
      throw new Error("Only super admins can send status notifications");
    }

    const { schoolId, schoolName, isActive, reason }: SchoolStatusNotificationRequest = await req.json();

    // Find all directors for this school
    const { data: directors, error: directorsError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner (
          email,
          first_name,
          last_name
        )
      `)
      .eq('school_id', schoolId)
      .eq('role', 'director');

    if (directorsError) {
      console.error("Error fetching directors:", directorsError);
      throw new Error("Failed to fetch school directors");
    }

    if (!directors || directors.length === 0) {
      console.log("No directors found for school:", schoolId);
      return new Response(
        JSON.stringify({ success: true, message: "No directors to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const statusText = isActive ? "Activated" : "Deactivated";
    const statusColor = isActive ? "#22c55e" : "#ef4444";

    // Send email to each director
    const emailPromises = directors.map(async (director: any) => {
      const directorName = director.profiles?.first_name 
        ? `${director.profiles.first_name} ${director.profiles.last_name || ''}`.trim()
        : 'Director';
      
      const directorEmail = director.profiles?.email;
      if (!directorEmail) return null;

      return resend.emails.send({
        from: "School Management <onboarding@resend.dev>",
        to: [directorEmail],
        subject: `Important: ${schoolName} has been ${statusText.toLowerCase()}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a3d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">School Status Update</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">Dear ${directorName},</p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="text-align: center; margin-bottom: 15px;">
                  <span style="display: inline-block; background: ${statusColor}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 18px;">
                    ${statusText}
                  </span>
                </div>
                <p style="text-align: center; font-size: 18px; font-weight: 600; margin: 0;">
                  ${schoolName}
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                ${isActive 
                  ? "Your school has been activated. All features are now accessible, and staff members can log in and use the system normally."
                  : "Your school has been deactivated by the platform administrator. During this period, access to the system may be limited."
                }
              </p>
              
              ${reason ? `
                <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px;">
                    <strong>Reason:</strong> ${reason}
                  </p>
                </div>
              ` : ''}
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                ${isActive 
                  ? "If you have any questions, please don't hesitate to contact our support team."
                  : "If you believe this was done in error or have any questions, please contact the platform administrator immediately."
                }
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                This is an automated notification from the School Management System.
              </p>
            </div>
          </body>
          </html>
        `,
      });
    });

    const results = await Promise.allSettled(emailPromises.filter(Boolean));
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`School status notification: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-school-status function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
