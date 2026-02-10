import nodemailer from "nodemailer";
import path from "path";

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

// ✅ FIXED: Corrected logo path to match actual filename
const logoPath = path.resolve(__dirname, "../../public/logo-EventLive.svg");

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

/**
 * Generate plain text version from HTML
 */
const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, "")
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Generate unsubscribe link
 */
const getUnsubscribeLink = (email: string): string => {
  return `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
};

/* ===================================================================
 * ENHANCED BASE TEMPLATE (Mobile-Responsive, Accessible)
 * =================================================================== */

const baseTemplate = (content: string, email: string = "") => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
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
    /* Reset Styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Base Styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
    }
    
    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    /* Header */
    .header {
      text-align: center;
      padding: 30px 20px;
      background: linear-gradient(135deg, #FF5722 0%, #ff7849 100%);
      border-bottom: 4px solid #e64a19;
    }
    
    .logo-text {
      display: inline-block;
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      text-decoration: none;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .logo-img {
      display: block;
      margin: 15px auto 0;
      max-width: 180px;
      height: auto;
    }
    
    /* Content */
    .content {
      padding: 40px 30px;
    }
    
    h1, h2, h3 {
      margin: 0 0 20px 0;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.3;
    }
    
    h1 { font-size: 28px; }
    h2 { font-size: 24px; }
    h3 { font-size: 20px; }
    
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
      font-size: 16px;
    }
    
    /* Buttons */
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #FF5722 0%, #ff7849 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(255, 87, 34, 0.2);
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 6px rgba(102, 126, 234, 0.2);
    }
    
    /* Cards & Boxes */
    .info-box {
      background: #f9fafb;
      border-left: 4px solid #FF5722;
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .highlight-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      color: #ffffff;
      margin: 24px 0;
    }
    
    .session-code {
      background: rgba(255,255,255,0.2);
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 3px;
      color: #ffffff;
    }
    
    /* Features List */
    .features {
      background: #f0f9ff;
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .feature-item {
      margin-bottom: 12px;
      padding-left: 28px;
      position: relative;
      color: #1f2937;
    }
    
    .feature-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
      font-size: 18px;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 30px 20px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #6b7280;
    }
    
    .footer a {
      color: #FF5722;
      text-decoration: none;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      
      .content {
        padding: 30px 20px !important;
      }
      
      h1 { font-size: 24px !important; }
      h2 { font-size: 20px !important; }
      h3 { font-size: 18px !important; }
      
      .btn {
        display: block !important;
        width: 100% !important;
        padding: 16px 20px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <a href="${process.env.FRONTEND_URL}" style="text-decoration: none;">
        <span class="logo-text">EventLive</span>
        <br/>
        <img src="cid:eventlivelogo" alt="EventLive - Seamless Virtual Events" class="logo-img" />
      </a>
    </div>
    
    <!-- Content -->
    <div class="content">
      ${content}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p style="font-weight: 600; color: #1f2937; margin-bottom: 16px;">EventLive</p>
      <p>Seamless Virtual Events, Reimagined</p>
      
      <div class="social-links">
        <a href="${process.env.FRONTEND_URL}/about">About</a> •
        <a href="${process.env.FRONTEND_URL}/support">Support</a> •
        <a href="${process.env.FRONTEND_URL}/privacy">Privacy</a>
      </div>
      
      ${email ? `<p><a href="${getUnsubscribeLink(email)}">Unsubscribe</a> from these emails</p>` : ''}
      
      <p style="margin-top: 20px; font-size: 12px;">
        © ${new Date().getFullYear()} EventLive. All rights reserved.<br/>
        123 Virtual Street, Cloud City, CC 12345
      </p>
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
 * ✨ Enhanced with marketing-friendly tone and clear value proposition
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
    <h2>${greeting}, ${name}! 👋</h2>
    <p style="font-size: 18px; color: #1f2937;">
      Welcome to <strong>EventLive</strong> – where virtual events come alive! We're thrilled to have you join our community of event creators and attendees.
    </p>
    
    <div class="features">
      <h3 style="margin-top: 0; color: #1f2937;">🚀 What You Can Do with EventLive:</h3>
      <div class="feature-item"><strong>Host Virtual Events:</strong> Create and manage professional sessions effortlessly</div>
      <div class="feature-item"><strong>Engage Attendees:</strong> Interactive polls, live Q&A, and real-time chat</div>
      <div class="feature-item"><strong>Track Analytics:</strong> Monitor registrations and attendance in real-time</div>
      <div class="feature-item"><strong>Secure Platform:</strong> Enterprise-grade security for peace of mind</div>
    </div>
    
    <p style="text-align: center; margin: 32px 0;">
      <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Explore Your Dashboard</a>
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>💡 Quick Tip:</strong> Start by exploring our event templates or join an upcoming event to see EventLive in action!
      </p>
    </div>
    
    <p>Need help getting started? Our support team is here for you at <a href="mailto:${EMAIL_CONFIG.replyTo}" style="color: #FF5722;">${EMAIL_CONFIG.replyTo}</a></p>
  `, email);

  const plainText = `
${greeting}, ${name}!

Welcome to EventLive – where virtual events come alive! We're thrilled to have you join our community.

What You Can Do with EventLive:
✓ Host Virtual Events: Create and manage professional sessions effortlessly
✓ Engage Attendees: Interactive polls, live Q&A, and real-time chat
✓ Track Analytics: Monitor registrations and attendance in real-time
✓ Secure Platform: Enterprise-grade security for peace of mind

Get Started: ${process.env.FRONTEND_URL}/dashboard

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
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
};

/**
 * 2. Send Login Notification
 * 🔒 Security-focused with clear action items
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
      <p style="margin: 0 0 12px 0;"><strong>🕒 Login Details:</strong></p>
      <p style="margin: 4px 0;"><strong>Time:</strong> ${time}</p>
      <p style="margin: 4px 0;"><strong>Device:</strong> ${device}</p>
      <p style="margin: 4px 0;"><strong>IP Address:</strong> ${ip}</p>
    </div>
    
    <p style="color: #dc2626; font-weight: 600;">
      ⚠️ If you didn't sign in, please secure your account immediately:
    </p>
    
    <p style="text-align: center; margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL}/auth/reset-password" class="btn">Reset Password Now</a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280;">
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
${process.env.FRONTEND_URL}/auth/reset-password

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
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Login notification sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending login notification:", error);
    throw error;
  }
};

/**
 * 3. Send Password Reset Email
 * 🔑 Clear instructions with urgency
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = baseTemplate(`
    <h3>Password Reset Request</h3>
    <p>We received a request to reset your EventLive password. Click the button below to create a new password:</p>
    
    <p style="text-align: center; margin: 32px 0;">
      <a href="${resetLink}" class="btn">Reset Your Password</a>
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>⏱️ This link expires in 1 hour</strong> for your security.
      </p>
    </div>
    
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
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Password reset email sent to ${email}`);
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
  const changeList = changes.map(c => `<li style="margin: 4px 0;">${c}</li>`).join("");

  const html = baseTemplate(`
    <h3>Profile Updated Successfully</h3>
    <p>Hello ${name},</p>
    <p>Your profile information was recently updated on <strong>${time}</strong>.</p>
    
    <div class="info-box">
      <p style="margin: 0 0 12px 0;"><strong>Changes Made:</strong></p>
      <ul style="margin: 0; padding-left: 20px;">
        ${changeList}
      </ul>
    </div>
    
    <p style="color: #dc2626; font-size: 14px;">
      If you did not make these changes, please <a href="${process.env.FRONTEND_URL}/support" style="color: #FF5722;">contact support</a> immediately.
    </p>
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
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Profile update notification sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending profile update email to user:", error);
    throw error;
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
  const changeList = changes.map(c => `<li style="margin: 4px 0;">${c}</li>`).join("");

  const html = baseTemplate(`
    <h3>User Profile Update Alert</h3>
    <p><strong>User:</strong> ${userName} (${userEmail})</p>
    <p><strong>Time:</strong> ${time}</p>
    
    <div class="info-box">
      <p style="margin: 0 0 12px 0;"><strong>Changes Detected:</strong></p>
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
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Admin notification sent for ${userEmail}`);
  } catch (error) {
    console.error("❌ Error sending admin notification:", error);
    throw error;
  }
};

