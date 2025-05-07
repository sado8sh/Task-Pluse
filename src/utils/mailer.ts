import nodemailer from 'nodemailer';
import { config } from 'dotenv';

// Load environment variables
config();

// Debug: Log SMTP configuration
console.log('SMTP Configuration:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER ? 'Set' : 'Not Set',
  pass: process.env.SMTP_PASS ? 'Set' : 'Not Set',
  from: process.env.FROM_EMAIL
});

if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.FROM_EMAIL) {
  console.error('Missing required SMTP configuration. Please check your .env file.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Only use this in development
  }
});

// Verify SMTP connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take our messages');
  }
});

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  try {
    console.log('Attempting to send email to:', to);
    
    const mailOptions = {
      from: {
        name: 'Task Pulse',
        address: process.env.FROM_EMAIL!
      },
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent successfully:', {
      messageId: info.messageId,
      to: to,
      subject: subject
    });
    return info;
  } catch (error) {
    console.error('Error sending email:', {
      error: error,
      to: to,
      subject: subject
    });
    // Don't throw the error, just log it
    return null;
  }
} 