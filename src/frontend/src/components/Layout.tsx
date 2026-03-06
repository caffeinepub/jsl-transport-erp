import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  Fuel,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { LoadingTrip } from "../hooks/useQueries";
import type { UserProfile } from "../hooks/useQueries";
import BillingPage from "../pages/BillingPage";
import ConsigneesPage from "../pages/ConsigneesPage";
import ConsignersPage from "../pages/ConsignersPage";
import DashboardPage from "../pages/DashboardPage";
import DeliveryOrdersPage from "../pages/DeliveryOrdersPage";
import DieselPage from "../pages/DieselPage";
import LoadingTripsPage from "../pages/LoadingTripsPage";
import PaymentsPage from "../pages/PaymentsPage";
import PettyCashPage from "../pages/PettyCashPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import TDSPage from "../pages/TDSPage";
import TripsPage from "../pages/TripsPage";
import UnloadingPage from "../pages/UnloadingPage";
import VehiclesPage from "../pages/VehiclesPage";

type Page =
  | "dashboard"
  | "trips"
  | "billing"
  | "diesel"
  | "pettycash"
  | "payments"
  | "tds"
  | "reports"
  | "settings"
  | "consigners"
  | "consignees"
  | "delivery_orders"
  | "vehicles"
  | "loading_trips"
  | "unloading";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ocid: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    ocid: "sidebar.dashboard.link",
  },
  // ---- Master Data ----
  {
    id: "consigners",
    label: "Consigners (OCP)",
    icon: MapPin,
    ocid: "sidebar.consigners.link",
  },
  {
    id: "consignees",
    label: "Consignees",
    icon: Building2,
    ocid: "sidebar.consignees.link",
  },
  {
    id: "delivery_orders",
    label: "Delivery Orders",
    icon: FileCheck,
    ocid: "sidebar.delivery_orders.link",
  },
  {
    id: "vehicles",
    label: "Fleet / Vehicles",
    icon: Truck,
    ocid: "sidebar.vehicles.link",
  },
  // ---- Operations ----
  {
    id: "loading_trips",
    label: "Loading Trips",
    icon: Package,
    ocid: "sidebar.loading_trips.link",
  },
  {
    id: "unloading",
    label: "Unloading",
    icon: PackageCheck,
    ocid: "sidebar.unloading.link",
  },
  {
    id: "trips",
    label: "Trip Entry (Legacy)",
    icon: FileText,
    ocid: "sidebar.trips.link",
  },
  // ---- Finance ----
  {
    id: "billing",
    label: "Billing",
    icon: FileText,
    ocid: "sidebar.billing.link",
  },
  { id: "diesel", label: "Diesel", icon: Fuel, ocid: "sidebar.diesel.link" },
  {
    id: "pettycash",
    label: "Petty Cash",
    icon: Wallet,
    ocid: "sidebar.pettycash.link",
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    ocid: "sidebar.payments.link",
  },
  { id: "tds", label: "TDS", icon: Receipt, ocid: "sidebar.tds.link" },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    ocid: "sidebar.reports.link",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    ocid: "sidebar.settings.link",
  },
];

function renderNavItem(
  item: NavItem,
  currentPage: Page,
  onNavigate: (page: Page) => void,
) {
  const Icon = item.icon;
  const isActive = currentPage === item.id;
  return (
    <button
      type="button"
      key={item.id}
      onClick={() => onNavigate(item.id)}
      data-ocid={item.ocid}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        isActive ? "text-foreground" : "hover:text-foreground",
      )}
      style={{
        background: isActive ? "oklch(0.72 0.18 60 / 0.15)" : undefined,
        color: isActive ? "oklch(0.9 0.08 60)" : "oklch(0.6 0.02 240)",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "oklch(0.25 0.04 260)";
          e.currentTarget.style.color = "oklch(0.85 0.02 240)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "oklch(0.6 0.02 240)";
        }
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-xs">{item.label}</span>
      {isActive && (
        <ChevronRight
          className="ml-auto h-3.5 w-3.5"
          style={{ color: "oklch(0.72 0.18 60)" }}
        />
      )}
    </button>
  );
}

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: string) => void;
  userProfile: UserProfile;
}

interface PageContentProps {
  page: Page;
  onRecordUnloading: (trip: LoadingTrip) => void;
  prefillTrip: LoadingTrip | null;
  onPrefillConsumed: () => void;
}

