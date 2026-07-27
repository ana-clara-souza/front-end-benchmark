'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { useAnalyticsPayloadContext } from '../../../lib/dashboardData/AnalyticsPayloadContext';
import { normalizeNodeResponseIntoMessages } from '../../../lib/dashboardData/normalizeNodeResponse';

// Interface para os experimentos vindos do Node
interface ExperimentInfo {
  _id?: string;
  nome?: string;
  key?: string;
  chave?: string;
  id?: string;
  modelo?: string;
  model?: string;
  dataset?: string;
  device?: string;
  servico?: string;
}

export default function FiltrosPage() {
  const router = useRouter();
  
  // Hook do Contexto para entregar o payload ao Dashboard sem guardar estado de gráfico aqui
  const { deliverPayload, reportDeliveryError } = useAnalyticsPayloadContext();

  // 1. ESTADOS DOS FILTROS (Selecionados pelo usuário)
  const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>(''); // Corrigido para String livre (Seção 3)

  // 2. ESTADOS DE DADOS DUMMY/API DA TELA
  const [myExperiments, setMyExperiments] = useState<ExperimentInfo[]>([]);
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
    chart_f1_heatmap: 'Heatmap F1 por Classe'
  };

  // Carrega a lista real de experimentos da API do Node
  const fetchMyExperiments = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoadingExperiments(true);
    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/info', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao buscar lista de experimentos.');
      
      const data: ExperimentInfo[] = await response.json();
      const list = Array.isArray(data) ? data : [];
      setMyExperiments(list);

      // Extrai dinamicamente a lista de Devices reais únicos para popular o filtro (Opção A da Doc)
      const devices = Array.from(
        new Set(list.map((item) => item.device || item.servico).filter(Boolean) as string[])
      );
      setAvailableDevices(devices);

    } catch (e) {
      console.error('Erro ao carregar experimentos:', e);
    } finally {
      setLoadingExperiments(false);
    }
  };

  // Efeito executado na montagem da tela
  useEffect(() => {
    // Carrega os dados reais do usuário vindo da sessão (Substituindo props fixas conforme a doc)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const name = user.nomeCompleto || user.name || 'Usuário';
        setUserName(name);

        const parts = name.trim().split(/\s+/);
        let initials = 'U';
        if (parts.length > 0) {
          initials = parts.length === 1 
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

  // Handler para Seleção/Deseleção de Experimentos (Passo 1)
  const handleExperimentToggle = (expId: string) => {
    setSelectedExperiments((prev) =>
      prev.includes(expId) ? prev.filter((id) => id !== expId) : [...prev, expId]
    );
  };

  // Handler para Seleção/Deseleção de Gráficos (Passo 2)
  const handleChartToggle = (chartKey: string) => {
    setSelectedCharts((prev) =>
      prev.includes(chartKey) ? prev.filter((c) => c !== chartKey) : [...prev, chartKey]
    );
  };

  /**
   * FLUXO PRINCIPAL DE CONEXÃO COM O BACKEND (SEÇÃO 0 E SEÇÃO 4 DA DOC)
   * Realiza UMA ÚNICA chamada POST. A resposta bruta do Node é normalizada
   * e entregue via Context para a rota /dashboard.
   */
  const fetchCharts = async () => {
    setLoading(true);
    setError(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Token de autenticação não encontrado. Faça login novamente.');
      setLoading(false);
      return;
    }

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
          ...(selectedDevice ? { device: selectedDevice } : {})
        },
        scriptFilters: {
          _id: selectedExperiments,
          ...(selectedDevice ? { device: selectedDevice } : {})
        }
      };

      // 1. REQUISIÇÃO ÚNICA PARA O BACKEND
      const response = await fetch('https://api-ic-mutt.onrender.com/api/charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao carregar gráficos do servidor.`);
      }

      const data = await response.json();

      // Tratamento para retornos com erro amigável do backend
      if (data && data.success === false) {
        let msg = data.message || 'Erro do servidor ao gerar os gráficos.';
        try {
          const parsed = JSON.parse(msg);
          if (parsed && parsed.detail) msg = parsed.detail;
        } catch (e) {}
        throw new Error(msg);
      }

      // 2. NORMALIZAÇÃO UNIFICADA (O normalize cuida de separar mensagens Mobile/Script)
      const messages = normalizeNodeResponseIntoMessages(data);

      if (!messages || messages.length === 0) {
        throw new Error('Nenhum dado válido foi retornado para os experimentos selecionados.');
      }

      // 3. HANDOFF DIRETO PARA O CONTEXTO E NAVEGAÇÃO (ZONA PROTEGIDA)
      deliverPayload(messages);
      router.push('/dashboard');

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar gráficos.';
      setError(message);
      reportDeliveryError(message);
    } finally {
      setLoading(false);
    }
  };

 return (
  <div className="bg-body-tertiary min-vh-100">
    <Navbar userName={userName} initials={userInitials} />

    <main className="container py-5" style={{ maxWidth: '1000px' }}>
      
      {/* CABEÇALHO */}
      <div className="mb-4">
        <h2 className="h3 fw-bold text-dark m-0">Filtros do Dashboard</h2>
        <p className="text-secondary small m-0">
          Escolha os dados de teste e selecione as visualizações desejadas.
        </p>
      </div>

      {/* ALERTA DE ERRO */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm border-0 mb-4" role="alert">
          <div className="d-flex align-items-center">
            <span className="me-2">⚠️</span>
            <div><strong>Atenção:</strong> {error}</div>
          </div>
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* SEÇÃO 1: EXPERIMENTOS */}
      <div className="card shadow-sm border-0 mb-4 rounded-3">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="card-title fw-bold m-0 text-primary">1. Experimentos</h5>
              <small className="text-muted">Selecione um ou mais testes da base</small>
            </div>
            <span className="badge bg-primary-subtle text-primary fw-bold rounded-pill px-3 py-2">
              {selectedExperiments.length} Selecionado(s)
            </span>
          </div>

          {loadingExperiments ? (
            <div className="d-flex align-items-center gap-2 py-4 text-secondary">
              <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              <span>Carregando experimentos reais da base...</span>
            </div>
          ) : myExperiments.length === 0 ? (
            <div className="alert alert-warning border-0 bg-warning-subtle text-warning-emphasis mb-0">
              Nenhum experimento encontrado.
            </div>
          ) : (
            <div className="d-flex flex-wrap gap-2 pt-2">
              {myExperiments.map((exp) => {
                const expId = String(exp._id || exp.key || exp.chave || exp.id || '');
                const identifier = exp.nome || expId;
                const details = [exp.modelo || exp.model, exp.dataset, exp.device || exp.servico]
                  .filter(Boolean)
                  .join(' | ');
                const expDisplay = details ? `${identifier} (${details})` : String(identifier);

                const isSelected = selectedExperiments.includes(expId);

                return (
                  <button
                    key={expId}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 py-2 transition-all ${
                      isSelected
                        ? 'btn-primary shadow-sm fw-semibold'
                        : 'btn-outline-secondary bg-white text-body'
                    }`}
                    onClick={() => handleExperimentToggle(expId)}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {expDisplay}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO OPCIONAL: DISPOSITIVO REAL */}
      {availableDevices.length > 0 && (
        <div className="card shadow-sm border-0 mb-4 rounded-3">
          <div className="card-body p-4">
            <h5 className="card-title fw-bold text-dark mb-1">Dispositivo (Opcional)</h5>
            <p className="text-muted small mb-3">Filtre os testes por um aparelho específico</p>
            <select
              className="form-select form-select-lg fs-6 bg-white border-light-subtle"
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
      <div className="card shadow-sm border-0 mb-4 rounded-3">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="card-title fw-bold m-0 text-dark">2. Gráficos e Métricas</h5>
              <small className="text-muted">Marque quais visualizações deseja gerar no Dashboard</small>
            </div>
            <span className="badge bg-secondary-subtle text-secondary-emphasis fw-bold rounded-pill px-3 py-2">
              {selectedCharts.length} Escolhido(s)
            </span>
          </div>

          <div className="row g-3 pt-2">
            {Object.keys(chartTitles).map((chartKey) => {
              const isSelected = selectedCharts.includes(chartKey);

              return (
                <div key={chartKey} className="col-12 col-md-6">
                  <div
                    className={`card h-100 border transition-all cursor-pointer user-select-none ${
                      isSelected
                        ? 'border-primary bg-primary-subtle shadow-sm'
                        : 'border-light-subtle bg-white'
                    }`}
                    onClick={() => handleChartToggle(chartKey)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-body d-flex align-items-center justify-content-between p-3">
                      <span className={`fw-medium ${isSelected ? 'text-primary-emphasis' : 'text-dark'}`}>
                        {chartTitles[chartKey]}
                      </span>
                      <div className="form-check m-0 ms-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleChartToggle(chartKey)}
                          className="form-check-input cursor-pointer"
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
      <div className="d-flex justify-content-end mt-4">
        <button
          type="button"
          onClick={fetchCharts}
          className="btn btn-primary fw-semibold py-2 px-4 rounded-3 d-inline-flex align-items-center justify-content-center gap-2 border-0 shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Aplicando...</span>
            </>
          ) : (
            <span>Aplicar Filtros</span>
          )}
        </button>
      </div>

    </main>
  </div>
);
}