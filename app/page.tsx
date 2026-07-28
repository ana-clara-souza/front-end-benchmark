'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailInstitucional: email,
          senha: senha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao realizar login.');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      router.push('/filtros');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3 py-5">
      <div className="card border-0 shadow-sm rounded-4 p-4 p-sm-5" style={{ maxWidth: '420px', width: '100%' }}>
        
        {/* CABEÇALHO */}
        <div className="text-center mb-4">
          <h2 className="fw-bold text-dark fs-4 mb-1">Benchmark Web</h2>
          <h3 className="fs-6 fw-bold text-secondary mb-1">Acesse sua conta</h3>
          <p className="text-muted small mb-0">Entre com suas credenciais para continuar</p>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit}>
          {/* EMAIL */}
          <div className="mb-3">
            <label className="form-label fw-semibold small text-dark">Email Corporativo</label>
            <input
              type="email"
              className="form-control"
              placeholder="seuemail@institucional.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* SENHA */}
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label fw-semibold small text-dark mb-0">
                Senha
              </label>

              <Link
                href="/recuperar-senha"
                className="text-decoration-none small text-primary fw-semibold"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <div className="input-group">
              <input
                type={showSenha ? "text" : "password"}
                className="form-control"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowSenha(!showSenha)}
              >
                <i className={`bi ${showSenha ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
          </div>

          {/* ERRO */}
          {error && (
            <div className="alert alert-danger py-2 px-3 small mb-3 rounded-3" role="alert" style={{ fontSize: '13px' }}>
              ⚠ {error}
            </div>
          )}

          {/* BOTÃO */}
          <button
            type="submit"
            className="btn btn-primary w-100 fw-semibold py-2 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>

          {/* DIVISOR E CADASTRO */}
          <div className="text-center my-3 text-muted small position-relative">
            <hr className="my-3" />
            <span className="position-absolute top-50 start-50 translate-middle bg-white px-2 text-secondary">
              ou
            </span>
          </div>

          <p className="text-center small text-muted mb-0">
            Não tem uma conta?{' '}
            <Link href="/cadastro" className="text-decoration-none fw-semibold text-primary">
              Crie uma agora
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}