/**
 * 6. Send Enrollment Confirmation
 * 🎉 Exciting confirmation with clear next steps
 */
export const sendEnrollmentConfirmation = async (
  email: string,
  name: string,
  eventTitle: string,
  eventLink: string,
  sessionCode: string
) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
    <h2>${greeting}, ${name}! 🎉</h2>
    <p style="font-size: 18px;">
      You're all set! You've successfully enrolled in <strong>${eventTitle}</strong>.
    </p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;">Your Session Code</p>
      <div class="session-code">${sessionCode}</div>
      <a href="${eventLink}" class="btn" style="background: white; color: #667eea; margin-top: 16px;">Join Event</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 0 0 12px 0;"><strong>📌 Important:</strong></p>
      <p style="margin: 4px 0;">• Save this email – you'll need your session code to join</p>
      <p style="margin: 4px 0;">• Join 5-10 minutes early to test your setup</p>
      <p style="margin: 4px 0;">• Check your audio and video before the event starts</p>
    </div>
    
    <p>We're excited to see you at the event! If you have any questions, feel free to reach out.</p>
  `, email);

  const plainText = `
${greeting}, ${name}!

You're enrolled in ${eventTitle}!

Your Session Code: ${sessionCode}

Join Event: ${eventLink}

Important:
• Save this email – you'll need your session code to join
• Join 5-10 minutes early to test your setup
• Check your audio and video before the event starts

