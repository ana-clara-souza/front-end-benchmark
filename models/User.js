const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    nomeCompleto: {
      type: String,
      required: [true, "O nome completo é obrigatório"],
      trim: true,
    },

    emailInstitucional: {
      type: String,
      required: [true, "O email institucional é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email inválido"],
    },

    instituicao: {
      type: String,
      required: [true, "A instituição é obrigatória"],
      trim: true,
    },

    laboratorio: {
      type: String,
      required: [true, "O laboratório é obrigatório"],
      trim: true,
    },

    senha: {
      type: String,
      required: [true, "A senha é obrigatória"],
      minlength: [8, "A senha deve possuir no mínimo 8 caracteres"],
      select: false,
    },

    experimentKeys: {
      type: [String],
      default: [],
    },

    emailVerificado: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      default: null,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
    type: String,
    default: null,
  },

  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
