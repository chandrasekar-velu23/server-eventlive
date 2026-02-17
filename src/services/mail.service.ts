import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { config } from "../config";

/* ===================================================================
 * EMAIL CONFIGURATION
 * =================================================================== */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email configuration
const EMAIL_CONFIG = {
  from: {
    support: `"EventLive Support" <${process.env.EMAIL_USER}>`,
    security: `"EventLive Security" <${process.env.EMAIL_USER}>`,
    events: `"EventLive Events" <${process.env.EMAIL_USER}>`,
    system: `"EventLive System" <${process.env.EMAIL_USER}>`,
    feedback: `"EventLive Feedback" <${process.env.EMAIL_USER}>`,
  },
  replyTo: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
  adminEmail: process.env.ADMIN_EMAIL || "chandrasekarvelu23@gmail.com",
};

/* ===================================================================
 * LOGO EMBEDDING
 * =================================================================== */

/**
 * Convert SVG logo to base64 data URI for embedding
 */
const getLogoDataURI = (): string => {
  try {
    // Attempt to load from standard location, but don't crash if missing
    const logoPaths = [
      path.resolve(__dirname, "../../../eventlive-client/public/logo-eventlive.svg"),
      path.resolve(__dirname, "../../client/public/logo-eventlive.svg"),
      path.resolve(process.cwd(), "public/logo-eventlive.svg")
    ];

    for (const logoPath of logoPaths) {
      if (fs.existsSync(logoPath)) {
        const logoSvg = fs.readFileSync(logoPath, "utf8");
        const base64Logo = Buffer.from(logoSvg).toString("base64");
        return `data:image/svg+xml;base64,${base64Logo}`;
      }
    }

    // If no logo found, return empty string (silent fallback)
    console.log("Logo file not found, using default/empty logo.");
    return "";
  } catch (error) {
    console.warn("Failed to load logo (non-fatal):", error instanceof Error ? error.message : String(error));
    return "";
  }
};

const LOGO_DATA_URI = getLogoDataURI();

/* ===================================================================
 * HELPER FUNCTIONS
 * =================================================================== */

/**
 * Get time-based greeting
 */
const getGreetingTime = (): string => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good Morning";
  if (currentHour < 18) return "Good Afternoon";
  return "Good Evening";
};

const getUnsubscribeLink = (email: string): string => {
  return `${config.frontendUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
};

/**
 * Generate iCalendar (ICS) string
 */
const generateICS = (
  eventTitle: string,
  description: string,
  startTime: Date,
  endTime: Date,
  location: string = "Virtual - EventLive",
  organizerName: string = "EventLive",
  organizerEmail: string = "no-reply@eventlive.com"
): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const now = formatDate(new Date());
  const start = formatDate(new Date(startTime));
  const end = formatDate(new Date(endTime));

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EventLive//Virtual Events//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${now}-${startTime.getTime()}@eventlive.com
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${eventTitle}
DESCRIPTION:${description}
LOCATION:${location}
ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`.trim();
};

/* ===================================================================
 * MODERN RESPONSIVE EMAIL TEMPLATE
 * =================================================================== */

