import { config } from "../../config";
import { formatInTimeZone } from "../../utils/date";
import { getGreetingTime, getUnsubscribeLink } from "./utils";

// Helper Interface for common return type
interface EmailContent {
    html: string;
    text?: string;
}

// 1. Welcome Email
export const getWelcomeEmailContent = (name: string, email: string) => {
    const greeting = getGreetingTime();
    const replyTo = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;

    const html = `
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
      Need help getting started? Our support team is here for you at <a href="mailto:${replyTo}" style="color: #FF5722; font-weight: 600;">${replyTo}</a>
    </p>
  `;

    const text = `
${greeting}, ${name}!

Welcome to EventLive – where virtual events come alive! We're thrilled to have you join our community.

What You Can Do with EventLive:
✓ Host Virtual Events: Create and manage professional sessions effortlessly
✓ Engage Attendees: Interactive polls, live Q&A, and real-time chat
✓ Track Analytics: Monitor registrations and attendance in real-time
✓ Secure Platform: Enterprise-grade security for peace of mind

Get Started: ${config.frontendUrl}/dashboard

Need help? Contact us at ${replyTo}

© ${new Date().getFullYear()} EventLive. All rights reserved.
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

    return { html, text };
};

// 2. Login Notification
export const getLoginNotificationContent = (name: string, time: string, device: string, ip: string, email: string) => {
    const greeting = getGreetingTime();

    const html = `
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
      <a href="${config.frontendUrl}/forgot-password" class="btn">Reset Password Now</a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; text-align: center;">
      For your security, we recommend using a strong, unique password and enabling two-factor authentication.
    </p>
  `;

    const text = `
${greeting}, ${name}

New Login Detected

We detected a new login to your EventLive account.

Login Details:
- Time: ${time}
- Device: ${device}
- IP Address: ${ip}

If this was you, you can safely ignore this email.

If you didn't sign in, please reset your password immediately:
${config.frontendUrl}/forgot-password

© ${new Date().getFullYear()} EventLive Security Team
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

    return { html, text };
};

// 3. Password Reset
export const getPasswordResetContent = (resetToken: string, email: string) => {
    const resetLink = `${config.frontendUrl}/reset-password/${resetToken}`;

    const html = `
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
  `;

    const text = `
Password Reset Request

We received a request to reset your EventLive password.

Reset your password here: ${resetLink}

This link expires in 1 hour for your security.

If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} EventLive Security Team
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

    return { html, text };
};

// 4. User Profile Update
export const getUserProfileUpdateContent = (name: string, changes: string[], email: string) => {
    const time = new Date().toLocaleString();
    const changeList = changes.map(c => `<li style="margin: 8px 0; color: #374151;">${c}</li>`).join("");

    const html = `
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
  `;

    const text = `
Profile Updated Successfully

Hello ${name},

Your profile information was recently updated on ${time}.

Changes Made:
${changes.map(c => `- ${c}`).join('\n')}

If you did not make these changes, please contact support immediately.

© ${new Date().getFullYear()} EventLive Security Team
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

    return { html, text };
};

// 5. Role Notification
export const getRoleNotificationContent = (role: string, action: string, timestamp: string, email: string, roleCode: string) => {
    const greeting = getGreetingTime();

    const html = `
    <h3>${greeting}</h3>
    <p>This is a notification for your role: <strong>${role}</strong>.</p>
    <div class="info-box">
      <p><strong>Action:</strong> ${action}</p>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      <p><strong>Original Recipient:</strong> ${email}</p>
    </div>
    <p style="font-size: 12px; color: #6b7280;">Log: ${roleCode}</p>
  `;

    const text = `
${greeting}

Notification for role: ${role}
Action: ${action}
Timestamp: ${timestamp}
Original Recipient: ${email}
Log Code: ${roleCode}

© ${new Date().getFullYear()} EventLive
  `;

    return { html, text };
};

// 6. Admin Profile Update
export const getAdminProfileUpdateContent = (userName: string, userEmail: string, changes: string[]) => {
    const time = new Date().toLocaleString();
    const changeList = changes.map(c => `<li style="margin: 8px 0;">${c}</li>`).join("");

    const html = `
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
  `;

    const text = `
User Profile Update Alert

User: ${userName} (${userEmail})
Time: ${time}

Changes Detected:
${changes.map(c => `- ${c}`).join('\n')}

This is an automated security notification.

© ${new Date().getFullYear()} EventLive System
  `;

    return { html, text };
};

