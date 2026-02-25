export interface DriverPasscodeRegeneratedTemplateData {
  driverName: string;
  driverCode: string;
  passcode: string;
  logoUrl?: string; // Optional logo URL
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

export class DriverPasscodeRegeneratedTemplate {
  static readonly SUBJECT = 'Palagis Driver - Your Passcode Has Been Reset';

  static getSubject(): string {
    return this.SUBJECT;
  }

  static getText(data: DriverPasscodeRegeneratedTemplateData): string {
    return `Dear ${data.driverName},

Your driver account passcode has been successfully reset.
Please use the credentials below to log in to the Driver App.

Login Details:
Driver Code: ${data.driverCode}
Temporary Passcode: ${data.passcode}

We're excited to have you on the road!

Warm regards,
Palagis Ice Cream Team
support@palagisicecream.com
+1 (555) 123-4567

This is an automatically generated email – Please do not reply to it.

COPYRIGHT © 2026 Palagis Ice Cream, All Rights Reserved`;
  }

  static getHtml(data: DriverPasscodeRegeneratedTemplateData): string {
    // Escape user input to prevent XSS
    const safeDriverName = escapeHtml(data.driverName);
    const safeDriverCode = escapeHtml(data.driverCode);
    const safePasscode = escapeHtml(data.passcode);

    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Palagis Driver Welcome Email</title>
  </head>

  <body style="margin: 0; padding: 0; font-family: Poppins, Arial, sans-serif">
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f6fa; padding: 20px 0"
    >
      <tr>
        <td align="center">
          <!-- Main Container -->
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              background: #ffffff;
              border-radius: 20px 20px 0 0;
              overflow: hidden;
            "
          >
            <!-- Header Image -->
            <tr>
              <td>
                <img
                  src="./top-image.png"
                  width="600"
                  style="display: block; width: 100%; height: auto"
                />
              </td>
            </tr>

            <!-- Banner Section -->
            <tr>
              <td align="center" style="padding: 30px">
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    background: url(&quot;./bg-image.png&quot;);
                    border-radius: 16px;
                    height: 200px;
                  "
                >
                  <tr>
                    <td
                      align="center"
                      style="
                        color: #fff;
                        font-size: 20px;
                        vertical-align: bottom;
                        padding-bottom: 28px;
                        font-family: &quot;ADLaM Display&quot;, Arial;
                      "
                    >
                      <b>
                        America's Oldest Ice Cream Truck Company,<br />
                        Delivering Thousands of Smiles a Day
                      </b>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Welcome Text -->
            <tr>
              <td
                style="
                  padding: 0 30px 20px 30px;
                  font-size: 16px;
                  color: #4a5565;
                  line-height: 24px;
                "
              >
                <p>
                  Dear <strong style="color: #040954">${safeDriverName}</strong>,
                </p>

                <p>
                  Your driver account passcode has been successfully reset.
                  Please use the credentials below to log in to the Driver App.
                </p>
              </td>
            </tr>

            <!-- Login Details -->
            <tr>
              <td style="padding: 0 30px">
                <h3 style="margin: 0 0 15px 0; color: #040954">
                  Login Details:
                </h3>

                <table width="100%" cellpadding="10" cellspacing="0">
                  <tr>
                    <td
                      width="50%"
                      style="
                        background: #f5f6fa;
                        border-radius: 16px 0 0 16px;
                        color: #040954;
                        font-weight: 500;
                        user-select: all;
                        -webkit-user-select: all;
                        -moz-user-select: all;
                        -ms-user-select: all;
                        cursor: text;
                      "
                    >
                      ${safeDriverCode}
                    </td>
                    <td
                      style="background: #f5f6fa; border-radius: 0 16px 16px 0; padding: 10px;"
                    >
                      <img
                        src="./copy-icon.png"
                        alt="Copy"
                        style="margin-right: 20px; vertical-align: middle;"
                      />
                    </td>
                    <td width="20"></td>
                    <td
                      width="50%"
                      style="
                        background: #f5f6fa;
                        border-radius: 16px 0 0 16px;
                        color: #040954;
                        font-weight: 500;
                        user-select: all;
                        -webkit-user-select: all;
                        -moz-user-select: all;
                        -ms-user-select: all;
                        cursor: text;
                      "
                    >
                      ${safePasscode}
                    </td>
                    <td
                      style="background: #f5f6fa; border-radius: 0 16px 16px 0; padding: 10px;"
                    >
                      <img
                        src="./copy-icon.png"
                        alt="Copy"
                        style="margin-right: 20px; vertical-align: middle;"
                      />
                    </td>
                    <td></td>
                  </tr>
                </table>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">
                  Click on the credentials above to select and copy
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding: 30px">
                <!-- Outer Light Grey Container -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="
                    background-color: #e9eaef;
                    border-radius: 24px;
                    padding: 30px 16px 30px 52px;
                  "
                >
                  <tr>
                    <!-- Left Side -->
                    <td width="45%" style="vertical-align: middle">
                      <img
                        src="./app_icon.png"
                        width="80"
                        style="
                          display: block;
                          border-radius: 24px;
                          margin-bottom: 12px;
                          margin-left: 10px;
                        "
                      />

                      <div
                        style="
                          font-size: 18px;
                          font-weight: 500;
                          color: #040954;
                        "
                      >
                        Palagis Driver
                      </div>
                    </td>

                    <!-- Right Side -->
                    <td
                      width="65%"
                      align="center"
                      style="vertical-align: middle"
                    >
                      <!-- Inner White Box -->
                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        style="
                          background-color: #ffffff;
                          border-radius: 20px;
                          padding: 20px 8px;
                        "
                      >
                        <tr>
                          <td align="center">
                            <div
                              style="
                                font-size: 22px;
                                font-weight: 600;
                                color: #040954;
                                margin-bottom: 16px;
                              "
                            >
                              Download the App
                            </div>
                            <table>
                              <tr>
                                <td>
                                  <!-- App Store Button -->
                                  <div>
                                    <a href="APP_STORE_LINK" target="_blank">
                                      <img
                                        src="./app-download.png"
                                        width="140"
                                        style="display: block; margin: 0 auto"
                                      />
                                    </a>
                                  </div>
                                </td>
                                <td>
                                  <!-- Google Play Button -->
                                  <div>
                                    <a href="PLAY_STORE_LINK" target="_blank">
                                      <img
                                        src="./play-store.png"
                                        width="140"
                                        style="display: block; margin: 0 auto"
                                      />
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Closing -->
            <tr>
              <td
                style="
                  padding: 0 30px 20px 30px;
                  font-size: 16px;
                  color: #4a5565;
                "
              >
                <p>We're excited to have you on the road!</p>

                <p>
                  Warm regards,<br />
                  <strong style="color: #040954">Palagis Ice Cream Team</strong
                  ><br /><br />
                  <a
                    href="mailto:support@palagisicecream.com"
                    style="color: #004eeb; text-decoration: underline"
                  >
                    support@palagisicecream.com </a
                  ><br />
                  <span style="color: #040954">+1 (555) 123-4567</span>
                </p>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <p
            style="
              font-size: 12px;
              text-align: center;
              color: #4a5565;
              margin-top: 40px;
            "
          >
            This is an automatically generated email – Please do not reply to
            it.
          </p>

          <p
            style="
              font-size: 14px;
              text-align: center;
              color: #4a5565;
              margin-bottom: 40px;
            "
          >
            COPYRIGHT © 2026
            <strong style="color: #040954">Palagis Ice Cream</strong>, All
            Rights Reserved
          </p>

          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="
              background: #040954;
              color: #fff;
              font-size: 12px;
              margin-top: 10px;
              border-radius: 0 0 20px 20px;
            "
          >
            <tr>
              <td align="center" style="padding: 15px">
                For more information, visit our website
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