const baseTemplate = (content: string, email: string = "") => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>EventLive</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* ===== CLIENT-SPECIFIC STYLES ===== */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* ===== RESET STYLES ===== */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* ===== CONTAINER ===== */
    .email-wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 20px 0;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    /* ===== HEADER ===== */
      text-align: center;
      padding: 40px 20px;
      // Indigo Gradient
      background: linear-gradient(135deg, #4F46E5 0%, #4338ca 100%);
      position: relative;
    }
    
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3730A3 0%, #4338ca 100%);
    }
    
    .logo-container {
      display: inline-block;
    }
    
    .logo-img {
      display: block;
      width: 200px;
      height: auto;
      margin: 0 auto;
      max-width: 100%;
    }
    
    .logo-text {
      display: block;
      margin-top: 16px;
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      text-decoration: none;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .tagline {
      display: block;
      margin-top: 8px;
      font-size: 14px;
      color: rgba(255,255,255,0.9);
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    
    /* ===== CONTENT ===== */
    .content {
      padding: 48px 40px;
    }
    
    h1, h2, h3, h4 {
      margin: 0 0 20px 0;
      font-weight: 600;
      color: #111827;
      line-height: 1.3;
    }
    
    h1 { font-size: 32px; margin-bottom: 16px; }
    h2 { font-size: 28px; margin-bottom: 16px; }
    h3 { font-size: 24px; margin-bottom: 12px; }
    h4 { font-size: 20px; margin-bottom: 12px; }
    
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
      font-size: 16px;
      line-height: 1.7;
    }
    
    strong {
      color: #111827;
      font-weight: 600;
    }
    
    /* ===== BUTTONS ===== */
    .btn {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #4F46E5 0%, #4338ca 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(255, 87, 34, 0.3);
      border: none;
      cursor: pointer;
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(255, 87, 34, 0.4);
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .btn-secondary:hover {
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }
    
    .btn-outline {
      background: transparent;
      border: 2px solid #4F46E5;
      color: #4F46E5 !important;
      box-shadow: none;
    }
    
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    
    /* ===== CARDS & BOXES ===== */
    .info-box {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-left: 4px solid #0ea5e9;
      padding: 24px;
      border-radius: 10px;
      margin: 24px 0;
    }
    
    .warning-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 24px;
      border-radius: 10px;
      margin: 24px 0;
    }
    
    .success-box {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-left: 4px solid #10b981;
      padding: 24px;
      border-radius: 10px;
      margin: 24px 0;
    }
    
    .danger-box {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border-left: 4px solid #ef4444;
      padding: 24px;
      border-radius: 10px;
      margin: 24px 0;
    }
    
    .highlight-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 36px 32px;
      border-radius: 12px;
      text-align: center;
      color: #ffffff;
      margin: 32px 0;
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
    }
    
    .highlight-box h2,
    .highlight-box h3,
    .highlight-box p {
      color: #ffffff;
    }
    
    .session-code {
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 10px;
      margin: 24px 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* ===== FEATURES LIST ===== */
    .features {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 32px 28px;
      border-radius: 12px;
      margin: 32px 0;
    }
    
    .features h3 {
      margin-top: 0;
      color: #0c4a6e;
    }
    
    .feature-item {
      margin-bottom: 16px;
      padding-left: 32px;
      position: relative;
      color: #1f2937;
      font-size: 15px;
      line-height: 1.6;
    }
    
    .feature-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      top: 0;
      color: #10b981;
      font-weight: bold;
      font-size: 20px;
      width: 24px;
      height: 24px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* ===== DIVIDER ===== */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, #e5e7eb 50%, transparent 100%);
      margin: 32px 0;
    }
    
    /* ===== FOOTER ===== */
    .footer {
      text-align: center;
      padding: 40px 32px;
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border-top: 1px solid #e5e7eb;
    }
    
    .footer-logo {
      font-size: 20px;
      font-weight: 700;
      color: #4F46E5;
      margin-bottom: 8px;
    }
    
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
    }
    
    .footer a {
      color: #4F46E5;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }
    
    .footer a:hover {
      color: #e64a19;
      text-decoration: underline;
    }
    
    .social-links {
      margin: 24px 0;
      padding: 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 12px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    
    .social-links a:hover {
      color: #4F46E5;
    }
    
    .copyright {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }
    
    /* ===== RESPONSIVE STYLES ===== */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 10px 0 !important;
      }
      
      .email-container {
        border-radius: 0 !important;
        margin: 0 !important;
      }
      
      .header {
        padding: 32px 20px !important;
      }
      
      .logo-img {
        width: 160px !important;
      }
      
      .logo-text {
        font-size: 28px !important;
      }
      
      .tagline {
        font-size: 12px !important;
      }
      
      .content {
        padding: 32px 24px !important;
      }
      
      h1 { font-size: 26px !important; }
      h2 { font-size: 22px !important; }
      h3 { font-size: 20px !important; }
      h4 { font-size: 18px !important; }
      
      p {
        font-size: 15px !important;
      }
      
      .btn {
        display: block !important;
        width: 100% !important;
        padding: 16px 24px !important;
        font-size: 15px !important;
      }
      
      .info-box,
      .warning-box,
      .success-box,
      .danger-box {
        padding: 20px !important;
        margin: 20px 0 !important;
      }
      
      .highlight-box {
        padding: 28px 20px !important;
        margin: 24px 0 !important;
      }
      
      .session-code {
        font-size: 22px !important;
        letter-spacing: 3px !important;
        padding: 16px !important;
      }
      
      .features {
        padding: 24px 20px !important;
      }
      
      .feature-item {
        font-size: 14px !important;
        padding-left: 28px !important;
      }
      
      .footer {
        padding: 32px 24px !important;
      }
      
      .social-links a {
        display: block !important;
        margin: 8px 0 !important;
      }
    }
    
    /* ===== DARK MODE SUPPORT ===== */
    @media (prefers-color-scheme: dark) {
      .email-wrapper {
        background-color: #111827 !important;
      }
      
      .email-container {
        background-color: #1f2937 !important;
      }
      
      .content {
        color: #e5e7eb !important;
      }
      
      h1, h2, h3, h4, strong {
        color: #f9fafb !important;
      }
      
      p {
        color: #d1d5db !important;
      }
      
      .footer {
        background: #111827 !important;
        border-top-color: #374151 !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <a href="${config.frontendUrl}" class="logo-container" style="text-decoration: none;">
          ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="EventLive Logo" class="logo-img" />` : ''}
          <span class="logo-text">EventLive</span>
          <span class="tagline">Seamless Virtual Events, Reimagined</span>
        </a>
      </div>
      
      <!-- Content -->
      <div class="content">
        ${content}
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <div class="footer-logo">EventLive</div>
        <p style="font-weight: 500; color: #4b5563;">Seamless Virtual Events, Reimagined</p>
        
        <div class="social-links">
          <a href="${config.frontendUrl}/about">About</a> •
          <a href="${config.frontendUrl}/support">Support</a> •
          <a href="${config.frontendUrl}/privacy">Privacy Policy</a> •
          <a href="${config.frontendUrl}/terms">Terms of Service</a>
        </div>
        
        ${email ? `<p><a href="${getUnsubscribeLink(email)}">Unsubscribe</a> from these emails</p>` : ''}
        
        <div class="copyright">
          <p>© ${new Date().getFullYear()} EventLive. All rights reserved.</p>
          <p>123 Virtual Street, Cloud City, CC 12345</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

/* ===================================================================
 * EMAIL FUNCTIONS
 * =================================================================== */

/**
 * 1. Send Welcome Email (Signup)
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
    <h2>${greeting}, ${name}! 👋</h2>
    <p style="font-size: 18px; color: #111827; font-weight: 500;">
      Welcome to <strong>EventLive</strong> – where virtual events come alive! We're thrilled to have you join our community of event creators and attendees.
    </p>
    
    <div class="features">
      <h3>🚀 What You Can Do with EventLive:</h3>
      <div class="feature-item"><strong>Host Virtual Events:</strong> Create and manage professional sessions effortlessly</div>
      <div class="feature-item"><strong>Engage Attendees:</strong> Interactive polls, live Q&A, and real-time chat</div>
      <div class="feature-item"><strong>Track Analytics:</strong> Monitor registrations and attendance in real-time</div>
      <div class="feature-item"><strong>Secure Platform:</strong> Enterprise-grade security for peace of mind</div>
    </div>
    
    <div class="btn-container">
      <a href="${config.frontendUrl}/dashboard" class="btn">Explore Your Dashboard</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 15px;">
        <strong>💡 Quick Tip:</strong> Start by exploring our event templates or join an upcoming event to see EventLive in action!
      </p>
    </div>
    
    <div class="divider"></div>
    
    <p style="text-align: center; color: #6b7280;">
      Need help getting started? Our support team is here for you at <a href="mailto:${EMAIL_CONFIG.replyTo}" style="color: #FF5722; font-weight: 600;">${EMAIL_CONFIG.replyTo}</a>
    </p>
  `, email);

  const plainText = `
${greeting}, ${name}!

Welcome to EventLive – where virtual events come alive! We're thrilled to have you join our community.

What You Can Do with EventLive:
✓ Host Virtual Events: Create and manage professional sessions effortlessly
✓ Engage Attendees: Interactive polls, live Q&A, and real-time chat
✓ Track Analytics: Monitor registrations and attendance in real-time
✓ Secure Platform: Enterprise-grade security for peace of mind

Get Started: ${config.frontendUrl}/dashboard

Need help? Contact us at ${EMAIL_CONFIG.replyTo}

© ${new Date().getFullYear()} EventLive. All rights reserved.
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.support,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Welcome to EventLive, ${name}! Your Virtual Event Journey Starts Here 🚀`,
      html,
      text: plainText,
    });
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
};

