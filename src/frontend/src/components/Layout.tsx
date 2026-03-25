import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Banknote,
  BarChart3,
  BookOpen,
  Building2,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import type { LoadingTrip, UserProfile } from "../hooks/useQueries";
import BillingPage from "../pages/BillingPage";
import CashBankPage from "../pages/CashBankPage";
import ConsigneesPage from "../pages/ConsigneesPage";
import ConsignersPage from "../pages/ConsignersPage";
import DashboardPage from "../pages/DashboardPage";
import DeliveryOrdersPage from "../pages/DeliveryOrdersPage";
import DieselPage from "../pages/DieselPage";
import LoadingTripsPage from "../pages/LoadingTripsPage";
import PayablePage from "../pages/PayablePage";
import PetrolBunksPage from "../pages/PetrolBunksPage";
import PettyCashLedgerPage from "../pages/PettyCashLedgerPage";
import ReceivablePage from "../pages/ReceivablePage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import TDSPage from "../pages/TDSPage";
import UnloadingPage from "../pages/UnloadingPage";
import VehiclesPage from "../pages/VehiclesPage";

type Page =
  | "dashboard"
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
  | "unloading"
  | "receivable"
  | "payable"
  | "pettycash_ledger"
  | "petrol_bunks"
  | "cash_bank";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ocid: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        ocid: "sidebar.dashboard.link",
      },
    ],
  },
  {
    label: "Masters",
    items: [
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
        id: "vehicles",
        label: "Fleet / Vehicles",
        icon: Truck,
        ocid: "sidebar.vehicles.link",
      },
      {
        id: "petrol_bunks",
        label: "Petrol Bunks",
        icon: Fuel,
        ocid: "sidebar.petrol_bunks.link",
      },
    ],
  },
  {
    label: "DO Management",
    items: [
      {
        id: "delivery_orders",
        label: "Delivery Orders",
        icon: FileCheck,
        ocid: "sidebar.delivery_orders.link",
      },
    ],
  },
  {
    label: "Operations",
    items: [
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
    ],
  },
  {
    label: "Finance",
    items: [
      {
        id: "billing",
        label: "Billing",
        icon: FileText,
        ocid: "sidebar.billing.link",
      },
      {
        id: "receivable",
        label: "Receivable",
        icon: TrendingUp,
        ocid: "sidebar.receivable.link",
      },
      {
        id: "payable",
        label: "Payable",
        icon: TrendingDown,
        ocid: "sidebar.payable.link",
      },
      {
        id: "diesel",
        label: "Diesel",
        icon: Gauge,
        ocid: "sidebar.diesel.link",
      },
      {
        id: "pettycash_ledger",
        label: "Petty Cash",
        icon: Wallet,
        ocid: "sidebar.pettycash_ledger.link",
      },
      {
        id: "cash_bank",
        label: "Cash & Bank",
        icon: Banknote,
        ocid: "sidebar.cash_bank.link",
      },
      { id: "tds", label: "TDS", icon: Receipt, ocid: "sidebar.tds.link" },
    ],
  },
  {
    label: "Reports & Settings",
    items: [
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
    ],
  },
];

const pageLabels: Record<Page, string> = {
  dashboard: "Dashboard",
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
  receivable: "Accounts Receivable",
  payable: "Accounts Payable",
  pettycash_ledger: "Petty Cash Ledger",
  petrol_bunks: "Petrol Bunks",
  cash_bank: "Cash & Bank Records",
};

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
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all duration-150",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-white/60 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{item.label}</span>
      {isActive && <ChevronRight className="ml-auto h-3 w-3 text-primary" />}
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
  onNavigate: (page: Page) => void;
}

function PageContent({
  page,
  onRecordUnloading,
  prefillTrip,
  onPrefillConsumed,
  onNavigate,
}: PageContentProps) {
  switch (page) {
    case "dashboard":
      return <DashboardPage onNavigate={onNavigate} />;
    case "billing":
      return <BillingPage />;
    case "diesel":
      return <DieselPage />;
    case "pettycash":
      return <PettyCashLedgerPage />;
    case "payments":
      return <ReceivablePage />;
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
    case "receivable":
      return <ReceivablePage />;
    case "payable":
      return <PayablePage />;
    case "pettycash_ledger":
      return <PettyCashLedgerPage />;
    case "petrol_bunks":
      return <PetrolBunksPage />;
    case "cash_bank":
      return <CashBankPage />;
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

  const userRole = localStorage.getItem("jt_user_role") ?? "Administrator";

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
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
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
          "fixed inset-y-0 left-0 z-30 flex w-60 flex-col transition-transform duration-200 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ background: "oklch(0.18 0.06 350)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-3 py-3 border-b"
          style={{ borderColor: "oklch(0.28 0.07 350)" }}
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg overflow-hidden"
            style={{ background: "#ffffff" }}
          >
            <img
              src="/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png"
              alt="JTPL Logo"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-bold font-display leading-tight"
              style={{ color: "oklch(0.95 0.01 240)" }}
            >
              Jeen Trade &amp; Exports
            </p>
            <p
              className="text-[9px] font-medium mt-0.5"
              style={{ color: "oklch(0.72 0.18 60)" }}
            >
              Transport ERP
            </p>
          </div>
          <button
            type="button"
            className="ml-auto lg:hidden p-1 shrink-0"
            onClick={() => setSidebarOpen(false)}
            style={{ color: "oklch(0.7 0.04 350)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-2 px-2">
          {navSections.map((section) => (
            <div key={section.label} className="mb-1">
              <div className="px-2.5 pt-3 pb-1">
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "oklch(0.65 0.08 350)" }}
                >
                  {section.label}
                </p>
              </div>
              {section.items.map((item) =>
                renderNavItem(item, currentPage, handleNavigate),
              )}
            </div>
          ))}
        </nav>

        {/* Bottom user info */}
        <div
          className="border-t px-3 py-3"
          style={{ borderColor: "oklch(0.28 0.07 350)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: "oklch(0.72 0.18 60 / 0.2)",
                color: "oklch(0.8 0.14 60)",
              }}
            >
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-semibold"
                style={{ color: "oklch(0.95 0.01 240)" }}
              >
                {userProfile.name}
              </p>
              <p
                className="text-[10px] truncate"
                style={{ color: "oklch(0.65 0.04 350)" }}
              >
                {userRole}
              </p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="shrink-0 p-1 rounded"
              style={{ color: "oklch(0.65 0.04 350)" }}
              title="Logout"
              data-ocid="sidebar.logout_button"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-13 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Logo visible in top bar on mobile only (sidebar is hidden on mobile) */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md overflow-hidden bg-white">
                <img
                  src="/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png"
                  alt="JTPL Logo"
                  className="h-7 w-7 object-contain"
                />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-semibold font-display text-foreground">
                {pageLabels[currentPage]}
              </h1>
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                Jeen Trade &amp; Exports Pvt Ltd
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="hidden sm:block text-xs font-medium text-foreground"
              data-ocid="topbar.user_name"
            >
              {userProfile.name}
            </span>
            <Badge
              variant="secondary"
              className="hidden sm:flex text-[10px] h-5 px-1.5"
            >
              {userRole}
            </Badge>
            <CreditCard className="hidden" />
            <BookOpen className="hidden" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
              data-ocid="topbar.logout_button"
            >
              <LogOut className="h-3.5 w-3.5" />
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
            onNavigate={handleNavigate}
          />
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card px-6 py-2">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Jeen Trade &amp; Exports Pvt Ltd. Built
            with ❤️ using{" "}
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
