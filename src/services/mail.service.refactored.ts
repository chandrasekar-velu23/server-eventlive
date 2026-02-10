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
 * 4. Send Enrollment Confirmation
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
 * 5. Send Event Reminder (24 hours before)
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
 * 6. Send Thank You Email (Post-Event)
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
      <a href="${process.env.FRONTEND_URL}/events" class="btn-secondary btn">Explore More Events</a>
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

// Export all other existing functions with similar enhancements...
// (Profile updates, event creation notifications, session feedback, etc.)

export default {
    sendWelcomeEmail,
    sendLoginNotification,
    sendPasswordResetEmail,
    sendEnrollmentConfirmation,
    sendEventReminderEmail,
    sendThankYouEmail,
};
