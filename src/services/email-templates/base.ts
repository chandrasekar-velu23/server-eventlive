import fs from "fs";
import path from "path";
import { config } from "../../config";
import { getUnsubscribeLink } from "./utils";

/**
 * Convert SVG logo to base64 data URI for embedding
 */
const getLogoDataURI = (): string => {
    try {
        // Attempt to load from standard location, but don't crash if missing
        const logoPaths = [
            path.resolve(__dirname, "../../../../eventlive-client/public/logo-eventlive.svg"),
            path.resolve(__dirname, "../../../client/public/logo-eventlive.svg"),
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

export const baseTemplate = (content: string, email: string = "") => `
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
    .header {
      text-align: center;
      padding: 40px 20px;
      /* Indigo Gradient */
      background: linear-gradient(135deg, #4F46E5 0%, #4338ca 100%);
      position: relative;
    }
    
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
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