function PageContent({
  page,
  onRecordUnloading,
  prefillTrip,
  onPrefillConsumed,
}: PageContentProps) {
  switch (page) {
    case "dashboard":
      return <DashboardPage />;
    case "trips":
      return <TripsPage />;
    case "billing":
      return <BillingPage />;
    case "diesel":
      return <DieselPage />;
    case "pettycash":
      return <PettyCashPage />;
    case "payments":
      return <PaymentsPage />;
    case "tds":
      return <TDSPage />;
    case "reports":
      return <ReportsPage />;
    case "settings":
      return <SettingsPage />;
    case "consigners":
      return <ConsignersPage />;
    case "consignees":
      return <ConsigneesPage />;
    case "delivery_orders":
      return <DeliveryOrdersPage />;
    case "vehicles":
      return <VehiclesPage />;
    case "loading_trips":
      return <LoadingTripsPage onRecordUnloading={onRecordUnloading} />;
    case "unloading":
      return (
        <UnloadingPage
          prefillTrip={prefillTrip}
          onPrefillConsumed={onPrefillConsumed}
        />
      );
  }
}

export default function Layout({
  currentPage,
  onNavigate,
  userProfile,
}: LayoutProps) {
  const { clear } = useInternetIdentity();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prefillTrip, setPrefillTrip] = useState<LoadingTrip | null>(null);

  const pageLabels: Record<Page, string> = {
    dashboard: "Dashboard",
    trips: "Trip Entry (Legacy)",
    billing: "Billing",
    diesel: "Diesel Management",
    pettycash: "Petty Cash",
    payments: "Balance Payments",
    tds: "TDS Management",
    reports: "Reports",
    settings: "Settings",
    consigners: "Consigners (OCP)",
    consignees: "Consignees",
    delivery_orders: "Delivery Orders",
    vehicles: "Fleet / Vehicles",
    loading_trips: "Loading Trips",
    unloading: "Unloading Records",
  };

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const handleUnloadTrip = (trip: LoadingTrip) => {
    setPrefillTrip(trip);
    onNavigate("unloading");
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col transition-transform duration-200 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ background: "oklch(0.18 0.04 260)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b"
          style={{ borderColor: "oklch(0.28 0.04 260)" }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ background: "oklch(0.72 0.18 60)" }}
          >
            <Truck
              className="h-4 w-4"
              style={{ color: "oklch(0.08 0.02 260)" }}
            />
          </div>
          <div>
            <p
              className="text-sm font-bold font-display leading-none"
              style={{ color: "oklch(0.95 0.01 240)" }}
            >
              JSL Transport
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: "oklch(0.5 0.02 240)" }}
            >
              ERP System
            </p>
          </div>
          <button
            type="button"
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ color: "oklch(0.5 0.02 240)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-3">
          {/* Section: Overview */}
          {renderNavItem(navItems[0], currentPage, handleNavigate)}

          {/* Section: Master Data */}
          <div className="mt-3 mb-1 px-3">
            <p
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: "oklch(0.38 0.03 260)" }}
            >
              Master Data
            </p>
          </div>
          {navItems
            .slice(1, 5)
            .map((item) => renderNavItem(item, currentPage, handleNavigate))}

          {/* Section: Operations */}
          <div className="mt-3 mb-1 px-3">
            <p
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: "oklch(0.38 0.03 260)" }}
            >
              Operations
            </p>
          </div>
          {navItems
            .slice(5, 8)
            .map((item) => renderNavItem(item, currentPage, handleNavigate))}

          {/* Section: Finance */}
          <div className="mt-3 mb-1 px-3">
            <p
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: "oklch(0.38 0.03 260)" }}
            >
              Finance
            </p>
          </div>
          {navItems
            .slice(8)
            .map((item) => renderNavItem(item, currentPage, handleNavigate))}
        </nav>

        {/* Bottom user info */}
        <div
          className="border-t px-4 py-4"
          style={{ borderColor: "oklch(0.28 0.04 260)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold font-display"
              style={{
                background: "oklch(0.72 0.18 60 / 0.2)",
                color: "oklch(0.8 0.12 60)",
              }}
            >
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-semibold"
                style={{ color: "oklch(0.85 0.01 240)" }}
              >
                {userProfile.name}
              </p>
              <p
                className="text-[10px]"
                style={{ color: "oklch(0.5 0.02 240)" }}
              >
                Administrator
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold font-display text-foreground">
                {pageLabels[currentPage]}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                JSL Transport ERP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="hidden sm:block text-sm font-medium text-foreground"
              data-ocid="topbar.user_name"
            >
              {userProfile.name}
            </span>
            <Badge variant="secondary" className="hidden sm:flex text-xs">
              Admin
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-ocid="topbar.logout_button"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <PageContent
            page={currentPage}
            onRecordUnloading={handleUnloadTrip}
            prefillTrip={prefillTrip}
            onPrefillConsumed={() => setPrefillTrip(null)}
          />
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card px-6 py-2.5">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
