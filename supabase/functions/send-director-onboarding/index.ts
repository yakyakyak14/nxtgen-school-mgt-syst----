import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OnboardingRequest {
  email: string;
  directorName: string;
  schoolId: string;
  schoolName: string;
  inviterName: string;
  customMessage: string;
  subject: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Verify the caller is a super_admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (!roleData) {
      throw new Error("Only super admins can send director onboarding invitations");
    }

    const { email, directorName, schoolId, schoolName, inviterName, customMessage, subject }: OnboardingRequest = await req.json();

    // Create the invitation record with role = director
    const { data: invitation, error: invError } = await supabase
      .from("invitations")
      .insert({
        email,
        role: "director",
        school_id: schoolId,
        invited_by: user.id,
      })
      .select()
      .single();

    if (invError) {
      console.error("Error creating invitation:", invError);
      throw new Error(invError.message);
    }

    const appUrl = Deno.env.get("APP_URL") || "";
    const inviteLink = `${appUrl}/accept-invite?token=${invitation.token}`;

    // Convert the plain text message to HTML paragraphs
    const messageHtml = customMessage
      .split("\n\n")
      .map((para: string) => {
        // Handle bullet points
        if (para.includes("•")) {
          const items = para.split("\n").filter((l: string) => l.trim());
          const listItems = items.map((item: string) => `<li style="margin-bottom: 6px;">${item.replace("•", "").trim()}</li>`).join("");
          return `<ul style="padding-left: 20px; margin: 16px 0;">${listItems}</ul>`;
        }
        return `<p style="font-size: 16px; margin-bottom: 16px; line-height: 1.6;">${para.replace(/\n/g, "<br>")}</p>`;
      })
      .join("");

    const emailResponse = await resend.emails.send({
      from: "School Management <onboarding@resend.dev>",
      to: [email],
      subject: subject || `You've been invited to direct ${schoolName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a3d 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to the Platform</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Director Onboarding Invitation</p>
          </div>
          <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            ${messageHtml}
            
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="margin: 0 0 12px; font-size: 15px; color: #0369a1;">Your Director Privileges:</h3>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569;">
                <li style="margin-bottom: 6px;">Full administrative access to ${schoolName}</li>
                <li style="margin-bottom: 6px;">Appoint & manage all staff roles (Principals, Teachers, Admin Staff, etc.)</li>
                <li style="margin-bottom: 6px;">Financial oversight including fees and payroll</li>
                <li style="margin-bottom: 6px;">Student enrollment and academic management</li>
                <li style="margin-bottom: 6px;">School branding and configuration settings</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteLink}" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a3d 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; display: inline-block;">
                Accept Invitation & Set Up Your School
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Sent by ${inviterName} via School Management Platform<br>
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteLink}" style="color: #1e3a5f; word-break: break-all;">${inviteLink}</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Director onboarding email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, invitation }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-director-onboarding function:", error);
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
