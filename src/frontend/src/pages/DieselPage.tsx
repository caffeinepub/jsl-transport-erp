import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Banknote,
  FileText,
  Fuel,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type BunkPayment,
  type LocalDieselEntry,
  useCreateBunkPayment,
  useCreateLocalDieselEntry,
  useDeleteBunkPayment,
  useDeleteLocalDieselEntry,
  useGetAllBunkPayments,
  useGetAllLoadingTrips,
  useGetAllLocalDieselEntries,
  useGetAllVehicles,
  useUpdateLocalDieselEntry,
} from "../hooks/useQueries";
import { formatCurrency, formatDate, formatNumber } from "../utils/format";

interface ManualDieselFormData {
  vehicleId: string;
  date: string;
  vendor: string;
  litre: string;
  rate: string;
  remark: string;
  billFile: string;
}

const defaultForm: ManualDieselFormData = {
  vehicleId: "",
  date: "",
  vendor: "",
  litre: "",
  rate: "",
  remark: "",
  billFile: "",
};

interface BunkPaymentFormData {
  date: string;
  bunkName: string;
  amount: string;
  paymentMode: string;
  utrNo: string;
  remark: string;
}

const defaultBunkPaymentForm: BunkPaymentFormData = {
  date: "",
  bunkName: "",
  amount: "",
  paymentMode: "cash",
  utrNo: "",
  remark: "",
};