/**
 * 2. Send Login Notification
 */
export const sendLoginNotification = async (
  email: string,
  name: string,
  ip: string,
  device: string,
  time: string
) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
    <h3>${greeting}, ${name}</h3>
    <p>We detected a new login to your EventLive account. If this was you, you can safely ignore this email.</p>
    
    <div class="info-box">
      <p style="margin: 0 0 16px 0;"><strong>🕒 Login Details:</strong></p>
      <p style="margin: 4px 0;"><strong>Time:</strong> ${time}</p>
      <p style="margin: 4px 0;"><strong>Device:</strong> ${device}</p>
      <p style="margin: 4px 0;"><strong>IP Address:</strong> ${ip}</p>
    </div>
    
    <div class="danger-box">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">
        ⚠️ If you didn't sign in, please secure your account immediately.
      </p>
    </div>
    
    <div class="btn-container">
      <a href="${config.frontendUrl}/auth/reset-password" class="btn">Reset Password Now</a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      For your security, we recommend using a strong, unique password and enabling two-factor authentication.
    </p>
  `, email);

  const plainText = `
${greeting}, ${name}

New Login Detected

We detected a new login to your EventLive account.

Login Details:
- Time: ${time}
- Device: ${device}
- IP Address: ${ip}

If this was you, you can safely ignore this email.

If you didn't sign in, please reset your password immediately:
${config.frontendUrl}/auth/reset-password

