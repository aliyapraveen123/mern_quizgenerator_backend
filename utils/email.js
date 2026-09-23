const nodemailer = require('nodemailer');

const isEmailConfigured = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
};

const getFromAddress = () => {
  const configuredFrom = (process.env.FROM_EMAIL || process.env.SMTP_USER || '').trim();
  if (!configuredFrom) return process.env.SMTP_USER || 'no-reply@example.com';
  return configuredFrom.replace(/^"|"$/g, '');
};

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!isEmailConfigured()) return null;

  const port = parseInt(SMTP_PORT, 10);
  const secure = port === 465;
  const password = SMTP_HOST.toLowerCase().includes('gmail.com')
    ? SMTP_PASS.replace(/\s/g, '')
    : SMTP_PASS;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: password
    }
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[Email] SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in server/.env.');
    return { success: false, code: 'EMAIL_NOT_CONFIGURED' };
  }

  const from = getFromAddress();

  try {
    const info = await transporter.sendMail({
      from,
      sender: from,
      replyTo: from,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
      headers: {
        'X-Mailer': 'AI Quiz Generator',
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
        'Priority': 'normal'
      }
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] SMTP delivery failed:', error.message);
    return { success: false, code: 'EMAIL_DELIVERY_FAILED' };
  }
};

module.exports = { sendEmail, isEmailConfigured };

