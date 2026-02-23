export interface DriverRegistrationTemplateData {
  driverName: string;
  driverCode: string;
  passcode: string;
  logoUrl?: string; // Optional logo URL - if not provided, will use text "PALAGIS"
}

/**
 * Utility function to escape HTML entities for security
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export class DriverRegistrationTemplate {
  static readonly SUBJECT = 'Welcome to Palagis - Your Account Has Been Registered';

  static getSubject(): string {
    return this.SUBJECT;
  }

  static getText(data: DriverRegistrationTemplateData): string {
    return `Dear ${data.driverName},

Welcome to the fleet! Your journey starts here. Your account is active and ready for the road.

Here are your login credentials:

Driver Code: ${data.driverCode}
Temporary Passcode: ${data.passcode}

Please use these credentials to log in to your driver account.
Please change your passcode after your first login.

Need help getting started? Contact Support Team at support@palagis.com

© 2026 Palagis Logistics. All rights reserved.`;
  }

  static getHtml(data: DriverRegistrationTemplateData): string {
    // Escape user input to prevent XSS
    const safeDriverName = escapeHtml(data.driverName);
    const safeDriverCode = escapeHtml(data.driverCode);
    const safePasscode = escapeHtml(data.passcode);
    const safeLogoUrl = data.logoUrl ? escapeHtml(data.logoUrl) : null;

    // Logo section - use image if provided, otherwise use text
    const logoSection = safeLogoUrl
      ? `<img src="${safeLogoUrl}" alt="Palagis Logo" style="max-width: 200px; height: auto; display: block;" />`
      : `<div style="background-color: #111827; color: #ffffff; display: inline-block; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 20px; letter-spacing: 1px;">PALAGIS</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Palagis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            ${logoSection}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 20px 40px 0 40px; text-align: center;">
                            <h1 style="margin: 0; color: #111827; font-size: 26px; font-weight: 800; line-height: 1.2;">Welcome to the fleet!</h1>
                            <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 16px; line-height: 1.5;">Dear <strong>${safeDriverName}</strong>, your journey starts here. Your account is active and ready for the road.</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px 40px;">
                            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="padding-bottom: 15px;">
                                            <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Driver Code</p>
                                            <p style="margin: 4px 0 0 0; color: #111827; font-size: 20px; font-family: 'Courier New', Courier, monospace; font-weight: 700;">${safeDriverCode}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 15px; border-top: 1px solid #e5e7eb;">
                                            <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Temporary Passcode</p>
                                            <p style="margin: 4px 0 0 0; color: #111827; font-size: 20px; font-family: 'Courier New', Courier, monospace; font-weight: 700;">${safePasscode}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <a href="#" style="background-color: #2563eb; color: #ffffff; display: inline-block; padding: 16px 32px; border-radius: 12px; font-weight: 600; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Open Driver App</a>
                            <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 13px;">Please change your passcode after your first login.</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                                Need help getting started?<br>
                                <a href="mailto:support@palagis.com" style="color: #2563eb; text-decoration: none; font-weight: 500;">Contact Support Team</a>
                            </p>
                            <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px;">&copy; 2026 Palagis Logistics. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
  }
}
