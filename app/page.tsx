'use client';

export default function Login() {
  return (
    <div className="container-fluid vh-100 d-flex align-items-center px-5">
      <div className="row w-100 align-items-center mx-0">

        <div className="col-md-6 d-flex flex-column justify-content-center px-4">
          <h2 className="fw-bold mb-4">Benchmark Web</h2>

          <h4 className="fw-bold">Acesse sua conta</h4>
          <p className="text-muted mb-4">Entre com suas credenciais</p>

          <form>
            <div className="mb-3">
              <label>Email</label>
              <input type="email" className="form-control" />
            </div>

            <div className="mb-2">
              <label>Senha</label>
              <input type="password" className="form-control" />
            </div>

            <a href="/recuperar-senha" className="small d-block mb-3">
              Esqueceu a senha?
            </a>

            <button className="btn btn-primary w-100 mb-3"> 
              <a href="/dashboard">
              Entrar
              </a>
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
              <img
                src="/imagem.png"
                className="img-fluid rounded loginImage"
                alt="Imagem do login"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}