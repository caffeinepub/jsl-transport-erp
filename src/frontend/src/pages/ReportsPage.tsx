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
  useGetAllLocalDieselEntries,
  useGetAllPayables,
  useGetAllReceivables,
  useGetAllUnloadings,
  useGetAllVehicles,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

// =================== CSV HELPERS ===================
function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const csvEscape = (val: string | number): string => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

function downloadCSV(filename: string, csvContent: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([`${bom}${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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
  const dieselQuery = useGetAllLocalDieselEntries();

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
  const dieselEntries = dieselQuery.data ?? [];

  // Daily trips (filtered)
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
      {
        month: string;
        key: string;
        billing: number;
        gst: number;
        total: number;
        received: number;
        tds: number;
        trips: number;
      }
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
      if (!map[key])
        map[key] = {
          month: label,
          key,
          billing: 0,
          gst: 0,
          total: 0,
          received: 0,
          tds: 0,
          trips: 0,
        };
      map[key].billing += Number(inv.subtotal ?? 0);
      map[key].gst += Number(inv.gstAmount ?? 0);
      map[key].total += Number(inv.totalAmount);
      map[key].trips += 1;
      // Add received and TDS from matching receivable
      const rec = receivables.find(
        (r) => r.invoiceNumber === inv.invoiceNumber,
      );
      if (rec) {
        map[key].received += Number(rec.amountReceived ?? 0);
        map[key].tds += Number(rec.tdsDeduction ?? 0);
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [invoices, receivables, dateFrom, dateTo]);

  // Client billing
  const clientBilling = useMemo(() => {
    const map: Record<
      string,
      {
        client: string;
        invoices: BillingRow[];
        totalBilled: number;
        received: number;
      }
    > = {};
    for (const inv of invoices) {
      if (dateFrom && inv.invoiceDate < dateFrom) continue;
      if (dateTo && inv.invoiceDate > dateTo) continue;
      const key = inv.clientName || "Unknown";
      if (!map[key])
        map[key] = { client: key, invoices: [], totalBilled: 0, received: 0 };
      const rec = receivables.find(
        (r) => r.invoiceNumber === inv.invoiceNumber,
      );
      map[key].invoices.push({
        invoiceNo: inv.invoiceNumber,
        date: inv.invoiceDate,
        billing: Number(inv.subtotal ?? 0),
        gst: Number(inv.gstAmount ?? 0),
        total: Number(inv.totalAmount),
        received: rec ? Number(rec.amountReceived ?? 0) : 0,
        balance: rec ? Number(rec.balance ?? 0) : Number(inv.totalAmount),
        status: rec?.status ?? inv.status,
      });
      map[key].totalBilled += Number(inv.totalAmount);
      if (rec) map[key].received += Number(rec.amountReceived ?? 0);
    }
    return Object.values(map).sort((a, b) => b.totalBilled - a.totalBilled);
  }, [invoices, receivables, dateFrom, dateTo]);

  interface BillingRow {
    invoiceNo: string;
    date: string;
    billing: number;
    gst: number;
    total: number;
    received: number;
    balance: number;
    status: string;
  }

  // Vehicle profit (rich data)
  const vehicleProfit = useMemo(() => {
    const map: Record<
      string,
      {
        vehicle: string;
        trips: number;
        loadingQty: number;
        unloadingQty: number;
        shortage: number;
        bookingAmt: number;
        deductions: number;
        netPayable: number;
        dieselCost: number;
      }
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
      if (filterVehicle !== "all") {
        const v = vehicles.find(
          (veh) =>
            veh.id === trip.vehicleId ||
            Number(veh.id) === Number(trip.vehicleId),
        );
        if (v?.vehicleNumber !== filterVehicle) continue;
      }
      const v = vehicles.find(
        (veh) =>
          veh.id === trip.vehicleId ||
          Number(veh.id) === Number(trip.vehicleId),
      );
      const key = v?.vehicleNumber ?? trip.vehicleId.toString();
      if (!map[key])
        map[key] = {
          vehicle: key,
          trips: 0,
          loadingQty: 0,
          unloadingQty: 0,
          shortage: 0,
          bookingAmt: 0,
          deductions: 0,
          netPayable: 0,
          dieselCost: 0,
        };
      map[key].trips += 1;
      map[key].loadingQty += Number(trip.loadingQty ?? 0);
      map[key].unloadingQty += Number(ul.unloadingQty ?? 0);
      map[key].shortage += Number(ul.shortageQty ?? 0);
      map[key].bookingAmt += Number(ul.vehicleCost ?? 0);
      const totalDed =
        Number(ul.shortageAmount ?? 0) +
        Number(ul.gpsDeduction ?? 0) +
        Number(ul.challanDeduction ?? 0) +
        Number(ul.cashTds ?? 0) +
        Number(ul.penalty ?? 0) +
        Number(trip.advanceCash ?? 0) +
        Number(trip.advanceBank ?? 0) +
        Number(trip.hsdAmount ?? 0);
      map[key].deductions += totalDed;
      map[key].netPayable += Number(ul.netPayableToVehicle ?? 0);
    }
    // Add diesel cost
    for (const d of dieselEntries) {
      if (dateFrom && d.date < dateFrom) continue;
      if (dateTo && d.date > dateTo) continue;
      const v = vehicles.find(
        (veh) => veh.id === d.truckId || Number(veh.id) === Number(d.truckId),
      );
      if (!v) continue;
      if (filterVehicle !== "all" && v.vehicleNumber !== filterVehicle)
        continue;
      if (map[v.vehicleNumber])
        map[v.vehicleNumber].dieselCost += Number(d.total ?? 0);
    }
    return Object.values(map).sort((a, b) => b.bookingAmt - a.bookingAmt);
  }, [
    unloadings,
    trips,
    vehicles,
    dieselEntries,
    dateFrom,
    dateTo,
    filterVehicle,
  ]);

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

  // Filtered receivables
  const filteredReceivables = useMemo(
    () =>
      receivables.filter(
        (r) =>
          (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo),
      ),
    [receivables, dateFrom, dateTo],
  );

  // Filtered payables
  const filteredPayables = useMemo(
    () =>
      payables.filter(
        (p) =>
          (!dateFrom || p.date >= dateFrom) && (!dateTo || p.date <= dateTo),
      ),
    [payables, dateFrom, dateTo],
  );

  // =================== CSV EXPORT HANDLERS ===================

  const handleExportTrips = () => {
    if (filteredTrips.length === 0) {
      toast.warning("No records to export for selected filters");
      return;
    }
    toast.info("Downloading Trip Report...");
    const headers = [
      "Challan No",
      "Date",
      "Vehicle No",
      "DO No",
      "Consigner",
      "Consignee",
      "Loading Qty (MT)",
      "Unloading Qty (MT)",
      "Shortage (MT)",
      "Booking Rate (₹/MT)",
      "Vehicle Cost (₹)",
      "GPS Deduction (₹)",
      "Challan Deduction (₹)",
      "Advance (₹)",
      "Diesel Deduction (₹)",
      "TDS (₹)",
      "Penalty (₹)",
      "Toll (₹)",
      "Net Payable (₹)",
      "Billed (Yes/No)",
      "Invoice No",
    ];
    const rows = filteredTrips.map((t) => {
      const v = vehicles.find(
        (veh) =>
          veh.id === t.vehicleId || Number(veh.id) === Number(t.vehicleId),
      );
      const csgr = consigners.find(
        (c) => c.id === t.consignerId || Number(c.id) === Number(t.consignerId),
      );
      const csgne = consignees.find(
        (c) => c.id === t.consigneeId || Number(c.id) === Number(t.consigneeId),
      );
      const d = dos.find(
        (dd) => dd.id === t.doId || Number(dd.id) === Number(t.doId),
      );
      const ul = unloadings.find(
        (u) =>
          u.loadingTripId === t.id || Number(u.loadingTripId) === Number(t.id),
      );
      const billedInvoice = invoices.find(
        (inv) =>
          inv.tripIds?.some((tid) => Number(tid) === Number(t.id)) ||
          Number(inv.tripId) === Number(t.id),
      );
      const isBilled = !!billedInvoice || t.status === "billed";
      return [
        t.challanNo ?? "",
        t.loadingDate ?? "",
        v?.vehicleNumber ?? "",
        d?.doNumber ?? "",
        csgr?.name ?? "",
        csgne?.name ?? "",
        Number(t.loadingQty ?? 0).toFixed(3),
        ul ? Number(ul.unloadingQty ?? 0).toFixed(3) : "",
        ul ? Number(ul.shortageQty ?? 0).toFixed(3) : "",
        ul ? Number(ul.bookingRate ?? 0).toFixed(2) : "",
        ul ? Number(ul.vehicleCost ?? 0).toFixed(2) : "",
        ul ? Number(ul.gpsDeduction ?? 0).toFixed(2) : "",
        ul ? Number(ul.challanDeduction ?? 0).toFixed(2) : "",
        Number((t.advanceCash ?? 0) + (t.advanceBank ?? 0)).toFixed(2),
        Number(t.hsdAmount ?? 0).toFixed(2),
        ul ? Number(ul.cashTds ?? 0).toFixed(2) : "",
        ul ? Number(ul.penalty ?? 0).toFixed(2) : "",
        ul ? Number(ul.tollCharges ?? 0).toFixed(2) : "",
        ul ? Number(ul.netPayableToVehicle ?? 0).toFixed(2) : "",
        isBilled ? "Yes" : "No",
        billedInvoice?.invoiceNumber ?? "",
      ];
    });
    downloadCSV(`jt-trip-report-${todayStr()}.csv`, generateCSV(headers, rows));
  };

  const handleExportMonthly = () => {
    if (monthlyRevenue.length === 0) {
      toast.warning("No records to export for selected filters");
      return;
    }
    toast.info("Downloading Monthly Revenue Report...");
    const headers = [
      "Month (YYYY-MM)",
      "Total Billing Amount (₹)",
      "GST Amount (₹)",
      "Total Invoice Amount (₹)",
      "Received Amount (₹)",
      "Outstanding Balance (₹)",
      "TDS Deducted (₹)",
    ];
    const rows = monthlyRevenue.map((m) => [
      m.key,
      m.billing.toFixed(2),
      m.gst.toFixed(2),
      m.total.toFixed(2),
      m.received.toFixed(2),
      (m.total - m.received - m.tds).toFixed(2),
      m.tds.toFixed(2),
    ]);
    downloadCSV(
      `jt-revenue-report-${monthStr()}.csv`,
      generateCSV(headers, rows),
    );
  };

  const handleExportClientBilling = () => {
    const allRows = clientBilling.flatMap((cb) =>
      cb.invoices.map((inv) => ({ ...inv, client: cb.client })),
    );
    if (allRows.length === 0) {
      toast.warning("No records to export for selected filters");
      return;
    }
    toast.info("Downloading Client Billing Report...");
    const headers = [
      "Client Name",
      "Invoice No",
      "Invoice Date",
      "Billing Amount (₹)",
      "GST (₹)",
      "Total Amount (₹)",
      "Received (₹)",
      "Balance (₹)",
      "Status",
    ];
    const rows = allRows.map((r) => [
      r.client,
      r.invoiceNo,
      r.date,
      r.billing.toFixed(2),
      r.gst.toFixed(2),
      r.total.toFixed(2),
      r.received.toFixed(2),
      r.balance.toFixed(2),
      r.status,
    ]);
    downloadCSV(
      `jt-client-billing-${todayStr()}.csv`,
      generateCSV(headers, rows),
    );
  };

  const handleExportVehicleProfit = () => {
    if (vehicleProfit.length === 0) {
      toast.warning("No records to export for selected filters");
      return;
    }
    toast.info("Downloading Truck Profit Report...");
    const headers = [
      "Vehicle No",
      "Total Trips",
      "Total Loading Qty (MT)",
      "Total Unloading Qty (MT)",
      "Total Shortage (MT)",
      "Booking Amount (₹)",
      "Total Deductions (₹)",
      "Net Payable (₹)",
      "Total Diesel Cost (₹)",
      "Approx Profit (₹)",
    ];
    const rows = vehicleProfit.map((v) => {
      const approxProfit = v.bookingAmt - v.netPayable - v.dieselCost;
      return [
        v.vehicle,
        v.trips,
        v.loadingQty.toFixed(3),
        v.unloadingQty.toFixed(3),
        v.shortage.toFixed(3),
        v.bookingAmt.toFixed(2),
        v.deductions.toFixed(2),
        v.netPayable.toFixed(2),
        v.dieselCost.toFixed(2),
        approxProfit.toFixed(2),
      ];
    });
    downloadCSV(
      `jt-truck-profit-${todayStr()}.csv`,
      generateCSV(headers, rows),
    );
  };

  const handleExportDiesel = () => {
    const filtered = dieselEntries.filter((d) => {
      if (dateFrom && d.date < dateFrom) return false;
      if (dateTo && d.date > dateTo) return false;
      if (filterVehicle !== "all") {
        const v = vehicles.find(
          (veh) => veh.id === d.truckId || Number(veh.id) === Number(d.truckId),
        );
        if (v?.vehicleNumber !== filterVehicle) return false;
      }
      return true;
    });
    if (filtered.length === 0) {
      toast.warning("No records to export for selected filters");
      return;
    }
    toast.info("Downloading Diesel Report...");
    const headers = [
      "Vehicle No",
      "Petrol Bunk",
      "Challan No",
      "Date",
      "HSD Litres",
      "HSD Amount (₹)",
      "Slip No",
      "Bill No",
      "Status",
    ];
    const rows = filtered.map((d) => {
      const v = vehicles.find(
        (veh) => veh.id === d.truckId || Number(veh.id) === Number(d.truckId),
      );
      return [
        v?.vehicleNumber ?? "",
        d.vendor ?? "",
        d.tripRef ?? "",
        d.date ?? "",
        Number(d.litre ?? 0).toFixed(3),
        Number(d.total ?? 0).toFixed(2),
        d.slipNo ?? "",
        d.billNo ?? "",
        d.billNo ? "Locked" : "Unlocked",
      ];
    });
    downloadCSV(
      `jt-diesel-report-${todayStr()}.csv`,
      generateCSV(headers, rows),
    );
  };

  const handleExportReceivable = () => {
    if (filteredReceivables.length === 0) {
      toast.warning("No records to export for selected filters");
      return;
    }
    toast.info("Downloading Receivable Report...");
    const headers = [
      "Date",
      "Invoice No",
      "Client",
      "Invoice Amount (₹)",
      "Received (₹)",
      "TDS Deducted (₹)",
      "Penalty (₹)",
      "Balance (₹)",
      "Status",
    ];
    const rows = filteredReceivables.map((r) => [
      r.date ?? "",
      r.invoiceNumber ?? "",
      r.clientName ?? "",
      Number(r.invoiceAmount ?? 0).toFixed(2),
      Number(r.amountReceived ?? 0).toFixed(2),
      Number(r.tdsDeduction ?? 0).toFixed(2),
      Number(r.penaltyAmount ?? 0).toFixed(2),
      Number(r.balance ?? 0).toFixed(2),
      r.status ?? "",
    ]);
    downloadCSV(`jt-receivable-${todayStr()}.csv`, generateCSV(headers, rows));
  };

  const handleExportPayable = () => {
    if (filteredPayables.length === 0) {
      toast.warning("No records to export for selected filters");
      return;
    }
    toast.info("Downloading Payable Report...");
    const headers = [
      "Date",
      "Vehicle No",
      "Owner",
      "Trip Ref",
      "Total Payable (₹)",
      "Paid (₹)",
      "Balance (₹)",
      "Status",
    ];
    const rows = filteredPayables.map((p) => [
      p.date ?? "",
      p.vehicleNumber ?? "",
      p.ownerName ?? "",
      p.tripReference ?? "",
      Number(p.totalPayable ?? 0).toFixed(2),
      Number(p.amountPaid ?? 0).toFixed(2),
      Number(p.balance ?? 0).toFixed(2),
      p.status ?? "",
    ]);
    downloadCSV(`jt-payable-${todayStr()}.csv`, generateCSV(headers, rows));
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
              Business analytics and CSV export
            </p>
          </div>
        </div>
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
            value="diesel"
            className="text-xs"
            data-ocid="reports.diesel.tab"
          >
            Diesel
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

        {/* ---- TRIPS ---- */}
        <TabsContent value="trips" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">
                  Daily Trip Report ({filteredTrips.length} trips)
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportTrips}
                  className="gap-1.5 text-xs h-7 px-3"
                  style={{ background: "oklch(0.72 0.18 60)", color: "#111" }}
                  data-ocid="reports.trips.download"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
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
                          colSpan={8}
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

        {/* ---- MONTHLY REVENUE ---- */}
        <TabsContent value="monthly" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">
                  Monthly Revenue
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportMonthly}
                  className="gap-1.5 text-xs h-7 px-3"
                  style={{ background: "oklch(0.72 0.18 60)", color: "#111" }}
                  data-ocid="reports.monthly.download"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </Button>
              </div>
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
                      Billing
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      GST
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Total
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Received
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Outstanding
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRevenue.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No data for selected range
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthlyRevenue.map((m) => (
                      <TableRow key={m.key} className="table-row-hover">
                        <TableCell className="text-xs font-medium">
                          {m.month}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {m.trips}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(m.billing)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {formatCurrency(m.gst)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(m.total)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-green-600">
                          {formatCurrency(m.received)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-amber-600 font-semibold">
                          {formatCurrency(
                            Math.max(0, m.total - m.received - m.tds),
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- CLIENT BILLING ---- */}
        <TabsContent value="client" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">
                  Client-wise Billing
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportClientBilling}
                  className="gap-1.5 text-xs h-7 px-3"
                  style={{ background: "oklch(0.72 0.18 60)", color: "#111" }}
                  data-ocid="reports.client.download"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </Button>
              </div>
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
                          {c.invoices.length}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(c.totalBilled)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-green-600">
                          {formatCurrency(c.received)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-amber-600">
                          {formatCurrency(c.totalBilled - c.received)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- VEHICLE PROFIT ---- */}
        <TabsContent value="vehicle" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">
                  Vehicle-wise Profit
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportVehicleProfit}
                  className="gap-1.5 text-xs h-7 px-3"
                  style={{ background: "oklch(0.72 0.18 60)", color: "#111" }}
                  data-ocid="reports.vehicle.download"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </Button>
              </div>
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
                      Loading (MT)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Unloading (MT)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Booking Amt
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Net Payable
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Diesel
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleProfit.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
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
                          {v.loadingQty.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {v.unloadingQty.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(v.bookingAmt)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-green-600">
                          {formatCurrency(v.netPayable)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-amber-600">
                          {formatCurrency(v.dieselCost)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- DIESEL ---- */}
        <TabsContent value="diesel" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">
                  Diesel Report (
                  {
                    dieselEntries.filter((d) => {
                      if (dateFrom && d.date < dateFrom) return false;
                      if (dateTo && d.date > dateTo) return false;
                      if (filterVehicle !== "all") {
                        const v = vehicles.find(
                          (veh) =>
                            veh.id === d.truckId ||
                            Number(veh.id) === Number(d.truckId),
                        );
                        if (v?.vehicleNumber !== filterVehicle) return false;
                      }
                      return true;
                    }).length
                  }{" "}
                  entries)
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportDiesel}
                  className="gap-1.5 text-xs h-7 px-3"
                  style={{ background: "oklch(0.72 0.18 60)", color: "#111" }}
                  data-ocid="reports.diesel.download"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Vehicle No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Petrol Bunk
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Litres
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Amount (₹)
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Slip No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Bill No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dieselEntries.filter((d) => {
                      if (dateFrom && d.date < dateFrom) return false;
                      if (dateTo && d.date > dateTo) return false;
                      if (filterVehicle !== "all") {
                        const v = vehicles.find(
                          (veh) =>
                            veh.id === d.truckId ||
                            Number(veh.id) === Number(d.truckId),
                        );
                        if (v?.vehicleNumber !== filterVehicle) return false;
                      }
                      return true;
                    }).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-xs text-muted-foreground py-10"
                        >
                          No diesel entries for selected range
                        </TableCell>
                      </TableRow>
                    ) : (
                      dieselEntries
                        .filter((d) => {
                          if (dateFrom && d.date < dateFrom) return false;
                          if (dateTo && d.date > dateTo) return false;
                          if (filterVehicle !== "all") {
                            const v = vehicles.find(
                              (veh) =>
                                veh.id === d.truckId ||
                                Number(veh.id) === Number(d.truckId),
                            );
                            if (v?.vehicleNumber !== filterVehicle)
                              return false;
                          }
                          return true;
                        })
                        .map((d) => {
                          const v = vehicles.find(
                            (veh) =>
                              veh.id === d.truckId ||
                              Number(veh.id) === Number(d.truckId),
                          );
                          return (
                            <TableRow
                              key={d.id.toString()}
                              className="table-row-hover"
                            >
                              <TableCell className="text-xs font-mono">
                                {v?.vehicleNumber ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {d.vendor}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(d.date)}
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                {Number(d.litre ?? 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs text-right font-semibold">
                                {formatCurrency(d.total)}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {d.slipNo || "—"}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {d.billNo || "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                <span
                                  className={
                                    d.billNo
                                      ? "text-amber-600 font-medium"
                                      : "text-green-600"
                                  }
                                >
                                  {d.billNo ? "Locked" : "Unlocked"}
                                </span>
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

        {/* ---- DO DISPATCH ---- */}
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

        {/* ---- RECEIVABLE ---- */}
        <TabsContent value="receivable" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">
                  Accounts Receivable Report ({filteredReceivables.length}{" "}
                  records)
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportReceivable}
                  className="gap-1.5 text-xs h-7 px-3"
                  style={{ background: "oklch(0.72 0.18 60)", color: "#111" }}
                  data-ocid="reports.receivable.download"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </Button>
              </div>
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
                  {filteredReceivables.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No receivable records
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReceivables.map((r) => (
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

        {/* ---- PAYABLE ---- */}
        <TabsContent value="payable" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold">
                  Accounts Payable Report ({filteredPayables.length} records)
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportPayable}
                  className="gap-1.5 text-xs h-7 px-3"
                  style={{ background: "oklch(0.72 0.18 60)", color: "#111" }}
                  data-ocid="reports.payable.download"
                >
                  <Download className="h-3 w-3" />
                  Download CSV
                </Button>
              </div>
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
                  {filteredPayables.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-xs text-muted-foreground py-10"
                      >
                        No payable records
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayables.map((p) => (
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
                        <TableCell className="text-xs">{p.ownerName}</TableCell>
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
