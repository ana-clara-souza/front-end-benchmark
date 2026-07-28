'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Cadastro() {
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    emailInstitucional: '',
    instituicao: '',
    laboratorio: '',
    senha: '',
    confirmarSenha: '',
  });

  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMensagem('');
    setErro('');

    if (formData.senha !== formData.confirmarSenha) {
      setErro('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nomeCompleto: formData.nomeCompleto,
          emailInstitucional: formData.emailInstitucional,
          instituicao: formData.instituicao,
          laboratorio: formData.laboratorio,
          senha: formData.senha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar usuário.');
      }

      setMensagem('Cadastro realizado com sucesso! Verifique seu email. Redirecionando...');

      setTimeout(() => {
        window.location.href = '/';
      }, 4000);

      setFormData({
        nomeCompleto: '',
        emailInstitucional: '',
        instituicao: '',
        laboratorio: '',
        senha: '',
        confirmarSenha: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar com o servidor.';
      setErro(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3 py-5">
      <div className="card border-0 shadow-sm rounded-4 p-4 p-sm-5" style={{ maxWidth: '560px', width: '100%' }}>
        
        {/* CABEÇALHO */}
        <div className="text-center mb-4">
          <h2 className="fw-bold text-dark fs-4 mb-1">Benchmark Web</h2>
          <h3 className="fs-6 fw-bold text-secondary mb-1">Crie sua conta</h3>
          <p className="text-muted small mb-0">Preencha os dados abaixo para começar</p>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            
            {/* NOME COMPLETO */}
            <div className="col-12">
              <label className="form-label fw-semibold small text-dark mb-1">Nome Completo</label>
              <input
                type="text"
                className="form-control"
                placeholder="Seu nome completo"
                name="nomeCompleto"
                value={formData.nomeCompleto}
                onChange={handleChange}
                required
              />
            </div>

            {/* EMAIL INSTITUCIONAL */}
            <div className="col-12">
              <label className="form-label fw-semibold small text-dark mb-1">Email Institucional</label>
              <input
                type="email"
                className="form-control"
                placeholder="seuemail@institucional.br"
                name="emailInstitucional"
                value={formData.emailInstitucional}
                onChange={handleChange}
                required
              />
            </div>

            {/* INSTITUIÇÃO */}
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-dark mb-1">Instituição</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: USP, UFRJ"
                name="instituicao"
                value={formData.instituicao}
                onChange={handleChange}
                required
              />
            </div>

            {/* LABORATÓRIO */}
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-dark mb-1">Laboratório</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: LabIA"
                name="laboratorio"
                value={formData.laboratorio}
                onChange={handleChange}
                required
              />
            </div>

            {/* SENHA */}
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-dark mb-1">Senha</label>
              <div className="input-group">
                <input
                  type={showSenha ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Sua senha"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowSenha(!showSenha)}
                  aria-label={showSenha ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showSenha ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
                </button>
              </div>
            </div>

            {/* CONFIRMAR SENHA */}
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-dark mb-1">Confirmar Senha</label>
              <div className="input-group">
                <input
                  type={showConfirmarSenha ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Repita a senha"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                  aria-label={showConfirmarSenha ? 'Esconder confirmação' : 'Mostrar confirmação'}
                >
                  {showConfirmarSenha ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* MENSAGEM DE SUCESSO */}
          {mensagem && (
            <div className="alert alert-success py-2 px-3 small mt-3 mb-0 rounded-3" role="alert" style={{ fontSize: '13px' }}>
              ✓ {mensagem}
            </div>
          )}

          {/* MENSAGEM DE ERRO */}
          {erro && (
            <div className="alert alert-danger py-2 px-3 small mt-3 mb-0 rounded-3" role="alert" style={{ fontSize: '13px' }}>
              ⚠️ {erro}
            </div>
          )}

          {/* BOTÃO CADASTRAR */}
          <button
            type="submit"
            className="btn btn-primary w-100 fw-semibold py-2 mt-4"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cadastrando...
              </>
            ) : (
              'Cadastrar'
            )}
          </button>

          {/* DIVISOR E LINK DE LOGIN */}
          <div className="text-center my-3 text-muted small position-relative">
            <hr className="my-3" />
            <span className="position-absolute top-50 start-50 translate-middle bg-white px-2 text-secondary">
              ou
            </span>
          </div>

          <p className="text-center small text-muted mb-0">
            Já possui uma conta?{' '}
            <Link href="/" className="text-decoration-none fw-semibold text-primary">
              Faça login
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}