
/**
 * ============================================================================
 * EventLive Google Apps Script Mailer
 * ============================================================================
 * 
 * distinct "actions" correspond to the export methods in the original mail.service.ts
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;

    if (!action) throw new Error("No action specified");

    let result = { success: false, message: "Unknown action" };

    switch (action) {
      case 'sendWelcomeEmail':
        result = sendWelcomeEmail(payload);
        break;
      case 'sendLoginNotification':
        result = sendLoginNotification(payload);
        break;
      case 'sendPasswordResetEmail':
        result = sendPasswordResetEmail(payload);
        break;
      case 'sendProfileUpdateNotificationToUser':
        result = sendProfileUpdateNotificationToUser(payload);
        break;
      case 'sendRoleNotification':
        result = sendRoleNotification(payload);
        break;
      case 'sendProfileUpdateNotificationToAdmin':
        result = sendProfileUpdateNotificationToAdmin(payload);
        break;
      case 'sendEnrollmentConfirmation':
        result = sendEnrollmentConfirmation(payload);
        break;
      case 'sendEventCreationNotificationToAdmin':
        result = sendEventCreationNotificationToAdmin(payload);
        break;
      case 'sendSessionFeedbackRequest':
        result = sendSessionFeedbackRequest(payload);
        break;
      case 'sendSessionFeedbackEmail':
        result = sendSessionFeedbackEmail(payload);
        break;
      case 'sendSessionLinkEmail':
        result = sendSessionLinkEmail(payload);
        break;
      case 'sendEventReminderEmail':
        result = sendEventReminderEmail(payload);
        break;
      case 'sendAttendeeEmail':
        result = sendAttendeeEmail(payload);
        break;
      case 'sendRequestEmail':
        result = sendRequestEmail(payload);
        break;
      case 'sendSessionStartedEmail':
        result = sendSessionStartedEmail(payload);
        break;
      default:
        throw new Error("Invalid action: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/* ===================================================================
 * CONFIGURATION
 * =================================================================== */

const CONFIG = {
  appName: "EventLive",
  frontendUrl: "https://eventlive.netlify.app", // REPLACE with actual if different
  supportEmail: "chandrasekarvelu23@gmail.com", // REPLACE
  adminEmail: "chandrasekarvelu23@gmail.com",
};

/* ===================================================================
 * EMAIL IMPLEMENTATIONS
 * =================================================================== */

function sendWelcomeEmail(p) {
  const { email, name } = p;
  const content = getWelcomeEmailContent(name, email);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `Welcome to EventLive, ${name}! Your Virtual Event Journey Starts Here 🚀`,
    htmlBody: htmlBody,
    name: "EventLive Support"
  });
  return { success: true };
}

function sendLoginNotification(p) {
  const { email, name, ip, device, time } = p;
  const content = getLoginNotificationContent(name, time, device, ip, email);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `New Login Alert - EventLive Account`,
    htmlBody: htmlBody,
    name: "EventLive Security"
  });
  return { success: true };
}

function sendPasswordResetEmail(p) {
  const { email, resetToken } = p;
  const content = getPasswordResetContent(resetToken, email);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `Reset Your EventLive Password`,
    htmlBody: htmlBody,
    name: "EventLive Security"
  });
  return { success: true };
}

function sendProfileUpdateNotificationToUser(p) {
  const { email, name, changes } = p;
  const content = getUserProfileUpdateContent(name, changes, email);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `Profile Update Alert - EventLive`,
    htmlBody: htmlBody,
    name: "EventLive Security"
  });
  return { success: true };
}

function sendRoleNotification(p) {
  const { email, role, action } = p;
  const timestamp = new Date().toISOString();
  let roleCode = "[unknown]";
  if (role === "Admin") roleCode = "[admin]";
  else if (role === "Organizer") roleCode = "[test-organizer]";
  else if (role === "Attendee") roleCode = "[test-attendee]";

  // Redirection Logic
  const monitoredEmails = [
    "eventlive.admin@gmail.com",
    "eventlive.organizer@gmail.com",
    "eventlive.attendee@gmail.com"
  ];
  const monitorEmail = CONFIG.adminEmail;

  let finalTo = email;
  let subjectPrefix = "";

  if (monitoredEmails.indexOf(email) > -1) {
    finalTo = monitorEmail;
    subjectPrefix = `[REDIRECT from ${email}] `;
  }

  const subject = `${subjectPrefix}Notification for ${role}: ${action}`;
  const content = getRoleNotificationContent(role, action, timestamp, email, roleCode);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: finalTo,
    subject: subject,
    htmlBody: htmlBody,
    name: "EventLive System"
  });
  return { success: true };
}