See you there!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `You're Registered! Here's Your Access to ${eventTitle} 🎉`,
      html,
      text: plainText,
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Enrollment confirmation sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending enrollment confirmation:", error);
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
    <h3>New Event Created 🎊</h3>
    <p><strong>Organizer:</strong> ${organizerName}</p>
    <p><strong>Event Title:</strong> ${eventDetails.title}</p>
    <p><strong>Created At:</strong> ${time}</p>
    
    <div class="info-box">
      <p style="margin: 4px 0;"><strong>Type:</strong> ${eventDetails.category || eventDetails.type}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date(eventDetails.startTime).toLocaleString()}</p>
      <p style="margin: 4px 0;"><strong>Visibility:</strong> ${eventDetails.visibility}</p>
    </div>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL}/events/${eventDetails._id}" class="btn">View Event</a>
    </p>
  `);

  const plainText = `
New Event Created

Organizer: ${organizerName}
Event Title: ${eventDetails.title}
Created At: ${time}

Type: ${eventDetails.category || eventDetails.type}
Date: ${new Date(eventDetails.startTime).toLocaleString()}
Visibility: ${eventDetails.visibility}

View Event: ${process.env.FRONTEND_URL}/events/${eventDetails._id}

© ${new Date().getFullYear()} EventLive System
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: adminEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `[ADMIN] New Event Created: ${eventDetails.title}`,
      html,
      text: plainText,
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Event creation notification sent to admin (${adminEmail})`);
  } catch (error) {
    console.error("❌ Error sending event creation notification to admin:", error);
    throw error;
  }
};

/**
 * 8. Send Session Feedback Email (to Organizer)
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
    <p><strong>Event:</strong> ${eventTitle}</p>
    <p><strong>Attendee:</strong> ${attendeeName} (<a href="mailto:${attendeeEmail}" style="color: #FF5722;">${attendeeEmail}</a>)</p>
    <p><strong>Time:</strong> ${time}</p>
    
    <div style="background: #fdfdfd; padding: 20px; border-left: 4px solid #FF5722; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px 0;"><strong>Feedback:</strong></p>
      <p style="margin: 0; font-style: italic; color: #4b5563;">"${feedback}"</p>
    </div>

    ${requestList.length > 0 ? `
    <div class="info-box">
      <p style="margin: 0 0 8px 0;"><strong>Attendee Requested:</strong></p>
      <ul style="margin: 0; padding-left: 20px;">
        ${requestList.map(r => `<li>${r}</li>`).join("")}
      </ul>
    </div>
    ` : ''}

    <p style="font-size: 14px; color: #6b7280;">You can reply to this email to contact the attendee directly.</p>
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
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Feedback email sent to organizer (${organizerEmail})`);
  } catch (error) {
    console.error("❌ Error sending feedback email:", error);
    throw error;
  }
};

