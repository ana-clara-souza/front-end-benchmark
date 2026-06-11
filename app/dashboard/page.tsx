'use client';

import { useState } from 'react';

import Navbar from '../../components/Navbar';

export default function DashboardPage() {
  const [openFilter, setOpenFilter] = useState(false);

  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [selectedExperiments, setSelectedExperiments] = useState<number[]>([]);

  const [dataset, setDataset] = useState('deepweeds');
  const [device, setDevice] = useState('Slow-end');

  const handleChartChange = (chart: string) => {
    setSelectedCharts((prev) =>
      prev.includes(chart)
        ? prev.filter((c) => c !== chart)
        : [...prev, chart]
    );
  };

  const handleExperimentChange = (id: number) => {
    setSelectedExperiments((prev) =>
      prev.includes(id)
        ? prev.filter((exp) => exp !== id)
        : [...prev, id]
    );
  };

  const fetchCharts = async () => {
    const payload = {
      charts: selectedCharts,
      filters: {
        _id: selectedExperiments,
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
                    Experimentos
                  </h5>

                  {[1, 2, 3, 4].map((id) => (
                    <div
                      className="form-check mb-2"
                      key={id}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`exp${id}`}
                        checked={selectedExperiments.includes(
                          id
                        )}
                        onChange={() =>
                          handleExperimentChange(id)
                        }
                      />

                      <label
                        className="form-check-label"
                        htmlFor={`exp${id}`}
                      >
                        {id}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold mb-3">
                    Gráficos
                  </h5>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="graf1"
                      checked={selectedCharts.includes(
                        'chart1'
                      )}
                      onChange={() =>
                        handleChartChange('chart1')
                      }
                    />

                    <label
                      className="form-check-label"
                      htmlFor="graf1"
                    >
                      Comparativo de memória por dataset
                    </label>
                  </div>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="graf2"
                      checked={selectedCharts.includes(
                        'chart2'
                      )}
                      onChange={() =>
                        handleChartChange('chart2')
                      }
                    />

                    <label
                      className="form-check-label"
                      htmlFor="graf2"
                    >
                      Memória por modelo e dataset
                    </label>
                  </div>

                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="graf3"
                      checked={selectedCharts.includes(
                        'chart3'
                      )}
                      onChange={() =>
                        handleChartChange('chart3')
                      }
                    />

                    <label
                      className="form-check-label"
                      htmlFor="graf3"
                    >
                      Tempo de inferência
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="graf4"
                      checked={selectedCharts.includes(
                        'chart4'
                      )}
                      onChange={() =>
                        handleChartChange('chart4')
                      }
                    />

                    <label
                      className="form-check-label"
                      htmlFor="graf4"
                    >
                      Inferência por segundo
                    </label>
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

        <div className="dashboard-grid">
          <div className="dashboard-card"></div>

          <div className="dashboard-card wide"></div>

          <div className="dashboard-card"></div>

          <div className="dashboard-card wide"></div>
        </div>
      </section>
    </main>
  );
}