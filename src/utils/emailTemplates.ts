
export const getEmailTemplate = (title: string, message: string, code?: string, buttonText?: string, buttonUrl?: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body {
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.03);
          border: 1px solid #f1f5f9;
        }
        .header {
          background: #ffffff;
          padding: 40px 20px;
          text-align: center;
          color: #0f172a;
          border-bottom: 1px solid #f1f5f9;
        }
        .logo {
          height: 48px;
          margin-bottom: 12px;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: #0f172a;
        }
        .header p {
          margin: 4px 0 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        .content {
          padding: 48px 40px;
          line-height: 1.6;
        }
        .blue-badge {
          display: inline-block;
          background: #f0f9ff;
          color: #0369a1;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 24px;
          border: 1px solid #e0f2fe;
        }
        h2 {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 16px;
          letter-spacing: -0.5px;
        }
        p {
          margin: 0 0 20px;
          font-size: 16px;
          color: #475569;
        }
        .otp-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 32px;
          text-align: center;
          border-radius: 16px;
          margin: 32px 0;
        }
        .otp-code {
          font-size: 40px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 8px;
          margin: 12px 0;
          font-family: Courier, monospace;
        }
        .button {
          display: inline-block;
          padding: 16px 32px;
          background-color: #0f172a;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px 0;
          transition: transform 0.2s ease;
        }
        .footer {
          background: #f8fafc;
          padding: 32px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
          border-top: 1px solid #f1f5f9;
        }
        .social-links {
          margin-bottom: 20px;
        }
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          color: #94a3b8;
          text-decoration: none;
        }
        .divider {
          height: 1px;
          background: #e2e8f0;
          margin: 32px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="cid:logo" alt="Learnova Logo" style="height: 48px; width: auto; max-width: 200px; object-contain: contain;">
          <p>The Future of Learning</p>
        </div>
        <div class="content">
          <div class="blue-badge">✓ Secure Verification</div>
          <h2>${title}</h2>
          <p>${message}</p>
          
          ${code ? `
            <div class="otp-container">
              <p style="margin-top:0; font-weight: 600; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
              <div class="otp-code">${code}</div>
              <p style="margin-bottom:0; font-size: 13px; color: #94a3b8;">This code is valid for 10 minutes. Please do not share it with anyone.</p>
            </div>
          ` : ''}

          ${buttonUrl ? `
            <div style="text-align: center;">
              <a href="${buttonUrl}" class="button">${buttonText || 'Complete Action'}</a>
            </div>
          ` : ''}

          <div class="divider"></div>
          
          <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
            If you didn't request this email, you can safely ignore it. Your account security is our top priority.
          </p>
        </div>
        <div class="footer">
          <div class="social-links">
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">Instagram</a>
          </div>
          &copy; ${new Date().getFullYear()} Learnova LMS. <br>
          Transforming education through technology.
        </div>
      </div>
    </body>
    </html>
  `;
};
