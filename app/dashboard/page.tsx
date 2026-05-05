import Navbar from "../../components/Navbar";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">
      <Navbar active="dashboard" userName="Ana" initials="AS" />

      <section className="dashboard-content">
        <div className="dashboard-header">
          <h2 className="dashboard-title">Gráficos</h2>

          <button className="dashboard-filter-button" type="button">
            <span className="dashboard-filter-icon">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 5H21L14 13V19L10 21V13L3 5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Filtros
          </button>
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