import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (!transporter) {
    const host = process.env.MAILTRAP_HOST || 'live.smtp.mailtrap.io';
    const port = parseInt(process.env.MAILTRAP_PORT || '587', 10);
    const user = process.env.MAILTRAP_USER || 'api';
    const pass = process.env.MAILTRAP_PASS;

    if (!pass) {
      console.warn('MAILTRAP_PASS is not set. Email sending will be disabled or fail.');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
  const mailTransporter = getTransporter();
  
  try {
    const info = await mailTransporter.sendMail({
      from: '"Wayta App" <no-reply@wayta.co.za>',
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