/**
 * 9. Send Session Link to Attendees
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
    <h3>${greeting}, ${name}!</h3>
    <p>Your session link for <strong>${eventTitle}</strong> is ready!</p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;">Session Details</p>
      <h2 style="margin: 10px 0; color: white;">${eventTitle}</h2>
      <p style="margin: 5px 0; font-size: 16px;">📅 ${formattedDate}</p>
      <p style="margin: 5px 0 20px 0; font-size: 16px;">🕐 ${formattedTime}</p>
      
      <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; opacity: 0.9;">SESSION CODE</p>
        <h3 style="margin: 5px 0; font-family: monospace; letter-spacing: 3px; color: white;">${sessionCode}</h3>
      </div>
      
      <a href="${sessionLink}" style="display: inline-block; padding: 12px 30px; background-color: white; color: #667eea; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 10px;">Join Session Now</a>
    </div>

    <div class="info-box">
      <p style="margin: 0;"><strong>💡 Pro Tip:</strong> Join a few minutes early to test your audio and video settings!</p>
    </div>
    
    <p>We look forward to seeing you at the event!</p>
  `, email);

  const plainText = `
${greeting}, ${name}!

Your session link for ${eventTitle} is ready!

Session Details:
- Event: ${eventTitle}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Session Code: ${sessionCode}

Join Session: ${sessionLink}

Pro Tip: Join a few minutes early to test your audio and video settings!

See you there!

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
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Session link email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending session link email:", error);
    throw error;
  }
};

/**
 * 10. Send Event Reminder (24 hours before)
 * ⏰ Helpful reminder with preparation checklist
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
    <h2>${greeting}, ${name}! ⏰</h2>
    <p style="font-size: 18px;">
      Just a friendly reminder that <strong>${eventTitle}</strong> is starting tomorrow!
    </p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 24px; border-radius: 8px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #856404;">📅 Event Details</h3>
      <p style="margin: 4px 0; color: #856404;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin: 4px 0; color: #856404;"><strong>Time:</strong> ${formattedTime}</p>
    </div>
    
    <p style="text-align: center; margin: 32px 0;">
      <a href="${eventLink}" class="btn">Join Event</a>
    </p>
    
    <div class="features">
      <h3 style="margin-top: 0;">📝 Before You Join:</h3>
      <div class="feature-item">Test your internet connection</div>
      <div class="feature-item">Check your audio and video settings</div>
      <div class="feature-item">Prepare any questions you might have</div>
      <div class="feature-item">Have a notepad ready for key takeaways</div>
    </div>
    
    <p>Looking forward to seeing you there!</p>
  `, email);

  const plainText = `
${greeting}, ${name}!

Reminder: ${eventTitle} starts tomorrow!

Event Details:
- Date: ${formattedDate}
- Time: ${formattedTime}

Join Event: ${eventLink}

Before You Join:
✓ Test your internet connection
✓ Check your audio and video settings
✓ Prepare any questions you might have
✓ Have a notepad ready for key takeaways

See you tomorrow!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Tomorrow: ${eventTitle} - Don't Miss Out! ⏰`,
      html,
      text: plainText,
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Event reminder sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending event reminder:", error);
    throw error;
  }
};

/**
 * 11. Send Event Starting Soon Email (1 hour before)
 */
