'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './cadastro.css';

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
      console.log('Resposta de cadastro:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar usuário.');
      }

      setMensagem('Cadastro realizado com sucesso! Verifique seu email. Redirecionando em 5 segundos...');

      setTimeout(() => {
        window.location.href = '/';
      }, 5000);

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
    <main className="cadastro-page">
      <section className="cadastro-left">
        <div className="cadastro-form-box">
          <h1 className="brand-title">Benchmark Web</h1>

          <h2 className="page-title">Crie sua conta</h2>
          <p className="page-subtitle">Preencha os dados para começar</p>

          <form className="cadastro-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome Completo</label>
              <input
                type="text"
                name="nomeCompleto"
                value={formData.nomeCompleto}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Institucional</label>
              <input
                type="email"
                name="emailInstitucional"
                value={formData.emailInstitucional}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Instituição</label>
              <input
                type="text"
                name="instituicao"
                value={formData.instituicao}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Laboratório</label>
              <input
                type="text"
                name="laboratorio"
                value={formData.laboratorio}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={showSenha ? 'text' : 'password'}
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowSenha(!showSenha)}
                  aria-label={showSenha ? "Esconder senha" : "Mostrar senha"}
                >
                  {showSenha ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirmar Senha</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmarSenha ? 'text' : 'password'}
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                  aria-label={showConfirmarSenha ? "Esconder confirmação de senha" : "Mostrar confirmação de senha"}
                >
                  {showConfirmarSenha ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {mensagem && (
              <p style={{ color: 'green', marginTop: '10px' }}>
                {mensagem}
              </p>
            )}

            {erro && (
              <p style={{ color: 'red', marginTop: '10px' }}>
                {erro}
              </p>
            )}

            <button type="submit" className="btn-cadastrar" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>

            <p className="login-link">
              Já possui uma conta? <Link href="/">Faça login</Link>
            </p>
          </form>
        </div>
      </section>

      <section className="cadastro-right">
        <div className="circle-bg"></div>

        <div className="steps-box">
          <h2>COMO FUNCIONA</h2>

          <div className="step-item">
            <div className="step-number">1</div>
            <div>
              <h3>Crie sua conta</h3>
              <p>Preencha seus dados</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div>
              <h3>Verifique seu email</h3>
              <p>Entre no gmail e clique no link de verificação</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div>
              <h3>Acesse a plataforma</h3>
              <p>Após a verificação retorne na plataforma</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div>
              <h3>Analise os resultados de seus experimentos</h3>
              <p>Visualize gráficos e compare resultados em tempo real</p>
            </div>
          </div>

          <div className="include-card">
            <h3>Plataforma inclui</h3>
            <ul>
              <li>Benchmarks de memória e energia</li>
              <li>Comparação de modelos de IA</li>
              <li>Entre outros</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}