const User = require("../models/User");
const authService = require("../services/authService");
const emailService = require("../services/emailService");

const EMAIL_ENABLED = process.env.ENABLE_EMAIL === "true";

exports.login = async ({ body }) => {
  try {
    const { emailInstitucional, senha } = body;

    if (!emailInstitucional || !senha) {
      return {
        status: 400,
        body: { message: "E-mail e senha são obrigatórios." },
      };
    }

    const user = await User.findOne({ emailInstitucional }).select("+senha");

    if (!user || !(await authService.comparePassword(senha, user.senha))) {
      return {
        status: 401,
        body: { message: "Credenciais inválidas." },
      };
    }

    if (
      process.env.REQUIRE_EMAIL_VERIFICATION === "true" &&
      !user.emailVerificado
    ) {
      return {
        status: 403,
        body: { message: "Confirme seu e-mail antes de realizar o login." },
      };
    }

    return {
      status: 200,
      body: {
        message: "Login realizado com sucesso.",
        sessionToken: authService.generateAccessToken(user._id),
        user: {
          id: user._id,
          nomeCompleto: user.nomeCompleto,
          emailInstitucional: user.emailInstitucional,
          instituicao: user.instituicao,
          laboratorio: user.laboratorio,
        },
      },
    };
  } catch (err) {
    console.error(err);

    return {
      status: 500,
      body: { message: "Erro interno do servidor." },
    };
  }
};

exports.verifyEmail = async ({ query }) => {
  try {
    const token = query.get("token");

    if (!token) {
      return {
        status: 400,
        body: { message: "Token não informado." },
      };
    }

    const user = await User.findOne({
      emailVerificationToken: token,
    });

    if (!user) {
      return {
        status: 400,
        body: { message: "Token inválido." },
      };
    }

    if (user.emailVerificado) {
      return {
        status: 400,
        body: { message: "Este e-mail já foi confirmado." },
      };
    }

    if (user.emailVerificationExpires < new Date()) {
      return {
        status: 400,
        body: {
          message: "O link expirou. Solicite um novo e-mail de confirmação.",
        },
      };
    }

    user.emailVerificado = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await user.save();

    return {
      status: 200,
      body: {
        message:
          "E-mail confirmado com sucesso! Agora você já pode fazer login.",
      },
    };
  } catch (err) {
    console.error(err);

    return {
      status: 500,
      body: { message: "Erro interno do servidor." },
    };
  }
};

exports.resendVerificationEmail = async ({ body }) => {
  try {
    const { emailInstitucional } = body;

    if (!emailInstitucional) {
      return {
        status: 400,
        body: { message: "E-mail é obrigatório." },
      };
    }

    const genericMessage =
      "Se existir uma conta para este e-mail e ela ainda não estiver confirmada, um novo e-mail de verificação será enviado.";

    const user = await User.findOne({ emailInstitucional });

    if (!user) {
      return {
        status: 200,
        body: { message: genericMessage },
      };
    }

    if (user.emailVerificado) {
      return {
        status: 400,
        body: { message: "O e-mail já foi confirmado." },
      };
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires > new Date()
    ) {
      return {
        status: 429,
        body: {
          message:
            "Já existe um e-mail de verificação válido. Aguarde sua expiração antes de solicitar outro.",
        },
      };
    }

    const verificationToken = authService.generateRandomToken();

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = authService.generateTokenExpiration();

    await user.save();

    if (EMAIL_ENABLED) {
      await emailService.sendVerificationEmail(
        user.emailInstitucional,
        verificationToken,
      );
    }

    return {
      status: 200,
      body: { message: genericMessage },
    };
  } catch (err) {
    console.error(err);

    return {
      status: 500,
      body: { message: "Erro interno do servidor." },
    };
  }
};

exports.forgotPassword = async ({ body }) => {
  try {
    const { emailInstitucional } = body;

    if (!emailInstitucional) {
      return {
        status: 400,
        body: { message: "E-mail é obrigatório." },
      };
    }

    const genericMessage =
      "Se existir uma conta para este e-mail, um link de recuperação será enviado.";

    const user = await User.findOne({ emailInstitucional });

    if (!user) {
      return {
        status: 200,
        body: { message: genericMessage },
      };
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires > new Date()) {
      return {
        status: 429,
        body: {
          message:
            "Já existe uma solicitação de recuperação válida. Aguarde sua expiração antes de solicitar outra.",
        },
      };
    }

    const resetToken = authService.generateRandomToken();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = authService.generateTokenExpiration(3);

    await user.save();

    if (EMAIL_ENABLED) {
      await emailService.sendPasswordResetEmail(
        user.emailInstitucional,
        resetToken,
      );
    }

    return {
      status: 200,
      body: { message: genericMessage },
    };
  } catch (err) {
    console.error(err);

    return {
      status: 500,
      body: { message: "Erro interno do servidor." },
    };
  }
};

exports.resetPassword = async ({ body }) => {
  try {
    const { token, senha } = body;

    if (!token || !senha) {
      return {
        status: 400,
        body: {
          message: "Token e nova senha são obrigatórios.",
        },
      };
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+senha");

    if (!user) {
      return {
        status: 400,
        body: {
          message: "Token inválido ou expirado.",
        },
      };
    }

    if (senha.length < 8) {
      return {
        status: 400,
        body: {
          message: "A senha deve possuir no mínimo 8 caracteres.",
        },
      };
    }

    user.senha = await authService.hashPassword(senha);

    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return {
      status: 200,
      body: {
        message: "Senha redefinida com sucesso.",
      },
    };
  } catch (err) {
    console.error(err);

    return {
      status: 500,
      body: { message: "Erro interno do servidor." },
    };
  }
};
