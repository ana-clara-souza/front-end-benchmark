'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NavbarProps {
  userName?: string;
  initials?: string;
}

export default function Navbar({
  userName: propUserName = 'Usuário',
  initials: propInitials = 'U',
}: NavbarProps) {
  const router = useRouter();

  const [userName, setUserName] = useState(propUserName);
  const [initials, setInitials] = useState(propInitials);

  // Leitura direta e simples do localStorage no carregamento
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const name = user.nomeCompleto || user.name || 'Usuário';
        setUserName(name);
        setInitials(name.charAt(0).toUpperCase()); // Pega apenas a primeira letra (simples e direto)
      } catch (e) {
        console.error('Erro ao ler usuário no Navbar:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom px-4 py-3">
        <div className="container-fluid d-flex align-items-center">
          <Link href="/filtros" className="navbar-brand fw-bold text-dark text-decoration-none">
            Benchmark Web
          </Link>

          {/* Links de Navegação */}
          <div className="d-flex gap-3 ms-4">
            <Link href="/experimentos" className="text-decoration-none fw-semibold text-secondary">
              Experimentos
            </Link>
            <Link href="/filtros" className="text-decoration-none fw-semibold text-secondary">
              Filtros
            </Link>
            <Link href="/dashboard" className="text-decoration-none fw-semibold text-secondary">
              Gráficos
            </Link>
          </div>

          {/* Usuário e Dropdown */}
          <div className="ms-auto dropdown">
            <button
              type="button"
              className="btn border-0 d-flex align-items-center gap-2 bg-transparent"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                style={{ width: '40px', height: '40px' }}
              >
                {initials}
              </div>

              <span className="fw-semibold text-dark">
                {userName}
              </span>
            </button>

            <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
              <li>
                <button
                  className="dropdown-item"
                  type="button"
                  data-bs-toggle="modal"
                  data-bs-target="#profileModal"
                >
                  Perfil
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button
                  className="dropdown-item text-danger fw-semibold"
                  type="button"
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* MODAL SIMPLIFICADO (APENAS VISUALIZAÇÃO DE DADOS E AÇÕES RÁPIDAS) */}
      <div className="modal fade" id="profileModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content border-0 rounded-4 shadow">
            <div className="modal-header border-0">
              <h5 className="modal-title fw-bold fs-6">Perfil do Usuário</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div className="modal-body text-center pb-4">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                style={{ width: '60px', height: '60px', fontSize: '1.25rem' }}
              >
                {initials}
              </div>

              <h6 className="fw-bold mb-1">{userName}</h6>
              <p className="text-muted small mb-4">Sessão Ativa</p>

              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm fw-semibold"
                  data-bs-dismiss="modal"
                  onClick={() => router.push('/recuperar-senha')}
                >
                  Alterar Senha
                </button>

                <button
                  type="button"
                  className="btn btn-danger btn-sm fw-semibold"
                  data-bs-dismiss="modal"
                  onClick={handleLogout}
                >
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}