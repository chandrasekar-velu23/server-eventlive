import nodemailer from "nodemailer";
import path from "path";

/* ---------------------------------------------------
 * EMAIL CONFIGURATION
 * ---------------------------------------------------*/
const transporter = nodemailer.createTransport({
  service: "gmail", // Since user specifically requested Gmail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// reliable path resolution: goes up from src/services to root/public
const logoPath = path.resolve(__dirname, "../../public/EventLive.svg");

/* ---------------------------------------------------
 * HELPERS
 * ---------------------------------------------------*/
const getGreetingTime = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good Morning";
  if (currentHour < 18) return "Good Afternoon";
  return "Good Evening";
};

/* ---------------------------------------------------
 * TEMPLATES (Basic HTML)
 * ---------------------------------------------------*/
const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
  .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #FF5722; margin-bottom: 20px; }
  .logo { font-size: 24px; font-weight: bold; color: #FF5722; text-decoration: none; }
  .footer { text-align: center; font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 10px; }
  .btn { display: inline-block; padding: 10px 20px; background-color: #FF5722; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
  .features { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
  .feature-item { margin-bottom: 10px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${process.env.FRONTEND_URL}" class="logo">
        <!-- Text Fallback for visibility -->
        <span style="color: #FF5722; font-size: 28px; font-weight: bold; text-decoration: none;">EventLive</span>
        <!-- Image Logo -->
        <br/>
        <img src="cid:eventlivelogo" alt="EventLive" height="50" style="display: inline-block; margin-top: 10px; height: 50px; width: auto;" />
      </a>
    </div>
    ${content}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} EventLive. All rights reserved.</p>
      <p>Seamless Virtual Events, Reimagined.</p>
    </div>
  </div>
</body>
</html>
`;

/* ---------------------------------------------------
 * EXPORTED FUNCTIONS
 * ---------------------------------------------------*/

/**
 * Send Welcome Email (Signup)
 */
export const sendWelcomeEmail = async (email: string, name: string) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
      <h2>${greeting}, ${name}!</h2>
        <p>Welcome to <strong>EventLive</strong>. We are thrilled to have you on board.</p>
          <p>EventLive is your all-in-one platform for hosting and attending seamless virtual events.</p>

            <div class="features">
              <h3>🚀 What you can do with EventLive:</h3>
                <div class="feature-item">✅ <strong>Host Virtual Events:</strong> Create and manage sessions effortlessly.</div>
                  <div class="feature-item">✅ <strong>Engage Attendees:</strong> Live polls, Q&A, and chat features.</div>
                    <div class="feature-item">✅ <strong>Analytics:</strong> Track registrations and attendance in real-time.</div>
                      <div class="feature-item">✅ <strong>Secure Platform:</strong> Enterprise-grade security for your events.</div>
                        </div>

                        <p style="text-align: center;">
                          <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
                            </p>
                              `);

  try {
    await transporter.sendMail({
      from: `"EventLive Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to EventLive, ${name}!`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo' // same cid value as in the html img src
      }]
    });
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

/**
 * Send Login Notification
 */
export const sendLoginNotification = async (email: string, name: string, ip: string, device: string, time: string) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
  <h3>${greeting}, ${name}.</h3>
    <p>We noticed a new login to your EventLive account.</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>🕒 Time:</strong> ${time}</p>
          <p><strong>💻 Device:</strong> ${device}</p>
            <p><strong>🌐 IP Address:</strong> ${ip}</p>
              </div>
              <p>If this was you, you can safely ignore this email.</p>
                <p style="color: red;">If you did not sign in, please <a href="${process.env.FRONTEND_URL}/auth/reset-password">reset your password</a> immediately.</p>
                  `);

  try {
    await transporter.sendMail({
      from: `"EventLive Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `New Login Alert - EventLive`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Login notification sent to ${email}`);
  } catch (error) {
    console.error("Error sending login notification:", error);
  }
};

/**
 * Send Password Reset Email
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = baseTemplate(`
  <h3>Password Reset Request</h3>
    <p>You requested to reset your password. Click the button below to proceed:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="btn">Reset Password</a>
          </p>
          <p>This link is valid for 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Reset Your Password - EventLive`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
};

/**
 * Send Profile Update Notification to User
 */
