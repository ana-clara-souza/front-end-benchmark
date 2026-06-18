'use client';

import { useState } from 'react';

import Navbar from '../../components/Navbar';

export default function DashboardPage() {
  const [openFilter, setOpenFilter] = useState(false);

  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [selectedExperiments, setSelectedExperiments] = useState<Record<string, number[]>>({
    chart1: [],
    chart2: [],
    chart3: [],
    chart4: []
  });

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const generateKey = async () => {
    setGenerating(true);
    setGeneratedKey(null);
    setKeyError(null);
    try {
      const response = await fetch('https://api-ic-mutt.onrender.com/api/experimentos/chaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Erro ao gerar chave de experimento.');
      }
      const data = await response.json();
      if (data && data.key) {
        setGeneratedKey(data.key);
        setShowKeyModal(true);
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

  const [dataset, setDataset] = useState('deepweeds');
  const [device, setDevice] = useState('Slow-end');

  const chartLimits: Record<string, number> = {
    chart1: 6,
    chart2: 3,
    chart3: 2,
    chart4: 2
  };

  const handleChartChange = (chart: string) => {
    setSelectedCharts((prev) => {
      const nextCharts = prev.includes(chart)
        ? prev.filter((c) => c !== chart)
        : [...prev, chart];

      // Limpar experimentos do gráfico se for desmarcado
      if (prev.includes(chart)) {
        setSelectedExperiments((prevExps) => ({
          ...prevExps,
          [chart]: []
        }));
      }

      return nextCharts;
    });
  };

  const handleExperimentChange = (chart: string, id: number) => {
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

  const fetchCharts = async () => {
    // Unir todos os experimentos selecionados de todos os gráficos selecionados
    const combinedExperimentsSet = new Set<number>();
    selectedCharts.forEach((chart) => {
      const exps = selectedExperiments[chart] || [];
      exps.forEach((id) => combinedExperimentsSet.add(id));
    });
    const combinedExperiments = Array.from(combinedExperimentsSet);

    const payload = {
      charts: selectedCharts,
      filters: {
        _id: combinedExperiments,
        dataset,
        device,
      },
    };

    try {
      console.log('Payload enviado:', payload);

      const response = await fetch(
        'https://api-ic-mutt.onrender.com/api/charts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      console.log('Resposta da API:', data);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <main className="dashboard-page">
      <Navbar userName="Ana" initials="AS" />

      <section className="dashboard-content">
        <div className="dashboard-header">
          <h2 className="dashboard-title">
            Gráficos
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

            <div className="filter-container">
              <button
                className="dashboard-filter-button"
                type="button"
                onClick={() =>
                  setOpenFilter(!openFilter)
                }
              >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M3 5H21L14 13V19L10 21V13L3 5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>

              Filtros
            </button>

            {openFilter && (
              <div className="filter-dropdown">
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">
                    Gráficos e Experimentos
                  </h5>

                  {/* CHART 1 */}
                  <div className="mb-3 border-bottom pb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="graf1"
                        checked={selectedCharts.includes('chart1')}
                        onChange={() => handleChartChange('chart1')}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="graf1">
                        Comparativo de memória por dataset
                        <span className="ms-2 badge bg-secondary font-monospace" style={{ fontSize: '10px' }}>
                          limite: 6
                        </span>
                      </label>
                    </div>
                    {selectedCharts.includes('chart1') && (
                      <div className="ms-4 mt-2 mb-1">
                        <div className="small text-muted mb-1" style={{ fontSize: '12px' }}>
                          Selecione até 6 experimentos:
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => {
                            const isChecked = selectedExperiments.chart1?.includes(id) || false;
                            const isDisabled = !isChecked && (selectedExperiments.chart1?.length || 0) >= 6;
                            return (
                              <div key={id} className="form-check form-check-inline m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`exp-chart1-${id}`}
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => handleExperimentChange('chart1', id)}
                                />
                                <label className="form-check-label small" htmlFor={`exp-chart1-${id}`}>
                                  {id}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CHART 2 */}
                  <div className="mb-3 border-bottom pb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="graf2"
                        checked={selectedCharts.includes('chart2')}
                        onChange={() => handleChartChange('chart2')}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="graf2">
                        Memória por modelo e dataset
                        <span className="ms-2 badge bg-secondary font-monospace" style={{ fontSize: '10px' }}>
                          limite: 3
                        </span>
                      </label>
                    </div>
                    {selectedCharts.includes('chart2') && (
                      <div className="ms-4 mt-2 mb-1">
                        <div className="small text-muted mb-1" style={{ fontSize: '12px' }}>
                          Selecione até 3 experimentos:
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => {
                            const isChecked = selectedExperiments.chart2?.includes(id) || false;
                            const isDisabled = !isChecked && (selectedExperiments.chart2?.length || 0) >= 3;
                            return (
                              <div key={id} className="form-check form-check-inline m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`exp-chart2-${id}`}
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => handleExperimentChange('chart2', id)}
                                />
                                <label className="form-check-label small" htmlFor={`exp-chart2-${id}`}>
                                  {id}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CHART 3 */}
                  <div className="mb-3 border-bottom pb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="graf3"
                        checked={selectedCharts.includes('chart3')}
                        onChange={() => handleChartChange('chart3')}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="graf3">
                        Tempo de inferência
                        <span className="ms-2 badge bg-secondary font-monospace" style={{ fontSize: '10px' }}>
                          limite: 2
                        </span>
                      </label>
                    </div>
                    {selectedCharts.includes('chart3') && (
                      <div className="ms-4 mt-2 mb-1">
                        <div className="small text-muted mb-1" style={{ fontSize: '12px' }}>
                          Selecione até 2 experimentos:
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => {
                            const isChecked = selectedExperiments.chart3?.includes(id) || false;
                            const isDisabled = !isChecked && (selectedExperiments.chart3?.length || 0) >= 2;
                            return (
                              <div key={id} className="form-check form-check-inline m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`exp-chart3-${id}`}
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => handleExperimentChange('chart3', id)}
                                />
                                <label className="form-check-label small" htmlFor={`exp-chart3-${id}`}>
                                  {id}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CHART 4 */}
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="graf4"
                        checked={selectedCharts.includes('chart4')}
                        onChange={() => handleChartChange('chart4')}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="graf4">
                        Inferência por segundo
                        <span className="ms-2 badge bg-secondary font-monospace" style={{ fontSize: '10px' }}>
                          limite: 2
                        </span>
                      </label>
                    </div>
                    {selectedCharts.includes('chart4') && (
                      <div className="ms-4 mt-2 mb-1">
                        <div className="small text-muted mb-1" style={{ fontSize: '12px' }}>
                          Selecione até 2 experimentos:
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => {
                            const isChecked = selectedExperiments.chart4?.includes(id) || false;
                            const isDisabled = !isChecked && (selectedExperiments.chart4?.length || 0) >= 2;
                            return (
                              <div key={id} className="form-check form-check-inline m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`exp-chart4-${id}`}
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => handleExperimentChange('chart4', id)}
                                />
                                <label className="form-check-label small" htmlFor={`exp-chart4-${id}`}>
                                  {id}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold mb-3">
                    Dataset
                  </h5>

                  <select
                    className="form-select"
                    value={dataset}
                    onChange={(e) =>
                      setDataset(e.target.value)
                    }
                  >
                    <option value="deepweeds">
                      deepweeds
                    </option>

                    <option value="cifar10">
                      cifar10
                    </option>

                    <option value="imagenet">
                      imagenet
                    </option>
                  </select>
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold mb-3">
                    Device
                  </h5>

                  <select
                    className="form-select"
                    value={device}
                    onChange={(e) =>
                      setDevice(e.target.value)
                    }
                  >
                    <option value="Slow-end">
                      Slow-end
                    </option>

                    <option value="Mid-end">
                      Mid-end
                    </option>

                    <option value="High-end">
                      High-end
                    </option>
                  </select>
                </div>

                <button
                  className="btn btn-primary w-100"
                  onClick={fetchCharts}
                >
                  Aplicar Filtros
                </button>
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card"></div>

          <div className="dashboard-card wide"></div>

          <div className="dashboard-card"></div>

          <div className="dashboard-card wide"></div>
        </div>
      </section>

      {/* Modal de Chave de Experimento */}
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