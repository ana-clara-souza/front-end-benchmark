'use client';

import Link from 'next/link';

export default function RecuperarSenha() {
  return (
    <main className="recuperar-page">
      <section className="recuperar-left-panel">
        <div className="recuperar-left-content">
          <h1 className="recuperar-brand">Benchmark Web</h1>

          <Link href="/" className="recuperar-back-link">
            <span className="recuperar-back-arrow">←</span>
            Voltar para login
          </Link>

          <div className="recuperar-progress">
            <span className="recuperar-progress-inactive"></span>
            <span className="recuperar-progress-active"></span>
            <span className="recuperar-progress-inactive"></span>
          </div>

          <h2 className="recuperar-title">Verifique seu email</h2>

          <p className="recuperar-description">
            Enviamos um código de 6 dígitos
            <br />
            para xxx@universidade.com.br
          </p>

          <div className="recuperar-form-block">
            <label className="recuperar-label">CÓDIGO DE VERIFICAÇÃO</label>

            <div className="recuperar-code-inputs">
              <input maxLength={1} className="recuperar-code-input" />
              <input maxLength={1} className="recuperar-code-input" />
              <input maxLength={1} className="recuperar-code-input" />
              <input maxLength={1} className="recuperar-code-input" />
              <input maxLength={1} className="recuperar-code-input" />
              <input maxLength={1} className="recuperar-code-input" />
            </div>

            <button type="button" className="recuperar-verify-button">
              Verificar código
            </button>
          </div>

          <p className="recuperar-resend-text">
            Não recebeu? <a href="#">Reenviar código</a>
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
              <h4>Verifique seu email</h4>
              <p>Entre no gmail e verifique se recebeu o código</p>
            </div>
          </div>

          <div className="recuperar-step">
            <div className="recuperar-step-number">2</div>
            <div>
              <h4>Verifique o código</h4>
              <p>Digite o código recebido por email</p>
            </div>
          </div>

          <div className="recuperar-step">
            <div className="recuperar-step-number">3</div>
            <div>
              <h4>Nova senha</h4>
              <p>Defina uma nova senha</p>
            </div>
          </div>

          <div className="recuperar-info-card">
            <div className="recuperar-info-icon">cadeado</div>

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