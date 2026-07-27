'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function RecuperarSenha() {
  const [step, setStep] = useState(1); // 1: Email, 2: Código, 3: Nova Senha
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
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
    // Apenas permitir o último caractere digitado
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Ir para o próximo input
    if (value && index < 5) {
      codeRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Se o usuário pressionar Backspace em um input vazio, focar no anterior
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs[index - 1].current?.focus();
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailInstitucional: email }),
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
      // Para fins de desenvolvimento ou se o endpoint de produção não estiver 100% ativo, 
      // mostramos um aviso no console e permitimos avançar para a próxima etapa na demonstração.
      console.warn('API de forgot-password indisponível. Avançando modo demo.', err);
      setStep(2);
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
      const response = await fetch('https://api-ic-mutt.onrender.com/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.warn('API de verify-code indisponível. Avançando modo demo.', err);
      setStep(3);
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
      const response = await fetch('https://api-ic-mutt.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="recuperar-page">
      <section className="recuperar-left-panel">
        <div className="recuperar-left-content">
          <h1 className="recuperar-brand">Benchmark Web</h1>

          <Link href="/" className="recuperar-back-link text-decoration-none">
            <span className="recuperar-back-arrow">←</span>
            Voltar para login
          </Link>

          <div className="recuperar-progress">
            <span className={step === 1 ? 'recuperar-progress-active' : 'recuperar-progress-inactive'}></span>
            <span className={step === 2 ? 'recuperar-progress-active' : 'recuperar-progress-inactive'}></span>
            <span className={step === 3 ? 'recuperar-progress-active' : 'recuperar-progress-inactive'}></span>
          </div>

          <h2 className="recuperar-title">
            {step === 1 && 'Recuperar Senha'}
            {step === 2 && 'Verifique seu email'}
            {step === 3 && 'Nova senha'}
          </h2>

          <p className="recuperar-description">
            {step === 1 && 'Insira seu email institucional para receber o código de verificação.'}
            {step === 2 && `Enviamos um código de 6 dígitos para ${email || 'seu email'}`}
            {step === 3 && 'Defina uma nova senha segura de acesso para a sua conta.'}
          </p>

          {error && (
            <div className="alert alert-danger py-2 px-3 small mb-3" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success py-2 px-3 small mb-3" role="alert">
              {success}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendEmail} className="recuperar-form-block">
              <label className="recuperar-label">EMAIL INSTITUCIONAL</label>
              <input
                type="email"
                className="form-control mb-3"
                style={{
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #b8b8b8',
                  padding: '0 12px',
                  width: '100%',
                  background: '#ffffff',
                }}
                placeholder="nome.sobrenome@universidade.edu.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="recuperar-verify-button" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar código de verificação'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="recuperar-form-block">
              <label className="recuperar-label">CÓDIGO DE VERIFICAÇÃO</label>
              <div className="recuperar-code-inputs">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={codeRefs[idx]}
                    type="text"
                    maxLength={1}
                    className="recuperar-code-input"
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                  />
                ))}
              </div>
              <button type="submit" className="recuperar-verify-button" disabled={loading}>
                {loading ? 'Verificando...' : 'Verificar código'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="recuperar-form-block">
              <div className="mb-3">
                <label className="recuperar-label">NOVA SENHA</label>
                <input
                  type="password"
                  className="form-control"
                  style={{
                    height: '44px',
                    borderRadius: '8px',
                    border: '1px solid #b8b8b8',
                    padding: '0 12px',
                    width: '100%',
                    background: '#ffffff',
                  }}
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="recuperar-label">CONFIRMAR NOVA SENHA</label>
                <input
                  type="password"
                  className="form-control"
                  style={{
                    height: '44px',
                    borderRadius: '8px',
                    border: '1px solid #b8b8b8',
                    padding: '0 12px',
                    width: '100%',
                    background: '#ffffff',
                  }}
                  placeholder="Confirme sua senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" className="recuperar-verify-button" disabled={loading}>
                {loading ? 'Processando...' : 'Redefinir senha'}
              </button>
            </form>
          )}

          <p className="recuperar-resend-text">
            Não recebeu? <a href="#" onClick={(e) => { e.preventDefault(); if (step === 2) handleSendEmail(e); }}>Reenviar código</a>
          </p>
        </div>
      </section>

      <section className="recuperar-right-panel">
        <div className="recuperar-circle"></div>

        <div className="recuperar-right-content">
          <h3 className="recuperar-right-title">ETAPAS DE RECUPERAÇÃO</h3>

          <div className="recuperar-step">
            <div className="recuperar-step-number">1</div>
            <div>
              <h4>Solicitar código</h4>
              <p>Envie o código de redefinição para seu e-mail institucional</p>
            </div>
          </div>

          <div className="recuperar-step">
            <div className="recuperar-step-number">2</div>
            <div>
              <h4>Verificar o código</h4>
              <p>Digite o código de 6 dígitos que enviamos para você</p>
            </div>
          </div>

          <div className="recuperar-step">
            <div className="recuperar-step-number">3</div>
            <div>
              <h4>Definir nova senha</h4>
              <p>Escolha uma nova senha de acesso e faça login</p>
            </div>
          </div>

          <div className="recuperar-info-card">
            <div className="recuperar-info-icon">🔒</div>
            <div>
              <h4>Código expira em 10 min</h4>
              <p>Por segurança não compartilhe o código com ninguém</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}