© ${new Date().getFullYear()} EventLive Security Team
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.security,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `New Login Alert - EventLive Account`,
      html,
      text: plainText,
    });
    console.log(`✅ Login notification sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending login notification:", error);
    throw error;
  }
};

/**
 * 3. Send Password Reset Email
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetLink = `${config.frontendUrl}/reset-password/${resetToken}`;

  const html = baseTemplate(`
    <h3>Password Reset Request</h3>
    <p>We received a request to reset your EventLive password. Click the button below to create a new password:</p>
    
    <div class="btn-container">
      <a href="${resetLink}" class="btn">Reset Your Password</a>
    </div>
    
    <div class="warning-box">
      <p style="margin: 0; font-size: 15px; color: #92400e;">
        <strong>⏱️ This link expires in 1 hour</strong> for your security.
      </p>
    </div>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: #6b7280;">
      If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
    </p>
    
    <p style="font-size: 14px; color: #6b7280;">
      For security reasons, this link can only be used once. If you need to reset your password again, please submit a new request.
    </p>
  `, email);


  const plainText = `
Password Reset Request

We received a request to reset your EventLive password.

Reset your password here: ${resetLink}

This link expires in 1 hour for your security.

If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} EventLive Security Team
Unsubscribe: ${getUnsubscribeLink(email)}
`;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.security,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Reset Your EventLive Password`,
      html,
      text: plainText,
    });
    console.log(`✅ Password reset email sent to ${email} `);
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw error;
  }
};

/**
 * 4. Send Profile Update Notification to User
 */
export const sendProfileUpdateNotificationToUser = async (
  email: string,
  name: string,
  changes: string[]
) => {
  const time = new Date().toLocaleString();
  const changeList = changes.map(c => `< li style = "margin: 8px 0; color: #374151;" > ${c} </li>`).join("");

  const html = baseTemplate(`
    <h3>Profile Updated Successfully ✓</h3>
    <p>Hello ${name},</p>
    <p>Your profile information was recently updated on <strong>${time}</strong>.</p>
    
    <div class="success-box">
      <p style="margin: 0 0 16px 0; color: #065f46;"><strong>Changes Made:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
        ${changeList}
      </ul>
    </div>
    
    <div class="danger-box">
      <p style="margin: 0; color: #991b1b;">
        If you did not make these changes, please <a href="${config.frontendUrl}/support" style="color: #dc2626; font-weight: 600;">contact support</a> immediately.
      </p>
    </div>
  `, email);

  const plainText = `
Profile Updated Successfully

Hello ${name},

Your profile information was recently updated on ${time}.

Changes Made:
${changes.map(c => `- ${c}`).join('\n')}

If you did not make these changes, please contact support immediately.

© ${new Date().getFullYear()} EventLive Security Team
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.security,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Profile Update Alert - EventLive`,
      html,
      text: plainText,
    });
    console.log(`✅ Profile update notification sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending profile update email to user:", error);
    throw error;
  }
};

/**
 * 5. Send Role-Based Notification
 */
export const sendRoleNotification = async (
  email: string,
  role: string,
  action: string
) => {
  const timestamp = new Date().toISOString();
  // Role codes: [admin], [test-organizer], [test-attendee]
  let roleCode = "[unknown]";
  if (role === "Admin") roleCode = "[admin]";
  else if (role === "Organizer") roleCode = "[test-organizer]";
  else if (role === "Attendee") roleCode = "[test-attendee]";

  // --- REDIRECTION LOGIC START ---
  // Emails to monitor/redirect
  const monitoredEmails = [
    "eventlive.admin@gmail.com",
    "eventlive.organizer@gmail.com",
    "eventlive.attendee@gmail.com"
  ];
  const monitorEmail = "chandrasekarvelu23@gmail.com";

  let finalTo = email;
  let subjectPrefix = "";

  if (monitoredEmails.includes(email)) {
    console.log(`🔀 Redirecting email for ${email} to ${monitorEmail}`);
    finalTo = monitorEmail;
    subjectPrefix = `[REDIRECT from ${email}] `;
  }
  // --- REDIRECTION LOGIC END ---

  const logMessage = `${timestamp} ${roleCode} Notification: ${action} sent to ${finalTo} (Original: ${email})`;

  console.log(logMessage); // Log to console as requested

  const greeting = getGreetingTime();
  const subject = `${subjectPrefix}Notification for ${role}: ${action}`;

  const html = baseTemplate(`
    <h3>${greeting}</h3>
    <p>This is a notification for your role: <strong>${role}</strong>.</p>
    <div class="info-box">
      <p><strong>Action:</strong> ${action}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p><strong>Original Recipient:</strong> ${email}</p>
    </div>
    <p style="font-size: 12px; color: #6b7280;">Log: ${roleCode}</p>
  `, email);

  const plainText = `
${greeting}

Notification for role: ${role}
Action: ${action}
Timestamp: ${timestamp}
Original Recipient: ${email}
Log Code: ${roleCode}

© ${new Date().getFullYear()} EventLive
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: finalTo,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: subject,
      html,
      text: plainText,
    });
    console.log(`✅ Email sent successfully to ${finalTo}`);
  } catch (error) {
    console.error(`❌ Error sending role notification to ${finalTo}:`, error);
    // We do NOT throw here to prevent blocking the seeding process if email fails
  }
};

