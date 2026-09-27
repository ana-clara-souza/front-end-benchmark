'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';

interface Experiment {
  _id: string;
  nome?: string;
  createdAt?: string;
  updatedAt?: string;
  dataset?: string;
  modelo?: string;
  dispositivo?: string | null;
  device?: string | null;
  qtdMobile?: number;
  qtdScript?: number;
  arquivado?: boolean;
  [key: string]: unknown;
}

export default function ExperimentosPage() {
  const router = useRouter();
  const [experimentosAtivos, setExperimentosAtivos] = useState<Experiment[]>([]);
  const [experimentosArquivados, setExperimentosArquivados] = useState<Experiment[]>([]);
  const [activeTab, setActiveTab] = useState<'ativos' | 'arquivados'>('ativos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Busca lista de experimentos ativos e arquivados simultaneamente usando cookies HttpOnly
  const fetchExperimentos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Envia o cookie HttpOnly de sessão
    };

    try {
      const [resAtivos, resArquivados] = await Promise.all([
        fetch('https://api-ic-mutt.onrender.com/api/experimentos/info', requestOptions),
        fetch('https://api-ic-mutt.onrender.com/api/experimentos/arquivados', requestOptions),
      ]);

      if (resAtivos.status === 401 || resArquivados.status === 401) {
        router.push('/');
        return;
      }

      if (!resAtivos.ok || !resArquivados.ok) {
        throw new Error('Falha ao carregar a lista de experimentos.');
      }

      const dataAtivos = await resAtivos.json();
      const dataArquivados = await resArquivados.json();

      console.log('📦 Retorno bruto da API (/experimentos/info):', dataAtivos);
      console.log('📦 Retorno bruto da API (/experimentos/arquivados):', dataArquivados);

      const listaAtivosFormatada = Array.isArray(dataAtivos) ? dataAtivos : dataAtivos.experimentos || [];
      const listaArquivadosFormatada = Array.isArray(dataArquivados) ? dataArquivados : dataArquivados.experimentos || [];

      console.log('📋 Lista de experimentos ATIVOS processada:', listaAtivosFormatada);
      console.log('📋 Lista de experimentos ARQUIVADOS processada:', listaArquivadosFormatada);

      setExperimentosAtivos(listaAtivosFormatada);
      setExperimentosArquivados(listaArquivadosFormatada);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar experimentos.';
      console.error('❌ Erro ao buscar experimentos:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchExperimentos();
  }, [fetchExperimentos]);

  // Define a lista atual com base na aba selecionada
  const listaAtual = useMemo(() => {
    return activeTab === 'ativos' ? experimentosAtivos : experimentosArquivados;
  }, [activeTab, experimentosAtivos, experimentosArquivados]);

  // Filtra a lista atual com base no termo de busca
  const experimentosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return listaAtual;

    const term = searchTerm.toLowerCase();

    return listaAtual.filter((exp) => {
      const nome = (exp.nome || '').toLowerCase();
      const id = (exp._id || '').toLowerCase();
      const modelo = (exp.modelo || '').toLowerCase();
      const dataset = (exp.dataset || '').toLowerCase();
      const dispositivo = (exp.dispositivo || exp.device || '').toLowerCase();

      return (
        nome.includes(term) ||
        id.includes(term) ||
        modelo.includes(term) ||
        dataset.includes(term) ||
        dispositivo.includes(term)
      );
    });
  }, [listaAtual, searchTerm]);

  // Ação de Gerar Nova Chave de Experimento solicitando o nome
  const handleGerarExperimento = async () => {
    const nomeDigitado = window.prompt('Digite o nome do experimento:');

    if (!nomeDigitado || !nomeDigitado.trim()) {
      return;
    }

    const nome = nomeDigitado.trim();

    setCreating(true);
    setError(null);
    setSuccessMessage(null);
    setNewKey(null);

    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/chaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Envia o cookie de autenticação
        body: JSON.stringify({ nome }),
      });

      if (response.status === 401) {
        router.push('/');
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao gerar nova chave de experimento.');
      }

      const data: { message: string; id: string; createdAt: string } = await response.json();
      console.log('🔑 Resposta da criação de novo experimento:', data);

      setSuccessMessage(data.message || 'Experimento criado com sucesso!');
      setNewKey(data.id);

      await fetchExperimentos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar experimento.';
      console.error('❌ Erro ao gerar experimento:', err);
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-vh-100 bg-body-tertiary d-flex flex-column">
      <Navbar />

      {/* Conteúdo Principal */}
      <main className="container py-4 flex-grow-1">
        {/* Cabeçalho de Ações */}
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
          <div className="alert alert-danger alert-dismissible fade show rounded-3 shadow-sm mb-4" role="alert">
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
          {/* Cabeçalho do Card com Abas e Barra de Pesquisa */}
          <div className="card-header bg-body border-0 pt-4 px-4 pb-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            {/* Navegação entre Ativos e Arquivados */}
            <ul className="nav nav-pills gap-2 border-bottom-0">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold px-3 py-2 rounded-3 d-flex align-items-center gap-2 ${
                    activeTab === 'ativos' ? 'active bg-primary text-white' : 'text-secondary bg-body-tertiary'
                  }`}
                  onClick={() => setActiveTab('ativos')}
                >
                  <i className="bi bi-flask"></i>
                  Ativos
                  <span
                    className={`badge rounded-pill ${
                      activeTab === 'ativos' ? 'bg-white text-primary' : 'bg-secondary-subtle text-secondary'
                    }`}
                  >
                    {experimentosAtivos.length}
                  </span>
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold px-3 py-2 rounded-3 d-flex align-items-center gap-2 ${
                    activeTab === 'arquivados' ? 'active bg-secondary text-white' : 'text-secondary bg-body-tertiary'
                  }`}
                  onClick={() => setActiveTab('arquivados')}
                >
                  <i className="bi bi-archive"></i>
                  Arquivados
                  <span
                    className={`badge rounded-pill ${
                      activeTab === 'arquivados' ? 'bg-white text-secondary' : 'bg-secondary-subtle text-secondary'
                    }`}
                  >
                    {experimentosArquivados.length}
                  </span>
                </button>
              </li>
            </ul>

            {/* Campo de Pesquisa */}
            <div className="input-group mw-100 w-auto">
              <span className="input-group-text bg-body-tertiary border-end-0">
                <i className="bi bi-search text-secondary"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 bg-body-tertiary ps-0 shadow-none"
                placeholder="Pesquisar experimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="btn btn-outline-secondary border-start-0 shadow-none"
                  type="button"
                  onClick={() => setSearchTerm('')}
                  title="Limpar pesquisa"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>

          <div className="card-body p-4">
            {loading ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
                <span className="text-secondary small fw-medium">Buscando seus experimentos...</span>
              </div>
            ) : listaAtual.length === 0 ? (
              <div className="text-center py-5">
                <i
                  className={`bi ${activeTab === 'ativos' ? 'bi-flask' : 'bi-archive'} fs-1 text-secondary opacity-50 d-block mb-3`}
                ></i>
                <h3 className="h6 fw-semibold text-secondary mb-1">
                  {activeTab === 'ativos' ? 'Nenhum experimento ativo' : 'Nenhum experimento arquivado'}
                </h3>
                <p className="text-muted small mb-0">
                  {activeTab === 'ativos'
                    ? 'Clique no botão acima para gerar sua primeira chave de experimento.'
                    : 'Os experimentos arquivados aparecerão nesta aba.'}
                </p>
              </div>
            ) : experimentosFiltrados.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-search fs-1 text-secondary opacity-50 d-block mb-3"></i>
                <h3 className="h6 fw-semibold text-secondary mb-1">Nenhum resultado para "{searchTerm}"</h3>
                <p className="text-muted small mb-3">Tente buscar por outro nome, ID, modelo ou dataset.</p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-none"
                  onClick={() => setSearchTerm('')}
                >
                  Limpar filtro
                </button>
              </div>
            ) : (
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                {experimentosFiltrados.map((exp, index) => {
                  const dispositivoAtual = exp.dispositivo ?? exp.device;
                  const tituloCard = exp.nome || (exp.modelo ? `Modelo: ${exp.modelo}` : `Experimento #${index + 1}`);

                  return (
                    <div key={exp._id || index} className="col">
                      <div className="card h-100 border border-light-subtle rounded-3 shadow-sm">
                        <div className="card-body p-3 d-flex flex-column justify-content-between">
                          <div>
                            {/* Header do Card: ID e Criado em */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="d-flex align-items-center gap-1">
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 small fw-semibold">
                                  ID: {exp._id}
                                </span>
                                {activeTab === 'arquivados' && (
                                  <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-2 py-1 small">
                                    Arquivado
                                  </span>
                                )}
                              </div>
                              {exp.createdAt && (
                                <span className="text-secondary small">
                                  <i className="bi bi-calendar3 me-1"></i>
                                  {new Date(exp.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>

                            {/* Título do Card */}
                            <h3 className="h6 fw-bold text-body-emphasis mb-3">
                              {tituloCard}
                            </h3>

                            {/* Lista de Atributos */}
                            <ul className="list-unstyled small text-secondary mb-0 d-flex flex-column gap-2">
                              {/* EXIBIÇÃO DO NOME */}
                              {exp.nome && (
                                <li className="d-flex align-items-center gap-1">
                                  <i className="bi bi-tag text-primary"></i>
                                  <strong className="text-body-secondary">Nome:</strong> {exp.nome}
                                </li>
                              )}

                              {exp.modelo && (
                                <li className="d-flex align-items-center gap-1">
                                  <i className="bi bi-cpu text-primary"></i>
                                  <strong className="text-body-secondary">Modelo:</strong> {exp.modelo}
                                </li>
                              )}

                              {exp.dataset && (
                                <li className="d-flex align-items-center gap-1">
                                  <i className="bi bi-database text-primary"></i>
                                  <strong className="text-body-secondary">Dataset:</strong> {exp.dataset}
                                </li>
                              )}

                              <li className="d-flex align-items-center gap-1">
                                <i className="bi bi-phone text-primary"></i>
                                <strong className="text-body-secondary">Dispositivo:</strong>{' '}
                                {dispositivoAtual ? (
                                  <span className="badge bg-secondary-subtle text-secondary border">
                                    {dispositivoAtual}
                                  </span>
                                ) : (
                                  <span className="text-muted fst-italic">Não definido</span>
                                )}
                              </li>

                              <li className="d-flex align-items-center justify-content-between pt-2 border-top mt-1">
                                <span title="Quantidade Mobile">
                                  <i className="bi bi-phone-vibrate me-1 text-success"></i>
                                  <strong className="text-body-secondary">Quantidade Mobile:</strong> {exp.qtdMobile ?? 0}
                                </span>
                                <span title="Quantidade Script">
                                  <i className="bi bi-code-slash me-1 text-info"></i>
                                  <strong className="text-body-secondary">Quantidade Script:</strong> {exp.qtdScript ?? 0}
                                </span>
                              </li>
                            </ul>
                          </div>

                          {/* Rodapé do Card: Data de Atualização */}
                          {exp.updatedAt && (
                            <div className="pt-2 mt-3 border-top text-secondary text-end small">
                              <i className="bi bi-clock-history me-1"></i>
                              Atualizado: {new Date(exp.updatedAt).toLocaleString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}