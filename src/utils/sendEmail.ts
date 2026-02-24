import nodemailer from 'nodemailer';

const sendEmail = async (options: { email: string; subject: string; message: string; attachments?: any[] }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
    attachments: options.attachments,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