export const sendEventStartingSoonEmail = async (
  email: string,
  name: string,
  eventTitle: string,
  eventLink: string,
  sessionCode: string
) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
    <h3>${greeting}, ${name}!</h3>
    <p><strong>${eventTitle}</strong> is starting in just 1 hour! 🚀</p>
    
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; color: white;">
      <h2 style="margin: 0 0 15px 0; color: white;">⏰ Starting in 1 Hour!</h2>
      <p style="margin: 0 0 20px 0; font-size: 18px;">Get ready to join</p>
      
      <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; opacity: 0.9;">SESSION CODE</p>
        <h3 style="margin: 5px 0; font-family: monospace; letter-spacing: 3px; color: white;">${sessionCode}</h3>
      </div>
      
      <a href="${eventLink}" style="display: inline-block; padding: 12px 30px; background-color: white; color: #f5576c; text-decoration: none; border-radius: 25px; font-weight: bold;">Join Now</a>
    </div>

    <p style="text-align: center; font-size: 14px; color: #666;">
      💡 We recommend joining 5-10 minutes early to ensure everything is set up properly.
    </p>
  `, email);

  const plainText = `
${greeting}, ${name}!

${eventTitle} is starting in just 1 hour! 🚀

Session Code: ${sessionCode}

Join Now: ${eventLink}

We recommend joining 5-10 minutes early to ensure everything is set up properly.

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Starting Soon: ${eventTitle} in 1 hour!`,
      html,
      text: plainText,
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Event starting soon email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending event starting soon email:", error);
    throw error;
  }
};

/**
 * 12. Send Thank You Email (Post-Event)
 * 💝 Appreciation with feedback request
 */
export const sendThankYouEmail = async (
  email: string,
  name: string,
  eventTitle: string,
  attendanceDuration: number,
  feedbackLink?: string
) => {
  const greeting = getGreetingTime();
  const hours = Math.floor(attendanceDuration / 60);
  const minutes = attendanceDuration % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const html = baseTemplate(`
    <h2>${greeting}, ${name}! 🎉</h2>
    <p style="font-size: 18px;">
      Thank you for attending <strong>${eventTitle}</strong>! We hope you found it valuable and engaging.
    </p>
    
    <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #1f2937;">We Hope You Enjoyed It!</h3>
      <p style="margin: 0; font-size: 18px; color: #374151;">You attended for <strong>${durationText}</strong></p>
    </div>
    
    ${feedbackLink ? `
    <div style="background: #f0f9ff; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 16px 0; font-weight: 600;">📝 We'd Love Your Feedback!</p>
      <p style="margin: 0 0 20px 0; color: #6b7280;">Help us improve by sharing your thoughts</p>
      <a href="${feedbackLink}" class="btn">Share Feedback</a>
    </div>
    ` : ''}
    
    <div class="features">
      <h3 style="margin-top: 0;">🎯 What's Next?</h3>
      <div class="feature-item">Check your email for session recordings (if available)</div>
      <div class="feature-item">Connect with other attendees</div>
      <div class="feature-item">Explore more events on EventLive</div>
    </div>
    
    <p style="text-align: center; margin: 32px 0;">
      <a href="${process.env.FRONTEND_URL}/events" class="btn btn-secondary">Explore More Events</a>
    </p>
    
    <p>Thank you for being part of our community!</p>
  `, email);

  const plainText = `
${greeting}, ${name}!

Thank you for attending ${eventTitle}!

You attended for ${durationText}

${feedbackLink ? `Share your feedback: ${feedbackLink}\n\n` : ''}

What's Next?
✓ Check your email for session recordings (if available)
✓ Connect with other attendees
✓ Explore more events on EventLive

Explore More Events: ${process.env.FRONTEND_URL}/events

Thank you for being part of our community!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Thank You for Attending ${eventTitle}! 🎉`,
      html,
      text: plainText,
      attachments: [{
        filename: 'logo-EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`✅ Thank you email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending thank you email:", error);
    throw error;
  }
};

/**
 * 13. Bulk Send Session Links to Multiple Attendees
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

export default {
  sendWelcomeEmail,
  sendLoginNotification,
  sendPasswordResetEmail,
  sendProfileUpdateNotificationToUser,
  sendProfileUpdateNotificationToAdmin,
  sendEnrollmentConfirmation,
  sendEventCreationNotificationToAdmin,
  sendSessionFeedbackEmail,
  sendSessionLinkEmail,
  sendEventReminderEmail,
  sendEventStartingSoonEmail,
  sendThankYouEmail,
  bulkSendSessionLinks,
};
