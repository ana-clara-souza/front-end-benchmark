'use client';

import { useState, useEffect } from 'react';

import Navbar from '../../components/Navbar';

export default function DashboardPage() {
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

  const [selectedCharts, setSelectedCharts] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benchmark_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.selectedCharts || [];
        } catch { }
      }
    }
    return [];
  });

  const [selectedExperiments, setSelectedExperiments] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benchmark_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.selectedExperiments || {
            chart1: [],
            chart2: [],
            chart3: [],
            chart4: []
          };
        } catch { }
      }
    }
    return {
      chart1: [],
      chart2: [],
      chart3: [],
      chart4: []
    };
  });

  const [chartImages, setChartImages] = useState<Record<string, string | null>>({
    chart1: null,
    chart2: null,
    chart3: null,
    chart4: null
  });
  const [loadingCharts, setLoadingCharts] = useState<Record<string, boolean>>({
    chart1: false,
    chart2: false,
    chart3: false,
    chart4: false
  });

  const [activeTab, setActiveTab] = useState<'filtros' | 'graficos'>('filtros');

  const [myExperiments, setMyExperiments] = useState<ExperimentInfo[]>([]);
  const [loadingExperiments, setLoadingExperiments] = useState(false);

  const availableModels = ['ResNet50', 'MobileNetV2', 'VGG16'];

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [dataset, setDataset] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benchmark_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.dataset || 'deepweeds';
        } catch { }
      }
    }
    return 'deepweeds';
  });

  const [device, setDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benchmark_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.device || 'Slow-end';
        } catch { }
      }
    }
    return 'Slow-end';
  });

  const [model, setModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('benchmark_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.model || 'ResNet50';
        } catch { }
      }
    }
    return 'ResNet50';
  });

  const chartLimits: Record<string, number> = {
    chart1: 6,
    chart2: 3,
    chart3: 2,
    chart4: 2
  };

  const chartTitles: Record<string, string> = {
    chart1: 'Comparativo de memória por dataset',
    chart2: 'Memória por modelo e dataset',
    chart3: 'Tempo de inferência',
    chart4: 'Inferência por segundo'
  };

  const generateKey = async () => {
    setGenerating(true);
    setGeneratedKey(null);
    setKeyError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        throw new Error('Token não informado. Faça login novamente.');
      }
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/chaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();
      console.log('Resposta de chaves:', data);
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao gerar chave de experimento.');
      }
      const retrievedKey = data.key || data._id || data.id;
      if (data && retrievedKey) {
        setGeneratedKey(retrievedKey);
        setShowKeyModal(true);
        fetchMyExperiments();
      } else {
        throw new Error('Resposta inválida do servidor.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro de conexão.';
      setKeyError(errorMessage);
      setShowKeyModal(true);
    } finally {
      setGenerating(false);
    }
  };

  const fetchMyExperiments = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    setLoadingExperiments(true);
    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/meus-experimentos/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar experimentos.');
      }
      const data = await response.json();
      console.log('Resposta de meus experimentos:', data);
      setMyExperiments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro na requisição de meus experimentos:', e);
    } finally {
      setLoadingExperiments(false);
    }
  };


  const handleChartChange = (chart: string) => {
    setSelectedCharts((prev) => {
      const isSelected = prev.includes(chart);
      const nextCharts = isSelected
        ? prev.filter((c) => c !== chart)
        : [...prev, chart];

      if (isSelected) {
        setSelectedExperiments((prevExps) => ({
          ...prevExps,
          [chart]: []
        }));
      }
      return nextCharts;
    });
  };

  const handleExperimentChange = (chart: string, id: string) => {
    setSelectedExperiments((prev) => {
      const currentList = prev[chart] || [];
      const limit = chartLimits[chart] || 6;
      if (currentList.includes(id)) {
        return {
          ...prev,
          [chart]: currentList.filter((exp) => exp !== id)
        };
      } else {
        if (currentList.length >= limit) {
          return prev;
        }
        return {
          ...prev,
          [chart]: [...currentList, id]
        };
      }
    });
  };

  const fetchCharts = async (
    charts = selectedCharts,
    experiments = selectedExperiments
  ) => {
    if (charts.length === 0) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    setLoadingCharts((prev) => {
      const next = { ...prev };
      charts.forEach((c) => {
        next[c] = true;
      });
      return next;
    });

    const fetchPromises = charts.map(async (chart) => {
      const filtersPayload = {
        _id: (experiments[chart] || []).join(', ')
      };

      const payload = {
        charts: [chart],
        filters: filtersPayload,
      };

      console.log('Payload enviado para api/charts:', payload);

      try {
        if (!token) {
          throw new Error('Token não informado. Faça login novamente.');
        }
        const response = await fetch(
          'https://api-ic-mutt.onrender.com/api/charts',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar dados do gráfico ${chart}`);
        }

        const data = await response.json();
        console.log(`Resposta da API para o gráfico ${chart}:`, data);
        return { chart, data };
      } catch (error) {
        console.error(`Erro no gráfico ${chart}:`, error);
        return { chart, error };
      }
    });

    const results = await Promise.all(fetchPromises);

    setChartImages((prev) => {
      const next = { ...prev };
      results.forEach((res) => {
        if ('data' in res && res.data) {
          const imgData = res.data[res.chart];
          if (imgData) {
            next[res.chart] = imgData.startsWith('data:') ? imgData : `data:image/png;base64,${imgData}`;
          } else {
            next[res.chart] = null;
          }
        } else {
          next[res.chart] = null;
        }
      });
      return next;
    });

    setLoadingCharts((prev) => {
      const next = { ...prev };
      charts.forEach((c) => {
        next[c] = false;
      });
      return next;
    });
  };

  useEffect(() => {
    const loadAndFetch = async () => {
      const saved = localStorage.getItem('benchmark_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          await fetchCharts(
            parsed.selectedCharts || [],
            parsed.selectedExperiments || { chart1: [], chart2: [], chart3: [], chart4: [] }
          );
          setActiveTab('graficos');
        } catch (e) {
          console.error('Erro ao ler filtros do localStorage no Dashboard:', e);
        }
      }
      await fetchMyExperiments();
    };
    loadAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleApplyFilters = () => {
    const filters = {
      selectedCharts,
      selectedExperiments,
      dataset,
      device,
      model
    };
    localStorage.setItem('benchmark_filters', JSON.stringify(filters));
    fetchCharts(
      selectedCharts,
      selectedExperiments
    );
    setActiveTab('graficos');
  };

  return (
    <main className="dashboard-page">
      <Navbar userName="Ana" initials="AS" />

      <section className="dashboard-content">
        <div className="dashboard-header">
          <h2 className="dashboard-title">
            Dashboard
          </h2>

          <div className="d-flex gap-3 align-items-center flex-wrap">
            <button
              className="btn btn-primary d-flex align-items-center gap-2 px-3 fw-semibold text-white"
              style={{ height: '38px', borderRadius: '12px' }}
              onClick={generateKey}
              disabled={generating}
            >
              {generating ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Gerando...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Gerar Chave de Experimento
                </>
              )}
            </button>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`tab-button ${activeTab === 'filtros' ? 'active' : ''}`}
            onClick={() => setActiveTab('filtros')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filtros
          </button>
          <button
            className={`tab-button ${activeTab === 'graficos' ? 'active' : ''}`}
            onClick={() => setActiveTab('graficos')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Gráficos
          </button>
        </div>

        {activeTab === 'filtros' ? (
          <div>
            <div className="charts-grid">
              {Object.keys(chartTitles).map((chartKey) => {
                const isSelected = selectedCharts.includes(chartKey);
                const limit = chartLimits[chartKey];
                const currentSelectedCount = selectedExperiments[chartKey]?.length || 0;

                return (
                  <div key={chartKey} className={`chart-filter-card ${isSelected ? 'selected' : ''}`}>
                    <div className="card-header-custom">
                      <div>
                        <label className="chart-label" htmlFor={`chk-${chartKey}`}>
                          {chartTitles[chartKey]}
                        </label>
                        <div>
                          <span className="limit-badge">Limite: {limit}</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        id={`chk-${chartKey}`}
                        className="chart-card-checkbox"
                        checked={isSelected}
                        onChange={() => handleChartChange(chartKey)}
                      />
                    </div>

                    {isSelected && (
                      <div className="experiments-section">
                        <div className="experiments-title">
                          <span>Selecione os experimentos para comparar:</span>
                          <span className="experiments-count">{currentSelectedCount}/{limit}</span>
                        </div>
                        {loadingExperiments ? (
                          <div className="d-flex align-items-center gap-2 py-2">
                            <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></span>
                            <span className="text-muted small">Buscando experimentos...</span>
                          </div>
                        ) : myExperiments.length === 0 ? (
                          <div className="small text-muted py-2">
                            Nenhum experimento encontrado. Gere uma chave para começar.
                          </div>
                        ) : (
                          <div className="chips-container">
                            {myExperiments.map((exp) => {
                              const expId = String(exp._id || exp.key || exp.chave || exp.id || '');

                              let expDisplay = '';
                              if (typeof exp === 'object' && exp !== null) {
                                const identifier = exp.nome || exp._id || exp.key || exp.chave || exp.id;
                                const details = [exp.modelo || exp.model, exp.dataset, exp.device].filter(Boolean).join(' | ');
                                expDisplay = details ? `${identifier} (${details})` : String(identifier);
                              } else {
                                expDisplay = String(exp);
                              }

                              const isExpChecked = selectedExperiments[chartKey]?.includes(expId) || false;
                              const isLimitReached = !isExpChecked && currentSelectedCount >= limit;

                              return (
                                <button
                                  key={String(expId)}
                                  type="button"
                                  className={`exp-chip ${isExpChecked ? 'selected' : ''}`}
                                  disabled={isLimitReached}
                                  onClick={() => handleExperimentChange(chartKey, expId)}
                                  title={String(expDisplay)}
                                >
                                  {String(expDisplay)}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Detalhes dos experimentos selecionados */}
                        {selectedExperiments[chartKey] && selectedExperiments[chartKey].length > 0 && (
                          <div className="mt-3 p-3 bg-light rounded-3 border">
                            <span className="fw-semibold text-dark d-block mb-2 small text-uppercase tracking-wider" style={{ fontSize: '11px' }}>
                              Detalhes dos experimentos selecionados
                            </span>
                            <div className="d-flex flex-column gap-2">
                              {selectedExperiments[chartKey].map((id) => {
                                const expObj = myExperiments.find((e) => String(e._id || e.key || e.chave || e.id || '') === id);
                                if (!expObj) return null;
                                return (
                                  <div key={id} className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 bg-white rounded border small">
                                    <span className="fw-medium text-secondary">{expObj.nome || id}</span>
                                    <div className="d-flex gap-2">
                                      <span className="badge bg-light text-dark border">
                                        Dataset: {expObj.dataset || 'N/A'}
                                      </span>
                                      <span className="badge bg-light text-dark border">
                                        Serviço: {expObj.servico || expObj.device || 'N/A'}
                                      </span>
                                      <span className="badge bg-light text-dark border">
                                        Modelo: {expObj.modelo || expObj.model || 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="params-container">
              <div className="param-card">
                <h5 className="param-title">Dataset</h5>
                <div className="segmented-control">
                  {['deepweeds', 'cifar10', 'imagenet'].map((ds) => (
                    <button
                      key={ds}
                      type="button"
                      className={`segment-btn ${dataset === ds ? 'active' : ''}`}
                      onClick={() => setDataset(ds)}
                    >
                      {ds}
                    </button>
                  ))}
                </div>
              </div>

              <div className="param-card">
                <h5 className="param-title">Device</h5>
                <div className="segmented-control">
                  {['Slow-end', 'Mid-end', 'High-end'].map((dev) => (
                    <button
                      key={dev}
                      type="button"
                      className={`segment-btn ${device === dev ? 'active' : ''}`}
                      onClick={() => setDevice(dev)}
                    >
                      {dev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="param-card">
                <h5 className="param-title">Modelo</h5>
                <div className="segmented-control">
                  {availableModels.map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      className={`segment-btn ${model === mod ? 'active' : ''}`}
                      onClick={() => setModel(mod)}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="apply-section">
              <button className="btn-apply-filters" onClick={handleApplyFilters}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Aplicar Filtros e Ver Gráficos
              </button>
            </div>
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className={`dashboard-card d-flex flex-column align-items-center justify-content-center p-3 rounded-4 border bg-white shadow-sm ${!selectedCharts.includes('chart1') ? 'opacity-50' : ''}`} style={{ minHeight: '300px' }}>
              <h5 className="fw-bold text-dark mb-3" style={{ fontSize: '15px' }}>Comparativo de memória por dataset</h5>
              {!selectedCharts.includes('chart1') ? (
                <p className="text-muted small mb-0">Selecione este gráfico no filtro</p>
              ) : loadingCharts.chart1 ? (
                <div className="d-flex flex-column align-items-center">
                  <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2rem', height: '2rem' }}></div>
                  <span className="text-muted small">Buscando dados...</span>
                </div>
              ) : chartImages.chart1 ? (
                <img src={chartImages.chart1} className="img-fluid object-fit-contain rounded" alt="Comparativo de memória por dataset" style={{ maxHeight: '250px' }} />
              ) : (
                <p className="text-muted small mb-0">Clique em &quot;Aplicar Filtros&quot; para gerar o gráfico</p>
              )}
            </div>

            <div className={`dashboard-card wide d-flex flex-column align-items-center justify-content-center p-3 rounded-4 border bg-white shadow-sm ${!selectedCharts.includes('chart2') ? 'opacity-50' : ''}`} style={{ minHeight: '300px' }}>
              <h5 className="fw-bold text-dark mb-3" style={{ fontSize: '15px' }}>Memória por modelo e dataset</h5>
              {!selectedCharts.includes('chart2') ? (
                <p className="text-muted small mb-0">Selecione este gráfico no filtro</p>
              ) : loadingCharts.chart2 ? (
                <div className="d-flex flex-column align-items-center">
                  <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2rem', height: '2rem' }}></div>
                  <span className="text-muted small">Buscando dados...</span>
                </div>
              ) : chartImages.chart2 ? (
                <img src={chartImages.chart2} className="img-fluid object-fit-contain rounded" alt="Memória por modelo e dataset" style={{ maxHeight: '250px' }} />
              ) : (
                <p className="text-muted small mb-0">Clique em &quot;Aplicar Filtros&quot; para gerar o gráfico</p>
              )}
            </div>

            <div className={`dashboard-card d-flex flex-column align-items-center justify-content-center p-3 rounded-4 border bg-white shadow-sm ${!selectedCharts.includes('chart3') ? 'opacity-50' : ''}`} style={{ minHeight: '300px' }}>
              <h5 className="fw-bold text-dark mb-3" style={{ fontSize: '15px' }}>Tempo de inferência</h5>
              {!selectedCharts.includes('chart3') ? (
                <p className="text-muted small mb-0">Selecione este gráfico no filtro</p>
              ) : loadingCharts.chart3 ? (
                <div className="d-flex flex-column align-items-center">
                  <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2rem', height: '2rem' }}></div>
                  <span className="text-muted small">Buscando dados...</span>
                </div>
              ) : chartImages.chart3 ? (
                <img src={chartImages.chart3} className="img-fluid object-fit-contain rounded" alt="Tempo de inferência" style={{ maxHeight: '250px' }} />
              ) : (
                <p className="text-muted small mb-0">Clique em &quot;Aplicar Filtros&quot; para gerar o gráfico</p>
              )}
            </div>

            <div className={`dashboard-card wide d-flex flex-column align-items-center justify-content-center p-3 rounded-4 border bg-white shadow-sm ${!selectedCharts.includes('chart4') ? 'opacity-50' : ''}`} style={{ minHeight: '300px' }}>
              <h5 className="fw-bold text-dark mb-3" style={{ fontSize: '15px' }}>Inferência por segundo</h5>
              {!selectedCharts.includes('chart4') ? (
                <p className="text-muted small mb-0">Selecione este gráfico no filtro</p>
              ) : loadingCharts.chart4 ? (
                <div className="d-flex flex-column align-items-center">
                  <div className="spinner-border text-primary mb-2" role="status" style={{ width: '2rem', height: '2rem' }}></div>
                  <span className="text-muted small">Buscando dados...</span>
                </div>
              ) : chartImages.chart4 ? (
                <img src={chartImages.chart4} className="img-fluid object-fit-contain rounded" alt="Inferência por segundo" style={{ maxHeight: '250px' }} />
              ) : (
                <p className="text-muted small mb-0">Clique em &quot;Aplicar Filtros&quot; para gerar o gráfico</p>
              )}
            </div>
          </div>
        )}
      </section>

      {showKeyModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  Chave do Experimento
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowKeyModal(false)}
                ></button>
              </div>
              <div className="modal-body pt-3 pb-4 text-center">
                {keyError ? (
                  <div className="text-danger mb-3">
                    <p className="mb-0">{keyError}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted small mb-3">
                      Use esta chave para autenticar e enviar os resultados do seu experimento:
                    </p>
                    <div className="p-3 bg-light rounded-3 mb-3 font-monospace fw-bold fs-4 text-primary d-flex align-items-center justify-content-between border">
                      <span className="user-select-all">{generatedKey}</span>
                      <button
                        className="btn btn-sm btn-outline-secondary ms-2"
                        onClick={() => {
                          if (generatedKey) {
                            navigator.clipboard.writeText(generatedKey);
                            alert('Chave copiada para a área de transferência!');
                          }
                        }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary w-100 rounded-3 mt-2 text-white"
                  onClick={() => setShowKeyModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}