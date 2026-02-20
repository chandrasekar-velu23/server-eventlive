
import { config } from "../../config";
import { getUnsubscribeLink } from "./utils";

const LOGO_URL = "https://pub-f5610efa06534bd7b70f3b1f8e1b248e.r2.dev/assets/EventLive.png";

export const baseTemplate = (content: string, email?: string) => `
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
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* ===== CONTAINER ===== */
    .email-wrapper {
      width: 100%;
      background-color: #f4f4f5;
      padding: 40px 0;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e4e4e7;
    }
    
    /* ===== HEADER ===== */
    .header {
      text-align: center;
      padding: 32px 24px;
      background-color: #ffffff;
      border-bottom: 3px solid #4338CA; /* Brand Indigo */
    }
    
    .logo-img {
      display: block;
      width: 160px; /* Reduced specific size for the PNG */
      height: auto;
      margin: 0 auto;
      max-width: 100%;
    }
    
    /* ===== CONTENT ===== */
    .content {
      padding: 40px 32px;
      background-color: #ffffff;
    }
    
    h1, h2, h3, h4 {
      margin: 0 0 20px 0;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    
    h1 { font-size: 28px; margin-bottom: 16px; letter-spacing: -0.5px; }
    h2 { font-size: 24px; margin-bottom: 16px; letter-spacing: -0.3px; }
    h3 { font-size: 20px; margin-bottom: 12px; }
    
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
      font-size: 16px;
      line-height: 1.6;
    }
    
    strong {
      color: #111827;
      font-weight: 700;
    }
    
    a {
      color: #4338CA;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover { text-decoration: underline; }
    
    /* ===== BUTTONS ===== */
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background-color: #4338CA; /* Brand Indigo */
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: background-color 0.2s ease;
      border: none;
      box-shadow: 0 2px 4px rgba(67, 56, 202, 0.2);
    }
    
    .btn:hover {
      background-color: #3730A3;
    }
    
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    
    /* ===== INFO BOXES ===== */
    .info-box, .warning-box, .success-box, .highlight-box {
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
      font-size: 15px;
    }
    
    .info-box {
      background-color: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      color: #0c4a6e;
    }
    
    .warning-box {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }
    
    .success-box {
      background-color: #ecfdf5;
      border-left: 4px solid #10b981;
      color: #065f46;
    }
    
    .highlight-box {
      background-color: #4338CA;
      color: #ffffff;
      text-align: center;
      padding: 32px 24px;
    }
    .highlight-box h2, .highlight-box h3, .highlight-box p { color: #ffffff; }
    .highlight-box .session-code {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.2);
      color: #ffffff;
    }
    
    .session-code {
      background: #f3f4f6;
      padding: 16px;
      border-radius: 6px;
      margin: 20px 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #111827;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    
    /* ===== FEATURES LIST ===== */
    .features {
      background-color: #f9fafb;
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
      border: 1px solid #e5e7eb;
    }
    
    .feature-item {
      margin-bottom: 12px;
      padding-left: 28px;
      position: relative;
      color: #374151;
      font-size: 15px;
    }
    
    .feature-item:last-child { margin-bottom: 0; }
    
    .feature-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      top: 0;
      color: #4338CA;
      font-weight: bold;
    }
    
    /* ===== DIVIDER ===== */
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 32px 0;
    }
    
    /* ===== FOOTER ===== */
    .footer {
      text-align: center;
      padding: 32px 24px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    
    .footer-logo {
      width: 100px; /* Smaller footer logo */
      height: auto;
      opacity: 0.8;
      margin-bottom: 16px;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
      font-size: 13px;
    }
    
    .social-links a:hover { color: #4338CA; }
    
    .copyright {
      margin-top: 24px;
      font-size: 12px;
      color: #9ca3af;
    }
    
    /* ===== RESPONSIVE ===== */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 0 !important; }
      .email-container { border-radius: 0 !important; border: none !important; }
      .content { padding: 32px 20px !important; }
      .header { padding: 24px 20px !important; }
      .footer { padding: 32px 20px !important; }
      .btn { display: block !important; width: 100% !important; padding: 16px !important; }
      h1 { font-size: 24px !important; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <a href="${config.frontendUrl}" target="_blank" style="text-decoration: none;">
          <img src="${LOGO_URL}" alt="EventLive" class="logo-img" />
        </a>
      </div>
      
      <!-- Content -->
      <div class="content">
        ${content}
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <img src="${LOGO_URL}" alt="EventLive" class="footer-logo" />
        <p style="margin-bottom: 8px;">Seamless Virtual Events, Reimagined.</p>
        
        <div class="social-links">
          <a href="${config.frontendUrl}" target="_blank">Home</a> •
          <a href="${config.frontendUrl}/dashboard" target="_blank">Dashboard</a> •
          <a href="mailto:support@eventlive.com">Support</a>
        </div>
        
        <div class="copyright">
          <p>© ${new Date().getFullYear()} EventLive. All rights reserved.</p>

          ${email ? `<p style="margin-top: 12px;"><a href="${getUnsubscribeLink(email)}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a></p>` : ''}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
