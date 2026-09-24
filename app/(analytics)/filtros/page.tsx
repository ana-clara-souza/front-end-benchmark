'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAnalyticsPayloadContext } from '../../../lib/dashboardData/AnalyticsPayloadContext';
import { normalizeNodeResponseIntoMessages } from '../../../lib/dashboardData/normalizeNodeResponse';

// Interface completa igual à página de experimentos
interface ExperimentInfo {
  _id?: string;
  nome?: string;
  name?: string;
  key?: string;
  chave?: string;
  id?: string;
  modelo?: string;
  model?: string;
  dataset?: string;
  dispositivo?: string | null;
  device?: string | null;
  servico?: string | null;
  qtdMobile?: number;
  qtdScript?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export default function FiltrosPage() {
  const router = useRouter();

  // Hook do Contexto para entregar o payload ao Dashboard
  const { deliverPayload, reportDeliveryError } = useAnalyticsPayloadContext();

  // 1. ESTADOS DOS FILTROS
  const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  // 2. ESTADOS DE DADOS E PESQUISA
  const [myExperiments, setMyExperiments] = useState<ExperimentInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);
  const [loadingExperiments, setLoadingExperiments] = useState(false);

  // 3. ESTADOS DA SESSÃO E INTERFACE
  const [userName, setUserName] = useState('Usuário');
  const [userInitials, setUserInitials] = useState('U');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapeamento de títulos amigáveis para a interface de seleção
  const chartTitles: Record<string, string> = {
    chart1: 'Comparativo de memória por dataset',
    chart2: 'Memória por modelo e dataset',
    chart3: 'Tempo de inferência',
    chart4: 'Inferência por segundo',
    chart_metrics: 'Métricas de Predição',
    chart_pareto: 'Fronteira de Pareto',
    chart_pareto_by_dataset: 'Fronteira de Pareto (por dataset)',
    chart_f1_heatmap: 'Heatmap F1 por Classe',
  };

  // Carrega a lista real de experimentos da API usando cookies HttpOnly
  const fetchMyExperiments = async () => {
    setLoadingExperiments(true);
    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Envia automaticamente o cookie HttpOnly
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Erro ao buscar lista de experimentos.');
      }

      const data = await response.json();
      console.log('📦 Retorno bruto da API (/experimentos/info em Filtros):', data);

      const list: ExperimentInfo[] = Array.isArray(data) ? data : data.experimentos || [];
      console.log('📋 Lista de experimentos processada em Filtros:', list);

      setMyExperiments(list);

