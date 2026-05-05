import Link from "next/link";

type NavbarProps = {
  active?: "experimentos" | "dashboard";
  userName?: string;
  initials?: string;
};

export default function Navbar({
  active = "dashboard",
  userName = "Ana",
  initials = "AS",
}: NavbarProps) {
  return (
    <header className="app-navbar">
      <div className="app-navbar-left">
        <h1 className="app-logo">Benchmark Web</h1>
      </div>

      <nav className="app-navbar-center">
        <Link
          href="/experimentos"
          className={`app-nav-link ${
            active === "experimentos" ? "active" : ""
          }`}
        >
          Experimentos
        </Link>

        <Link
          href="/dashboard"
          className={`app-nav-link ${active === "dashboard" ? "active" : ""}`}
        >
          Dashboard
        </Link>
      </nav>

      <div className="app-navbar-right">
        <span className="app-user-name">{userName}</span>
        <div className="app-user-avatar">{initials}</div>
      </div>
    </header>
  );
}