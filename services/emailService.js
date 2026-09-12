const fs = require("fs/promises");
const path = require("path");
const transporter = require("../config/mail");

async function sendVerificationEmail(email, token) {
  const verificationLink =
    `${process.env.API_URL}/api/auth/verify-email?token=${token}`;

  const templatePath = path.join(
    process.cwd(),
    "templates",
    "verificationEmail.html"
  );

  let html = await fs.readFile(templatePath, "utf-8");

  html = html.replaceAll("{{verificationLink}}", verificationLink);

  await transporter.sendMail({
    from: `"ICD Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Confirmação de e-mail",
    html,
  });
}

async function sendPasswordResetEmail(email, token) {
  const resetLink =
    `${process.env.API_URL}/reset-password?token=${token}`;

  const templatePath = path.join(
    process.cwd(),
    "templates",
    "resetPasswordEmail.html"
  );

  let html = await fs.readFile(templatePath, "utf-8");

  html = html.replaceAll("{{resetLink}}", resetLink);

  await transporter.sendMail({
    from: `"ICD Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Recuperação de senha",
    html,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};