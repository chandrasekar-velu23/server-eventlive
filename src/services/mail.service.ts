import nodemailer from "nodemailer";
import { config } from "../config";
import { baseTemplate } from "./email-templates/base";
import * as templates from "./email-templates/content";
import { generateICS } from "./email-templates/utils";

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

// Dev helper to log email details
const logEmailInDev = (subject: string, to: string, context: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📧 [DEV-MAIL] Sending "${subject}" to [${to}] (${context})`);
  }
};

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
 * EMAIL FUNCTIONS
 * =================================================================== */

/**
 * 1. Send Welcome Email (Signup)
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  const { html: contentHtml, text } = templates.getWelcomeEmailContent(name, email);
  const html = baseTemplate(contentHtml, email);

  try {
    logEmailInDev('Welcome Email', email, 'Signup');
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.support,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Welcome to EventLive, ${name}! Your Virtual Event Journey Starts Here 🚀`,
      html,
      text,
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
  const { html: contentHtml, text } = templates.getLoginNotificationContent(name, time, device, ip, email);
  const html = baseTemplate(contentHtml, email);

  try {
    logEmailInDev('Login Notification', email, `IP: ${ip}, Device: ${device}`);
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.security,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `New Login Alert - EventLive Account`,
      html,
      text,
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
  const { html: contentHtml, text } = templates.getPasswordResetContent(resetToken, email);
  const html = baseTemplate(contentHtml, email);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.security,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Reset Your EventLive Password`,
      html,
      text,
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
  const { html: contentHtml, text } = templates.getUserProfileUpdateContent(name, changes, email);
  const html = baseTemplate(contentHtml, email);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.security,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Profile Update Alert - EventLive`,
      html,
      text,
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

  const subject = `${subjectPrefix}Notification for ${role}: ${action}`;
  const { html: contentHtml, text } = templates.getRoleNotificationContent(role, action, timestamp, email, roleCode);
  const html = baseTemplate(contentHtml, email);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: finalTo,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: subject,
      html,
      text,
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
  const { html: contentHtml, text } = templates.getAdminProfileUpdateContent(userName, userEmail, changes);
  const html = baseTemplate(contentHtml);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: adminEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `[ADMIN] User Profile Updated: ${userName}`,
      html,
      text,
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
  timezone?: string,
  description?: string,
  location?: string
) => {
  const { html: contentHtml, text } = templates.getEnrollmentConfirmationContent(
    name, eventTitle, eventLink, sessionCode, email, startTime, endTime, timezone
  );
  const html = baseTemplate(contentHtml, email);

  try {
    const mailOptions: any = {
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `You're Registered! Here's Your Access to ${eventTitle} 🎉`,
      html,
      text,
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

    logEmailInDev('Enrollment Confirmation', email, `Event: ${eventTitle}`);
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
  const { html: contentHtml, text } = templates.getEventCreationAdminContent(eventDetails, organizerName);
  const html = baseTemplate(contentHtml);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.system,
      to: adminEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `[ADMIN] New Event Created: ${eventDetails.title} `,
      html,
      text,
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
  const { html: contentHtml, text } = templates.getSessionFeedbackRequestContent(name, eventTitle, feedbackLink, email);
  const html = baseTemplate(contentHtml, email);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.feedback,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `We'd Love Your Feedback on ${eventTitle}`,
      html,
      text,
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
  const { html: contentHtml, text } = templates.getSessionFeedbackEmailContent(
    attendeeName, attendeeEmail, eventTitle, feedback, requests, organizerEmail
  );
  const html = baseTemplate(contentHtml, organizerEmail);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.feedback,
      to: organizerEmail,
      replyTo: attendeeEmail,
      subject: `Feedback received for ${eventTitle}`,
      html,
      text,
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
  startTime: Date,
  timezone: string
) => {
  const { html: contentHtml, text } = templates.getSessionLinkEmailContent(
    name, eventTitle, sessionLink, sessionCode, startTime, timezone, email
  );
  const html = baseTemplate(contentHtml, email);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Your Session Link: ${eventTitle}`,
      html,
      text,
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
  startTime: Date,
  timezone: string
) => {
  const { html: contentHtml, text } = templates.getEventReminderEmailContent(
    name, eventTitle, eventLink, startTime, timezone, email
  );
  const html = baseTemplate(contentHtml, email);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `Reminder: ${eventTitle} starts in 24 hours!`,
      html,
      text,
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
  startTime: Date,
  timezone: string
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
        startTime,
        timezone
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
  const { html: contentHtml } = templates.getAttendeeEmailContent(content);
  const html = baseTemplate(contentHtml, toEmail);

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

  const { html: contentHtml } = templates.getRequestEmailContent(fromName, fromEmail, subject, content, label);
  const html = baseTemplate(contentHtml, targetEmail);

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
  const { html: contentHtml, text } = templates.getSessionStartedEmailContent(sessionTitle, joinLink);
  const html = baseTemplate(contentHtml, email);

  try {
    await transporter.sendMail({
      from: EMAIL_CONFIG.from.events,
      to: email,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: `🔴 Live Now: ${sessionTitle}`,
      html,
      text,
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