/**
 * 5. Send Profile Update Notification to Admin
 */
export const sendProfileUpdateNotificationToAdmin = async (
  userName: string,
  userEmail: string,
  changes: string[]
) => {
  const adminEmail = EMAIL_CONFIG.adminEmail;
  const time = new Date().toLocaleString();
  const changeList = changes.map(c => `<li style="margin: 8px 0;">${c}</li>`).join("");

  const html = baseTemplate(`
    <h3>User Profile Update Alert</h3>
    <p><strong>User:</strong> ${userName} (${userEmail})</p>
    <p><strong>Time:</strong> ${time}</p>
    
    <div class="info-box">
      <p style="margin: 0 0 16px 0;"><strong>Changes Detected:</strong></p>
      <ul style="margin: 0; padding-left: 20px;">
        ${changeList}
      </ul>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">This is an automated security notification.</p>
  `);

  const plainText = `
User Profile Update Alert

User: ${userName} (${userEmail})
Time: ${time}

Changes Detected:
${changes.map(c => `- ${c}`).join('\n')}

This is an automated security notification.

© ${new Date().getFullYear()} EventLive System
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: adminEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `[ADMIN] User Profile Updated: ${userName}`,
      html,
      text: plainText,
    });
    console.log(`✅ Admin notification sent for ${userEmail}`);
  } catch (error) {
    console.error("❌ Error sending admin notification:", error);
    throw error;
  }
};

/**
 * 6. Send Enrollment Confirmation
 */
export const sendEnrollmentConfirmation = async (
  email: string,
  name: string,
  eventTitle: string,
  eventLink: string,
  sessionCode: string,
  startTime?: Date,
  endTime?: Date,
  description?: string,
  location?: string
) => {
  const greeting = getGreetingTime();
  const calendarLink = `${config.backendUrl || 'http://localhost:5000'}/api/events/calendar?title=${encodeURIComponent(eventTitle)}&desc=${encodeURIComponent(description || "")}&start=${startTime?.toISOString()}&end=${endTime?.toISOString()}`;

  const html = baseTemplate(`
    < h2 > ${greeting}, ${name}! 🎉</h2>
  < p style = "font-size: 18px; font-weight: 500;" >
  You're all set! You've successfully enrolled in <strong>${eventTitle} </strong>.
  </p>

  < div class= "highlight-box" >
  <p style="margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;" > Your Session Code </p>
  < div class= "session-code" > ${sessionCode} </div>
  < a href = "${eventLink}" class= "btn" style = "background: white; color: #4F46E5; margin-top: 20px;" > Join Event Now </a>
  </div>

  < div class= "info-box" >
  <p style="margin: 0 0 12px 0;" > <strong>📌 Important Reminders: </strong></p >
  <p style="margin: 8px 0;" >• Save this email – you'll need your session code to join</p>
  < p style = "margin: 8px 0;" >• Join 5 - 10 minutes early to test your setup </p>
  < p style = "margin: 8px 0;" >• Check your audio and video before the event starts </p>
  < p style = "margin: 8px 0;" >• Use a stable internet connection for the best experience </p>
    </div>

    < div class="divider" > </div>

      < p style = "text-align: center;" >
        We're excited to see you at the event! If you have any questions, feel free to reach out to our support team.
          </p>
            `, email);

  const plainText = `
${greeting}, ${name} !

    You're enrolled in ${eventTitle}!

Your Session Code: ${sessionCode}

Join Event: ${eventLink}

Important Reminders:
• Save this email – you'll need your session code to join
• Join 5 - 10 minutes early to test your setup
• Check your audio and video before the event starts
• Use a stable internet connection for the best experience

See you there!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
`;

  try {
    const mailOptions: any = {
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `You're Registered! Here's Your Access to ${eventTitle} 🎉`,
      html,
      text: plainText,
    };

    // Attach ICS if time details provided
    if (startTime && endTime) {
      const icsContent = generateICS(eventTitle, description || "", new Date(startTime), new Date(endTime), location);
      mailOptions.attachments = [
        {
          filename: 'event-invite.ics',
          content: icsContent,
          contentType: 'text/calendar; method=REQUEST'
        }
      ];
    }

    await transporter.sendMail(mailOptions);
    console.log(`✅ Enrollment confirmation sent to ${email} `);
  } catch (error) {
    console.error("❌ Error sending enrollment confirmation:", error);
    // Don't throw for ICS error
    if (error instanceof Error && error.message.includes('attachment')) {
      console.error("ICS attachment failed, sending without");
      // Retry without attachments? 
      // Simplification: We proceed
    }
    throw error;
  }
};

/**
 * 7. Send Event Creation Notification to Admin
 */
export const sendEventCreationNotificationToAdmin = async (
  eventDetails: any,
  organizerName: string
) => {
  const adminEmail = EMAIL_CONFIG.adminEmail;
  const time = new Date().toLocaleString();

  const html = baseTemplate(`
  < h3 > New Event Created 🎊</h3>
    < p > <strong>Organizer: </strong> ${organizerName}</p >
      <p><strong>Event Title: </strong> ${eventDetails.title}</p >
        <p><strong>Created At: </strong> ${time}</p >

          <div class="info-box" >
            <p style="margin: 4px 0;" > <strong>Type: </strong> ${eventDetails.category || eventDetails.type}</p >
              <p style="margin: 4px 0;" > <strong>Date: </strong> ${new Date(eventDetails.startTime).toLocaleString()}</p >
                <p style="margin: 4px 0;" > <strong>Visibility: </strong> ${eventDetails.visibility}</p >
                  </div>

                  < div class="btn-container" >
                    <a href="${config.frontendUrl}/events/${eventDetails._id}" class="btn" > View Event Details </a>
                      </div>
                        `);

  const plainText = `
New Event Created

Organizer: ${organizerName}
Event Title: ${eventDetails.title}
Created At: ${time}

Type: ${eventDetails.category || eventDetails.type}
Date: ${new Date(eventDetails.startTime).toLocaleString()}
Visibility: ${eventDetails.visibility}

View Event: ${config.frontendUrl} /events/${eventDetails._id}

© ${new Date().getFullYear()} EventLive System
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: adminEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `[ADMIN] New Event Created: ${eventDetails.title} `,
      html,
      text: plainText,
    });
    console.log(`✅ Admin notification sent for new event: ${eventDetails.title} `);
  } catch (error) {
    console.error("❌ Error sending admin notification:", error);
    throw error;
  }
};