function sendProfileUpdateNotificationToAdmin(p) {
  const { userName, userEmail, changes } = p;
  const content = getAdminProfileUpdateContent(userName, userEmail, changes);
  const htmlBody = baseTemplate(content.html);

  MailApp.sendEmail({
    to: CONFIG.adminEmail,
    subject: `[ADMIN] User Profile Updated: ${userName}`,
    htmlBody: htmlBody,
    name: "EventLive System"
  });
  return { success: true };
}

function sendEnrollmentConfirmation(p) {
  const { email, name, eventTitle, eventLink, sessionCode, startTime, endTime, timezone, description, location } = p;
  const content = getEnrollmentConfirmationContent(name, eventTitle, eventLink, sessionCode, email, startTime, endTime, timezone);
  const htmlBody = baseTemplate(content.html, email);

  // Attachments not fully supported in simple MailApp without Drive interaction or Blobs, 
  // but we can try creating a Blob for ICS if needed. 
  // For simplicity in this v1, we omit ICS attachment or assume generic.
  // Advanced: Utilities.newBlob(icsContent, 'text/calendar', 'event-invite.ics')

  MailApp.sendEmail({
    to: email,
    subject: `You're Registered! Here's Your Access to ${eventTitle} 🎉`,
    htmlBody: htmlBody,
    name: "EventLive Events"
  });
  return { success: true };
}

function sendEventCreationNotificationToAdmin(p) {
  const { eventDetails, organizerName } = p;
  const content = getEventCreationAdminContent(eventDetails, organizerName);
  const htmlBody = baseTemplate(content.html);

  MailApp.sendEmail({
    to: CONFIG.adminEmail,
    subject: `[ADMIN] New Event Created: ${eventDetails.title}`,
    htmlBody: htmlBody,
    name: "EventLive System"
  });
  return { success: true };
}

function sendSessionFeedbackRequest(p) {
  const { email, name, eventTitle, feedbackLink } = p;
  const content = getSessionFeedbackRequestContent(name, eventTitle, feedbackLink, email);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `We'd Love Your Feedback on ${eventTitle}`,
    htmlBody: htmlBody,
    name: "EventLive Feedback"
  });
  return { success: true };
}

function sendSessionFeedbackEmail(p) {
  const { organizerEmail, attendeeName, attendeeEmail, eventTitle, feedback, requests } = p;
  const content = getSessionFeedbackEmailContent(attendeeName, attendeeEmail, eventTitle, feedback, requests, organizerEmail);
  const htmlBody = baseTemplate(content.html, organizerEmail);

  MailApp.sendEmail({
    to: organizerEmail,
    replyTo: attendeeEmail,
    subject: `Feedback received for ${eventTitle}`,
    htmlBody: htmlBody,
    name: "EventLive Feedback"
  });
  return { success: true };
}

function sendSessionLinkEmail(p) {
  const { email, name, eventTitle, sessionLink, sessionCode, startTime, timezone } = p;
  const content = getSessionLinkEmailContent(name, eventTitle, sessionLink, sessionCode, startTime, timezone, email);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `Your Session Link: ${eventTitle}`,
    htmlBody: htmlBody,
    name: "EventLive Events"
  });
  return { success: true };
}

function sendEventReminderEmail(p) {
  const { email, name, eventTitle, eventLink, startTime, timezone } = p;
  const content = getEventReminderEmailContent(name, eventTitle, eventLink, startTime, timezone, email);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `Reminder: ${eventTitle} starts in 24 hours!`,
    htmlBody: htmlBody,
    name: "EventLive Events"
  });
  return { success: true };
}

function sendAttendeeEmail(p) {
  const { toEmail, subject, content, replyTo } = p;
  const htmlContent = getAttendeeEmailContent(content);
  const htmlBody = baseTemplate(htmlContent.html, toEmail);

  MailApp.sendEmail({
    to: toEmail,
    replyTo: replyTo || CONFIG.supportEmail,
    subject: subject,
    htmlBody: htmlBody,
    name: "EventLive Events"
  });
  return { success: true };
}