// 7. Enrollment Confirmation
export const getEnrollmentConfirmationContent = (
    name: string,
    eventTitle: string,
    eventLink: string,
    sessionCode: string,
    email: string,
    startTime?: Date,
    endTime?: Date,
    timezone?: string
) => {
    const greeting = getGreetingTime();

    const html = `
    <h2>${greeting}, ${name}! 🎉</h2>
    <p style="font-size: 18px; font-weight: 500;">
      You're all set! You've successfully enrolled in <strong>${eventTitle}</strong>.
    </p>
    
    ${startTime && timezone ? `
    <div class="info-box">
      <p style="margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;">Event Time</p>
      <p style="margin: 4px 0; font-size: 16px;"><strong>Starts:</strong> ${formatInTimeZone(startTime, timezone)}</p>
      ${endTime ? `<p style="margin: 4px 0; font-size: 16px;"><strong>Ends:</strong> ${formatInTimeZone(endTime, timezone)}</p>` : ''}
      <p style="margin: 4px 0; font-size: 14px; color: #666;">(${timezone})</p>
    </div>
    ` : ''}

    <div class="highlight-box">
      <p style="margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;">Your Session Code</p>
      <div class="session-code">${sessionCode}</div>
      <a href="${eventLink}" class="btn" style="background: white; color: #4F46E5; margin-top: 20px;">Join Event Now</a>
    </div>

    <div class="info-box">
      <p style="margin: 0 0 12px 0;"><strong>📌 Important Reminders:</strong></p>
      <p style="margin: 8px 0;">• Save this email – you'll need your session code to join</p>
      <p style="margin: 8px 0;">• Join 5-10 minutes early to test your setup</p>
      <p style="margin: 8px 0;">• Check your audio and video before the event starts</p>
      <p style="margin: 8px 0;">• Use a stable internet connection for the best experience</p>
    </div>

    <div class="divider"></div>

    <p style="text-align: center;">
      We're excited to see you at the event! If you have any questions, feel free to reach out to our support team.
    </p>
  `;

    const text = `
${greeting}, ${name}!

You're enrolled in ${eventTitle}!

Your Session Code: ${sessionCode}

Join Event: ${eventLink}

Important Reminders:
• Save this email – you'll need your session code to join
• Join 5-10 minutes early to test your setup
• Check your audio and video before the event starts
• Use a stable internet connection for the best experience

See you there!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

    return { html, text };
};

// 8. Event Creation Admin Notification
export const getEventCreationAdminContent = (eventDetails: any, organizerName: string) => {
    const time = new Date().toLocaleString();

    const html = `
    <h3>New Event Created 🎊</h3>
    <p><strong>Organizer:</strong> ${organizerName}</p>
    <p><strong>Event Title:</strong> ${eventDetails.title}</p>
    <p><strong>Created At:</strong> ${time}</p>
    
    <div class="info-box">
      <p style="margin: 4px 0;"><strong>Type:</strong> ${eventDetails.category || eventDetails.type}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${formatInTimeZone(eventDetails.startTime, eventDetails.timezone || 'UTC')}</p>
      <p style="margin: 4px 0;"><strong>Visibility:</strong> ${eventDetails.visibility}</p>
    </div>
    
    <div class="btn-container">
      <a href="${config.frontendUrl}/events/${eventDetails._id}" class="btn">View Event Details</a>
    </div>
  `;

    const text = `
New Event Created

Organizer: ${organizerName}
Event Title: ${eventDetails.title}
Created At: ${time}

Type: ${eventDetails.category || eventDetails.type}
Date: ${new Date(eventDetails.startTime).toLocaleString()}
Visibility: ${eventDetails.visibility}

View Event: ${config.frontendUrl}/events/${eventDetails._id}

© ${new Date().getFullYear()} EventLive System
  `;

    return { html, text };
};

// 9. Session Feedback Request
export const getSessionFeedbackRequestContent = (name: string, eventTitle: string, feedbackLink: string, email: string) => {
    const html = `
    <h3>How Was Your Experience? 💭</h3>
    <p>Hi ${name},</p>
    <p>Thank you for attending <strong>${eventTitle}</strong>! We hope you had a great experience.</p>
    
    <p style="font-size: 16px; font-weight: 500;">
      Your feedback helps us improve future events. Would you mind taking a moment to share your thoughts?
    </p>
    
    <div class="btn-container">
      <a href="${feedbackLink}" class="btn">Share Your Feedback</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>⏱️ Takes less than 2 minutes</strong> – Your input is invaluable to us!
      </p>
    </div>
    
    <p style="text-align: center; color: #6b7280;">
      Thank you for being part of our community!
    </p>
  `;

    const text = `
How Was Your Experience?

Hi ${name},

Thank you for attending ${eventTitle}! We hope you had a great experience.

Your feedback helps us improve future events. Would you mind taking a moment to share your thoughts?

Share Your Feedback: ${feedbackLink}

Takes less than 2 minutes – Your input is invaluable to us!

Thank you for being part of our community!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

    return { html, text };
};