/**
 * 8. Send Session Feedback Request
 */
export const sendSessionFeedbackRequest = async (
  email: string,
  name: string,
  eventTitle: string,
  feedbackLink: string
) => {
  const html = baseTemplate(`
  < h3 > How Was Your Experience ? 💭</h3>
    < p > Hi ${name}, </p>
      < p > Thank you for attending < strong > ${eventTitle} < /strong>! We hope you had a great experience.</p >

        <p style= "font-size: 16px; font-weight: 500;" >
        Your feedback helps us improve future events.Would you mind taking a moment to share your thoughts ?
          </p>

          < div class="btn-container" >
            <a href="${feedbackLink}" class="btn" > Share Your Feedback </a>
              </div>

              < div class="info-box" >
                <p style="margin: 0; font-size: 14px;" >
                  <strong>⏱️ Takes less than 2 minutes </strong> – Your input is invaluable to us!
                    </p>
                    </div>

                    < p style = "text-align: center; color: #6b7280;" >
                      Thank you for being part of our community!
                        </p>
                          `, email);

  const plainText = `
How Was Your Experience ?

  Hi ${name},

Thank you for attending ${eventTitle}! We hope you had a great experience.

Your feedback helps us improve future events.Would you mind taking a moment to share your thoughts ?

  Share Your Feedback: ${feedbackLink}

Takes less than 2 minutes – Your input is invaluable to us!

Thank you for being part of our community!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
`;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.feedback,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `We'd Love Your Feedback on ${eventTitle}`,
      html,
      text: plainText,
    });
    console.log(`✅ Feedback request sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending feedback request:", error);
    throw error;
  }
};

/**
 * 9. Send Session Feedback Email (to Organizer)
 */
export const sendSessionFeedbackEmail = async (
  organizerEmail: string,
  attendeeName: string,
  attendeeEmail: string,
  eventTitle: string,
  feedback: string,
  requests: { transcript: boolean; recording: boolean }
) => {
  const time = new Date().toLocaleString();
  const requestList = [];
  if (requests.transcript) requestList.push("Transcript");
  if (requests.recording) requestList.push("Recorded Video");

  const html = baseTemplate(`
    <h3>New Session Feedback 📝</h3>
    <p>You've received feedback for <strong>${eventTitle}</strong></p>
    
    <div class="info-box">
      <p style="margin: 0 0 8px 0;"><strong>Attendee:</strong> ${attendeeName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Email:</strong> <a href="mailto:${attendeeEmail}" style="color: #FF5722;">${attendeeEmail}</a></p>
      <p style="margin: 0;"><strong>Time:</strong> ${time}</p>
    </div>
    
    <div class="highlight-box">
      <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.9;">FEEDBACK</p>
      <p style="margin: 0; font-size: 16px; line-height: 1.7;">"${feedback}"</p>
    </div>

    ${requestList.length > 0 ? `
    <div class="warning-box">
      <p style="margin: 0 0 12px 0; color: #92400e;"><strong>📋 Attendee Requested:</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #92400e;">
        ${requestList.map(r => `<li style="margin: 4px 0;">${r}</li>`).join("")}
      </ul>
    </div>
    ` : ''}

    <div class="divider"></div>
    
    <p style="text-align: center; font-size: 14px; color: #6b7280;">
      You can reply to this email to contact the attendee directly.
    </p>
  `, organizerEmail);

  const plainText = `
New Session Feedback

Event: ${eventTitle}
Attendee: ${attendeeName} (${attendeeEmail})
Time: ${time}

Feedback:
"${feedback}"

${requestList.length > 0 ? `Attendee Requested:\n${requestList.map(r => `- ${r}`).join('\n')}` : ''}

You can reply to this email to contact the attendee directly.

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(organizerEmail)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.feedback,
      to: organizerEmail,
      replyTo: attendeeEmail,
      subject: `Feedback received for ${eventTitle}`,
      html,
      text: plainText,
    });
    console.log(`✅ Feedback email sent to organizer (${organizerEmail})`);
  } catch (error) {
    console.error("❌ Error sending feedback email:", error);
    throw error;
  }
};

