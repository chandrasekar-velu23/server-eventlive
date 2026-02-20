
import { config } from "../config";

/* ===================================================================
 * GOOGLE APPS SCRIPT MAIL SERVICE
 * =================================================================== */

const GAS_URL = process.env.GAS_MAIL_URL || "";

const postToGas = async (action: string, payload: any) => {
    if (!GAS_URL) {
        console.error("❌ GAS_MAIL_URL is not defined in .env");
        return; // Or throw error based on preference
    }

    try {
        const response = await fetch(GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, payload })
        });

        const data = await response.json();
        if (data.success) {
            console.log(`✅ [GAS] Action ${action} successful`);
        } else {
            console.error(`❌ [GAS] Action ${action} failed:`, data.error);
        }
    } catch (error) {
        console.error(`❌ [GAS] Network error for ${action}:`, error);
    }
};

/* ===================================================================
 * EMAIL FUNCTIONS (MIRRORS mail.service.ts)
 * =================================================================== */

export const sendWelcomeEmail = async (email: string, name: string) => {
    await postToGas("sendWelcomeEmail", { email, name });
};

export const sendLoginNotification = async (email: string, name: string, ip: string, device: string, time: string) => {
    await postToGas("sendLoginNotification", { email, name, ip, device, time });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
    await postToGas("sendPasswordResetEmail", { email, resetToken });
};

export const sendProfileUpdateNotificationToUser = async (email: string, name: string, changes: string[]) => {
    await postToGas("sendProfileUpdateNotificationToUser", { email, name, changes });
};

export const sendRoleNotification = async (email: string, role: string, action: string) => {
    await postToGas("sendRoleNotification", { email, role, action });
};

export const sendProfileUpdateNotificationToAdmin = async (userName: string, userEmail: string, changes: string[]) => {
    await postToGas("sendProfileUpdateNotificationToAdmin", { userName, userEmail, changes });
};

export const sendEnrollmentConfirmation = async (
    email: string, name: string, eventTitle: string, eventLink: string, sessionCode: string,
    startTime?: Date, endTime?: Date, timezone?: string, description?: string, location?: string
) => {
    // Serialize dates for JSON
    const payload = {
        email, name, eventTitle, eventLink, sessionCode,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        timezone, description, location
    };
    await postToGas("sendEnrollmentConfirmation", payload);
};

export const sendEventCreationNotificationToAdmin = async (eventDetails: any, organizerName: string) => {
    // Ensure eventDetails dates are strings
    const safeDetails = { ...eventDetails };
    if (safeDetails.startTime instanceof Date) safeDetails.startTime = safeDetails.startTime.toISOString();
    if (safeDetails.endTime instanceof Date) safeDetails.endTime = safeDetails.endTime.toISOString();

    await postToGas("sendEventCreationNotificationToAdmin", { eventDetails: safeDetails, organizerName });
};

export const sendSessionFeedbackRequest = async (email: string, name: string, eventTitle: string, feedbackLink: string) => {
    await postToGas("sendSessionFeedbackRequest", { email, name, eventTitle, feedbackLink });
};

export const sendSessionFeedbackEmail = async (
    organizerEmail: string, attendeeName: string, attendeeEmail: string, eventTitle: string,
    feedback: string, requests: { transcript: boolean; recording: boolean }
) => {
    await postToGas("sendSessionFeedbackEmail", { organizerEmail, attendeeName, attendeeEmail, eventTitle, feedback, requests });
};

export const sendSessionLinkEmail = async (
    email: string, name: string, eventTitle: string, sessionLink: string, sessionCode: string,
    startTime: Date, timezone: string
) => {
    await postToGas("sendSessionLinkEmail", {
        email, name, eventTitle, sessionLink, sessionCode,
        startTime: startTime.toISOString(), timezone
    });
};

export const sendEventReminderEmail = async (
    email: string, name: string, eventTitle: string, eventLink: string, startTime: Date, timezone: string
) => {
    await postToGas("sendEventReminderEmail", {
        email, name, eventTitle, eventLink,
        startTime: startTime.toISOString(), timezone
    });
};

export const bulkSendSessionLinks = async (
    attendees: Array<{ email: string; name: string }>,
    eventTitle: string, sessionLink: string, sessionCode: string, startTime: Date, timezone: string
) => {
    // Note: GAS Limits quota applies. Bulk sending 100+ emails might hit limits.
    // Best to batch or loop here. For simplicity, we loop calls to our single send function.
    // Ideally, GAS endpoint `bulkSend` should be created.

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const attendee of attendees) {
        await sendSessionLinkEmail(attendee.email, attendee.name, eventTitle, sessionLink, sessionCode, startTime, timezone);
        // Wait to match GAS rhythm
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    return results;
};

export const sendAttendeeEmail = async (toEmail: string, subject: string, content: string, replyTo?: string) => {
    await postToGas("sendAttendeeEmail", { toEmail, subject, content, replyTo });
};

export const sendRequestEmail = async (fromEmail: string, fromName: string, type: "inquiry" | "support", subject: string, content: string) => {
    await postToGas("sendRequestEmail", { fromEmail, fromName, type, subject, content });
};

export const sendSessionStartedEmail = async (email: string, name: string, sessionTitle: string, joinLink: string) => {
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