export const sendProfileUpdateNotificationToUser = async (email: string, name: string, changes: string[]) => {
  const time = new Date().toLocaleString();
  const changeList = changes.map(c => `<li>${c}</li>`).join("");

  const html = baseTemplate(`
    <h3>Profile Updated</h3>
    <p>Hello ${name},</p>
    <p>Your profile information was recently updated on <strong>${time}</strong>.</p>
    <p><strong>The following changes were made:</strong></p>
    <ul>${changeList}</ul>
    <p>If you did not make these changes, please contact support immediately.</p>
  `);
  // Attachments are handled same way
  try {
    await transporter.sendMail({
      from: `"EventLive Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Profile Update Alert - EventLive`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Profile update notification sent to ${email}`);
  } catch (error) {
    console.error("Error sending profile update email to user:", error);
  }
};

/**
 * Send Profile Update Notification to Admin
 */
export const sendProfileUpdateNotificationToAdmin = async (userName: string, userEmail: string, changes: string[]) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER; // Default to sender if admin not set
  const time = new Date().toLocaleString();
  const changeList = changes.map(c => `<li>${c}</li>`).join("");

  const html = baseTemplate(`
    <h3>User Profile Update Alert</h3>
    <p><strong>User:</strong> ${userName} (${userEmail})</p>
    <p><strong>Time:</strong> ${time}</p>
    <p><strong>Changes Detected:</strong></p>
    <ul>${changeList}</ul>
    <p>This is an automated security notification.</p>
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive System" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `[ADMIN] User Profile Updated: ${userName}`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Admin notification sent for ${userEmail}`);
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
};

/**
 * Send Enrollment Confirmation
 */
export const sendEnrollmentConfirmation = async (email: string, name: string, eventTitle: string, eventLink: string, sessionCode: string) => {
  const greeting = getGreetingTime();

  const html = baseTemplate(`
      <h3>${greeting}, ${name}.</h3>
      <p>You have successfully enrolled in <strong>${eventTitle}</strong>!</p>
      
      <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #777;">Session Code</p>
        <h2 style="margin: 5px 0 20px 0; font-family: monospace; letter-spacing: 2px; color: #FF5722;">${sessionCode}</h2>
        
        <a href="${eventLink}" class="btn">Join Event</a>
      </div>
  
      <p>Please keep this email safe. You will need the session code or the link above to join the event.</p>
    `);

  try {
    await transporter.sendMail({
      from: `"EventLive Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Enrollment Confirmed: ${eventTitle}`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Enrollment confirmation sent to ${email}`);
  } catch (error) {
    console.error("Error sending enrollment confirmation:", error);
  }
};

/**
 * Send Event Creation Notification to Admin
 */
export const sendEventCreationNotificationToAdmin = async (eventDetails: any, organizerName: string) => {
  // Hardcoded as requested by user, but good to fallback or check env
  const adminEmail = "chandrasekarvelu23@gmail.com";
  const time = new Date().toLocaleString();

  const html = baseTemplate(`
    <h3>New Event Created</h3>
    <p><strong>Organizer:</strong> ${organizerName}</p>
    <p><strong>Event Title:</strong> ${eventDetails.title}</p>
    <p><strong>Created At:</strong> ${time}</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>Type:</strong> ${eventDetails.category || eventDetails.type}</p>
      <p><strong>Date:</strong> ${new Date(eventDetails.startTime).toLocaleString()}</p>
      <p><strong>Visibility:</strong> ${eventDetails.visibility}</p>
    </div>

    <p>
      <a href="${process.env.FRONTEND_URL}/events/${eventDetails._id}" class="btn">View Event</a>
    </p>
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive System" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `[ADMIN] New Event Created: ${eventDetails.title}`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Event creation notification sent to admin (${adminEmail})`);
  } catch (error) {
    console.error("Error sending event creation notification to admin:", error);
  }
};


/**
 * Send Session Feedback Email (to Organizer)
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
    <p><strong>Attendee:</strong> ${attendeeName} (<a href="mailto:${attendeeEmail}">${attendeeEmail}</a>)</p>
    <p><strong>Time:</strong> ${time}</p>
    
    <div style="background: #fdfdfd; padding: 15px; border-left: 4px solid #FF5722; margin: 15px 0;">
      <p><strong>Feedback:</strong></p>
      <p><em>"${feedback}"</em></p>
    </div>

    ${requestList.length > 0 ? `
    <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>Attendee Requested:</strong></p>
      <ul>
        ${requestList.map(r => `<li>${r}</li>`).join("")}
      </ul>
    </div>
    ` : ''}

    <p style="font-size: 12px; color: #999;">You can reply to this email to contact the attendee directly.</p>
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive Feedback" <${process.env.EMAIL_USER}>`,
      to: organizerEmail,
      replyTo: attendeeEmail,
      subject: `Feedback received for ${eventTitle}`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Feedback email sent to organizer (${organizerEmail})`);
  } catch (error) {
    console.error("Error sending feedback email:", error);
  }
};

/**
 * Send Session Link to Attendees
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
    
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; color: white;">
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

    <p>💡 <strong>Pro Tip:</strong> Join a few minutes early to test your audio and video settings!</p>
    <p>We look forward to seeing you at the event!</p>
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Session Link: ${eventTitle}`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Session link email sent to ${email}`);
  } catch (error) {
    console.error("Error sending session link email:", error);
  }
};

/**
 * Send Event Reminder (24 hours before)
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
    <h3>${greeting}, ${name}!</h3>
    <p>This is a friendly reminder that <strong>${eventTitle}</strong> is starting soon!</p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #856404;">⏰ Event Starting In 24 Hours</h3>
      <p style="margin: 5px 0; color: #856404;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="margin: 5px 0; color: #856404;"><strong>🕐 Time:</strong> ${formattedTime}</p>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${eventLink}" class="btn">Join Event</a>
    </p>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>📝 Before you join:</strong></p>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Test your internet connection</li>
        <li>Check your audio and video settings</li>
        <li>Prepare any questions you might have</li>
        <li>Have a notepad ready for key takeaways</li>
      </ul>
    </div>

    <p>See you soon!</p>
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Reminder: ${eventTitle} starts in 24 hours!`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Event reminder email sent to ${email}`);
  } catch (error) {
    console.error("Error sending event reminder email:", error);
  }
};

/**
 * Send Event Starting Soon Email (1 hour before)
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
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Starting Soon: ${eventTitle} in 1 hour!`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Event starting soon email sent to ${email}`);
  } catch (error) {
    console.error("Error sending event starting soon email:", error);
  }
};

/**
 * Send Thank You Email After Event
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
    <h3>${greeting}, ${name}!</h3>
    <p>Thank you for attending <strong>${eventTitle}</strong>! 🎉</p>
    
    <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center;">
      <h2 style="margin: 0 0 15px 0; color: #333;">We Hope You Enjoyed It!</h2>
      <p style="margin: 0; font-size: 16px; color: #555;">You attended for <strong>${durationText}</strong></p>
    </div>

    ${feedbackLink ? `
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 15px 0;"><strong>📝 We'd love your feedback!</strong></p>
      <p style="margin: 0 0 15px 0; color: #666;">Help us improve by sharing your thoughts</p>
      <a href="${feedbackLink}" class="btn">Share Feedback</a>
    </div>
    ` : ''}

    <div style="background: #fff; border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>🎯 What's Next?</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #666;">
        <li>Check your email for session recordings (if available)</li>
        <li>Connect with other attendees</li>
        <li>Explore more events on EventLive</li>
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/events" class="btn">Explore More Events</a>
    </p>

    <p>Thank you for being part of our community!</p>
  `);

  try {
    await transporter.sendMail({
      from: `"EventLive Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Thank you for attending ${eventTitle}!`,
      html,
      attachments: [{
        filename: 'EventLive.svg',
        path: logoPath,
        cid: 'eventlivelogo'
      }]
    });
    console.log(`Thank you email sent to ${email}`);
  } catch (error) {
    console.error("Error sending thank you email:", error);
  }
};

/**
 * Bulk Send Session Links to Multiple Attendees
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
      console.error(`Failed to send session link to ${attendee.email}:`, error);
    }
  }

  console.log(`Bulk send complete: ${results.sent} sent, ${results.failed} failed`);
  return results;
};