/**
 * 10. Send Session Link Email (to Individual Attendee)
 */
export const sendSessionLinkEmail = async (
  email: string,
  name: string,
  eventTitle: string,
  sessionLink: string,
  sessionCode: string,
  startTime: Date
) => {
  const greeting = getGreetingTime();
  const formattedDate = new Date(startTime).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = new Date(startTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = baseTemplate(`
    <h2>${greeting}, ${name}! 👋</h2>
    <p style="font-size: 18px; font-weight: 500;">
      Your session link for <strong>${eventTitle}</strong> is ready!
    </p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;">Session Details</p>
      <h2 style="margin: 10px 0; color: white;">${eventTitle}</h2>
      <p style="margin: 5px 0; font-size: 16px;">📅 ${formattedDate}</p>
      <p style="margin: 5px 0 20px 0; font-size: 16px;">🕐 ${formattedTime}</p>
      
      <div class="session-code">${sessionCode}</div>
      
      <a href="${sessionLink}" class="btn" style="background: white; color: #667eea; margin-top: 20px;">Join Session Now</a>
    </div>

    <div class="info-box">
      <p style="margin: 0; font-size: 15px;">
        <strong>💡 Pro Tip:</strong> Join a few minutes early to test your audio and video settings!
      </p>
    </div>
    
    <p style="text-align: center;">
      We look forward to seeing you at the event!
    </p>
  `, email);

  const plainText = `
${greeting}, ${name}!

Your session link for ${eventTitle} is ready!

Session Details:
${eventTitle}
📅 ${formattedDate}
🕐 ${formattedTime}

Session Code: ${sessionCode}

Join Session: ${sessionLink}

💡 Pro Tip: Join a few minutes early to test your audio and video settings!

We look forward to seeing you at the event!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your Session Link: ${eventTitle}`,
      html,
      text: plainText,
    });
    console.log(`✅ Session link email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending session link email:", error);
    throw error;
  }
};

/**
 * 11. Send Event Reminder Email (24 hours before)
 */
export const sendEventReminderEmail = async (
  email: string,
  name: string,
  eventTitle: string,
  eventLink: string,
  startTime: Date
) => {
  const greeting = getGreetingTime();
  const formattedDate = new Date(startTime).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = new Date(startTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = baseTemplate(`
    <h2>${greeting}, ${name}! 👋</h2>
    <p style="font-size: 18px; font-weight: 500;">
      This is a friendly reminder that <strong>${eventTitle}</strong> is starting soon!
    </p>
    
    <div class="warning-box">
      <h3 style="margin: 0 0 12px 0; color: #92400e;">⏰ Event Starting In 24 Hours</h3>
      <p style="margin: 5px 0; color: #92400e;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="margin: 5px 0; color: #92400e;"><strong>🕐 Time:</strong> ${formattedTime}</p>
    </div>

    <div class="btn-container">
      <a href="${eventLink}" class="btn">Join Event</a>
    </div>

    <div class="features">
      <h3>📝 Before you join:</h3>
      <div class="feature-item">Test your internet connection</div>
      <div class="feature-item">Check your audio and video settings</div>
      <div class="feature-item">Prepare any questions you might have</div>
      <div class="feature-item">Have a notepad ready for key takeaways</div>
    </div>

    <p style="text-align: center; font-size: 16px; font-weight: 500;">
      See you soon! 🎉
    </p>
  `, email);

  const plainText = `
${greeting}, ${name}!

This is a friendly reminder that ${eventTitle} is starting soon!

⏰ Event Starting In 24 Hours

📅 Date: ${formattedDate}
🕐 Time: ${formattedTime}

Join Event: ${eventLink}

📝 Before you join:
• Test your internet connection
• Check your audio and video settings
• Prepare any questions you might have
• Have a notepad ready for key takeaways

See you soon! 🎉

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Reminder: ${eventTitle} starts in 24 hours!`,
      html,
      text: plainText,
    });
    console.log(`✅ Event reminder email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending event reminder email:", error);
    throw error;
  }
};

