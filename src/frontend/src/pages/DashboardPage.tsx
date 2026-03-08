import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Fuel,
  IndianRupee,
  Package,
  Receipt,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetAllLoadingTrips,
  useGetAllLocalDieselEntries,
  useGetAllPettyCashLedger,
  useGetAllReceivables,
  useGetAllTDSRecords,
  useGetAllUnloadings,
} from "../hooks/useQueries";
import { formatCurrency, formatNumber } from "../utils/format";

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
  loading?: boolean;
  onClick?: () => void;
}

function KPICard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
  loading,
  onClick,
}: KPICardProps) {
  return (
    <Card
      className={`border border-border transition-all duration-150 ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </p>
              <p className="mt-1.5 text-xl font-bold font-display text-foreground">
                {value}
              </p>
              {subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {subtitle}
                </p>
              )}
              {onClick && (
                <p className="mt-1 text-[10px] text-primary/70">
                  Click to view details →
                </p>
              )}
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: iconBg }}
            >
              <Icon className="h-5 w-5" style={{ color: iconColor }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type DashboardPage =
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
  | "pettycash_ledger";

interface DashboardPageProps {
  onNavigate?: (page: DashboardPage) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  // All data is from localStorage — no actor or staggering needed
  const loadingTripsQuery = useGetAllLoadingTrips();
  const unloadingsQuery = useGetAllUnloadings();
  const receivablesQuery = useGetAllReceivables();
  const dieselQuery = useGetAllLocalDieselEntries();
  const pettyCashQuery = useGetAllPettyCashLedger();
  const tdsQuery = useGetAllTDSRecords();

  const isLoading = loadingTripsQuery.isLoading || unloadingsQuery.isLoading;

  const loadingTrips = loadingTripsQuery.data ?? [];
  const unloadings = unloadingsQuery.data ?? [];
  const receivables = receivablesQuery.data ?? [];
  const diesel = dieselQuery.data ?? [];
  const pettyCash = pettyCashQuery.data ?? [];
  const tds = tdsQuery.data ?? [];

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const kpis = useMemo(() => {
    // Total Trips this month — from loading trips by loadingDate
    const monthTrips = loadingTrips.filter((t) =>
      t.loadingDate?.startsWith(currentMonthStr),
    );
    const totalTrips = monthTrips.length;

    // Total Quantity — sum of unloadingQty from all unloading records
    const totalQty = unloadings.reduce(
      (s, u) => s + (Number(u.unloadingQty) || 0),
      0,
    );

    // Total Billing — sum of clientBillAmount from unloading records
    const totalBilling = unloadings.reduce(
      (s, u) => s + (Number(u.clientBillAmount) || 0),
      0,
    );

    // Diesel expense — sum of total from LocalDieselEntry
    const totalDiesel = diesel.reduce((s, d) => s + (Number(d.total) || 0), 0);

    // Petty cash — sum of debit entries from PettyCashLedger
    const totalPettyCash = pettyCash
      .filter((p) => p.transactionType === "debit")
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    // Outstanding receivables (unpaid balance)
    const outstanding = receivables
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + (Number(r.balance) || 0), 0);

    // TDS total
    const totalTds = tds.reduce((s, t) => s + (Number(t.tdsAmount) || 0), 0);

    return {
      totalTrips,
      totalQty,
      totalBilling,
      totalDiesel,
      totalPettyCash,
      outstanding,
      totalTds,
    };
  }, [
    loadingTrips,
    unloadings,
    receivables,
    diesel,
    pettyCash,
    tds,
    currentMonthStr,
  ]);

  // Monthly revenue chart — use loadingDate from loading trips to bucket clientBillAmount
  const monthlyRevenueData = useMemo(() => {
    // Build a map of loadingTrip.id -> loadingDate
    const tripDateMap: Record<string, string> = {};
    for (const trip of loadingTrips) {
      tripDateMap[trip.id.toString()] = trip.loadingDate ?? "";
    }

    // Sum clientBillAmount by month using the trip's loading date
    const map: Record<string, number> = {};
    for (const u of unloadings) {
      const tripDate = tripDateMap[u.loadingTripId.toString()];
      if (!tripDate) continue;
      const d = new Date(tripDate);
      if (Number.isNaN(d.getTime())) continue;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[monthKey] = (map[monthKey] ?? 0) + (Number(u.clientBillAmount) || 0);
    }

    // Generate last 6 months
    const result: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      result.push({ month: label, revenue: map[monthKey] ?? 0 });
    }
    return result;
  }, [unloadings, loadingTrips]);

  // Expense pie chart data
  const expenseData = useMemo(() => {
    const dieselTotal = diesel.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const pettyTotal = pettyCash
      .filter((p) => p.transactionType === "debit")
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return [
      { name: "Diesel", value: dieselTotal, color: "#f59e0b" },
      { name: "Petty Cash", value: pettyTotal, color: "#6366f1" },
    ].filter((d) => d.value > 0);
  }, [diesel, pettyCash]);

  // Vehicle-wise billing chart (top 6 vehicles by total clientBillAmount)
  const vehicleBillingData = useMemo(() => {
    // Build loadingTrip id -> vehicleId map
    const tripVehicleMap: Record<string, bigint> = {};
    for (const trip of loadingTrips) {
      tripVehicleMap[trip.id.toString()] = trip.vehicleId;
    }
    const vehicleMap: Record<string, number> = {};
    for (const u of unloadings) {
      const vehicleId = tripVehicleMap[u.loadingTripId.toString()];
      if (vehicleId !== undefined) {
        const key = vehicleId.toString();
        vehicleMap[key] =
          (vehicleMap[key] ?? 0) + (Number(u.clientBillAmount) || 0);
      }
    }
    return Object.entries(vehicleMap)
      .map(([vehicleId, revenue]) => ({
        name: `V-${vehicleId}`,
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [unloadings, loadingTrips]);

  return (
    <div className="p-6 space-y-6" data-ocid="dashboard.page">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold font-display text-foreground">
          Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Current month performance at a glance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <KPICard
          title="Total Trips (This Month)"
          value={formatNumber(kpis.totalTrips)}
          icon={Truck}
          iconColor="oklch(0.72 0.18 60)"
          iconBg="oklch(0.72 0.18 60 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("loading_trips") : undefined}
        />
        <KPICard
          title="Total Quantity"
          value={`${formatNumber(kpis.totalQty)} MT`}
          icon={Package}
          iconColor="oklch(0.55 0.18 240)"
          iconBg="oklch(0.55 0.18 240 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("unloading") : undefined}
        />
        <KPICard
          title="Total Billing"
          value={formatCurrency(kpis.totalBilling)}
          icon={IndianRupee}
          iconColor="oklch(0.65 0.16 150)"
          iconBg="oklch(0.65 0.16 150 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("billing") : undefined}
        />
        <KPICard
          title="Diesel Expense"
          value={formatCurrency(kpis.totalDiesel)}
          icon={Fuel}
          iconColor="oklch(0.65 0.2 300)"
          iconBg="oklch(0.65 0.2 300 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("diesel") : undefined}
        />
        <KPICard
          title="Petty Cash"
          value={formatCurrency(kpis.totalPettyCash)}
          icon={Wallet}
          iconColor="oklch(0.7 0.2 30)"
          iconBg="oklch(0.7 0.2 30 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("pettycash") : undefined}
        />
        <KPICard
          title="Outstanding Receivable"
          value={formatCurrency(kpis.outstanding)}
          icon={AlertCircle}
          iconColor="oklch(0.577 0.245 27.325)"
          iconBg="oklch(0.577 0.245 27.325 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("receivable") : undefined}
        />
        <KPICard
          title="TDS Total"
          value={formatCurrency(kpis.totalTds)}
          icon={Receipt}
          iconColor="oklch(0.55 0.18 240)"
          iconBg="oklch(0.55 0.18 240 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("tds") : undefined}
        />
        <KPICard
          title="Net Revenue"
          value={formatCurrency(
            kpis.totalBilling - kpis.totalDiesel - kpis.totalPettyCash,
          )}
          icon={TrendingUp}
          iconColor="oklch(0.65 0.16 150)"
          iconBg="oklch(0.65 0.16 150 / 0.1)"
          subtitle="After diesel & petty cash"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("reports") : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Revenue Bar Chart */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-display">
              Monthly Billing (Client Bill Amount)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={monthlyRevenueData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.01 240)"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Client Bill",
                    ]}
                    contentStyle={{
                      background: "white",
                      border: "1px solid oklch(0.88 0.01 240)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="oklch(0.72 0.18 60)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense Pie Chart */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-display">
              Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : expenseData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No expense data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "white",
                      border: "1px solid oklch(0.88 0.01 240)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "oklch(0.4 0.02 240)",
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle-wise Billing Chart */}
      {vehicleBillingData.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-display">
              Vehicle-wise Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={vehicleBillingData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.01 240)"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Client Bill",
                    ]}
                    contentStyle={{
                      background: "white",
                      border: "1px solid oklch(0.88 0.01 240)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="oklch(0.55 0.18 240)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
