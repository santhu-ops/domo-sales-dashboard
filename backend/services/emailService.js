const nodemailer = require('nodemailer');

// Do NOT cache the transporter — recreate it each time so .env changes take effect without restart
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    console.log(`Email Service: Using SMTP ${host}:${port} as ${user}`);
    return nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false // allow self-signed certs on Windows / dev
      }
    });
  }

  // Fallback: log the email to console (mock mode)
  console.warn('Email Service: No SMTP config found — using console mock mode.');
  return {
    sendMail: async (mailOptions) => {
      console.log('\n========== [MOCK EMAIL] ==========');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Text:', mailOptions.text);
      console.log('==================================\n');
      return { messageId: 'mock-id-' + Date.now() };
    }
  };
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: process.env.FROM_EMAIL || '"SalesFlow" <noreply@salesflow.com>',
      to, subject, text, html
    });
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`📧 Email Preview: ${previewUrl}`);
    return info;
  } catch (error) {
    console.error(`❌ Email delivery failed to ${to}: ${error.message}`);
    return null;
  }
};

// ─── Beautiful HTML Email Template Helper ─────────────────────────
const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SalesFlow</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;border:1px solid #1e293b;">
              <div style="display:inline-flex;align-items:center;gap:12px;margin-bottom:8px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:12px;display:inline-block;text-align:center;line-height:44px;font-size:22px;">📈</div>
              </div>
              <h1 style="margin:8px 0 4px;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">SalesFlow</h1>
              <p style="margin:0;font-size:13px;color:#64748b;">Revenue Intelligence Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1e293b;padding:40px;border-left:1px solid #334155;border-right:1px solid #334155;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:24px;text-align:center;border:1px solid #1e293b;border-top:none;">
              <p style="margin:0 0 8px;font-size:12px;color:#475569;">© 2026 SalesFlow. All rights reserved.</p>
              <p style="margin:0;font-size:11px;color:#334155;">This is an automated message. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── OTP Verification Email ────────────────────────────────────────
