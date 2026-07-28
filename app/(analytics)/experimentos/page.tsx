'use client';

import { useEffect, useState, useCallback } from 'react';

interface Experiment {
  _id: string;
  name?: string;
  createdAt?: string;
  device?: string;
  [key: string]: unknown;
}

export default function ExperimentosPage() {
  const [experimentos, setExperimentos] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Busca a lista de experimentos do usuário
  const fetchExperimentos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar a lista de experimentos.');
      }

      const data = await response.json();
      setExperimentos(Array.isArray(data) ? data : data.experimentos || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar experimentos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperimentos();
  }, [fetchExperimentos]);

  // Ação de Gerar Nova Chave de Experimento (POST /api/experimentos/chaves)
  const handleGerarExperimento = async () => {
    setCreating(true);
    setError(null);
    setSuccessMessage(null);
    setNewKey(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/chaves', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar nova chave de experimento.');
      }

      const data: { message: string; id: string; createdAt: string } = await response.json();

      setSuccessMessage(data.message || 'Experimento criado com sucesso!');
      setNewKey(data.id);

      // Recarrega a lista para sincronizar com o novo experimento
      await fetchExperimentos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar experimento.';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Cabeçalho */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center pb-3 mb-4 border-bottom gap-3">
        <div>
          <h1 className="h3 fw-bold text-body-emphasis mb-1">Meus Experimentos</h1>
          <p className="text-secondary small mb-0">
            Gerencie e crie chaves para execução e coleta de métricas nos seus dispositivos.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 px-4 py-2 rounded-3 shadow-sm fw-semibold"
          onClick={handleGerarExperimento}
          disabled={creating}
        >
          {creating ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              Gerando...
            </>
          ) : (
            <>
              <i className="bi bi-plus-lg"></i>
              Gerar Experimento
            </>
          )}
        </button>
      </div>

      {/* Alertas de Feedback */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show rounded-3 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show rounded-3 shadow-sm mb-4" role="alert">
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className="bi bi-check-circle-fill fs-5"></i>
            <strong className="fs-6">{successMessage}</strong>
          </div>
          {newKey && (
            <div className="mt-2 pt-2 border-top border-success-subtle">
              <span className="small text-secondary d-block">Sua nova chave de experimento:</span>
              <code className="fs-5 fw-bold text-success bg-success-subtle px-2 py-1 rounded d-inline-block mt-1">
                {newKey}
              </code>
            </div>
          )}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)} aria-label="Close"></button>
        </div>
      )}

      {/* Lista de Experimentos */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header bg-body border-0 pt-4 px-4 pb-0">
          <h2 className="h5 fw-bold text-body-emphasis mb-0">Experimentos Cadastrados</h2>
        </div>

        <div className="card-body p-4">
          {loading ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
              <span className="text-secondary small fw-medium">Buscando seus experimentos...</span>
            </div>
          ) : experimentos.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-flask fs-1 text-secondary opacity-50 d-block mb-3"></i>
              <h3 className="h6 fw-semibold text-secondary mb-1">Nenhum experimento encontrado</h3>
              <p className="text-muted small mb-3">Clique no botão acima para gerar sua primeira chave de experimento.</p>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
              {experimentos.map((exp, index) => (
                <div key={exp._id || index} className="col">
                  <div className="card h-100 border border-light-subtle rounded-3 shadow-sm hover-shadow transition">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 small fw-semibold">
                          ID: {exp._id}
                        </span>
                        {exp.createdAt && (
                          <span className="text-secondary micro-text" style={{ fontSize: '0.75rem' }}>
                            {new Date(exp.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      <h3 className="h6 fw-bold text-body-emphasis mb-1">
                        {exp.name || `Experimento #${index + 1}`}
                      </h3>

                      {exp.device && (
                        <p className="text-secondary small mb-0 d-flex align-items-center gap-1 mt-2">
                          <i className="bi bi-phone text-muted"></i>
                          {exp.device}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}