'use client';

import { useRouter } from "next/navigation";

interface NavbarProps {
  userName: string;
  initials: string;
}

export default function Navbar({
  userName,
  initials,
}: NavbarProps) {
  const router = useRouter();

  return (
    <>
      {/* NAVBAR */}

      <nav className="navbar navbar-expand-lg bg-white border-bottom px-4 py-3">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">
            Benchmark Web
          </span>

          <div className="ms-auto">
            <button
              type="button"
              className="btn border-0 d-flex align-items-center gap-2"
              style={{ background: "transparent" }}
              data-bs-toggle="modal"
              data-bs-target="#profileModal"
            >
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{
                  width: "42px",
                  height: "42px",
                  fontWeight: 700,
                }}
              >
                {initials}
              </div>

              <span className="fw-semibold text-dark">
                {userName}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* MODAL */}

      <div
        className="modal fade"
        id="profileModal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 rounded-4 shadow">
            <div className="modal-header border-0">
              <h5 className="modal-title fw-bold">
                Configurações do Perfil
              </h5>

              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>

            <div className="modal-body">
              <form>
                {/* NOME */}

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Nome
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Digite seu nome"
                  />
                </div>

                {/* CONTATO */}

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Contato
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Digite seu contato"
                  />
                </div>

                {/* ALTERAR SENHA */}

                <div className="mb-4">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none fw-semibold"
                    data-bs-dismiss="modal"
                    onClick={() => {
                      setTimeout(() => {
                        router.push(
                          "/recuperar-senha"
                        );
                      }, 200);
                    }}
                  >
                    Alterar senha
                  </button>
                </div>

                {/* SALVAR */}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                >
                  Salvar alterações
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}