export default function DieselPage() {
  const manualDieselQuery = useGetAllLocalDieselEntries();
  const loadingTripsQuery = useGetAllLoadingTrips();
  const vehiclesQuery = useGetAllVehicles();
  const bunkPaymentsQuery = useGetAllBunkPayments();

  const createManual = useCreateLocalDieselEntry();
  const updateManual = useUpdateLocalDieselEntry();
  const deleteManual = useDeleteLocalDieselEntry();
  const createBunkPayment = useCreateBunkPayment();
  const deleteBunkPayment = useDeleteBunkPayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LocalDieselEntry | null>(
    null,
  );
  const [form, setForm] = useState<ManualDieselFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<LocalDieselEntry | null>(
    null,
  );
  const [billPreview, setBillPreview] = useState<LocalDieselEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bill No inline edit state
  const [editBillNoId, setEditBillNoId] = useState<string | null>(null);
  const [editBillNoValue, setEditBillNoValue] = useState("");

  // Bunk payment dialog
  const [bunkPaymentDialogOpen, setBunkPaymentDialogOpen] = useState(false);
  const [bunkPaymentForm, setBunkPaymentForm] = useState<BunkPaymentFormData>(
    defaultBunkPaymentForm,
  );
  const [deleteBunkPaymentConfirm, setDeleteBunkPaymentConfirm] =
    useState<BunkPayment | null>(null);

  const vehicles = vehiclesQuery.data ?? [];
  const trips = loadingTripsQuery.data ?? [];
  const manualEntries = manualDieselQuery.data ?? [];
  const bunkPayments = bunkPaymentsQuery.data ?? [];

  const total = Number(form.litre || 0) * Number(form.rate || 0);

  // Trip HSD entries: trips with hsdAmount > 0
  const tripHSDEntries = useMemo(
    () => trips.filter((t) => (t.hsdAmount ?? 0) > 0 || (t.hsdLitres ?? 0) > 0),
    [trips],
  );

  // Unique bunk names from trip HSD entries and manual entries
  const uniqueBunkNames = useMemo(() => {
    const names = new Set<string>();
    for (const t of tripHSDEntries) {
      if (t.petrolBunkName) names.add(t.petrolBunkName);
    }
    for (const e of manualEntries) {
      if (e.vendor) names.add(e.vendor);
    }
    return Array.from(names).sort();
  }, [tripHSDEntries, manualEntries]);

  // Bunk-wise diesel summary
  const bunkSummary = useMemo(() => {
    const map: Record<
      string,
      { totalDiesel: number; totalPaid: number; outstanding: number }
    > = {};
    for (const t of tripHSDEntries) {
      const bunk = t.petrolBunkName || "Unknown";
      if (!map[bunk])
        map[bunk] = { totalDiesel: 0, totalPaid: 0, outstanding: 0 };
      map[bunk].totalDiesel += t.hsdAmount ?? 0;
    }
    for (const e of manualEntries) {
      const bunk = e.vendor || "Unknown";
      if (!map[bunk])
        map[bunk] = { totalDiesel: 0, totalPaid: 0, outstanding: 0 };
      map[bunk].totalDiesel += e.total;
    }
    for (const p of bunkPayments) {
      const bunk = p.bunkName || "Unknown";
      if (!map[bunk])
        map[bunk] = { totalDiesel: 0, totalPaid: 0, outstanding: 0 };
      map[bunk].totalPaid += p.amount;
    }
    for (const bunk of Object.keys(map)) {
      map[bunk].outstanding = map[bunk].totalDiesel - map[bunk].totalPaid;
    }
    return map;
  }, [tripHSDEntries, manualEntries, bunkPayments]);

  const getVehicleNo = (vehicleId: bigint) =>
    vehicles.find((v) => v.id.toString() === vehicleId.toString())
      ?.vehicleNumber ?? vehicleId.toString();

  // Combined summary
  const summaryStats = useMemo(() => {
    const resolveVehicleNo = (vehicleId: bigint) =>
      vehicles.find((v) => v.id.toString() === vehicleId.toString())
        ?.vehicleNumber ?? vehicleId.toString();

    const tripLitres = tripHSDEntries.reduce(
      (s, t) => s + (t.hsdLitres ?? 0),
      0,
    );
    const tripExpense = tripHSDEntries.reduce(
      (s, t) => s + (t.hsdAmount ?? 0),
      0,
    );
    const manualLitres = manualEntries.reduce((s, e) => s + e.litre, 0);
    const manualExpense = manualEntries.reduce((s, e) => s + e.total, 0);
    const totalLitres = tripLitres + manualLitres;
    const totalExpense = tripExpense + manualExpense;

    const truckMap: Record<
      string,
      { vehicleNo: string; litres: number; total: number }
    > = {};
    for (const trip of tripHSDEntries) {
      const vNo = resolveVehicleNo(trip.vehicleId);
      if (!truckMap[vNo])
        truckMap[vNo] = { vehicleNo: vNo, litres: 0, total: 0 };
      truckMap[vNo].litres += trip.hsdLitres ?? 0;
      truckMap[vNo].total += trip.hsdAmount ?? 0;
    }
    for (const entry of manualEntries) {
      const vNo = resolveVehicleNo(entry.truckId);
      if (!truckMap[vNo])
        truckMap[vNo] = { vehicleNo: vNo, litres: 0, total: 0 };
      truckMap[vNo].litres += entry.litre;
      truckMap[vNo].total += entry.total;
    }

    return {
      totalLitres,
      totalExpense,
      truckMap,
      tripLitres,
      tripExpense,
      manualLitres,
      manualExpense,
    };
  }, [tripHSDEntries, manualEntries, vehicles]);

  const openCreateDialog = () => {
    setEditingEntry(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: LocalDieselEntry) => {
    setEditingEntry(entry);
    setForm({
      vehicleId: entry.truckId.toString(),
      date: entry.date,
      vendor: entry.vendor,
      litre: entry.litre.toString(),
      rate: entry.rate.toString(),
      remark: entry.remark,
      billFile: entry.billFile,
    });
    setDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, billFile: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    const data: Omit<LocalDieselEntry, "id"> = {
      truckId: BigInt(form.vehicleId),
      date: form.date,
      vendor: form.vendor,
      litre: Number(form.litre),
      rate: Number(form.rate),
      total,
      billFile: form.billFile,
      remark: form.remark,
      source: "manual",
      tripRef: "",
      billNo: "",
    };
    try {
      if (editingEntry) {
        await updateManual.mutateAsync({ id: editingEntry.id, ...data });
        toast.success("Diesel entry updated");
      } else {
        await createManual.mutateAsync(data);
        toast.success("Diesel entry added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save diesel entry.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteManual.mutateAsync(deleteConfirm.id);
      toast.success("Entry deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  // Bill No inline save for trip entries
  const saveBillNo = async (entry: LocalDieselEntry) => {
    try {
      await updateManual.mutateAsync({ ...entry, billNo: editBillNoValue });
      toast.success("Bill No saved");
      setEditBillNoId(null);
    } catch {
      toast.error("Failed to save bill no.");
    }
  };

  // Bunk payment submit
  const handleBunkPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bunkPaymentForm.bunkName || !bunkPaymentForm.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    const userRole = localStorage.getItem("jt_user_role") ?? "User";
    const data: Omit<BunkPayment, "id"> = {
      date: bunkPaymentForm.date,
      bunkName: bunkPaymentForm.bunkName,
      amount: Number(bunkPaymentForm.amount),
      paymentMode: bunkPaymentForm.paymentMode,
      utrNo: bunkPaymentForm.utrNo,
      remark: bunkPaymentForm.remark,
      createdBy: userRole,
      createdDate: new Date().toISOString().split("T")[0],
    };
    try {
      await createBunkPayment.mutateAsync(data);
      toast.success("Bunk payment recorded");
      setBunkPaymentDialogOpen(false);
      setBunkPaymentForm(defaultBunkPaymentForm);
    } catch {
      toast.error("Failed to save bunk payment.");
    }
  };

  const handleDeleteBunkPayment = async () => {
    if (!deleteBunkPaymentConfirm) return;
    try {
      await deleteBunkPayment.mutateAsync(deleteBunkPaymentConfirm.id);
      toast.success("Payment deleted");
      setDeleteBunkPaymentConfirm(null);
    } catch {
      toast.error("Failed to delete payment.");
    }
  };

  const isSaving = createManual.isPending || updateManual.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="diesel.page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.6 0.18 60 / 0.12)" }}
          >
            <Fuel
              className="h-4 w-4"
              style={{ color: "oklch(0.55 0.18 60)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Diesel Management
            </h2>
            <p className="text-sm text-muted-foreground">
              {tripHSDEntries.length} trip HSD records · {manualEntries.length}{" "}
              manual entries
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="diesel.new_button"
        >
          <Plus className="h-4 w-4" />
          Add Manual Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Litres
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {formatNumber(summaryStats.totalLitres)} L
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Trip: {formatNumber(summaryStats.tripLitres)}L + Manual:{" "}
              {formatNumber(summaryStats.manualLitres)}L
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Expense
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {formatCurrency(summaryStats.totalExpense)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Manual bills: {formatCurrency(summaryStats.manualExpense)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Trip HSD Entries
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {tripHSDEntries.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatCurrency(summaryStats.tripExpense)} total
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Manual Bills
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {manualEntries.length}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {manualEntries.filter((e) => e.billFile).length} with bill uploads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trip" data-ocid="diesel.tabs">
        <TabsList className="h-8">
          <TabsTrigger
            value="trip"
            className="text-xs"
            data-ocid="diesel.trip.tab"
          >
            Trip HSD Records ({tripHSDEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="text-xs"
            data-ocid="diesel.manual.tab"
          >
            Manual Bunk Bills ({manualEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="bunk_payments"
            className="text-xs"
            data-ocid="diesel.bunk_payments.tab"
          >
            Bunk Payments ({bunkPayments.length})
          </TabsTrigger>
        </TabsList>

        {/* Section A: Trip HSD (read-only + bill no editable) */}
        <TabsContent value="trip" className="mt-3">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                HSD Diesel from Loading Trips — Auto-populated
              </p>
              <Badge variant="outline" className="text-[10px] ml-auto">
                Read-only
              </Badge>
            </div>
            {loadingTripsQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : tripHSDEntries.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                data-ocid="diesel.trip.empty_state"
              >
                <Fuel className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No trip HSD records found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  HSD entries from Loading Trips will appear here automatically
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Trip ID
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Loading Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Vehicle No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Petrol Bunk
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Litres
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Bill No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Source
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tripHSDEntries.map((trip, index) => {
                      // Find matching diesel entry for this trip
                      const dieselEntry = manualEntries.find(
                        (e) => e.source === "trip" && e.tripRef === trip.tripId,
                      );
                      const currentBillNo = dieselEntry?.billNo ?? "";
                      const isEditing = editBillNoId === trip.tripId;
                      return (
                        <TableRow
                          key={trip.id.toString()}
                          className="table-row-hover"
                          data-ocid={`diesel.trip.item.${index + 1}`}
                        >
                          <TableCell className="text-xs font-mono font-medium text-primary">
                            {trip.tripId}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(trip.loadingDate)}
                          </TableCell>
                          <TableCell className="text-xs font-medium font-mono">
                            {getVehicleNo(trip.vehicleId)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {trip.petrolBunkName || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {trip.hsdLitres
                              ? `${formatNumber(trip.hsdLitres)} L`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-semibold">
                            {trip.hsdAmount
                              ? formatCurrency(trip.hsdAmount)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {isEditing && dieselEntry ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editBillNoValue}
                                  onChange={(e) =>
                                    setEditBillNoValue(e.target.value)
                                  }
                                  placeholder="Bill No"
                                  className="h-6 text-xs w-28"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => saveBillNo(dieselEntry)}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-[10px]"
                                  onClick={() => setEditBillNoId(null)}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span
                                  className={
                                    currentBillNo
                                      ? "font-mono font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {currentBillNo || "—"}
                                </span>
                                {dieselEntry && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                                    onClick={() => {
                                      setEditBillNoId(trip.tripId);
                                      setEditBillNoValue(currentBillNo);
                                    }}
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                              <Truck className="h-2.5 w-2.5" />
                              Trip HSD
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Section B: Manual Bunk Bills (editable) */}
        <TabsContent value="manual" className="mt-3">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                Manual Petrol Bunk Bill Entries
              </p>
            </div>
            {manualDieselQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : manualEntries.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                data-ocid="diesel.manual.empty_state"
              >
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No manual diesel entries yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add petrol bunk bills with bill upload and remarks
                </p>
                <Button
                  onClick={openCreateDialog}
                  className="mt-4 gap-2 text-xs"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Entry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="diesel.manual.table">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Vehicle No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Petrol Pump
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Litres
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Rate/L
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Total
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Remark
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Bill
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualEntries.map((entry, index) => (
                      <TableRow
                        key={entry.id.toString()}
                        className="table-row-hover"
                        data-ocid={`diesel.manual.item.${index + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium font-mono">
                          {getVehicleNo(entry.truckId)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.vendor}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatNumber(entry.litre)} L
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(entry.rate)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(entry.total)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {entry.remark || "-"}
                        </TableCell>
                        <TableCell>
                          {entry.billFile ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBillPreview(entry)}
                              className="h-6 gap-1 px-2 text-[10px] text-primary hover:text-primary"
                              data-ocid={`diesel.bill_button.${index + 1}`}
                            >
                              <Paperclip className="h-3 w-3" />
                              View Bill
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(entry)}
                              className="h-7 w-7 p-0"
                              data-ocid={`diesel.edit_button.${index + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(entry)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              data-ocid={`diesel.delete_button.${index + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Section C: Bunk Payments */}
        <TabsContent value="bunk_payments" className="mt-3 space-y-4">
          {/* Bunk-wise summary cards */}
          {Object.keys(bunkSummary).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(bunkSummary).map(([bunk, data]) => (
                <Card key={bunk} className="border border-border">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {bunk}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Total Diesel
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(data.totalDiesel)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Paid
                        </p>
                        <p className="text-sm font-bold text-green-600">
                          {formatCurrency(data.totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Outstanding
                        </p>
                        <p
                          className={`text-sm font-bold ${data.outstanding > 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          {formatCurrency(Math.abs(data.outstanding))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                Bunk Payment Records
              </p>
              <Button
                size="sm"
                onClick={() => setBunkPaymentDialogOpen(true)}
                className="ml-auto gap-1.5 h-7 text-xs"
                data-ocid="diesel.bunk_payment.new_button"
              >
                <Plus className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            </div>
            {bunkPaymentsQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : bunkPayments.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12"
                data-ocid="diesel.bunk_payments.empty_state"
              >
                <Wallet className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No bunk payments recorded yet
                </p>
                <Button
                  onClick={() => setBunkPaymentDialogOpen(true)}
                  className="mt-4 gap-2 text-xs"
                  size="sm"
                  data-ocid="diesel.bunk_payment.empty_new_button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Record Payment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Bunk Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Mode
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        UTR / Cheque No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Remark
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bunkPayments.map((payment, index) => (
                      <TableRow
                        key={payment.id.toString()}
                        className="table-row-hover"
                        data-ocid={`diesel.bunk_payment.item.${index + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(payment.date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {payment.bunkName}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.paymentMode === "bank"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px] capitalize"
                          >
                            {payment.paymentMode === "bank" ? "Bank" : "Cash"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {payment.utrNo || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {payment.remark || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteBunkPaymentConfirm(payment)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            data-ocid={`diesel.bunk_payment.delete_button.${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Truck-wise Summary */}
      {Object.keys(summaryStats.truckMap).length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold font-display text-foreground">
              Vehicle-wise Diesel Summary (Combined)
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">
                  Vehicle No
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Total Litres
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Total Expense
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summaryStats.truckMap).map(([vNo, data]) => (
                <TableRow key={vNo} className="table-row-hover">
                  <TableCell className="text-xs font-medium font-mono">
                    {vNo}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatNumber(data.litres)} L
                  </TableCell>
                  <TableCell className="text-xs text-right font-semibold">
                    {formatCurrency(data.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Manual Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="diesel.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEntry ? "Edit Diesel Entry" : "Add Petrol Bunk Bill"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Vehicle *</Label>
                <Select
                  value={form.vehicleId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, vehicleId: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="diesel.form.vehicle_select"
                  >
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem
                        key={v.id.toString()}
                        value={v.id.toString()}
                        className="text-xs"
                      >
                        {v.vehicleNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dieselDate" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="dieselDate"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="diesel.form.date_input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="vendor" className="text-xs">
                  Petrol Pump / Vendor *
                </Label>
                <Input
                  id="vendor"
                  placeholder="e.g. Indian Oil, HP Petrol Pump"
                  value={form.vendor}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vendor: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="diesel.form.vendor_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="litre" className="text-xs">
                  Litres *
                </Label>
                <Input
                  id="litre"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.litre}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, litre: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="diesel.form.litre_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dieselRate" className="text-xs">
                  Rate per Litre (₹) *
                </Label>
                <Input
                  id="dieselRate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.rate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, rate: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="diesel.form.rate_input"
                />
              </div>
            </div>
            <div className="rounded-md bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Auto-calculated Total
              </p>
              <p className="text-base font-bold font-display mt-1">
                {formatCurrency(total)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dieselRemark" className="text-xs">
                Remark / Notes
              </Label>
              <Textarea
                id="dieselRemark"
                placeholder="e.g. Filled at Ananta OCP gate, reconcile with bunk bill #123"
                value={form.remark}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remark: e.target.value }))
                }
                className="text-xs resize-none"
                rows={2}
                data-ocid="diesel.form.remark_textarea"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Upload Petrol Bunk Bill (optional)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs gap-2"
                  data-ocid="diesel.form.upload_button"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {form.billFile ? "Change Bill" : "Attach Bill"}
                </Button>
                {form.billFile && (
                  <>
                    <span className="text-xs text-green-700 font-medium">
                      ✓ Bill attached
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((p) => ({ ...p, billFile: "" }))}
                      className="text-xs text-destructive h-7"
                    >
                      Remove
                    </Button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              {form.billFile?.startsWith("data:image") && (
                <div className="mt-2 rounded-md overflow-hidden border border-border">
                  <img
                    src={form.billFile}
                    alt="Bill preview"
                    className="max-h-40 w-full object-contain"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="diesel.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.vehicleId}
                data-ocid="diesel.form.submit_button"
                className="text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingEntry ? (
                  "Update"
                ) : (
                  "Add Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bunk Payment Dialog */}
      <Dialog
        open={bunkPaymentDialogOpen}
        onOpenChange={setBunkPaymentDialogOpen}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="diesel.bunk_payment.modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Record Bunk Payment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBunkPaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bpDate" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="bpDate"
                  type="date"
                  value={bunkPaymentForm.date}
                  onChange={(e) =>
                    setBunkPaymentForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="diesel.bunk_payment.date_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Mode *</Label>
                <Select
                  value={bunkPaymentForm.paymentMode}
                  onValueChange={(v) =>
                    setBunkPaymentForm((p) => ({ ...p, paymentMode: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="diesel.bunk_payment.mode_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-xs">
                      Cash
                    </SelectItem>
                    <SelectItem value="bank" className="text-xs">
                      Bank Transfer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Bunk Name *</Label>
                {uniqueBunkNames.length > 0 ? (
                  <Select
                    value={bunkPaymentForm.bunkName}
                    onValueChange={(v) =>
                      setBunkPaymentForm((p) => ({ ...p, bunkName: v }))
                    }
                  >
                    <SelectTrigger
                      className="text-xs"
                      data-ocid="diesel.bunk_payment.bunk_select"
                    >
                      <SelectValue placeholder="Select bunk" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueBunkNames.map((name) => (
                        <SelectItem key={name} value={name} className="text-xs">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Enter bunk name"
                    value={bunkPaymentForm.bunkName}
                    onChange={(e) =>
                      setBunkPaymentForm((p) => ({
                        ...p,
                        bunkName: e.target.value,
                      }))
                    }
                    required
                    className="text-xs"
                    data-ocid="diesel.bunk_payment.bunk_input"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bpAmount" className="text-xs">
                  Amount (₹) *
                </Label>
                <Input
                  id="bpAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={bunkPaymentForm.amount}
                  onChange={(e) =>
                    setBunkPaymentForm((p) => ({
                      ...p,
                      amount: e.target.value,
                    }))
                  }
                  required
                  className="text-xs"
                  data-ocid="diesel.bunk_payment.amount_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bpUtr" className="text-xs">
                  UTR / Cheque No
                </Label>
                <Input
                  id="bpUtr"
                  placeholder="UTR or cheque number"
                  value={bunkPaymentForm.utrNo}
                  onChange={(e) =>
                    setBunkPaymentForm((p) => ({ ...p, utrNo: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="diesel.bunk_payment.utr_input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="bpRemark" className="text-xs">
                  Remark
                </Label>
                <Textarea
                  id="bpRemark"
                  placeholder="Payment remarks..."
                  value={bunkPaymentForm.remark}
                  onChange={(e) =>
                    setBunkPaymentForm((p) => ({
                      ...p,
                      remark: e.target.value,
                    }))
                  }
                  className="text-xs resize-none"
                  rows={2}
                  data-ocid="diesel.bunk_payment.remark_textarea"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBunkPaymentDialogOpen(false)}
                data-ocid="diesel.bunk_payment.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBunkPayment.isPending}
                data-ocid="diesel.bunk_payment.submit_button"
                className="text-xs"
              >
                {createBunkPayment.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Record Payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm (manual entry) */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm" data-ocid="diesel.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this diesel entry?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="diesel.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteManual.isPending}
              data-ocid="diesel.delete_confirm_button"
              className="text-xs"
            >
              {deleteManual.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Bunk Payment Confirm */}
      <Dialog
        open={!!deleteBunkPaymentConfirm}
        onOpenChange={() => setDeleteBunkPaymentConfirm(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="diesel.bunk_payment.delete_modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete Payment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this bunk payment record?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBunkPaymentConfirm(null)}
              data-ocid="diesel.bunk_payment.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBunkPayment}
              disabled={deleteBunkPayment.isPending}
              data-ocid="diesel.bunk_payment.delete_confirm_button"
              className="text-xs"
            >
              {deleteBunkPayment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Preview Dialog */}
      <Dialog open={!!billPreview} onOpenChange={() => setBillPreview(null)}>
        <DialogContent
          className="max-w-2xl"
          data-ocid="diesel.bill_preview.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Petrol Bunk Bill — {billPreview?.vendor}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-2">
            {billPreview && (
              <span>
                {getVehicleNo(billPreview.truckId)} ·{" "}
                {formatDate(billPreview.date)} ·{" "}
                {formatNumber(billPreview.litre)}L ·{" "}
                {formatCurrency(billPreview.total)}
              </span>
            )}
          </div>
          {billPreview?.billFile && (
            <div className="rounded-lg overflow-hidden border border-border">
              {billPreview.billFile.startsWith("data:image") ? (
                <img
                  src={billPreview.billFile}
                  alt="Diesel bill"
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : (
                <iframe
                  src={billPreview.billFile}
                  title="Diesel bill PDF"
                  className="w-full h-[60vh]"
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBillPreview(null)}
              data-ocid="diesel.bill_preview.close_button"
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
