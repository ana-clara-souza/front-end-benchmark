const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("Erro ao conectar ao servidor de e-mail:");
    console.error(error);
  } else {
    console.log("Servidor de e-mail conectado com sucesso.");
  }
});

module.exports = transporter;