      // Extrai dinamicamente a lista de Devices reais únicos
      const devices = Array.from(
        new Set(
          list
            .map((item) => item.dispositivo || item.device || item.servico)
            .filter(Boolean) as string[]
        )
      );
      setAvailableDevices(devices);
    } catch (e) {
      console.error('❌ Erro ao carregar experimentos:', e);
    } finally {
      setLoadingExperiments(false);
    }
  };

  // Efeito executado na montagem da tela
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const name = user.nomeCompleto || user.nome || user.name || 'Usuário';
        setUserName(name);

        const parts = name.trim().split(/\s+/);
        let initials = 'U';
        if (parts.length > 0) {
          initials =
            parts.length === 1
              ? parts[0].charAt(0).toUpperCase()
              : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        setUserInitials(initials);
      } catch (e) {
        console.error('Erro ao ler usuário logado do localStorage:', e);
      }
    }

    fetchMyExperiments();
  }, []);

  // 🔍 Filtra a lista de experimentos com base na busca
  const filteredExperiments = useMemo(() => {
    if (!searchTerm.trim()) return myExperiments;

    const term = searchTerm.toLowerCase();

    return myExperiments.filter((exp) => {
      const expId = String(exp._id || exp.key || exp.chave || exp.id || '').toLowerCase();
      const identifier = (exp.nome || exp.name || '').toLowerCase();
      const modelo = (exp.modelo || exp.model || '').toLowerCase();
      const dataset = (exp.dataset || '').toLowerCase();
      const device = (exp.dispositivo || exp.device || exp.servico || '').toLowerCase();

      return (
        identifier.includes(term) ||
        expId.includes(term) ||
        modelo.includes(term) ||
        dataset.includes(term) ||
        device.includes(term)
      );
    });
  }, [myExperiments, searchTerm]);

  // Handler para Seleção/Deseleção de Experimentos
  const handleExperimentToggle = (expId: string) => {
    setSelectedExperiments((prev) =>
      prev.includes(expId) ? prev.filter((id) => id !== expId) : [...prev, expId]
    );
  };

  // Selecionar/Deselecionar todos os experimentos filtrados
  const handleSelectAllExperiments = () => {
    const currentFilteredIds = filteredExperiments.map((exp) =>
      String(exp._id || exp.key || exp.chave || exp.id || '')
    );

    const allSelected = currentFilteredIds.every((id) => selectedExperiments.includes(id));

    if (allSelected) {
      setSelectedExperiments((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedExperiments((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  // Handler para Seleção/Deseleção de Gráficos
  const handleChartToggle = (chartKey: string) => {
    setSelectedCharts((prev) =>
      prev.includes(chartKey) ? prev.filter((c) => c !== chartKey) : [...prev, chartKey]
    );
  };

  /**
   * FLUXO PRINCIPAL DE CONEXÃO COM O BACKEND
   */
  const fetchCharts = async () => {
    setLoading(true);
    setError(null);

    if (selectedExperiments.length === 0) {
      setError('Por favor, selecione pelo menos um experimento.');
      setLoading(false);
      return;
    }

    if (selectedCharts.length === 0) {
      setError('Por favor, selecione pelo menos um gráfico para visualizar.');
      setLoading(false);
      return;
    }

    try {
      // Montagem do Payload ÚNICO
      const payload: Record<string, unknown> = {
        charts: selectedCharts,
        mobileFilters: {
          _id: selectedExperiments,
          ...(selectedDevice ? { device: selectedDevice } : {}),
        },
        scriptFilters: {
          _id: selectedExperiments,
          ...(selectedDevice ? { device: selectedDevice } : {}),
        },
      };

      console.log('>>> [1] Payload enviado para /api/charts:', JSON.stringify(payload, null, 2));

      // Requisição para o Backend com Cookie HttpOnly
      const response = await fetch('https://api-ic-mutt.onrender.com/api/charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Envia o cookie de autenticação
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada ou não autorizada. Por favor, faça login novamente.');
        }
        throw new Error(`Erro HTTP ${response.status} ao carregar gráficos do servidor.`);
      }

      const data = await response.json();
      console.log('>>> [2] Resposta Bruta da API:', data);

      if (data && data.success === false) {
        let msg = data.message || 'Erro do servidor ao gerar os gráficos.';
        try {
          const parsed = JSON.parse(msg);
          if (parsed && parsed.detail) msg = parsed.detail;
        } catch (e) {}
        throw new Error(msg);
      }

      // Normalização unificada
      const messages = normalizeNodeResponseIntoMessages(data);
      console.log('>>> [3] Mensagens Normalizadas para o Contexto:', messages);

      if (!messages || messages.length === 0) {
        throw new Error('Nenhum dado válido foi retornado para os experimentos selecionados.');
      }

      // Entrega do payload e navegação
      deliverPayload(messages);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar gráficos.';
      console.error('❌ Erro no fetchCharts:', err);
      setError(message);
      reportDeliveryError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-column">
      <Navbar userName={userName} initials={userInitials} />

      <main className="container py-4 flex-grow-1">
        {/* CABEÇALHO */}
        <div className="pb-3 mb-4 border-bottom">
          <h1 className="h3 fw-bold text-body-emphasis mb-1">Filtros do Dashboard</h1>
          <p className="text-secondary small mb-0">
            Escolha os dados dos seus testes e selecione as visualizações desejadas para gerar a análise.
          </p>
        </div>

        {/* ALERTA DE ERRO */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show rounded-3 shadow-sm mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
          </div>
        )}

        {/* SEÇÃO 1: EXPERIMENTOS */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-header bg-body border-0 pt-4 px-4 pb-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h2 className="h5 fw-bold text-body-emphasis mb-1">1. Selecionar Experimentos</h2>
              <p className="text-secondary small mb-0">Marque os experimentos que deseja incluir no gráfico</p>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Botão Selecionar Todos */}
              {filteredExperiments.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary rounded-3 fw-semibold shadow-none"
                  onClick={handleSelectAllExperiments}
                >
                  <i className="bi bi-check2-all me-1"></i>
                  {filteredExperiments.every((exp) =>
                    selectedExperiments.includes(String(exp._id || exp.key || exp.chave || exp.id || ''))
                  )
                    ? 'Limpar'
                    : 'Selecionar todos'}
                </button>
              )}

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
          </div>

          <div className="card-body p-4">
            {loadingExperiments ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
                <span className="text-secondary small fw-medium">Buscando seus experimentos...</span>
              </div>
            ) : myExperiments.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-flask fs-1 text-secondary opacity-50 d-block mb-3"></i>
                <h3 className="h6 fw-semibold text-secondary mb-1">Nenhum experimento encontrado</h3>
                <p className="text-muted small mb-0">Crie ou execute um experimento para visualizá-lo aqui.</p>
              </div>
            ) : filteredExperiments.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-search fs-1 text-secondary opacity-50 d-block mb-3"></i>
                <h3 className="h6 fw-semibold text-secondary mb-1">Nenhum resultado para "{searchTerm}"</h3>
                <p className="text-muted small mb-3">Tente buscar por outro nome, ID, modelo, dataset ou dispositivo.</p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-none"
                  onClick={() => setSearchTerm('')}
                >
                  Limpar pesquisa
                </button>
              </div>
            ) : (
              /* GRID DE CARDS EXIBINDO INFORMAÇÕES COMPLETAS */
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                {filteredExperiments.map((exp, index) => {
                  const expId = String(exp._id || exp.key || exp.chave || exp.id || '');
                  const isSelected = selectedExperiments.includes(expId);
                  const dispositivoAtual = exp.dispositivo ?? exp.device ?? exp.servico;
                  const nomeExperimento = exp.nome || exp.name;
                  const modeloAtual = exp.modelo || exp.model;
                  const tituloCard = nomeExperimento || (modeloAtual ? `Modelo: ${modeloAtual}` : `Experimento #${index + 1}`);

                  return (
                    <div key={expId || index} className="col">
                      <div
                        className={`card h-100 border rounded-3 shadow-sm transition user-select-none ${
                          isSelected ? 'border-primary bg-primary-subtle' : 'border-light-subtle bg-white'
                        }`}
                        onClick={() => handleExperimentToggle(expId)}
                        role="button"
                      >
                        <div className="card-body p-3 d-flex flex-column justify-content-between">
                          <div>
                            {/* Header do Card: Checkbox, ID e Criado em */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="d-flex align-items-center gap-2">
                                <div className="form-check m-0">
                                  <input
                                    type="checkbox"
                                    className="form-check-input shadow-none"
                                    checked={isSelected}
                                    onChange={() => handleExperimentToggle(expId)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 small fw-semibold">
                                  ID: {expId}
                                </span>
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

                            {/* Lista Detalhada de Atributos */}
                            <ul className="list-unstyled small text-secondary mb-0 d-flex flex-column gap-2">
                              {exp.nome && (
                                <li className="d-flex align-items-center gap-1">
                                  <i className="bi bi-tag text-primary"></i>
                                  <strong className="text-body-secondary">Nome:</strong> {exp.nome}
                                </li>
                              )}

                              {modeloAtual && (
                                <li className="d-flex align-items-center gap-1">
                                  <i className="bi bi-cpu text-primary"></i>
                                  <strong className="text-body-secondary">Modelo:</strong> {modeloAtual}
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
                                  <strong className="text-body-secondary">Mobile:</strong> {exp.qtdMobile ?? 0}
                                </span>
                                <span title="Quantidade Script">
                                  <i className="bi bi-code-slash me-1 text-info"></i>
                                  <strong className="text-body-secondary">Script:</strong> {exp.qtdScript ?? 0}
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

        {/* SEÇÃO OPCIONAL: DISPOSITIVO REAL */}
        {availableDevices.length > 0 && (
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="h6 fw-bold text-body-emphasis mb-1">Filtrar por Dispositivo (Opcional)</h5>
              <p className="text-secondary small mb-3">Restrinja a análise de dados a um hardware específico</p>
              <select
                className="form-select bg-body-tertiary border-light-subtle shadow-none"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                <option value="">Todos os Dispositivos</option>
                {availableDevices.map((dev) => (
                  <option key={dev} value={dev}>
                    {dev}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* SEÇÃO 2: GRÁFICOS */}
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-header bg-body border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h5 fw-bold text-body-emphasis mb-1">2. Gráficos e Métricas</h2>
              <p className="text-secondary small mb-0">Marque quais visualizações deseja gerar no Dashboard</p>
            </div>
            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle rounded-pill px-3 py-2 fw-bold">
              {selectedCharts.length} Escolhido(s)
            </span>
          </div>

          <div className="card-body p-4">
            <div className="row g-3">
              {Object.keys(chartTitles).map((chartKey) => {
                const isSelected = selectedCharts.includes(chartKey);

                return (
                  <div key={chartKey} className="col-12 col-md-6">
                    <div
                      className={`card h-100 border transition user-select-none ${
                        isSelected ? 'border-primary bg-primary-subtle' : 'border-light-subtle bg-white'
                      }`}
                      onClick={() => handleChartToggle(chartKey)}
                      role="button"
                    >
                      <div className="card-body d-flex align-items-center justify-content-between p-3">
                        <span className={`fw-medium ${isSelected ? 'text-primary' : 'text-body-emphasis'}`}>
                          {chartTitles[chartKey]}
                        </span>
                        <div className="form-check m-0 ms-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleChartToggle(chartKey)}
                            onClick={(e) => e.stopPropagation()}
                            className="form-check-input shadow-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTÃO PRINCIPAL */}
        <div className="d-flex justify-content-end mb-4">
          <button
            type="button"
            onClick={fetchCharts}
            className="btn btn-primary fw-semibold py-2 px-4 rounded-3 d-inline-flex align-items-center justify-content-center gap-2 shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Aplicando Filtros...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check-lg"></i>
                <span>Aplicar Filtros</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}