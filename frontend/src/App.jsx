import Logistics from "./pages/Logistics";
import "./App.css";
import Procurement from "./pages/Procurement";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Inventory from "./pages/Inventory";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SalesOrders from "./pages/SalesOrders";
import Finance from "./pages/Finance";
import Documents from "./pages/Documents";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Truck,
  FileText,
  Brain,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Construction,
} from "lucide-react";


/* =========================================================
   TEMPORARY MODULE PAGE
   ========================================================= */

function ModulePlaceholder({ title, description }) {
  return (
    <section className="module-page">

      <div className="module-header">

        <div>
          <div className="module-eyebrow">
            NEXUS / WORKSPACE
          </div>

          <h1>{title}</h1>

          <p>{description}</p>
        </div>

      </div>

      <div className="data-card">

        <div className="empty-state">

          <Construction size={42} />

          <h3>{title} Workspace</h3>

          <p>
            This module is being connected to the NEXUS
            backend services.
          </p>

        </div>

      </div>

    </section>
  );
}


/* =========================================================
   APPLICATION SHELL
   ========================================================= */

function Application() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();


  /* ---------------------------------------------------------
     USER INFORMATION
     --------------------------------------------------------- */

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email ||
    "NEXUS User";

  const displayRole =
    user?.role ||
    user?.roles?.[0] ||
    "USER";

  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


  /* ---------------------------------------------------------
     SIDEBAR NAVIGATION
     --------------------------------------------------------- */

  const navigation = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
    },
    {
      label: "Sales Orders",
      icon: ShoppingCart,
      path: "/sales-orders",
    },
    {
      label: "Inventory",
      icon: Package,
      path: "/inventory",
    },
    {
      label: "Logistics",
      icon: Truck,
      path: "/logistics",
    },
    {
      label: "Finance",
      icon: FileText,
      path: "/finance",
    },
    {
      label: "AI Intelligence",
      icon: Brain,
      path: "/ai",
    },
    {
      label: "Settings",
      icon: Settings,
      path: "/settings",
    },
  ];


  /* ---------------------------------------------------------
     LOGOUT
     --------------------------------------------------------- */

  const handleLogout = () => {
    logout();

    navigate("/login", {
      replace: true,
    });
  };


  /* ---------------------------------------------------------
     ACTIVE NAVIGATION
     --------------------------------------------------------- */

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };


  /* ---------------------------------------------------------
     PAGE RENDERER
     --------------------------------------------------------- */

  const renderPage = () => {

    /* Dashboard */
    if (location.pathname === "/") {
      return <Dashboard />;
    }


    /* Sales Orders */
    if (
      location.pathname === "/sales-orders" ||
      location.pathname.startsWith("/sales-orders/")
    ) {
      return <SalesOrders />;
    }


    /* Inventory */
      if (
      location.pathname === "/inventory" ||
      location.pathname.startsWith("/inventory/")
    ) {
      return <Inventory />;
      }if (
    location.pathname === "/procurement" ||
    location.pathname.startsWith("/procurement/")
    ) {
    return <Procurement />;
    }


    /* Logistics */
    if (
      location.pathname === "/logistics" ||
      location.pathname.startsWith("/logistics/")
    ) {
      return (
        <ModulePlaceholder
          title="Logistics"
          description="Manage shipments, containers, ports, and logistics intelligence."
        />
      );
    }


    /* Finance */
    if (
      location.pathname === "/finance" ||
      location.pathname.startsWith("/finance/")
    ) {
      return (
        <ModulePlaceholder
          title="Finance"
          description="Manage invoices, payments, receipts, and financial risk."
        />
      );
    }


    /* AI */
    if (
      location.pathname === "/ai" ||
      location.pathname.startsWith("/ai/")
    ) {
      return (
        <ModulePlaceholder
          title="AI Intelligence"
          description="Access NEXUS forecasting, anomaly detection, decision intelligence, RAG, and knowledge graph capabilities."
        />
      );
    }


    /* Settings */
    if (
      location.pathname === "/settings" ||
      location.pathname.startsWith("/settings/")
    ) {
      return (
        <ModulePlaceholder
          title="Settings"
          description="Manage NEXUS workspace configuration and account settings."
        />
      );
    }


    /* Unknown protected route */
    return <Navigate to="/" replace />;
  };


  return (
    <div className="app-shell">


      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="sidebar">


        {/* Brand */}

        <div className="sidebar-brand">

          <div className="brand-logo">
            N
          </div>

          <div className="brand-text">

            <h1>
              NEXUS
            </h1>

            <span>
              Enterprise Intelligence
            </span>

          </div>

        </div>


        {/* Navigation */}

        <nav className="sidebar-nav">

          <div className="nav-section-title">
            WORKSPACE
          </div>


          {navigation.map((item) => {

            const Icon = item.icon;

            return (
              <button
                key={item.path}
                type="button"
                className={`nav-item ${
                  isActive(item.path)
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  navigate(item.path)
                }
              >

                <Icon size={18} />

                <span>
                  {item.label}
                </span>

              </button>
            );

          })}

        </nav>


        {/* Sidebar Footer */}

        <div className="sidebar-footer">


          <div className="sidebar-status">

            <span className="status-dot" />

            <span>
              System Operational
            </span>

          </div>


          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >

            <LogOut size={17} />

            <span>
              Sign Out
            </span>

          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="main-content">


        {/* ===================================================
            TOPBAR
            =================================================== */}

        <header className="topbar">


          <div className="topbar-left">

            <div className="search-box">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search NEXUS..."
              />

              <span className="search-shortcut">
                /
              </span>

            </div>

          </div>


          <div className="topbar-right">


            {/* Notifications */}

            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
            >

              <Bell size={19} />

              <span className="notification-dot" />

            </button>


            {/* User */}

            <div className="user-menu">

              <div className="user-avatar">
                {initials}
              </div>

              <div className="user-info">

                <strong>
                  {displayName}
                </strong>

                <span>
                  {displayRole}
                </span>

              </div>

              <ChevronDown size={16} />

            </div>

          </div>

        </header>


        {/* ===================================================
            ACTIVE PAGE
            =================================================== */}

        {renderPage()}

      </main>

    </div>
  );
}


/* =========================================================
   APPLICATION ROUTER
   ========================================================= */

export default function App() {

  return (
    <Routes>


      {/* =====================================================
          PUBLIC ROUTES
          ===================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />


      {/* =====================================================
          PROTECTED APPLICATION
          ===================================================== */}

      <Route element={<ProtectedRoute />}>

        <Route
          path="/*"
          element={<Application />}
        />

      </Route>


      {/* =====================================================
          GLOBAL FALLBACK
          ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}