const User = require("../models/User");
const authService = require("../services/authService");

exports.createUser = async ({ body }) => {
  try {
    const existingUser = await User.findOne({
      emailInstitucional: body.emailInstitucional,
    });
    if (existingUser)
      return {
        status: 409,
        body: { message: "Este e-mail já está cadastrado." },
      };

    await User.create({
      ...body,
      senha: await authService.hashPassword(body.senha),
      emailVerificado: false,
    });
    return {
      status: 201,
      body: {
        message:
          "Usuário criado com sucesso. Verifique seu e-mail para ativar sua conta.",
      },
    };
  } catch (err) {
    console.error(err);
    return { status: 400, body: { error: err.message } };
  }
};

exports.updateUser = async ({ id, body }) => {
  try {
    const user = await User.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!user)
      return { status: 404, body: { message: "Usuário não encontrado" } };
    return {
      status: 200,
      body: { message: "Usuário atualizado com sucesso", user },
    };
  } catch (err) {
    return { status: 400, body: { error: err.message } };
  }
};

exports.deleteUser = async ({ id }) => {
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user)
      return { status: 404, body: { message: "Usuário não encontrado" } };
    return { status: 200, body: { message: "Usuário deletado com sucesso" } };
  } catch {
    return { status: 400, body: { error: "ID inválido" } };
  }
};
