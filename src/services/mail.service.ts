import { config } from "../config";

/* ===================================================================
 * EMAIL CONFIGURATION (GAS PROXY)
 * =================================================================== */

const GAS_URL = process.env.GAS_MAIL_URL || "";

/**
 * Helper to log email triggers in development
 */
const logEmailInDev = (action: string, recipient: string, context?: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📧 [GAS-MAIL-TRIGGER] Action: "${action}" to [${recipient}] ${context ? `(${context})` : ''}`);
  }
};

/**
 * Generic POSTer to the GAS Web App
 */
const postToGas = async (action: string, payload: any) => {
  if (!GAS_URL) {
    if (process.env.NODE_ENV === 'production') {
      console.error("❌ CRITICAL: GAS_MAIL_URL is not defined. Emails will NOT be sent.");
    } else {
      console.warn("⚠️ GAS_MAIL_URL is missing. (Dev Mode: Skipping actual send)");
    }
    return;
  }

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: any = await response.json();
    if (data.success) {
      console.log(`✅ [GAS] Mail "${action}" successful`);
    } else {
      console.error(`❌ [GAS] Mail "${action}" failed:`, data.error);
    }
  } catch (error) {
    console.error(`❌ [GAS] Network/Processing error for ${action}:`, error);
  }
};

/* ===================================================================
 * EMAIL FUNCTIONS (Implemented via GAS)
 * =================================================================== */

/**
 * 1. Send Welcome Email (Signup)
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  logEmailInDev('sendWelcomeEmail', email);
  await postToGas("sendWelcomeEmail", { email, name });
};

/**
 * 2. Send Login Notification
 */
export const sendLoginNotification = async (email: string, name: string, ip: string, device: string, time: string) => {
  logEmailInDev('sendLoginNotification', email, `IP: ${ip}`);
  await postToGas("sendLoginNotification", { email, name, ip, device, time });
};

/**
 * 3. Send Password Reset Email
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  logEmailInDev('sendPasswordResetEmail', email);
  await postToGas("sendPasswordResetEmail", { email, resetToken });
};

/**
 * 4. Send Profile Update Notification to User
 */
export const sendProfileUpdateNotificationToUser = async (email: string, name: string, changes: string[]) => {
  logEmailInDev('sendProfileUpdateNotificationToUser', email, `${changes.length} changes`);
  await postToGas("sendProfileUpdateNotificationToUser", { email, name, changes });
};

/**
 * 5. Send Role-Based Notification (Seeding/Admin)
 */
export const sendRoleNotification = async (email: string, role: string, action: string) => {
  logEmailInDev('sendRoleNotification', email, `Role: ${role}`);
  await postToGas("sendRoleNotification", { email, role, action });
};

/**
 * 6. Send Profile Update Notification to Admin
 */
export const sendProfileUpdateNotificationToAdmin = async (userName: string, userEmail: string, changes: string[]) => {
  const adminEmail = process.env.ADMIN_EMAIL || "chandrasekarvelu23@gmail.com";
  logEmailInDev('sendProfileUpdateNotificationToAdmin', adminEmail, `User: ${userEmail}`);
  await postToGas("sendProfileUpdateNotificationToAdmin", { userName, userEmail, changes });
};

/**
 * 7. Send Enrollment Confirmation
 */
export const sendEnrollmentConfirmation = async (
  email: string, name: string, eventTitle: string, eventLink: string, sessionCode: string,
  startTime?: Date, endTime?: Date, timezone?: string, description?: string, location?: string
) => {
  logEmailInDev('sendEnrollmentConfirmation', email, `Event: ${eventTitle}`);
  const payload = {
    email, name, eventTitle, eventLink, sessionCode,
    startTime: startTime instanceof Date ? startTime.toISOString() : startTime,
    endTime: endTime instanceof Date ? endTime.toISOString() : endTime,
    timezone, description, location
  };
  await postToGas("sendEnrollmentConfirmation", payload);
};

/**
 * 8. Send Event Creation Notification to Admin
 */
export const sendEventCreationNotificationToAdmin = async (eventDetails: any, organizerName: string) => {
  const adminEmail = process.env.ADMIN_EMAIL || "chandrasekarvelu23@gmail.com";
  logEmailInDev('sendEventCreationNotificationToAdmin', adminEmail, `Event: ${eventDetails.title}`);

  const safeDetails = { ...eventDetails };
  if (safeDetails.startTime instanceof Date) safeDetails.startTime = safeDetails.startTime.toISOString();
  if (safeDetails.endTime instanceof Date) safeDetails.endTime = safeDetails.endTime.toISOString();

  await postToGas("sendEventCreationNotificationToAdmin", { eventDetails: safeDetails, organizerName });
};

/**
 * 9. Send Session Feedback Request (Attendee)
 */
export const sendSessionFeedbackRequest = async (email: string, name: string, eventTitle: string, feedbackLink: string) => {
  logEmailInDev('sendSessionFeedbackRequest', email);
  await postToGas("sendSessionFeedbackRequest", { email, name, eventTitle, feedbackLink });
};

/**
 * 10. Send Session Feedback Email (to Organizer)
 */
export const sendSessionFeedbackEmail = async (
  organizerEmail: string, attendeeName: string, attendeeEmail: string, eventTitle: string,
  feedback: string, requests: { transcript: boolean; recording: boolean }
) => {
  logEmailInDev('sendSessionFeedbackEmail', organizerEmail, `From: ${attendeeName}`);
  await postToGas("sendSessionFeedbackEmail", { organizerEmail, attendeeName, attendeeEmail, eventTitle, feedback, requests });
};

/**
 * 11. Send Session Link Email (to Individual Attendee)
 */
export const sendSessionLinkEmail = async (
  email: string, name: string, eventTitle: string, sessionLink: string, sessionCode: string,
  startTime: Date, timezone: string
) => {
  logEmailInDev('sendSessionLinkEmail', email, `Event: ${eventTitle}`);
  await postToGas("sendSessionLinkEmail", {
    email, name, eventTitle, sessionLink, sessionCode,
    startTime: startTime instanceof Date ? startTime.toISOString() : startTime,
    timezone
  });
};

/**
 * 12. Send Event Reminder Email (24 hours before)
 */
export const sendEventReminderEmail = async (
  email: string, name: string, eventTitle: string, eventLink: string, startTime: Date, timezone: string
) => {
  logEmailInDev('sendEventReminderEmail', email);
  await postToGas("sendEventReminderEmail", {
    email, name, eventTitle, eventLink,
    startTime: startTime instanceof Date ? startTime.toISOString() : startTime,
    timezone
  });
};

/**
 * 13. Bulk Send Session Links
 */
export const bulkSendSessionLinks = async (
  attendees: Array<{ email: string; name: string }>,
  eventTitle: string, sessionLink: string, sessionCode: string, startTime: Date, timezone: string
) => {
  console.log(`🚀 [GAS] Initiating bulk send for ${attendees.length} attendees...`);
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  // We loop calls for safety/quota management in GAS. 
  // Real-world: Should implement a batch endpoint in GAS.
  for (const attendee of attendees) {
    try {
      await sendSessionLinkEmail(attendee.email, attendee.name, eventTitle, sessionLink, sessionCode, startTime, timezone);
      results.sent++;
      await new Promise(resolve => setTimeout(resolve, 300)); // Throttle
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${attendee.email}: ${err.message}`);
    }
  }
  return results;
};

/**
 * 14. Send Email to Attendee (From Organizer)
 */
export const sendAttendeeEmail = async (toEmail: string, subject: string, content: string, replyTo?: string) => {
  logEmailInDev('sendAttendeeEmail', toEmail, `Sub: ${subject}`);
  await postToGas("sendAttendeeEmail", { toEmail, subject, content, replyTo });
};

/**
 * 15. Send Request Email (Attendee -> Organizer/Support)
 */
export const sendRequestEmail = async (fromEmail: string, fromName: string, type: "inquiry" | "support", subject: string, content: string) => {
  const target = type === "support" ? "Support" : "Admin";
  logEmailInDev('sendRequestEmail', target, `From: ${fromEmail}`);
  await postToGas("sendRequestEmail", { fromEmail, fromName, type, subject, content });
};

/**
 * 16. Send Session Started Email
 */
export const sendSessionStartedEmail = async (email: string, name: string, sessionTitle: string, joinLink: string) => {
  logEmailInDev('sendSessionStartedEmail', email, `Live: ${sessionTitle}`);
  await postToGas("sendSessionStartedEmail", { email, name, sessionTitle, joinLink });
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