// 10. Session Feedback Email (to Organizer)
export const getSessionFeedbackEmailContent = (
    attendeeName: string,
    attendeeEmail: string,
    eventTitle: string,
    feedback: string,
    requests: { transcript: boolean; recording: boolean },
    organizerEmail: string
) => {
    const time = new Date().toLocaleString();
    const requestList: string[] = [];
    if (requests.transcript) requestList.push("Transcript");
    if (requests.recording) requestList.push("Recorded Video");

    const html = `
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
  `;

    const text = `
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

    return { html, text };
};

// 11. Session Link Email
export const getSessionLinkEmailContent = (
    name: string,
    eventTitle: string,
    sessionLink: string,
    sessionCode: string,
    startTime: Date,
    timezone: string,
    email: string
) => {
    const greeting = getGreetingTime();
    const formattedDateTime = formatInTimeZone(startTime, timezone, "PPP p");

    const html = `
    <h2>${greeting}, ${name}! 👋</h2>
    <p style="font-size: 18px; font-weight: 500;">
      Your session link for <strong>${eventTitle}</strong> is ready!
    </p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;">Session Details</p>
      <h2 style="margin: 10px 0; color: white;">${eventTitle}</h2>
      <p style="margin: 5px 0 20px 0; font-size: 16px;">📅 ${formattedDateTime} (${timezone})</p>
      
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
  `;

    const text = `
${greeting}, ${name}!

Your session link for ${eventTitle} is ready!

Session Details:
${eventTitle}
📅 ${formattedDateTime} (${timezone})


Session Code: ${sessionCode}

Join Session: ${sessionLink}

💡 Pro Tip: Join a few minutes early to test your audio and video settings!

We look forward to seeing you at the event!

© ${new Date().getFullYear()} EventLive
Unsubscribe: ${getUnsubscribeLink(email)}
  `;

    return { html, text };
};

// 12. Event Reminder Email
export const getEventReminderEmailContent = (
    name: string,
    eventTitle: string,
    eventLink: string,
    startTime: Date,
    timezone: string,
    email: string
) => {
    const greeting = getGreetingTime();
    const formattedDate = formatInTimeZone(startTime, timezone, "EEEE, MMMM do, yyyy");
    const formattedTime = formatInTimeZone(startTime, timezone, "h:mm a");

    const html = `
    <h2>${greeting}, ${name}! 👋</h2>
    <p style="font-size: 18px; font-weight: 500;">
      This is a friendly reminder that <strong>${eventTitle}</strong> is starting soon!
    </p>
    
    <div class="warning-box">
      <h3 style="margin: 0 0 12px 0; color: #92400e;">⏰ Event Starting In 24 Hours</h3>
      <p style="margin: 5px 0; color: #92400e;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="margin: 5px 0; color: #92400e;"><strong>🕐 Time:</strong> ${formattedTime} (${timezone})</p>
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
  `;

    const text = `
${greeting}, ${name}!

This is a friendly reminder that ${eventTitle} is starting soon!

⏰ Event Starting In 24 Hours

📅 Date: ${formattedDate}
🕐 Time: ${formattedTime} (${timezone})

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

    return { html, text };
};

// 13. Attendee Email (From Organizer)
export const getAttendeeEmailContent = (content: string) => {
    const html = `
    <h3>Message from Event Organizer</h3>
    <div class="info-box">
      ${content.replace(/\n/g, '<br>')}
    </div>
    <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
      You received this email because you are registered for an event on EventLive.
    </p>
  `;

    return { html };
};

// 14. Request Email
export const getRequestEmailContent = (fromName: string, fromEmail: string, subject: string, content: string, label: string) => {
    const html = `
    <h3>New ${label}</h3>
    <p><strong>From:</strong> ${fromName} (<a href="mailto:${fromEmail}">${fromEmail}</a>)</p>
    <p><strong>Subject:</strong> ${subject}</p>
    
    <div class="info-box">
      ${content.replace(/\n/g, '<br>')}
    </div>
    
    <div class="btn-container">
      <a href="mailto:${fromEmail}?subject=Re: ${subject}" class="btn">Reply to Attendee</a>
    </div>
  `;

    return { html };
};

// 15. Session Started Email
export const getSessionStartedEmailContent = (sessionTitle: string, joinLink: string) => {
    const html = `
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
  `;

    const text = `
The Session is Live!

The session "${sessionTitle}" has just started.

Join Now: ${joinLink}

See you there!
  `;

    return { html, text };
};
