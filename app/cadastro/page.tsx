'use client';

import Link from 'next/link';
import './cadastro.css';

export default function Cadastro() {
  return (
    <main className="cadastro-page">
      <section className="cadastro-left">
        <div className="cadastro-form-box">
          <h1 className="brand-title">Benchmark Web</h1>

          <h2 className="page-title">Crie sua conta</h2>
          <p className="page-subtitle">Preencha os dados para começar</p>

          <form className="cadastro-form">
            <div className="form-group">
              <label>Nome Completo</label>
              <input type="text" />
            </div>

            <div className="form-group">
              <label>Email Institucional</label>
              <input type="email" />
            </div>

            <div className="form-group">
              <label>Instituição</label>
              <input type="text" />
            </div>

            <div className="form-group">
              <label>Laboratório</label>
              <input type="text" />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input type="password" />
            </div>

            <button type="submit" className="btn-cadastrar">
              Cadastrar
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