'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RecuperarSenha() {
  const router = useRouter();

  const [step, setStep] = useState(1); // 1: Email, 2: Código, 3: Nova Senha
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const codeRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-focar no primeiro input quando chegar na etapa do código
  useEffect(() => {
    if (step === 2) {
      codeRefs[0].current?.focus();
    }
  }, [step]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-ic-mutt.onrender.com';

      const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailInstitucional: cleanEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao solicitar código de recuperação.');
      }

      setSuccess('Código de verificação enviado! Verifique sua caixa de entrada.');
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const codeString = code.join('');
    if (codeString.length < 6) {
      setError('Por favor, insira o código de 6 dígitos.');
      setLoading(false);
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-ic-mutt.onrender.com';

      const response = await fetch(`${baseUrl}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailInstitucional: email, code: codeString }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Código de verificação inválido.');
      }

      setSuccess('Código verificado com sucesso!');
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    const codeString = code.join('');

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-ic-mutt.onrender.com';

      const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailInstitucional: email,
          code: codeString,
          novaSenha: novaSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao redefinir a senha.');
      }

      setSuccess('Sua senha foi redefinida com sucesso! Redirecionando para login...');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3 py-5">
      <div className="card border-0 shadow-sm rounded-4 p-4 p-sm-5" style={{ maxWidth: '440px', width: '100%' }}>
        
        {/* CABEÇALHO */}
        <div className="text-center mb-4">
          <h2 className="fw-bold text-dark fs-4 mb-1">Benchmark Web</h2>
          <h3 className="fs-6 fw-bold text-secondary mb-1">
            {step === 1 && 'Recuperar Senha'}
            {step === 2 && 'Verifique seu e-mail'}
            {step === 3 && 'Criar Nova Senha'}
          </h3>
          <p className="text-muted small mb-0">
            {step === 1 && 'Insira seu e-mail corporativo para receber o código de verificação'}
            {step === 2 && `Enviamos um código de 6 dígitos para ${email || 'seu e-mail'}`}
            {step === 3 && 'Defina uma nova senha de acesso para a sua conta'}
          </p>
        </div>

        {/* PROGRESSO DAS ETAPAS */}
        <div className="d-flex justify-content-center gap-2 mb-4">
          <span className={`rounded-pill flex-grow-1 ${step >= 1 ? 'bg-primary' : 'bg-secondary-subtle'}`} style={{ height: '4px' }}></span>
          <span className={`rounded-pill flex-grow-1 ${step >= 2 ? 'bg-primary' : 'bg-secondary-subtle'}`} style={{ height: '4px' }}></span>
          <span className={`rounded-pill flex-grow-1 ${step >= 3 ? 'bg-primary' : 'bg-secondary-subtle'}`} style={{ height: '4px' }}></span>
        </div>

        {/* ERROS E SUCESSOS */}
        {error && (
          <div className="alert alert-danger py-2 px-3 small mb-3 rounded-3" role="alert">
            ⚠ {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success py-2 px-3 small mb-3 rounded-3" role="alert">
            ✓ {success}
          </div>
        )}

        {/* ETAPA 1: SOLICITAR CÓDIGO */}
        {step === 1 && (
          <form onSubmit={handleSendEmail}>
            <div className="mb-3">
              <label className="form-label fw-semibold small text-dark">Email Corporativo</label>
              <input
                type="email"
                className="form-control"
                placeholder="seuemail@institucional.br"
                value={email}
                onChange={(e) => {
                  if (error) setError(null);
                  setEmail(e.target.value);
                }}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold py-2 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Enviando...
                </>
              ) : (
                'Enviar código'
              )}
            </button>
          </form>
        )}

        {/* ETAPA 2: DIGITAR CÓDIGO */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <div className="mb-3">
              <label className="form-label fw-semibold small text-dark mb-2">Código de Verificação</label>
              <div className="d-flex justify-content-between gap-2">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={codeRefs[idx]}
                    type="text"
                    maxLength={1}
                    className="form-control text-center fw-bold fs-5 p-0"
                    style={{ height: '48px' }}
                    value={digit}
                    onChange={(e) => {
                      if (error) setError(null);
                      handleCodeChange(idx, e.target.value);
                    }}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold py-2 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Verificando...
                </>
              ) : (
                'Verificar código'
              )}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link text-decoration-none small text-primary p-0 fw-semibold"
                onClick={handleSendEmail}
                disabled={loading}
              >
                Não recebeu? Reenviar código
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 3: NOVA SENHA */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            {/* NOVA SENHA */}
            <div className="mb-3">
              <label className="form-label fw-semibold small text-dark">Nova Senha</label>
              <div className="input-group">
                <input
                  type={showNovaSenha ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => {
                    if (error) setError(null);
                    setNovaSenha(e.target.value);
                  }}
                  minLength={6}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowNovaSenha(!showNovaSenha)}
                  disabled={loading}
                >
                  <i className={`bi ${showNovaSenha ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* CONFIRMAR NOVA SENHA */}
            <div className="mb-3">
              <label className="form-label fw-semibold small text-dark">Confirmar Nova Senha</label>
              <div className="input-group">
                <input
                  type={showConfirmarSenha ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Repita sua nova senha"
                  value={confirmarSenha}
                  onChange={(e) => {
                    if (error) setError(null);
                    setConfirmarSenha(e.target.value);
                  }}
                  minLength={6}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                  disabled={loading}
                >
                  <i className={`bi ${showConfirmarSenha ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold py-2 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Redefinindo...
                </>
              ) : (
                'Redefinir senha'
              )}
            </button>
          </form>
        )}

        {/* DIVISOR E NAVEGAÇÃO DE VOLTA */}
        <div className="text-center my-3 text-muted small position-relative">
          <hr className="my-3" />
        </div>

        <p className="text-center small text-muted mb-0">
          Lembrou a senha?{' '}
          <Link href="/" className="text-decoration-none fw-semibold text-primary">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}