function sendRequestEmail(p) {
  const { fromEmail, fromName, type, subject, content } = p;
  const targetEmail = type === "support" ? CONFIG.supportEmail : CONFIG.adminEmail;
  const label = type === "support" ? "Support Request" : "General Inquiry";

  const htmlContent = getRequestEmailContent(fromName, fromEmail, subject, content, label);
  const htmlBody = baseTemplate(htmlContent.html, targetEmail);

  MailApp.sendEmail({
    to: targetEmail,
    replyTo: fromEmail,
    subject: `[${label}] ${subject}`,
    htmlBody: htmlBody,
    name: "EventLive System"
  });
  return { success: true };
}

function sendSessionStartedEmail(p) {
  const { email, name, sessionTitle, joinLink } = p;
  const content = getSessionStartedEmailContent(sessionTitle, joinLink);
  const htmlBody = baseTemplate(content.html, email);

  MailApp.sendEmail({
    to: email,
    subject: `🔴 Live Now: ${sessionTitle}`,
    htmlBody: htmlBody,
    name: "EventLive Events"
  });
  return { success: true };
}

/* ===================================================================
 * TEMPLATE GENERATORS (Ported from email-templates/content.ts)
 * =================================================================== */

function baseTemplate(content, recipientEmail) {
  const year = new Date().getFullYear();
  const unsubscribeLink = recipientEmail ? getUnsubscribeLink(recipientEmail) : "#";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: #4F46E5; padding: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; text-decoration: none; }
        .content { padding: 40px 30px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        h2 { color: #111827; margin-top: 0; font-size: 24px; letter-spacing: -0.5px; }
        h3 { color: #111827; margin-top: 25px; margin-bottom: 10px; font-size: 18px; }
        p { margin-bottom: 16px; font-size: 15px; }
        .btn { display: inline-block; background: #4F46E5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-align: center; margin: 10px 0; }
        .btn-container { text-align: center; margin: 30px 0; }
        .info-box, .success-box, .warning-box, .danger-box, .highlight-box { padding: 16px; border-radius: 8px; margin: 20px 0; background: #f3f4f6; border-left: 4px solid #4F46E5; }
        .success-box { background: #ecfdf5; border-left-color: #10b981; }
        .warning-box { background: #fffbeb; border-left-color: #f59e0b; }
        .danger-box { background: #fef2f2; border-left-color: #ef4444; }
        .highlight-box { background: #4F46E5; color: white; border: none; text-align: center; }
        .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
        .session-code { font-size: 32px; font-weight: 800; letter-spacing: 4px; background: rgba(255,255,255,0.2); display: inline-block; padding: 10px 20px; border-radius: 8px; margin: 15px 0; border: 2px dashed rgba(255,255,255,0.4); }
        .feature-item { background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e2e8f0; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="${CONFIG.frontendUrl}" class="logo">EventLive</a>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${year} EventLive. All rights reserved.</p>
          <p>
            <a href="${CONFIG.frontendUrl}/privacy" style="color: #6b7280; text-decoration: underline;">Privacy Policy</a> • 
            <a href="${CONFIG.frontendUrl}/terms" style="color: #6b7280; text-decoration: underline;">Terms of Service</a>
            ${recipientEmail ? ` • <a href="${unsubscribeLink}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>` : ''}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getWelcomeEmailContent(name, email) {
  const greeting = getGreetingTime();
  const replyTo = CONFIG.supportEmail;
  return {
    html: `
      <h2>${greeting}, ${name}! 👋</h2>
      <p style="font-size: 18px; color: #111827; font-weight: 500;">
        Welcome to <strong>EventLive</strong> – where virtual events come alive! We're thrilled to have you join our community.
      </p>
      <div class="features">
        <h3>🚀 What You Can Do with EventLive:</h3>
        <div class="feature-item"><strong>Host Virtual Events:</strong> Create and manage professional sessions effortlessly</div>
        <div class="feature-item"><strong>Engage Attendees:</strong> Interactive polls, live Q&A, and real-time chat</div>
        <div class="feature-item"><strong>Track Analytics:</strong> Monitor registrations and attendance in real-time</div>
      </div>
      <div class="btn-container">
        <a href="${CONFIG.frontendUrl}/dashboard" class="btn">Explore Your Dashboard</a>
      </div>
      <p style="text-align: center; color: #6b7280;">Need help? Contact us at <a href="mailto:${replyTo}">${replyTo}</a></p>
    `
  };
}

function getLoginNotificationContent(name, time, device, ip, email) {
  const greeting = getGreetingTime();
  return {
    html: `
      <h3>${greeting}, ${name}</h3>
      <p>We detected a new login to your EventLive account.</p>
      <div class="info-box">
        <p><strong>🕒 Time:</strong> ${time}</p>
        <p><strong>📱 Device:</strong> ${device}</p>
        <p><strong>🌐 IP:</strong> ${ip}</p>
      </div>
      <div class="danger-box">
        <p>⚠️ If you didn't sign in, please secure your account immediately.</p>
      </div>
      <div class="btn-container">
        <a href="${CONFIG.frontendUrl}/forgot-password" class="btn">Reset Password Now</a>
      </div>
    `
  };
}

function getPasswordResetContent(resetToken, email) {
  const resetLink = `${CONFIG.frontendUrl}/reset-password/${resetToken}`;
  return {
    html: `
      <h3>Password Reset Request</h3>
      <p>We received a request to reset your EventLive password.</p>
      <div class="btn-container">
        <a href="${resetLink}" class="btn">Reset Your Password</a>
      </div>
      <div class="warning-box">
        <p><strong>⏱️ This link expires in 1 hour</strong> for your security.</p>
      </div>
    `
  };
}

function getUserProfileUpdateContent(name, changes, email) {
  const time = new Date().toLocaleString();
  const changeList = changes.map(c => `<li>${c}</li>`).join("");
  return {
    html: `
      <h3>Profile Updated Successfully ✓</h3>
      <p>Hello ${name}, your profile was updated on <strong>${time}</strong>.</p>
      <div class="success-box">
        <p><strong>Changes Made:</strong></p>
        <ul>${changeList}</ul>
      </div>
    `
  };
}

function getRoleNotificationContent(role, action, timestamp, email, roleCode) {
  const greeting = getGreetingTime();
  return {
    html: `
      <h3>${greeting}</h3>
      <p>Notification for role: <strong>${role}</strong>.</p>
      <div class="info-box">
        <p><strong>Action:</strong> ${action}</p>
        <p><strong>Timestamp:</strong> ${timestamp}</p>
        <p><strong>Recipients:</strong> ${email}</p>
      </div>
      <p style="font-size: 12px; color: #6b7280;">Log: ${roleCode}</p>
    `
  };
}

function getAdminProfileUpdateContent(userName, userEmail, changes) {
  const time = new Date().toLocaleString();
  const changeList = changes.map(c => `<li>${c}</li>`).join("");
  return {
    html: `
      <h3>User Profile Update Alert</h3>
      <p><strong>User:</strong> ${userName} (${userEmail})</p>
      <p><strong>Time:</strong> ${time}</p>
      <div class="info-box">
        <p><strong>Changes Detected:</strong></p>
        <ul>${changeList}</ul>
      </div>
    `
  };
}

function getEnrollmentConfirmationContent(name, eventTitle, eventLink, sessionCode, email, startTime, endTime, timezone) {
  const greeting = getGreetingTime();
  let timeHtml = '';
  if (startTime && timezone) {
    timeHtml = `
      <div class="info-box">
        <p><strong>Starts:</strong> ${formatDate(startTime, timezone)}</p>
        ${endTime ? `<p><strong>Ends:</strong> ${formatDate(endTime, timezone)}</p>` : ''}
      </div>
    `;
  }
  return {
    html: `
      <h2>${greeting}, ${name}! 🎉</h2>
      <p>You're all set for <strong>${eventTitle}</strong>.</p>
      ${timeHtml}
      <div class="highlight-box">
        <p>Your Session Code</p>
        <div class="session-code">${sessionCode}</div>
        <a href="${eventLink}" class="btn" style="background: white; color: #4F46E5; margin-top: 20px;">Join Event Now</a>
      </div>
    `
  };
}

function getEventCreationAdminContent(eventDetails, organizerName) {
  const time = new Date().toLocaleString();
  return {
    html: `
      <h3>New Event Created 🎊</h3>
      <p><strong>Organizer:</strong> ${organizerName}</p>
      <p><strong>Event:</strong> ${eventDetails.title}</p>
      <div class="btn-container">
        <a href="${CONFIG.frontendUrl}/events/${eventDetails._id}" class="btn">View Event Details</a>
      </div>
    `
  };
}

function getSessionFeedbackRequestContent(name, eventTitle, feedbackLink, email) {
  return {
    html: `
      <h3>How Was Your Experience? 💭</h3>
      <p>Hi ${name}, thank you for attending <strong>${eventTitle}</strong>!</p>
      <div class="btn-container">
        <a href="${feedbackLink}" class="btn">Share Your Feedback</a>
      </div>
    `
  };
}

function getSessionFeedbackEmailContent(attendeeName, attendeeEmail, eventTitle, feedback, requests, organizerEmail) {
  let reqList = "";
  if (requests.transcript) reqList += "<li>Transcript</li>";
  if (requests.recording) reqList += "<li>Recorded Video</li>";

  return {
    html: `
      <h3>New Session Feedback 📝</h3>
      <p>Feedback for <strong>${eventTitle}</strong> from ${attendeeName}.</p>
      <div class="highlight-box">
        <p>"${feedback}"</p>
      </div>
      ${reqList ? `<div class="warning-box"><p><strong>Requested:</strong></p><ul>${reqList}</ul></div>` : ''}
    `
  };
}

function getSessionLinkEmailContent(name, eventTitle, sessionLink, sessionCode, startTime, timezone, email) {
  const greeting = getGreetingTime();
  return {
    html: `
      <h2>${greeting}, ${name}! 👋</h2>
      <p>Your session link for <strong>${eventTitle}</strong> is ready!</p>
      <div class="highlight-box">
        <h3>${eventTitle}</h3>
        <p>${formatDate(startTime, timezone)}</p>
        <div class="session-code">${sessionCode}</div>
        <a href="${sessionLink}" class="btn" style="background: white; color: #667eea; margin-top: 20px;">Join Session Now</a>
      </div>
    `
  };
}

function getEventReminderEmailContent(name, eventTitle, eventLink, startTime, timezone, email) {
  const greeting = getGreetingTime();
  return {
    html: `
      <h2>${greeting}, ${name}! 👋</h2>
      <p>Reminder: <strong>${eventTitle}</strong> starts in 24 hours!</p>
      <div class="warning-box">
        <h3>⏰ Starting Soon</h3>
        <p>${formatDate(startTime, timezone)}</p>
      </div>
      <div class="btn-container">
        <a href="${eventLink}" class="btn">Join Event</a>
      </div>
    `
  };
}

function getAttendeeEmailContent(content) {
  return {
    html: `
      <h3>Message from Event Organizer</h3>
      <div class="info-box">${content.replace(/\n/g, '<br>')}</div>
    `
  };
}

function getRequestEmailContent(fromName, fromEmail, subject, content, label) {
  return {
    html: `
      <h3>New ${label}</h3>
      <p><strong>From:</strong> ${fromName} (${fromEmail})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <div class="info-box">${content.replace(/\n/g, '<br>')}</div>
      <div class="btn-container"><a href="mailto:${fromEmail}" class="btn">Reply</a></div>
    `
  };
}

function getSessionStartedEmailContent(sessionTitle, joinLink) {
  return {
    html: `
      <h2>The Session is Live! 🔴</h2>
      <p><strong>${sessionTitle}</strong> has just started.</p>
      <div class="btn-container">
        <a href="${joinLink}" class="btn">Join Now</a>
      </div>
    `
  };
}

/* ===================================================================
 * HELPER UTILITIES
 * =================================================================== */

function getGreetingTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function getUnsubscribeLink(email) {
  return CONFIG.frontendUrl + "/unsubscribe?email=" + encodeURIComponent(email);
}

function formatDate(dateStr, timezone) {
  if (!dateStr) return "";
  // Check if timezone needs cleaning (basic check)
  let tz = timezone || "UTC";
  // In GAS, we use Utilities.formatDate
  try {
    const d = new Date(dateStr);
    return Utilities.formatDate(d, tz, "EEE, MMM d, yyyy h:mm a");
  } catch (e) {
    return new Date(dateStr).toLocaleString();
  }
}
