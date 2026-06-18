'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          password: password,
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

      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex align-items-center px-5">
      <div className="row w-100 align-items-center mx-0">

        <div className="col-md-6 d-flex flex-column justify-content-center px-4">
          <h2 className="fw-bold mb-4">Benchmark Web</h2>

          <h4 className="fw-bold">Acesse sua conta</h4>
          <p className="text-muted mb-4">Entre com suas credenciais</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-2">
              <label className="form-label fw-semibold">Senha</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <a href="/recuperar-senha" className="small d-block mb-3">
              Esqueceu a senha?
            </a>

            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-100 mb-3 text-white text-decoration-none"
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

            <button type="button" className="btn btn-light w-100 border mb-3">
              Faça login com o Google
            </button>

            <p className="small">
              Não tem uma conta? <a href="/cadastro">Crie uma</a>
            </p>
          </form>
        </div>

        <div className="col-md-6 d-none d-md-flex align-items-center justify-content-center px-4">
          <div className="w-100 d-flex justify-content-center">
            <div className="card p-2 shadow-sm imageCard">
              <Image
                src="/imagem.png"
                width={500}
                height={500}
                className="img-fluid rounded loginImage"
                alt="Imagem do login"
                priority
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}