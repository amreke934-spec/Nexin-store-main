import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey.trim());
  }
  return resendClient;
}

export interface SendOtpEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Builds a modern, Gmail & mobile-optimized responsive HTML email
 */
function buildOtpEmailHtml(otpCode: string, recipientName: string = 'عزيزنا العميل'): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز التحقق | نكسن ستور</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .content-box { padding: 24px 16px !important; }
      .otp-code { font-size: 30px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; direction: rtl; text-align: right; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="520" class="container" style="max-width: 520px; width: 100%; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #110B29 0%, #1E1242 50%, #2E1065 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #7F00FF;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(127, 0, 255, 0.2); border: 1px solid rgba(127, 0, 255, 0.4); border-radius: 14px; padding: 10px 18px; margin-bottom: 12px;">
                      <span style="font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: 1px;">NEXEN STORE</span>
                    </div>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800;">تأكيد البريد الإلكتروني</h1>
                    <p style="margin: 6px 0 0; color: #DDD6FE; font-size: 13px;">بوابة شحن الألعاب والمنتجات الرقمية</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="content-box" style="padding: 36px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #0F172A;">مرحباً ${recipientName}،</p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.7; color: #475569;">
                شكراً لانضمامك إلى <strong>نكسن ستور</strong>. لتأكيد حسابك وضمان أمان عمليات الشحن والمشتريات الخاصة بك، يرجى استخدام رمز التحقق التالي:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #FAF5FF; border: 2px dashed #7F00FF; border-radius: 16px; padding: 20px 24px; text-align: center;">
                      <div style="font-size: 12px; font-weight: 700; color: #6B21A8; margin-bottom: 8px; text-transform: uppercase;">رمز التحقق الخاص بك (OTP)</div>
                      <div class="otp-code" style="font-size: 38px; font-weight: 900; color: #581C87; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; direction: ltr; display: inline-block;">
                        ${otpCode}
                      </div>
                      <div style="margin-top: 10px; font-size: 12px; color: #7E22CE; font-weight: 600;">
                        ⏱️ صالح لمدة 10 دقائق فقط
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Spam / Junk Notice Box (Explicit User Requirement) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td style="background-color: #FEF9C3; border: 1px solid #FDE047; border-radius: 12px; padding: 12px 16px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #854D0E; font-weight: 600;">
                      💡 <strong>ملاحظة هامة:</strong> يرجى التحقق من مجلد الرسائل غير المرغوب بها (Spam / Junk) إذا لم يصلك الرمز في صندوق الوارد الرئيسي.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Advice -->
              <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.6; color: #64748B;">
                🔒 لأسباب أمنية، لا تشارك هذا الرمز مع أي شخص. لن يطلب منك فريق دعم نكسن ستور هذا الرمز أبداً. إذا لم تكن أنت من قام بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #334155;">
                متجر نكسن ستور | Nexen Store
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                منصة رقمية موثوقة لخدمات الشحن والبطاقات الرقمية &bull; دمشق، سوريا
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends OTP Email via Resend with sender no-reply@nexin-store.top
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  otpCode: string,
  recipientName?: string
): Promise<SendOtpEmailResult> {
  const cleanEmail = toEmail.trim().toLowerCase();
  const resend = getResendClient();

  const html = buildOtpEmailHtml(otpCode, recipientName || 'عزيزنا العميل');
  const subject = `رمز التحقق الخاص بك: ${otpCode} | نكسن ستور`;

  if (!resend) {
    console.warn(`[Resend Email] RESEND_API_KEY is not configured in .env. Falling back to console logging.`);
    console.log(`=======================================================`);
    console.log(`📧 [Simulated Email to: ${cleanEmail}]`);
    console.log(`🔑 Verification OTP Code: >>> ${otpCode} <<< (Expires in 10 min)`);
    console.log(`=======================================================`);
    return {
      success: true,
      isSimulated: true,
      messageId: `sim-${Date.now()}`,
    };
  }

  try {
    const data = await resend.emails.send({
      from: 'Nexen Store <no-reply@nexin-store.top>',
      to: [cleanEmail],
      subject,
      html,
    });

    if (data.error) {
      console.error('[Resend Error]', data.error);
      return {
        success: false,
        error: data.error.message || 'فشل إرسال البريد الإلكتروني عبر Resend',
      };
    }

    console.log(`[Resend Success] Email sent to ${cleanEmail} (ID: ${data.data?.id})`);
    return {
      success: true,
      messageId: data.data?.id,
    };
  } catch (err: any) {
    console.error('[Resend Exception]', err);

    // Handle rate limits or other HTTP errors
    const errorMessage = err?.message || String(err);
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      return {
        success: false,
        error: 'تم تجاوز حد إرسال الرسائل المؤقت. يرجى الانتظار دقيقة والمحاولة مجدداً.',
      };
    }

    return {
      success: false,
      error: `تعذر إرسال الرمز: ${errorMessage}`,
    };
  }
}
