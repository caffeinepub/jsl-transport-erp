import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";
import {
  useGetAllClients,
  useGetAllDieselEntries,
  useGetAllInvoices,
  useGetAllPayments,
  useGetAllPettyCash,
  useGetAllTrips,
  useGetAllTrucks,
} from "../hooks/useQueries";
import { formatCurrency, formatNumber, getMonthYear } from "../utils/format";

export default function ReportsPage() {
  const tripsQuery = useGetAllTrips();
  const invoicesQuery = useGetAllInvoices();
  const dieselQuery = useGetAllDieselEntries();
  const pettyCashQuery = useGetAllPettyCash();
  const paymentsQuery = useGetAllPayments();
  const clientsQuery = useGetAllClients();
  const trucksQuery = useGetAllTrucks();

  const isLoading =
    tripsQuery.isLoading ||
    invoicesQuery.isLoading ||
    dieselQuery.isLoading ||
    pettyCashQuery.isLoading ||
    paymentsQuery.isLoading;

  const trips = tripsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const diesel = dieselQuery.data ?? [];
  const pettyCash = pettyCashQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const map: Record<
      string,
      {
        trips: number;
        billing: number;
        diesel: number;
        pettyCash: number;
        outstanding: number;
      }
    > = {};

    // Generate last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthYear(d.toISOString());
      map[key] = {
        trips: 0,
        billing: 0,
        diesel: 0,
        pettyCash: 0,
        outstanding: 0,
      };
    }

    for (const trip of trips) {
      const key = getMonthYear(trip.loadingDate);
      if (map[key]) map[key].trips++;
    }

    // Distribute invoices across months (use index-based approximation)
    const invoicesPerMonth = Math.max(1, Math.ceil(invoices.length / 12));
    const keys = Object.keys(map);
    invoices.forEach((inv, idx) => {
      const monthKey =
        keys[Math.min(Math.floor(idx / invoicesPerMonth), keys.length - 1)];
      if (map[monthKey]) map[monthKey].billing += inv.totalInvoice;
    });

    for (const entry of diesel) {
      const key = getMonthYear(entry.date);
      if (map[key]) map[key].diesel += entry.total;
    }

    for (const entry of pettyCash) {
      const key = getMonthYear(entry.date);
      if (map[key]) map[key].pettyCash += entry.amount;
    }

    for (const payment of payments) {
      if (payment.paymentStatus !== "paid") {
        // Distribute by trip date
        const trip = trips.find((t) => t.id === payment.tripId);
        if (trip) {
          const key = getMonthYear(trip.loadingDate);
          if (map[key]) map[key].outstanding += payment.balance;
        }
      }
    }

    return Object.entries(map).map(([month, data]) => ({ month, ...data }));
  }, [trips, invoices, diesel, pettyCash, payments]);

  // Client-wise revenue
  const clientRevenue = useMemo(() => {
    const tripClientMap: Record<string, bigint> = {};
    for (const trip of trips) {
      tripClientMap[trip.id.toString()] = trip.clientId;
    }
    const map: Record<
      string,
      { trips: number; billing: number; outstanding: number }
    > = {};
    for (const inv of invoices) {
      const clientId = tripClientMap[inv.tripId.toString()];
      if (clientId !== undefined) {
        const client = clients.find((c) => c.id === clientId);
        const name = client?.clientName ?? `Client ${clientId}`;
        if (!map[name]) map[name] = { trips: 0, billing: 0, outstanding: 0 };
        map[name].billing += inv.totalInvoice;
        map[name].trips++;
      }
    }
    for (const payment of payments) {
      if (payment.paymentStatus !== "paid") {
        const trip = trips.find((t) => t.id === payment.tripId);
        if (trip) {
          const client = clients.find((c) => c.id === trip.clientId);
          const name = client?.clientName ?? `Client ${trip.clientId}`;
          if (map[name]) map[name].outstanding += payment.balance;
        }
      }
    }
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.billing - a.billing);
  }, [invoices, trips, clients, payments]);

  // Truck-wise expense
  const truckExpense = useMemo(() => {
    const map: Record<
      string,
      { dieselCost: number; pettyCashCost: number; totalTrips: number }
    > = {};
    for (const entry of diesel) {
      const key = entry.truckId.toString();
      if (!map[key])
        map[key] = { dieselCost: 0, pettyCashCost: 0, totalTrips: 0 };
      map[key].dieselCost += entry.total;
    }
    for (const entry of pettyCash) {
      const key = entry.truckId.toString();
      if (!map[key])
        map[key] = { dieselCost: 0, pettyCashCost: 0, totalTrips: 0 };
      map[key].pettyCashCost += entry.amount;
    }
    for (const trip of trips) {
      const key = trip.truckId.toString();
      if (!map[key])
        map[key] = { dieselCost: 0, pettyCashCost: 0, totalTrips: 0 };
      map[key].totalTrips++;
    }
    return Object.entries(map)
      .map(([truckId, data]) => ({
        truckNumber:
          trucks.find((t) => t.id.toString() === truckId)?.truckNumber ??
          truckId,
        ...data,
        totalExpense: data.dieselCost + data.pettyCashCost,
      }))
      .sort((a, b) => b.totalExpense - a.totalExpense);
  }, [diesel, pettyCash, trips, trucks]);

  return (
    <div className="p-6 space-y-5" data-ocid="reports.page">
      <div>
        <h2 className="text-lg font-bold font-display text-foreground">
          Reports
        </h2>
        <p className="text-sm text-muted-foreground">
          Business performance summaries
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Trips
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {formatNumber(trips.length)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Revenue
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {formatCurrency(invoices.reduce((s, i) => s + i.totalInvoice, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Expenses
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {formatCurrency(
                diesel.reduce((s, d) => s + d.total, 0) +
                  pettyCash.reduce((s, p) => s + p.amount, 0),
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Clients
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {clients.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="h-9 bg-muted/50">
          <TabsTrigger
            value="monthly"
            className="text-xs h-7"
            data-ocid="reports.monthly.tab"
          >
            Monthly Summary
          </TabsTrigger>
          <TabsTrigger
            value="clients"
            className="text-xs h-7"
            data-ocid="reports.clients.tab"
          >
            Client-wise Revenue
          </TabsTrigger>
          <TabsTrigger
            value="trucks"
            className="text-xs h-7"
            data-ocid="reports.trucks.tab"
          >
            Truck-wise Expenses
          </TabsTrigger>
        </TabsList>

        {/* Monthly Summary */}
        <TabsContent value="monthly">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Month
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Trips
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Total Billing
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Diesel
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Petty Cash
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Outstanding
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlySummary.map((row, index) => (
                      <TableRow
                        key={row.month}
                        className="table-row-hover"
                        data-ocid={`reports.monthly.item.${index + 1}`}
                      >
                        <TableCell className="text-xs font-medium">
                          {row.month}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.trips}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {formatCurrency(row.billing)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(row.diesel)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(row.pettyCash)}
                        </TableCell>
                        <TableCell
                          className="text-xs text-right font-medium"
                          style={{
                            color:
                              row.outstanding > 0
                                ? "oklch(0.45 0.2 27)"
                                : undefined,
                          }}
                        >
                          {formatCurrency(row.outstanding)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/30 font-semibold border-t-2 border-border">
                      <TableCell className="text-xs font-bold">TOTAL</TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {trips.length}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {formatCurrency(
                          invoices.reduce((s, i) => s + i.totalInvoice, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {formatCurrency(
                          diesel.reduce((s, d) => s + d.total, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {formatCurrency(
                          pettyCash.reduce((s, p) => s + p.amount, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {formatCurrency(
                          payments
                            .filter((p) => p.paymentStatus !== "paid")
                            .reduce((s, p) => s + p.balance, 0),
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Client-wise Revenue */}
        <TabsContent value="clients">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : clientRevenue.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16"
                data-ocid="reports.clients.empty_state"
              >
                <p className="text-sm text-muted-foreground">
                  No client data available
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Client Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Invoices
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Total Billing
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Outstanding
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRevenue.map((row, index) => (
                      <TableRow
                        key={row.name}
                        className="table-row-hover"
                        data-ocid={`reports.clients.item.${index + 1}`}
                      >
                        <TableCell className="text-xs font-medium">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.trips}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(row.billing)}
                        </TableCell>
                        <TableCell
                          className="text-xs text-right"
                          style={{
                            color:
                              row.outstanding > 0
                                ? "oklch(0.45 0.2 27)"
                                : undefined,
                          }}
                        >
                          {formatCurrency(row.outstanding)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Truck-wise Expense */}
        <TabsContent value="trucks">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : truckExpense.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16"
                data-ocid="reports.trucks.empty_state"
              >
                <p className="text-sm text-muted-foreground">
                  No truck expense data available
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Truck No
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Total Trips
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Diesel Cost
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Petty Cash
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Total Expense
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {truckExpense.map((row, index) => (
                      <TableRow
                        key={row.truckNumber}
                        className="table-row-hover"
                        data-ocid={`reports.trucks.item.${index + 1}`}
                      >
                        <TableCell className="text-xs font-medium">
                          {row.truckNumber}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.totalTrips}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(row.dieselCost)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(row.pettyCashCost)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(row.totalExpense)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
