import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useGetAllBillingInvoices,
  useGetAllConsignees,
  useGetAllConsigners,
  useGetAllDeliveryOrders,
  useGetAllLoadingTrips,
  useGetAllPayables,
  useGetAllReceivables,
  useGetAllUnloadings,
  useGetAllVehicles,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

export default function ReportsPage() {
  const tripsQuery = useGetAllLoadingTrips();
  const unloadingsQuery = useGetAllUnloadings();
  const invoicesQuery = useGetAllBillingInvoices();
  const receivablesQuery = useGetAllReceivables();
  const payablesQuery = useGetAllPayables();
  const dosQuery = useGetAllDeliveryOrders();
  const vehiclesQuery = useGetAllVehicles();
  const consignersQuery = useGetAllConsigners();
  const consigneesQuery = useGetAllConsignees();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("all");

  const trips = tripsQuery.data ?? [];
  const unloadings = unloadingsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const receivables = receivablesQuery.data ?? [];
  const payables = payablesQuery.data ?? [];
  const dos = dosQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];
  const consignees = consigneesQuery.data ?? [];

  // Daily trips
  const filteredTrips = useMemo(
    () =>
      trips.filter((t) => {
        if (!t.loadingDate) return true;
        if (dateFrom && t.loadingDate < dateFrom) return false;
        if (dateTo && t.loadingDate > dateTo) return false;
        if (filterVehicle !== "all") {
          const v = vehicles.find(
            (veh) =>
              veh.id === t.vehicleId || Number(veh.id) === Number(t.vehicleId),
          );
          if (v?.vehicleNumber !== filterVehicle) return false;
        }
        return true;
      }),
    [trips, dateFrom, dateTo, filterVehicle, vehicles],
  );

  // Monthly revenue
  const monthlyRevenue = useMemo(() => {
    const map: Record<
      string,
      { month: string; billing: number; trips: number }
    > = {};
    for (const inv of invoices) {
      if (dateFrom && inv.invoiceDate < dateFrom) continue;
      if (dateTo && inv.invoiceDate > dateTo) continue;
      const d = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
      if (!map[key]) map[key] = { month: label, billing: 0, trips: 0 };
      map[key].billing += Number(inv.totalAmount);
      map[key].trips += 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [invoices, dateFrom, dateTo]);

  // Client billing
  const clientBilling = useMemo(() => {
    const map: Record<
      string,
      { client: string; invoices: number; billed: number; received: number }
    > = {};
    for (const inv of invoices) {
      if (dateFrom && inv.invoiceDate < dateFrom) continue;
      if (dateTo && inv.invoiceDate > dateTo) continue;
      const key = inv.clientName || "Unknown";
      if (!map[key])
        map[key] = { client: key, invoices: 0, billed: 0, received: 0 };
      map[key].invoices += 1;
      map[key].billed += Number(inv.totalAmount);
      if (inv.status === "Received")
        map[key].received += Number(inv.totalAmount);
    }
    return Object.values(map).sort((a, b) => b.billed - a.billed);
  }, [invoices, dateFrom, dateTo]);

  // Vehicle profit
  const vehicleProfit = useMemo(() => {
    const map: Record<
      string,
      { vehicle: string; trips: number; bookingAmt: number; netPayable: number }
    > = {};
    for (const ul of unloadings) {
      const trip = trips.find(
        (t) =>
          t.id === ul.loadingTripId ||
          Number(t.id) === Number(ul.loadingTripId),
      );
      if (!trip) continue;
      if (dateFrom && trip.loadingDate < dateFrom) continue;
      if (dateTo && trip.loadingDate > dateTo) continue;
      const v = vehicles.find(
        (veh) =>
          veh.id === trip.vehicleId ||
          Number(veh.id) === Number(trip.vehicleId),
      );
      const key = v?.vehicleNumber ?? trip.vehicleId.toString();
      if (!map[key])
        map[key] = { vehicle: key, trips: 0, bookingAmt: 0, netPayable: 0 };
      map[key].trips += 1;
      map[key].bookingAmt += Number(ul.vehicleCost);
      map[key].netPayable += Number(ul.netPayableToVehicle);
    }
    return Object.values(map).sort((a, b) => b.bookingAmt - a.bookingAmt);
  }, [unloadings, trips, vehicles, dateFrom, dateTo]);

  // DO dispatch
  const doDispatch = useMemo(() => {
    return dos.map((d) => {
      const dispatched = trips
        .filter((t) => t.doId === d.id || Number(t.doId) === Number(d.id))
        .reduce((s, t) => s + Number(t.loadingQty), 0);
      const consigner = consigners.find(
        (c) => c.id === d.consignerId || Number(c.id) === Number(d.consignerId),
      );
      return {
        doNumber: d.doNumber,
        consigner: consigner?.name ?? "—",
        doQty: Number(d.doQty),
        dispatched,
        remaining: Math.max(0, Number(d.doQty) - dispatched),
        status: d.status,
        expiry: d.expiryDate,
      };
    });
  }, [dos, trips, consigners]);

  const handleExport = () => {
    toast.info("Export feature coming soon");
  };

  return (
    <div className="p-6 space-y-5" data-ocid="reports.page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.72 0.18 60 / 0.12)" }}
          >
            <BarChart3
              className="h-4 w-4"
              style={{ color: "oklch(0.72 0.18 60)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Reports
            </h2>
            <p className="text-sm text-muted-foreground">
              Business analytics and summaries
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-2 text-xs"
          data-ocid="reports.export_button"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs"
                data-ocid="reports.date_from.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs"
                data-ocid="reports.date_to.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle</Label>
              <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                <SelectTrigger
                  className="text-xs"
                  data-ocid="reports.vehicle.select"
                >
                  <SelectValue placeholder="All vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Vehicles
                  </SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem
                      key={v.id.toString()}
                      value={v.vehicleNumber}
                      className="text-xs"
                    >
                      {v.vehicleNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trips">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger
            value="trips"
            className="text-xs"
            data-ocid="reports.trips.tab"
          >
            Daily Trips
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="text-xs"
            data-ocid="reports.monthly.tab"
          >
            Monthly Revenue
          </TabsTrigger>
          <TabsTrigger
            value="client"
            className="text-xs"
            data-ocid="reports.client.tab"
          >
            Client Billing
          </TabsTrigger>
          <TabsTrigger
            value="vehicle"
            className="text-xs"
            data-ocid="reports.vehicle.tab"
          >
            Vehicle Profit
          </TabsTrigger>
          <TabsTrigger
            value="do"
            className="text-xs"
            data-ocid="reports.do.tab"
          >
            DO Dispatch
          </TabsTrigger>
          <TabsTrigger
            value="receivable"
            className="text-xs"
            data-ocid="reports.receivable.tab"
          >
            Receivable
          </TabsTrigger>
          <TabsTrigger
            value="payable"
            className="text-xs"
            data-ocid="reports.payable.tab"
          >
            Payable
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">
                Daily Trip Report ({filteredTrips.length} trips)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Trip ID
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Vehicle
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Challan
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        DO
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Consigner
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Consignee
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Loading (MT)
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="text-center text-xs text-muted-foreground py-10"
                        >
                          No trips in selected range
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrips.map((t) => {
                        const v = vehicles.find(
                          (veh) =>
                            veh.id === t.vehicleId ||
                            Number(veh.id) === Number(t.vehicleId),
                        );
                        const csgr = consigners.find(
                          (c) =>
                            c.id === t.consignerId ||
                            Number(c.id) === Number(t.consignerId),
                        );
                        const csgne = consignees.find(
                          (c) =>
                            c.id === t.consigneeId ||
                            Number(c.id) === Number(t.consigneeId),
                        );
                        const d = dos.find(
                          (dd) =>
                            dd.id === t.doId ||
                            Number(dd.id) === Number(t.doId),
                        );
                        return (
                          <TableRow
                            key={t.id.toString()}
                            className="table-row-hover"
                          >
                            <TableCell className="text-xs font-mono font-semibold">
                              {t.tripId}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(t.loadingDate)}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {v?.vehicleNumber ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {t.challanNo}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {d?.doNumber ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs max-w-[90px] truncate">
                              {csgr?.name ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs max-w-[90px] truncate">
                              {csgne?.name ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              {Number(t.loadingQty).toFixed(3)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {t.status}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">
                      Month
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Invoices
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Total Billing
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRevenue.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No data for selected range
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthlyRevenue.map((m) => (
                      <TableRow key={m.month} className="table-row-hover">
                        <TableCell className="text-xs font-medium">
                          {m.month}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {m.trips}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(m.billing)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">
                Client-wise Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">
                      Client
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Invoices
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Total Billed
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Received
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Pending
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientBilling.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No data
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientBilling.map((c) => (
                      <TableRow key={c.client} className="table-row-hover">
                        <TableCell className="text-xs font-medium">
                          {c.client}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {c.invoices}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(c.billed)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-green-600">
                          {formatCurrency(c.received)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-amber-600">
                          {formatCurrency(c.billed - c.received)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicle" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">
                Vehicle-wise Profit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">
                      Vehicle
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Trips
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Booking Amt
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Net Payable
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleProfit.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No data
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicleProfit.map((v) => (
                      <TableRow key={v.vehicle} className="table-row-hover">
                        <TableCell className="text-xs font-mono font-semibold">
                          {v.vehicle}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {v.trips}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(v.bookingAmt)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-green-600">
                          {formatCurrency(v.netPayable)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="do" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">
                DO-wise Dispatch Report
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">
                      DO Number
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Consigner
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      DO Qty
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Dispatched
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Remaining
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Expiry
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doDispatch.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No delivery orders
                      </TableCell>
                    </TableRow>
                  ) : (
                    doDispatch.map((d) => (
                      <TableRow key={d.doNumber} className="table-row-hover">
                        <TableCell className="text-xs font-mono font-semibold">
                          {d.doNumber}
                        </TableCell>
                        <TableCell className="text-xs">{d.consigner}</TableCell>
                        <TableCell className="text-xs text-right">
                          {d.doQty.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {d.dispatched.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {d.remaining.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(d.expiry)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-medium ${d.status === "Active" ? "text-green-600" : d.status === "Expired" ? "text-red-600" : "text-muted-foreground"}`}
                          >
                            {d.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivable" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">
                Accounts Receivable Report
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Invoice No
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Client
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Invoice Amt
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Received
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Balance
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No receivable records
                      </TableCell>
                    </TableRow>
                  ) : (
                    receivables
                      .filter(
                        (r) =>
                          (!dateFrom || r.date >= dateFrom) &&
                          (!dateTo || r.date <= dateTo),
                      )
                      .map((r) => (
                        <TableRow
                          key={r.id.toString()}
                          className="table-row-hover"
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(r.date)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {r.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.clientName}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {formatCurrency(r.invoiceAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-green-600">
                            {formatCurrency(r.amountReceived)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-amber-600 font-semibold">
                            {formatCurrency(r.balance)}
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {r.status}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">
                Accounts Payable Report
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Vehicle
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Owner
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Trip Ref
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Total Payable
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Paid
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Balance
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No payable records
                      </TableCell>
                    </TableRow>
                  ) : (
                    payables
                      .filter(
                        (p) =>
                          (!dateFrom || p.date >= dateFrom) &&
                          (!dateTo || p.date <= dateTo),
                      )
                      .map((p) => (
                        <TableRow
                          key={p.id.toString()}
                          className="table-row-hover"
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(p.date)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {p.vehicleNumber}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.ownerName}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.tripReference}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {formatCurrency(p.totalPayable)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-green-600">
                            {formatCurrency(p.amountPaid)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-amber-600 font-semibold">
                            {formatCurrency(p.balance)}
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {p.status}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
