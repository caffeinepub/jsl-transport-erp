import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Loader2,
  Lock,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SearchableSelect } from "../components/SearchableSelect";
import {
  type LoadingTrip,
  useCreateLoadingTrip,
  useCreateLocalDieselEntry,
  useCreatePettyCashLedger,
  useCreateVehicle,
  useDeleteLoadingTrip,
  useGetAllBillingInvoices,
  useGetAllConsignees,
  useGetAllConsigners,
  useGetAllDeliveryOrders,
  useGetAllLoadingTrips,
  useGetAllPetrolBunks,
  useGetAllVehicles,
  useUpdateLoadingTrip,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

interface LoadingTripFormData {
  loadingDate: string;
  challanNo: string;
  vehicleId: string;
  passNumber: string;
  doId: string;
  consignerId: string;
  consigneeId: string;
  loadingQty: string;
  advanceCash: string;
  advanceBank: string;
  hsdLitres: string;
  hsdAmount: string;
  petrolBunkName: string;
  status: string;
}

const defaultForm: LoadingTripFormData = {
  loadingDate: "",
  challanNo: "",
  vehicleId: "",
  passNumber: "",
  doId: "",
  consignerId: "",
  consigneeId: "",
  loadingQty: "",
  advanceCash: "0",
  advanceBank: "0",
  hsdLitres: "0",
  hsdAmount: "0",
  petrolBunkName: "",
  status: "loaded",
};

interface LoadingTripsPageProps {
  onRecordUnloading?: (trip: LoadingTrip) => void;
}

export default function LoadingTripsPage({
  onRecordUnloading,
}: LoadingTripsPageProps) {
  const tripsQuery = useGetAllLoadingTrips();
  const vehiclesQuery = useGetAllVehicles();
  const billingInvoicesQuery = useGetAllBillingInvoices();
  const dosQuery = useGetAllDeliveryOrders();
  const consignersQuery = useGetAllConsigners();
  const consigneesQuery = useGetAllConsignees();
  const createTrip = useCreateLoadingTrip();
  const updateTrip = useUpdateLoadingTrip();
  const deleteTrip = useDeleteLoadingTrip();
  const createPettyCash = useCreatePettyCashLedger();
  const createDieselEntry = useCreateLocalDieselEntry();
  const petrolBunksQuery = useGetAllPetrolBunks();
  const createVehicle = useCreateVehicle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [bunkDropdownOpen, setBunkDropdownOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LoadingTrip | null>(null);
  const [form, setForm] = useState<LoadingTripFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<LoadingTrip | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAddVehicleOpen, setQuickAddVehicleOpen] = useState(false);
  const [quickVehicleForm, setQuickVehicleForm] = useState({
    vehicleNumber: "",
    vehicleType: "Association",
    ownerName: "",
    ownerPhone: "",
  });

  const trips = tripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const billingInvoices = billingInvoicesQuery.data ?? [];
  const billedTripIds = new Set<string>(
    billingInvoices.flatMap((inv) =>
      (inv.tripIds ?? []).map((id) => id.toString()),
    ),
  );
  const dos = dosQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];
  const consignees = consigneesQuery.data ?? [];
  const petrolBunks = petrolBunksQuery.data ?? [];

  const getVehicleNum = (id: bigint) =>
    vehicles.find((v) => v.id === id)?.vehicleNumber ?? id.toString();
  const getConsignerName = (id: bigint) =>
    consigners.find((c) => c.id === id)?.name ?? id.toString();
  const getConsigneeName = (id: bigint) =>
    consignees.find((c) => c.id === id)?.name ?? id.toString();
  const getDONumber = (id: bigint) =>
    dos.find((d) => d.id === id)?.doNumber ?? id.toString();

  const filteredTrips = trips.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const vNum = getVehicleNum(item.vehicleId).toLowerCase();
    const doNum = item.doId !== 0n ? getDONumber(item.doId).toLowerCase() : "";
    return (
      item.challanNo.toLowerCase().includes(q) ||
      vNum.includes(q) ||
      item.passNumber.toLowerCase().includes(q) ||
      doNum.includes(q)
    );
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setVehicleSearch("");
    setVehicleDropdownOpen(false);
    setDialogOpen(true);
  };

  // When a DO is selected, auto-fill consigner and consignee from the DO
  const handleDOSelect = (v: string) => {
    if (!v || v === "0") {
      setForm((p) => ({ ...p, doId: v }));
      return;
    }
    const selectedDO = dos.find((d) => d.id.toString() === v);
    setForm((p) => ({
      ...p,
      doId: v,
      consignerId: selectedDO
        ? selectedDO.consignerId.toString()
        : p.consignerId,
      consigneeId:
        selectedDO?.consigneeId && selectedDO.consigneeId !== 0n
          ? selectedDO.consigneeId.toString()
          : p.consigneeId,
    }));
  };

  const normalizeId = (v: bigint | number | string) =>
    String(Number(BigInt(v.toString())));

  const openEditDialog = (item: LoadingTrip) => {
    setEditingItem(item);
    const vId = normalizeId(item.vehicleId);
    const foundVehicle = vehicles.find((v) => normalizeId(v.id) === vId);
    setVehicleSearch(foundVehicle?.vehicleNumber ?? "");
    setVehicleDropdownOpen(false);
    setForm({
      loadingDate: item.loadingDate,
      challanNo: item.challanNo,
      vehicleId: vId,
      passNumber: item.passNumber,
      doId: normalizeId(item.doId),
      consignerId: normalizeId(item.consignerId),
      consigneeId: normalizeId(item.consigneeId),
      loadingQty: item.loadingQty.toString(),
      advanceCash: item.advanceCash.toString(),
      advanceBank: item.advanceBank.toString(),
      hsdLitres: item.hsdLitres.toString(),
      hsdAmount: item.hsdAmount.toString(),
      petrolBunkName: item.petrolBunkName,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId || !form.consignerId || !form.consigneeId) {
      toast.error("Please fill all required fields");
      return;
    }

    // Duplicate Challan No check
    const challanTrimmed = form.challanNo.trim().toUpperCase();
    const duplicateChallan = trips.find(
      (t) =>
        t.challanNo.trim().toUpperCase() === challanTrimmed &&
        t.id !== editingItem?.id,
    );
    if (duplicateChallan) {
      toast.error(
        `Challan No "${form.challanNo}" already exists. Duplicate entry not allowed.`,
        { duration: 5000 },
      );
      return;
    }

    // Duplicate Pass Number (TP Number) check — only if pass number is provided
    if (form.passNumber.trim()) {
      const passTrimmed = form.passNumber.trim().toUpperCase();
      const duplicatePass = trips.find(
        (t) =>
          t.passNumber.trim().toUpperCase() === passTrimmed &&
          t.id !== editingItem?.id,
      );
      if (duplicatePass) {
        toast.error(
          `TP/Pass No "${form.passNumber}" already used in Challan ${duplicatePass.challanNo}. Duplicate entry not allowed.`,
          { duration: 5000 },
        );
        return;
      }
    }

    const data: Omit<LoadingTrip, "id" | "tripId"> = {
      loadingDate: form.loadingDate,
      challanNo: form.challanNo,
      vehicleId: BigInt(form.vehicleId),
      passNumber: form.passNumber,
      doId: form.doId ? BigInt(form.doId) : 0n,
      consignerId: BigInt(form.consignerId),
      consigneeId: BigInt(form.consigneeId),
      loadingQty: Number(form.loadingQty),
      advanceCash: Number(form.advanceCash) || 0,
      advanceBank: Number(form.advanceBank) || 0,
      hsdLitres: Number(form.hsdLitres) || 0,
      hsdAmount: Number(form.hsdAmount) || 0,
      petrolBunkName: form.petrolBunkName,
      status: form.status,
    };
    const vehicleNum =
      vehicles.find((v) => v.id.toString() === form.vehicleId)?.vehicleNumber ??
      form.vehicleId;

    try {
      if (editingItem) {
        const prevCash = editingItem.advanceCash ?? 0;
        const newCash = Number(form.advanceCash) || 0;
        await updateTrip.mutateAsync({
          id: editingItem.id,
          tripId: editingItem.tripId,
          ...data,
        });
        // If cash advance increased, record the difference as Cash Outward
        const cashDiff = newCash - prevCash;
        if (cashDiff > 0 && form.loadingDate) {
          await createPettyCash.mutateAsync({
            date: form.loadingDate,
            transactionType: "debit",
            category: "Vehicle Advance (Cash)",
            narration: `Cash Advance to vehicle ${vehicleNum} | Challan: ${form.challanNo}`,
            amount: cashDiff,
            reference: form.challanNo,
          });
        }
        // Auto-record HSD diesel entry for update
        if (Number(form.hsdAmount) > 0 && form.petrolBunkName) {
          // Remove old auto diesel entry for this challan
          const dieselItems = JSON.parse(
            localStorage.getItem("jt_local_diesel") || "[]",
          );
          const filtered = dieselItems.filter(
            (d: { remark?: string }) => !d.remark?.includes(form.challanNo),
          );
          localStorage.setItem("jt_local_diesel", JSON.stringify(filtered));
          // Create new entry
          await createDieselEntry.mutateAsync({
            truckId: BigInt(form.vehicleId),
            date: form.loadingDate,
            vendor: form.petrolBunkName,
            litre: Number(form.hsdLitres) || 0,
            rate:
              Number(form.hsdLitres) > 0
                ? Math.round(
                    (Number(form.hsdAmount) || 0) / Number(form.hsdLitres),
                  )
                : 0,
            total: Number(form.hsdAmount) || 0,
            billFile: "",
            remark: `Auto from trip Challan: ${form.challanNo}`,
            source: "trip",
            tripRef: form.challanNo,
            billNo: "",
          });
        }
        toast.success("Loading trip updated");
      } else {
        await createTrip.mutateAsync(data);
        // Auto-record cash advance as Cash Outward in Petty Cash
        const cashAmt = Number(form.advanceCash) || 0;
        if (cashAmt > 0 && form.loadingDate) {
          await createPettyCash.mutateAsync({
            date: form.loadingDate,
            transactionType: "debit",
            category: "Vehicle Advance (Cash)",
            narration: `Cash Advance to vehicle ${vehicleNum} | Challan: ${form.challanNo}`,
            amount: cashAmt,
            reference: form.challanNo,
          });
        }
        // Auto-record HSD diesel entry for new trip
        if (Number(form.hsdAmount) > 0 && form.petrolBunkName) {
          await createDieselEntry.mutateAsync({
            truckId: BigInt(form.vehicleId),
            date: form.loadingDate,
            vendor: form.petrolBunkName,
            litre: Number(form.hsdLitres) || 0,
            rate:
              Number(form.hsdLitres) > 0
                ? Math.round(
                    (Number(form.hsdAmount) || 0) / Number(form.hsdLitres),
                  )
                : 0,
            total: Number(form.hsdAmount) || 0,
            billFile: "",
            remark: `Auto from trip Challan: ${form.challanNo}`,
            source: "trip",
            tripRef: form.challanNo,
            billNo: "",
          });
        }
        toast.success("Loading trip recorded");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save loading trip.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    if (billedTripIds.has(deleteConfirm.id.toString())) {
      toast.error("Cannot delete: this trip is included in a billing invoice.");
      setDeleteConfirm(null);
      return;
    }
    try {
      await deleteTrip.mutateAsync(deleteConfirm.id);
      toast.success("Loading trip deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete loading trip.");
    }
  };

  const isSaving = createTrip.isPending || updateTrip.isPending;
  const totalAdvance =
    (Number(form.advanceCash) || 0) + (Number(form.advanceBank) || 0);

  return (
    <div className="p-6 space-y-5" data-ocid="loading_trips.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.72 0.18 60 / 0.12)" }}
          >
            <Package
              className="h-4 w-4"
              style={{ color: "oklch(0.72 0.18 60)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Loading Trips
            </h2>
            <p className="text-sm text-muted-foreground">
              {trips.length} trip{trips.length !== 1 ? "s" : ""} ·{" "}
              {trips.filter((t) => t.status === "loaded").length} awaiting
              unloading
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="loading_trips.add_button"
        >
          <Plus className="h-4 w-4" />
          Record Loading
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by challan no, vehicle no, pass no, DO no..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-ocid="loading_trips.search_input"
        />
        {searchQuery && filteredTrips.length < trips.length && (
          <p className="mt-1 text-xs text-muted-foreground">
            Showing {filteredTrips.length} of {trips.length} trips
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {tripsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="loading_trips.empty_state"
          >
            <Package className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No loading trips recorded yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Record a loading trip to start tracking material movement
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="loading_trips.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Challan No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Vehicle
                  </TableHead>
                  <TableHead className="text-xs font-semibold">DO#</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consigner
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consignee
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Loading (MT)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Advance
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Bunk</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((item, index) => {
                  const advance = item.advanceCash + item.advanceBank;
                  const isBilledTrip = billedTripIds.has(item.id.toString());
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className="table-row-hover"
                      style={
                        isBilledTrip
                          ? { background: "oklch(0.97 0.04 85)" }
                          : undefined
                      }
                      data-ocid={`loading_trips.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-mono font-semibold">
                        {item.challanNo}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.loadingDate)}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {getVehicleNum(item.vehicleId)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {item.doId !== 0n ? getDONumber(item.doId) : "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">
                        {getConsignerName(item.consignerId)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">
                        {getConsigneeName(item.consigneeId)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {item.loadingQty.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {advance > 0
                          ? `₹${advance.toLocaleString("en-IN")}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[80px] truncate text-muted-foreground">
                        {item.petrolBunkName || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {item.status === "unloaded" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium status-paid">
                              <PackageCheck className="h-3 w-3" />
                              Unloaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium status-partial">
                              <Package className="h-3 w-3" />
                              Loaded
                            </span>
                          )}
                          {isBilledTrip && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <Lock className="h-3 w-3" />
                              Billed
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === "loaded" && onRecordUnloading && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRecordUnloading(item)}
                              className="h-7 px-2 text-xs gap-1"
                            >
                              <PackageCheck className="h-3 w-3" />
                              Unload
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              !isBilledTrip && openEditDialog(item)
                            }
                            className="h-7 w-7 p-0"
                            disabled={isBilledTrip}
                            title={
                              isBilledTrip
                                ? "Locked – trip is included in a bill"
                                : "Edit"
                            }
                            data-ocid={`loading_trips.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              !isBilledTrip && setDeleteConfirm(item)
                            }
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            disabled={isBilledTrip}
                            title={
                              isBilledTrip
                                ? "Locked – trip is included in a bill"
                                : "Delete"
                            }
                            data-ocid={`loading_trips.delete_button.${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="loading_trips.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem
                ? `Edit Trip — Challan ${editingItem.challanNo}`
                : "Record Loading Trip"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lt-date" className="text-xs">
                  Loading Date *
                </Label>
                <Input
                  id="lt-date"
                  type="date"
                  value={form.loadingDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, loadingDate: e.target.value }))
                  }
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lt-challan" className="text-xs">
                  Challan No *
                </Label>
                <Input
                  id="lt-challan"
                  placeholder="CHN-001"
                  value={form.challanNo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, challanNo: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="loading_trips.challan.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vehicle *</Label>
                <div className="relative">
                  <div className="flex items-center border border-input rounded-md bg-background px-2 h-9 gap-1">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      placeholder="Search vehicle number..."
                      value={vehicleSearch}
                      onChange={(e) => {
                        setVehicleSearch(e.target.value);
                        setVehicleDropdownOpen(true);
                        if (!e.target.value)
                          setForm((p) => ({ ...p, vehicleId: "" }));
                      }}
                      onFocus={() => setVehicleDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setVehicleDropdownOpen(false), 150)
                      }
                      className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                      data-ocid="loading_trips.vehicle.search_input"
                    />
                    {form.vehicleId && (
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleSearch("");
                          setForm((p) => ({ ...p, vehicleId: "" }));
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {vehicleDropdownOpen && vehicleSearch && (
                    <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                      {vehicles
                        .filter(
                          (v) =>
                            v.isActive &&
                            v.vehicleNumber
                              .toLowerCase()
                              .includes(vehicleSearch.toLowerCase()),
                        )
                        .slice(0, 6)
                        .map((v) => (
                          <button
                            key={v.id.toString()}
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onMouseDown={() => {
                              setForm((p) => ({
                                ...p,
                                vehicleId: String(Number(v.id)),
                              }));
                              setVehicleSearch(v.vehicleNumber);
                              setVehicleDropdownOpen(false);
                            }}
                          >
                            {v.vehicleNumber}
                          </button>
                        ))}
                      {vehicles.filter(
                        (v) =>
                          v.isActive &&
                          v.vehicleNumber
                            .toLowerCase()
                            .includes(vehicleSearch.toLowerCase()),
                      ).length === 0 && (
                        <div className="px-3 py-2 text-xs">
                          <span className="text-muted-foreground">
                            Vehicle not found.{" "}
                          </span>
                          <button
                            type="button"
                            className="text-primary font-medium hover:underline"
                            onMouseDown={() => {
                              setVehicleDropdownOpen(false);
                              setQuickVehicleForm((p) => ({
                                ...p,
                                vehicleNumber: vehicleSearch,
                              }));
                              setQuickAddVehicleOpen(true);
                            }}
                          >
                            + Add Vehicle
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lt-pass" className="text-xs">
                  Pass Number
                </Label>
                <Input
                  id="lt-pass"
                  placeholder="PASS-001"
                  value={form.passNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, passNumber: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Delivery Order (DO)</Label>
                <SearchableSelect
                  value={form.doId}
                  onChange={handleDOSelect}
                  placeholder="Search DO (optional)..."
                  data-ocid="loading_trips.do.select"
                  options={[
                    { value: "0", label: "None" },
                    ...dos
                      .filter((d) => d.status === "Active")
                      .map((d) => {
                        const csgName =
                          consigners.find((c) => c.id === d.consignerId)
                            ?.name ?? "?";
                        const dispatched = trips
                          .filter((t) => {
                            try {
                              return (
                                BigInt(t.doId.toString()) ===
                                BigInt(d.id.toString())
                              );
                            } catch {
                              return false;
                            }
                          })
                          .reduce((s, t) => s + (Number(t.loadingQty) || 0), 0);
                        const remaining = d.doQty - dispatched;
                        const overDispatch =
                          remaining <= 0 && !d.allowOverDispatch;
                        return {
                          value: d.id.toString(),
                          label: `${d.doNumber} — ${csgName} (Rem: ${remaining.toFixed(1)} MT${overDispatch ? " — FULL" : ""})`,
                          disabled: overDispatch,
                        };
                      }),
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consigner (OCP) *</Label>
                <SearchableSelect
                  value={form.consignerId}
                  onChange={(v) => setForm((p) => ({ ...p, consignerId: v }))}
                  placeholder="Search OCP..."
                  data-ocid="loading_trips.consigner.select"
                  options={consigners.map((c) => ({
                    value: c.id.toString(),
                    label: c.name,
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consignee *</Label>
                <SearchableSelect
                  value={form.consigneeId}
                  onChange={(v) => setForm((p) => ({ ...p, consigneeId: v }))}
                  placeholder="Search destination..."
                  data-ocid="loading_trips.consignee.select"
                  options={consignees.map((c) => ({
                    value: c.id.toString(),
                    label: c.name,
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lt-qty" className="text-xs">
                  Loading Qty (MT) *
                </Label>
                <Input
                  id="lt-qty"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={form.loadingQty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, loadingQty: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="loading_trips.qty.input"
                />
              </div>
            </div>

            {/* Advance section */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">
                Advance Payment
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lt-cash" className="text-xs">
                    Cash Advance (₹)
                  </Label>
                  <Input
                    id="lt-cash"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.advanceCash}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, advanceCash: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="loading_trips.advance_cash.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lt-bank" className="text-xs">
                    Bank Advance (₹)
                  </Label>
                  <Input
                    id="lt-bank"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.advanceBank}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, advanceBank: e.target.value }))
                    }
                    className="text-xs"
                  />
                </div>
              </div>
              {totalAdvance > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total Advance:{" "}
                  <span className="font-semibold text-foreground">
                    ₹{totalAdvance.toLocaleString("en-IN")}
                  </span>
                  {Number(form.advanceCash) > 0 && (
                    <span className="ml-2 text-amber-600">
                      (Cash TDS @ 2% = ₹
                      {(Number(form.advanceCash) * 0.02).toFixed(0)})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* HSD section */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">
                HSD (Diesel Refill)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lt-hsd-litres" className="text-xs">
                    Litres
                  </Label>
                  <Input
                    id="lt-hsd-litres"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.hsdLitres}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, hsdLitres: e.target.value }))
                    }
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lt-hsd-amt" className="text-xs">
                    Amount (₹)
                  </Label>
                  <Input
                    id="lt-hsd-amt"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.hsdAmount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, hsdAmount: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="loading_trips.hsd_amount.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lt-bunk" className="text-xs">
                    Petrol Bunk Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="lt-bunk"
                      placeholder="e.g. HP Petrol Bunk"
                      value={form.petrolBunkName}
                      onChange={(e) => {
                        setForm((p) => ({
                          ...p,
                          petrolBunkName: e.target.value,
                        }));
                        setBunkDropdownOpen(true);
                      }}
                      onFocus={() => setBunkDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setBunkDropdownOpen(false), 150)
                      }
                      className="text-xs"
                      data-ocid="loading_trips.bunk.input"
                    />
                    {bunkDropdownOpen &&
                      form.petrolBunkName &&
                      petrolBunks.filter((b) =>
                        b.bunkName
                          .toLowerCase()
                          .includes(form.petrolBunkName.toLowerCase()),
                      ).length > 0 && (
                        <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-36 overflow-y-auto">
                          {petrolBunks
                            .filter((b) =>
                              b.bunkName
                                .toLowerCase()
                                .includes(form.petrolBunkName.toLowerCase()),
                            )
                            .slice(0, 6)
                            .map((b) => (
                              <button
                                key={b.id.toString()}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onMouseDown={() => {
                                  setForm((p) => ({
                                    ...p,
                                    petrolBunkName: b.bunkName,
                                  }));
                                  setBunkDropdownOpen(false);
                                }}
                              >
                                {b.bunkName}
                              </button>
                            ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="loading_trips.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSaving ||
                  !form.vehicleId ||
                  !form.consignerId ||
                  !form.consigneeId
                }
                className="text-xs"
                data-ocid="loading_trips.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Trip"
                ) : (
                  "Record Loading"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="loading_trips.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Loading Trip
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete trip with Challan <strong>{deleteConfirm?.challanNo}</strong>
            ? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="loading_trips.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTrip.isPending}
              className="text-xs"
              data-ocid="loading_trips.delete_confirm_button"
            >
              {deleteTrip.isPending ? (
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
      {/* Quick Add Vehicle Dialog */}
      <Dialog open={quickAddVehicleOpen} onOpenChange={setQuickAddVehicleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              Add New Vehicle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle Number *</Label>
              <input
                type="text"
                placeholder="e.g. MH-12-AB-1234"
                value={quickVehicleForm.vehicleNumber}
                onChange={(e) =>
                  setQuickVehicleForm((p) => ({
                    ...p,
                    vehicleNumber: e.target.value.toUpperCase(),
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-ocid="loading_trips.quick_vehicle.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle Type</Label>
              <SearchableSelect
                value={quickVehicleForm.vehicleType}
                onChange={(v) =>
                  setQuickVehicleForm((p) => ({ ...p, vehicleType: v }))
                }
                options={[
                  { value: "Association", label: "Association" },
                  { value: "Non-Association", label: "Non-Association" },
                  { value: "Own", label: "Own" },
                  { value: "Vendor", label: "Vendor" },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Owner Name</Label>
              <input
                type="text"
                placeholder="Owner name"
                value={quickVehicleForm.ownerName}
                onChange={(e) =>
                  setQuickVehicleForm((p) => ({
                    ...p,
                    ownerName: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Owner Contact</Label>
              <input
                type="text"
                placeholder="Phone number"
                value={quickVehicleForm.ownerPhone}
                onChange={(e) =>
                  setQuickVehicleForm((p) => ({
                    ...p,
                    ownerPhone: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickAddVehicleOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              className="text-xs"
              disabled={
                !quickVehicleForm.vehicleNumber.trim() ||
                createVehicle.isPending
              }
              onClick={async () => {
                if (!quickVehicleForm.vehicleNumber.trim()) return;
                try {
                  const vNum = quickVehicleForm.vehicleNumber.trim();
                  const newId = await createVehicle.mutateAsync({
                    vehicleNumber: vNum,
                    vehicleType: quickVehicleForm.vehicleType,
                    ownerName: quickVehicleForm.ownerName,
                    ownerPhone: quickVehicleForm.ownerPhone,
                    ownerAddress: "",
                    panCard: "",
                    bank1AccountHolder: "",
                    bank1BankName: "",
                    bank1AccountNo: "",
                    bank1IFSC: "",
                    bank1Branch: "",
                    bank2AccountHolder: "",
                    bank2BankName: "",
                    bank2AccountNo: "",
                    bank2IFSC: "",
                    bank2Branch: "",
                    insuranceExpiry: "",
                    pollutionExpiry: "",
                    fitnessExpiry: "",
                    isActive: true,
                  });
                  setForm((p) => ({ ...p, vehicleId: String(Number(newId)) }));
                  setVehicleSearch(vNum);
                  setQuickAddVehicleOpen(false);
                  setQuickVehicleForm({
                    vehicleNumber: "",
                    vehicleType: "Association",
                    ownerName: "",
                    ownerPhone: "",
                  });
                  toast.success(`Vehicle ${vNum} added and selected`);
                } catch {
                  toast.error("Failed to add vehicle");
                }
              }}
              data-ocid="loading_trips.quick_vehicle.save_button"
            >
              {createVehicle.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add & Select"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
