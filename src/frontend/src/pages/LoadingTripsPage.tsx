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
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type LoadingTrip,
  useCreateLoadingTrip,
  useDeleteLoadingTrip,
  useGetAllConsignees,
  useGetAllConsigners,
  useGetAllDeliveryOrders,
  useGetAllLoadingTrips,
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
  const dosQuery = useGetAllDeliveryOrders();
  const consignersQuery = useGetAllConsigners();
  const consigneesQuery = useGetAllConsignees();
  const createTrip = useCreateLoadingTrip();
  const updateTrip = useUpdateLoadingTrip();
  const deleteTrip = useDeleteLoadingTrip();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LoadingTrip | null>(null);
  const [form, setForm] = useState<LoadingTripFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<LoadingTrip | null>(null);

  const trips = tripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const dos = dosQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];
  const consignees = consigneesQuery.data ?? [];

  const getVehicleNum = (id: bigint) =>
    vehicles.find((v) => v.id === id)?.vehicleNumber ?? id.toString();
  const getConsignerName = (id: bigint) =>
    consigners.find((c) => c.id === id)?.name ?? id.toString();
  const getConsigneeName = (id: bigint) =>
    consignees.find((c) => c.id === id)?.name ?? id.toString();
  const getDONumber = (id: bigint) =>
    dos.find((d) => d.id === id)?.doNumber ?? id.toString();

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: LoadingTrip) => {
    setEditingItem(item);
    setForm({
      loadingDate: item.loadingDate,
      challanNo: item.challanNo,
      vehicleId: item.vehicleId.toString(),
      passNumber: item.passNumber,
      doId: item.doId.toString(),
      consignerId: item.consignerId.toString(),
      consigneeId: item.consigneeId.toString(),
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
    try {
      if (editingItem) {
        await updateTrip.mutateAsync({
          id: editingItem.id,
          tripId: editingItem.tripId,
          ...data,
        });
        toast.success("Loading trip updated");
      } else {
        await createTrip.mutateAsync(data);
        toast.success("Loading trip recorded");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save loading trip.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
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
                    Trip ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Challan
                  </TableHead>
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
                {trips.map((item, index) => {
                  const advance = item.advanceCash + item.advanceBank;
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className="table-row-hover"
                      data-ocid={`loading_trips.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-mono font-semibold">
                        {item.tripId}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.loadingDate)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.challanNo}
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
                            onClick={() => openEditDialog(item)}
                            className="h-7 w-7 p-0"
                            data-ocid={`loading_trips.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(item)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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
                ? `Edit Trip ${editingItem.tripId}`
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
                <Select
                  value={form.vehicleId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, vehicleId: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="loading_trips.vehicle.select"
                  >
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles
                      .filter((v) => v.isActive)
                      .map((v) => (
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
                <Select
                  value={form.doId}
                  onValueChange={(v) => setForm((p) => ({ ...p, doId: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="loading_trips.do.select"
                  >
                    <SelectValue placeholder="Select DO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-xs">
                      None
                    </SelectItem>
                    {dos
                      .filter((d) => d.status === "Active")
                      .map((d) => {
                        const csgName =
                          consigners.find((c) => c.id === d.consignerId)
                            ?.name ?? "?";
                        return (
                          <SelectItem
                            key={d.id.toString()}
                            value={d.id.toString()}
                            className="text-xs"
                          >
                            {d.doNumber} — {csgName}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consigner (OCP) *</Label>
                <Select
                  value={form.consignerId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, consignerId: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="loading_trips.consigner.select"
                  >
                    <SelectValue placeholder="Select OCP" />
                  </SelectTrigger>
                  <SelectContent>
                    {consigners.map((c) => (
                      <SelectItem
                        key={c.id.toString()}
                        value={c.id.toString()}
                        className="text-xs"
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consignee *</Label>
                <Select
                  value={form.consigneeId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, consigneeId: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="loading_trips.consignee.select"
                  >
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {consignees.map((c) => (
                      <SelectItem
                        key={c.id.toString()}
                        value={c.id.toString()}
                        className="text-xs"
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Input
                    id="lt-bunk"
                    placeholder="e.g. HP Petrol Bunk"
                    value={form.petrolBunkName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, petrolBunkName: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="loading_trips.bunk.input"
                  />
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
            Delete trip <strong>{deleteConfirm?.tripId}</strong>? This cannot be
            undone.
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
    </div>
  );
}
