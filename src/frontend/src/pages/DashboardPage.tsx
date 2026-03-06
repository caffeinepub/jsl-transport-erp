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
import { useEffect, useMemo, useState } from "react";
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
import { useActor } from "../hooks/useActor";
import {
  useGetAllClients,
  useGetAllDieselEntries,
  useGetAllInvoices,
  useGetAllPayments,
  useGetAllPettyCash,
  useGetAllTDSEntries,
  useGetAllTrips,
} from "../hooks/useQueries";
import { formatCurrency, formatNumber, getMonthYear } from "../utils/format";

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
  | "unloading";

interface DashboardPageProps {
  onNavigate?: (page: DashboardPage) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { actor, isFetching } = useActor();
  // Stagger wave 2 queries by 600ms to reduce simultaneous IC calls on login
  const [wave2Ready, setWave2Ready] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWave2Ready(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Wave 1 (immediate): most important KPIs
  const tripsQuery = useGetAllTrips();
  const invoicesQuery = useGetAllInvoices();

  // Wave 2 (after 600ms): secondary data
  const dieselQuery = useGetAllDieselEntries({
    enabled: wave2Ready && !!actor && !isFetching,
  });
  const pettyCashQuery = useGetAllPettyCash({
    enabled: wave2Ready && !!actor && !isFetching,
  });
  const paymentsQuery = useGetAllPayments({
    enabled: wave2Ready && !!actor && !isFetching,
  });
  const tdsQuery = useGetAllTDSEntries({
    enabled: wave2Ready && !!actor && !isFetching,
  });
  const clientsQuery = useGetAllClients({
    enabled: wave2Ready && !!actor && !isFetching,
  });

  const isLoading =
    tripsQuery.isLoading ||
    invoicesQuery.isLoading ||
    dieselQuery.isLoading ||
    pettyCashQuery.isLoading ||
    paymentsQuery.isLoading ||
    tdsQuery.isLoading;

  const trips = tripsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const diesel = dieselQuery.data ?? [];
  const pettyCash = pettyCashQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const tds = tdsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const kpis = useMemo(() => {
    const monthTrips = trips.filter((t) =>
      t.loadingDate?.startsWith(currentMonthStr),
    );
    const totalTrips = monthTrips.length;
    const totalQty = monthTrips.reduce((s, t) => s + t.loadingQty, 0);
    const totalBilling = invoices.reduce((s, i) => s + i.totalInvoice, 0);
    const totalDiesel = diesel.reduce((s, d) => s + d.total, 0);
    const totalPettyCash = pettyCash.reduce((s, p) => s + p.amount, 0);
    const outstanding = payments
      .filter((p) => p.paymentStatus !== "paid")
      .reduce((s, p) => s + p.balance, 0);
    const totalTds = tds.reduce((s, t) => s + t.tdsAmount, 0);
    return {
      totalTrips,
      totalQty,
      totalBilling,
      totalDiesel,
      totalPettyCash,
      outstanding,
      totalTds,
    };
  }, [trips, invoices, diesel, pettyCash, payments, tds, currentMonthStr]);

  // Monthly revenue chart data
  const monthlyRevenueData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of invoices) {
      // Use trip to get date - we'll approximate with invoice id order
      const month = getMonthYear(
        new Date(Date.now() - Number(inv.id) * 86400000).toISOString(),
      );
      map[month] = (map[month] ?? 0) + inv.totalInvoice;
    }
    // Generate last 6 months
    const result: { month: string; revenue: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      const monthKey = getMonthYear(d.toISOString());
      result.push({ month: label, revenue: map[monthKey] ?? 0 });
    }
    // Distribute invoices across months for better visualization
    if (invoices.length > 0 && result.every((r) => r.revenue === 0)) {
      const perMonth = Math.floor(invoices.length / 6);
      let idx = 0;
      for (let i = 0; i < result.length; i++) {
        const count =
          i === result.length - 1 ? invoices.length - idx : perMonth;
        result[i].revenue = invoices
          .slice(idx, idx + count)
          .reduce((s, inv) => s + inv.totalInvoice, 0);
        idx += count;
      }
    }
    return result;
  }, [invoices]);

  // Expense pie chart data
  const expenseData = useMemo(() => {
    const dieselTotal = diesel.reduce((s, d) => s + d.total, 0);
    const pettyTotal = pettyCash.reduce((s, p) => s + p.amount, 0);
    return [
      { name: "Diesel", value: dieselTotal, color: "#f59e0b" },
      { name: "Petty Cash", value: pettyTotal, color: "#6366f1" },
    ].filter((d) => d.value > 0);
  }, [diesel, pettyCash]);

  // Client revenue chart data
  const clientRevenueData = useMemo(() => {
    const tripClientMap: Record<string, bigint> = {};
    for (const trip of trips) {
      tripClientMap[trip.id.toString()] = trip.clientId;
    }
    const clientMap: Record<string, number> = {};
    for (const inv of invoices) {
      const clientId = tripClientMap[inv.tripId.toString()];
      if (clientId !== undefined) {
        const client = clients.find((c) => c.id === clientId);
        const name = client?.clientName ?? `Client ${clientId}`;
        clientMap[name] = (clientMap[name] ?? 0) + inv.totalInvoice;
      }
    }
    return Object.entries(clientMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [invoices, trips, clients]);

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
          title="Outstanding Payment"
          value={formatCurrency(kpis.outstanding)}
          icon={AlertCircle}
          iconColor="oklch(0.577 0.245 27.325)"
          iconBg="oklch(0.577 0.245 27.325 / 0.1)"
          loading={isLoading}
          onClick={onNavigate ? () => onNavigate("payments") : undefined}
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
          title="Total Revenue"
          value={formatCurrency(
            kpis.totalBilling - kpis.totalDiesel - kpis.totalPettyCash,
          )}
          icon={TrendingUp}
          iconColor="oklch(0.65 0.16 150)"
          iconBg="oklch(0.65 0.16 150 / 0.1)"
          subtitle="After expenses"
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
              Monthly Revenue
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
                      "Revenue",
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

      {/* Client Revenue Chart */}
      {clientRevenueData.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-display">
              Client-wise Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={clientRevenueData}
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
                      "Revenue",
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