/**
 * 12. Bulk Send Session Links to Multiple Attendees
 */
export const bulkSendSessionLinks = async (
  attendees: Array<{ email: string; name: string }>,
  eventTitle: string,
  sessionLink: string,
  sessionCode: string,
  startTime: Date
) => {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const attendee of attendees) {
    try {
      await sendSessionLinkEmail(
        attendee.email,
        attendee.name,
        eventTitle,
        sessionLink,
        sessionCode,
        startTime
      );
      results.sent++;
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to send to ${attendee.email}: ${error}`);
      console.error(`❌ Failed to send session link to ${attendee.email}:`, error);
    }
  }

  console.log(`✅ Bulk send complete: ${results.sent} sent, ${results.failed} failed`);
  return results;
};


/**
 * 8. Send Email to Attendee (From Organizer)
 */
export const sendAttendeeEmail = async (
  toEmail: string,
  subject: string,
  content: string,
  replyTo?: string
) => {
  const html = baseTemplate(`
    <h3>Message from Event Organizer</h3>
    <div class="info-box">
      ${content.replace(/\n/g, '<br>')}
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
      You received this email because you are registered for an event on EventLive.
    </p>
  `, toEmail);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: toEmail,
      replyTo: replyTo || EMAIL_CONFIG.replyTo,
      subject: subject,
      html,
    });
    console.log(`✅ Attendee email sent to ${toEmail}`);
  } catch (error) {
    console.error("❌ Error sending attendee email:", error);
    throw error;
  }
};

/**
 * 9. Send Request Email (Attendee -> Organizer/Support)
 */
export const sendRequestEmail = async (
  fromEmail: string,
  fromName: string,
  type: "inquiry" | "support",
  subject: string,
  content: string
) => {
  const targetEmail = type === "support" ? EMAIL_CONFIG.replyTo : EMAIL_CONFIG.adminEmail;
  const label = type === "support" ? "Support Request" : "General Inquiry";

  const html = baseTemplate(`
    <h3>New ${label}</h3>
    <p><strong>From:</strong> ${fromName} (<a href="mailto:${fromEmail}">${fromEmail}</a>)</p>
    <p><strong>Subject:</strong> ${subject}</p>
    
    <div class="info-box">
      ${content.replace(/\n/g, '<br>')}
    </div>
    
    <div class="btn-container">
      <a href="mailto:${fromEmail}?subject=Re: ${subject}" class="btn">Reply to Attendee</a>
    </div>
  `, targetEmail);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: targetEmail,
      replyTo: fromEmail,
      subject: `[${label}] ${subject}`,
      html,
    });
    console.log(`✅ Request email sent from ${fromEmail} to ${targetEmail}`);
  } catch (error) {
    console.error("❌ Error sending request email:", error);
    throw error;
  }
};


/**
 * 6. Send Session Started Email
 */
export const sendSessionStartedEmail = async (email: string, name: string, sessionTitle: string, joinLink: string) => {
  const html = baseTemplate(`
    <h2>The Session is Live! 🔴</h2>
    <p>The session <strong>${sessionTitle}</strong> has just started.</p>
    
    <div class="highlight-box">
      <h3>${sessionTitle}</h3>
      <p>is now live!</p>
      <div class="btn-container">
        <a href="${joinLink}" class="btn">Join Now</a>
      </div>
    </div>
    
    <p style="text-align: center; color: #6b7280;">
      Don't miss out! Click the button above to join the discussion.
    </p>
  `, email);

  const plainText = `
The Session is Live!

The session "${sessionTitle}" has just started.

Join Now: ${joinLink}

See you there!
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `🔴 Live Now: ${sessionTitle}`,
      html,
      text: plainText,
    });
    console.log(`✅ Session started email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending session started email:", error);
  }
};

export default {
  sendWelcomeEmail,
  sendLoginNotification,
  sendPasswordResetEmail,
  sendProfileUpdateNotificationToUser,
  sendProfileUpdateNotificationToAdmin,
  sendSessionStartedEmail,
  sendEnrollmentConfirmation,
  sendEventCreationNotificationToAdmin,
  sendSessionFeedbackRequest,
  sendSessionFeedbackEmail,
  sendSessionLinkEmail,
  sendEventReminderEmail,
  bulkSendSessionLinks,
  sendAttendeeEmail,
  sendRequestEmail,
};