const sendOTPEmail = async (user, otp) => {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f8fafc;">Verify Your Email 🔐</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Hello <strong style="color:#e2e8f0;">${user.name}</strong>, use the 6-digit code below to verify your account.
      This code expires in <strong style="color:#2563eb;">10 minutes</strong>.
    </p>
    
    <!-- OTP Box -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#1e1b4b);border:2px solid #2563eb;border-radius:16px;padding:32px;text-align:center;margin:0 0 28px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:2px;">Your Verification Code</p>
      <div style="font-size:48px;font-weight:900;letter-spacing:16px;color:#fff;font-family:monospace;">
        ${otp}
      </div>
    </div>
    
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#64748b;">
        ⚠️ Never share this code with anyone. SalesFlow will never ask for your OTP via email or phone.
      </p>
    </div>
    
    <p style="margin:0;font-size:13px;color:#475569;">
      If you didn't create a SalesFlow account, please ignore this email.
    </p>
  `;
  
  return sendEmail({
    to: user.email,
    subject: `${otp} is your SalesFlow verification code`,
    html: emailWrapper(content),
    text: `Your SalesFlow OTP code is: ${otp}. It expires in 10 minutes.`
  });
};

// ─── Welcome Email ─────────────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:56px;margin-bottom:16px;">🎉</div>
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f8fafc;">Welcome to SalesFlow!</h2>
      <p style="margin:0;font-size:15px;color:#94a3b8;">Your account is verified and ready to go.</p>
    </div>
    
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
      Hello <strong style="color:#e2e8f0;">${user.name}</strong> 👋<br><br>
      You're all set! Your SalesFlow Revenue Intelligence account is active. Start tracking sales, monitoring revenue, and growing your business with real-time analytics.
    </p>
    
    <!-- Feature Cards -->
    <div style="margin:0 0 28px;">
      ${[
        { emoji: '📊', title: 'Revenue Dashboard', desc: 'Real-time revenue tracking with beautiful charts' },
        { emoji: '🤝', title: 'Deal Pipeline', desc: 'Manage deals from lead to closed won' },
        { emoji: '👥', title: 'Customer Management', desc: 'Track customers and their lifetime value' },
        { emoji: '📈', title: 'Analytics & Reports', desc: 'Export reports to PDF and Excel' }
      ].map(f => `
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px;">
          <span style="font-size:22px;">${f.emoji}</span>
          <div>
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#e2e8f0;">${f.title}</p>
            <p style="margin:0;font-size:12px;color:#64748b;">${f.desc}</p>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div style="text-align:center;">
      <a href="${dashboardUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
        🚀 Go to Dashboard
      </a>
    </div>
  `;
  
  return sendEmail({
    to: user.email,
    subject: `Welcome to SalesFlow, ${user.name}! 🎉`,
    html: emailWrapper(content),
    text: `Welcome ${user.name}! Your SalesFlow account is ready. Visit ${dashboardUrl}/dashboard to get started.`
  });
};

// ─── Forgot Password Email ─────────────────────────────────────────
const sendForgotPasswordEmail = async (user, otp) => {
  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f8fafc;">Reset Your Password 🔑</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Hello <strong style="color:#e2e8f0;">${user.name}</strong>, we received a request to reset your SalesFlow password. 
      Use the 6-digit code below to create a new password.
    </p>
    
    <!-- OTP Box -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#1e1b4b);border:2px solid #2563eb;border-radius:16px;padding:32px;text-align:center;margin:0 0 28px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:2px;">Your Reset Code</p>
      <div style="font-size:48px;font-weight:900;letter-spacing:16px;color:#fff;font-family:monospace;">
        ${otp}
      </div>
    </div>
    
    <div style="background:#1a0d0d;border:1px solid #450a0a;border-radius:12px;padding:16px;">
      <p style="margin:0;font-size:13px;color:#fca5a5;">
        ⏰ This code expires in <strong>10 minutes</strong>. If you didn't request a password reset, please ignore this email — your account is safe.
      </p>
    </div>
  `;
  
  return sendEmail({
    to: user.email,
    subject: `${otp} is your SalesFlow password reset code`,
    html: emailWrapper(content),
    text: `Your SalesFlow password reset code is: ${otp}\n\nThis code expires in 10 minutes.`
  });
};

// ─── High Value Deal Alert ─────────────────────────────────────────
const sendHighValueDealAlert = async (deal, ownerName, adminEmails) => {
  if (!adminEmails || adminEmails.length === 0) return;
  const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(deal.value);
  
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;">⚠️</div>
      <h2 style="margin:8px 0 4px;font-size:22px;font-weight:700;color:#f8fafc;">High Value Deal Alert</h2>
    </div>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">A high-value deal has entered the pipeline:</p>
    
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden;margin:0 0 24px;">
      ${[
        ['Deal Title', deal.title],
        ['Value', `<strong style="color:#f87171;font-size:18px;">${formattedValue}</strong>`],
        ['Stage', deal.stage],
        ['Owner', ownerName],
        ['Probability', `${deal.probability}%`]
      ].map(([k, v], i) => `
        <div style="padding:12px 16px;${i > 0 ? 'border-top:1px solid #1e293b;' : ''}display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:#64748b;font-weight:600;">${k}</span>
          <span style="font-size:13px;color:#e2e8f0;">${v}</span>
        </div>
      `).join('')}
    </div>
    
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/deals" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">
        View in Dashboard →
      </a>
    </div>
  `;
  
  return sendEmail({
    to: adminEmails.join(','),
    subject: `⚠️ High Value Deal: ${deal.title} — ${formattedValue}`,
    html: emailWrapper(content),
    text: `High Value Deal: "${deal.title}" valued at ${formattedValue} by ${ownerName}.`
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendForgotPasswordEmail,
  sendHighValueDealAlert
};
