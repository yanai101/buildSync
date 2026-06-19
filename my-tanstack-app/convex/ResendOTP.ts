import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 10, // 10 minutes
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    
    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const verificationUrl = `${siteUrl}/register?verifyCode=${token}&email=${encodeURIComponent(email)}`;
    
    const { error } = await resend.emails.send({
      from: "BuildSync <support@buildsync.co.il>",
      to: [email],
      subject: `אימות חשבון BuildSync`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
          <h2>ברוך הבא ל-BuildSync!</h2>
          <p>כדי להשלים את ההרשמה ולאמת את כתובת האימייל שלך, לחץ על הכפתור למטה:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066FF; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">אמת אימייל עכשיו</a>
          <p style="margin-top: 24px;">או העתק את הקישור הבא לדפדפן:</p>
          <p dir="ltr" style="text-align: left; font-size: 12px; color: #666; word-break: break-all;">
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error("Could not send email: " + error.message);
    }
  },
});
