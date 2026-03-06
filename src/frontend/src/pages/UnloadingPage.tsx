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
import { Loader2, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type LoadingTrip,
  type Unloading,
  useCreateUnloading,
  useDeleteUnloading,
  useGetAllConsigners,
  useGetAllLoadingTrips,
  useGetAllUnloadings,
  useGetAllVehicles,
  useUpdateUnloading,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

interface UnloadingFormData {
  loadingTripId: string;
  unloadingDate: string;
  unloadingQty: string;
  gpsDeduction: string;
  challanDeduction: string;
  penalty: string;
  tollCharges: string;
  bookingRate: string;
  billingRate: string;
}

const defaultForm: UnloadingFormData = {
  loadingTripId: "",
  unloadingDate: "",
  unloadingQty: "",
  gpsDeduction: "131",
  challanDeduction: "200",
  penalty: "0",
  tollCharges: "0",
  bookingRate: "",
  billingRate: "",
};

interface UnloadingPageProps {
  prefillTrip?: LoadingTrip | null;
  onPrefillConsumed?: () => void;
}

export default function UnloadingPage({
  prefillTrip,
  onPrefillConsumed,
}: UnloadingPageProps) {
  const unloadingsQuery = useGetAllUnloadings();
  const tripsQuery = useGetAllLoadingTrips();
  const vehiclesQuery = useGetAllVehicles();
  const consignersQuery = useGetAllConsigners();
  const createUnloading = useCreateUnloading();
  const updateUnloading = useUpdateUnloading();
  const deleteUnloading = useDeleteUnloading();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Unloading | null>(null);
  const [form, setForm] = useState<UnloadingFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Unloading | null>(null);

  const unloadings = unloadingsQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];

  const loadedTrips = trips.filter((t) => t.status === "loaded");

  // Prefill from loading trips page
  useEffect(() => {
    if (!prefillTrip) return;
    const consignerList = consignersQuery.data ?? [];
    const consigner = consignerList.find(
      (c) => c.id === prefillTrip.consignerId,
    );
    setEditingItem(null);
    setForm({
      ...defaultForm,
      loadingTripId: prefillTrip.id.toString(),
      bookingRate: consigner ? consigner.nonAssociationRate.toString() : "",
      billingRate: consigner ? consigner.billingRate.toString() : "",
    });
    setDialogOpen(true);
    onPrefillConsumed?.();
  }, [prefillTrip, consignersQuery.data, onPrefillConsumed]);

  const getTrip = (id: bigint) => trips.find((t) => t.id === id);
  const getVehicleNum = (id: bigint) =>
    vehicles.find((v) => v.id === id)?.vehicleNumber ?? id.toString();

  // Live calculations from form values
  const computedValues = useMemo(() => {
    const trip = form.loadingTripId
      ? trips.find(
          (t) =>
            t.id === BigInt(form.loadingTripId) ||
            Number(t.id) === Number(form.loadingTripId),
        )
      : null;
    const loadingQty = trip ? Number(trip.loadingQty) || 0 : 0;
    const unloadingQty = Number(form.unloadingQty) || 0;
    const advanceCash = trip ? Number(trip.advanceCash) || 0 : 0;
    const advanceBank = trip ? Number(trip.advanceBank) || 0 : 0;
    const hsdAmount = trip ? Number(trip.hsdAmount) || 0 : 0;

    const shortageQty = Math.max(0, loadingQty - unloadingQty);
    const shortageAmount = shortageQty > 0.05 ? shortageQty * 5000 : 0;
    const cashTds = advanceCash * 0.02;
    const bookingRate = Number(form.bookingRate) || 0;
    const billingRate = Number(form.billingRate) || 0;
    const gpsDeduction = Number(form.gpsDeduction) || 131;
    const challanDeduction = Number(form.challanDeduction) || 200;
    const penalty = Number(form.penalty) || 0;

    const tollCharges = Number(form.tollCharges) || 0;
    const vehicleCost = unloadingQty * bookingRate;
    const clientBillAmount = unloadingQty * billingRate;
    const netPayableToVehicle =
      vehicleCost -
      advanceCash -
      advanceBank -
      hsdAmount -
      gpsDeduction -
      challanDeduction -
      penalty -
      tollCharges -
      cashTds;

    return {
      loadingQty,
      shortageQty,
      shortageAmount,
      cashTds,
      vehicleCost,
      clientBillAmount,
      netPayableToVehicle,
      advanceCash,
      advanceBank,
      hsdAmount,
      tollCharges,
    };
  }, [form, trips]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: Unloading) => {
    setEditingItem(item);
    setForm({
      loadingTripId: item.loadingTripId.toString(),
      unloadingDate: item.unloadingDate,
      unloadingQty: item.unloadingQty.toString(),
      gpsDeduction: item.gpsDeduction.toString(),
      challanDeduction: item.challanDeduction.toString(),
      penalty: item.penalty.toString(),
      tollCharges: item.tollCharges.toString(),
      bookingRate: item.bookingRate.toString(),
      billingRate: item.billingRate.toString(),
    });
    setDialogOpen(true);
  };

  // Auto-fill rates when consigner changes via trip selection
  const handleTripSelect = (tripId: string) => {
    const trip = trips.find((t) => t.id === BigInt(tripId));
    if (trip) {
      const consigner = consigners.find((c) => c.id === trip.consignerId);
      setForm((p) => ({
        ...p,
        loadingTripId: tripId,
        bookingRate: consigner
          ? consigner.nonAssociationRate.toString()
          : p.bookingRate,
        billingRate: consigner
          ? consigner.billingRate.toString()
          : p.billingRate,
      }));
    } else {
      setForm((p) => ({ ...p, loadingTripId: tripId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.loadingTripId) {
      toast.error("Please select a loading trip");
      return;
    }
    const cv = computedValues;
    const data: Omit<Unloading, "id"> = {
      loadingTripId: BigInt(form.loadingTripId),
      unloadingDate: form.unloadingDate,
      unloadingQty: Number(form.unloadingQty),
      shortageQty: cv.shortageQty,
      shortageAmount: cv.shortageAmount,
      gpsDeduction: Number(form.gpsDeduction) || 131,
      challanDeduction: Number(form.challanDeduction) || 200,
      penalty: Number(form.penalty) || 0,
      tollCharges: Number(form.tollCharges) || 0,
      cashTds: cv.cashTds,
      bookingRate: Number(form.bookingRate),
      billingRate: Number(form.billingRate),
      vehicleCost: cv.vehicleCost,
      clientBillAmount: cv.clientBillAmount,
      netPayableToVehicle: cv.netPayableToVehicle,
    };
    try {
      if (editingItem) {
        await updateUnloading.mutateAsync({ id: editingItem.id, ...data });
        toast.success("Unloading record updated");
      } else {
        await createUnloading.mutateAsync(data);
        toast.success("Unloading recorded successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save unloading record.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteUnloading.mutateAsync(deleteConfirm.id);
      toast.success("Unloading record deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete unloading record.");
    }
  };

  const isSaving = createUnloading.isPending || updateUnloading.isPending;
  const selectedTrip = form.loadingTripId
    ? (trips.find(
        (t) =>
          t.id === BigInt(form.loadingTripId) ||
          Number(t.id) === Number(form.loadingTripId),
      ) ?? null)
    : null;

  const fmt = (n: number) =>
    `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 space-y-5" data-ocid="unloading.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.65 0.16 150 / 0.12)" }}
          >
            <PackageCheck
              className="h-4 w-4"
              style={{ color: "oklch(0.45 0.16 150)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Unloading Records
            </h2>
            <p className="text-sm text-muted-foreground">
              {unloadings.length} record{unloadings.length !== 1 ? "s" : ""} ·{" "}
              {loadedTrips.length} trips awaiting unloading
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="unloading.add_button"
        >
          <Plus className="h-4 w-4" />
          Record Unloading
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {unloadingsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : unloadings.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="unloading.empty_state"
          >
            <PackageCheck className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No unloading records yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Record unloading to calculate vehicle costs and deductions
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="unloading.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Trip ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Vehicle
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Unload (MT)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Shortage
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Vehicle Cost
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Client Bill
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Net Payable
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    GPS Ded.
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Penalty
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Toll
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Cash TDS
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unloadings.map((item, index) => {
                  const trip = getTrip(item.loadingTripId);
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className="table-row-hover"
                      data-ocid={`unloading.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-mono font-semibold">
                        {trip?.tripId ?? item.loadingTripId.toString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.unloadingDate)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {trip ? getVehicleNum(trip.vehicleId) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {item.unloadingQty.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {item.shortageQty > 0 ? (
                          <span className="text-destructive font-medium">
                            {item.shortageQty.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {fmt(item.vehicleCost)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {fmt(item.clientBillAmount)}
                      </TableCell>
                      <TableCell
                        className="text-xs text-right font-semibold"
                        style={{
                          color:
                            item.netPayableToVehicle < 0
                              ? "oklch(0.45 0.2 27)"
                              : "oklch(0.4 0.16 150)",
                        }}
                      >
                        {fmt(item.netPayableToVehicle)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {fmt(item.gpsDeduction)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {fmt(item.penalty)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {fmt(item.tollCharges)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {fmt(item.cashTds)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                            className="h-7 w-7 p-0"
                            data-ocid={`unloading.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(item)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            data-ocid={`unloading.delete_button.${index + 1}`}
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
          data-ocid="unloading.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit Unloading Record" : "Record Unloading"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Loading Trip *</Label>
                <Select
                  value={form.loadingTripId}
                  onValueChange={handleTripSelect}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="unloading.trip.select"
                  >
                    <SelectValue placeholder="Select loaded trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show loaded trips for new, or include the editing trip */}
                    {(editingItem
                      ? trips.filter(
                          (t) =>
                            t.id === BigInt(form.loadingTripId) ||
                            t.status === "loaded",
                        )
                      : loadedTrips
                    ).map((t) => (
                      <SelectItem
                        key={t.id.toString()}
                        value={t.id.toString()}
                        className="text-xs"
                      >
                        {t.tripId} — {getVehicleNum(t.vehicleId)} (
                        {t.loadingQty.toFixed(2)} MT)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ul-date" className="text-xs">
                  Unloading Date *
                </Label>
                <Input
                  id="ul-date"
                  type="date"
                  value={form.unloadingDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, unloadingDate: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="unloading.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ul-qty" className="text-xs">
                  Unloading Qty (MT) *
                </Label>
                <Input
                  id="ul-qty"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={form.unloadingQty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, unloadingQty: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="unloading.qty.input"
                />
              </div>
              {selectedTrip && (
                <div className="flex items-center rounded-lg border border-border bg-muted/30 px-3">
                  <div className="text-xs space-y-0.5">
                    <p className="text-muted-foreground">Loading Qty</p>
                    <p className="font-semibold">
                      {selectedTrip.loadingQty.toFixed(3)} MT
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Rates */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">
                Rates (₹/MT)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ul-booking" className="text-xs">
                    Booking Rate (to vehicle owner)
                  </Label>
                  <Input
                    id="ul-booking"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.bookingRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, bookingRate: e.target.value }))
                    }
                    required
                    className="text-xs"
                    data-ocid="unloading.booking_rate.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ul-billing" className="text-xs">
                    Billing Rate (Jeen Trade → Client Invoice)
                  </Label>
                  <Input
                    id="ul-billing"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.billingRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, billingRate: e.target.value }))
                    }
                    required
                    className="text-xs"
                    data-ocid="unloading.billing_rate.input"
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">
                Deductions
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ul-gps" className="text-xs">
                    GPS (₹/trip)
                  </Label>
                  <Input
                    id="ul-gps"
                    type="number"
                    min="0"
                    value={form.gpsDeduction}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gpsDeduction: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="unloading.gps.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Challan Ded. (₹)</Label>
                  <Select
                    value={form.challanDeduction}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, challanDeduction: v }))
                    }
                  >
                    <SelectTrigger
                      className="text-xs"
                      data-ocid="unloading.challan.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100" className="text-xs">
                        ₹100
                      </SelectItem>
                      <SelectItem value="200" className="text-xs">
                        ₹200
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ul-penalty" className="text-xs">
                    Penalty (₹)
                  </Label>
                  <Input
                    id="ul-penalty"
                    type="number"
                    min="0"
                    value={form.penalty}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, penalty: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="unloading.penalty.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ul-toll" className="text-xs">
                    Toll Charges (₹)
                  </Label>
                  <Input
                    id="ul-toll"
                    type="number"
                    min="0"
                    value={form.tollCharges}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tollCharges: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="unloading.toll.input"
                  />
                </div>
              </div>
            </div>

            {/* Live preview panel */}
            {form.unloadingQty && form.bookingRate && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-bold text-foreground">
                  📊 Live Calculation Preview
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loading Qty</span>
                    <span className="font-medium">
                      {computedValues.loadingQty.toFixed(3)} MT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unloading Qty</span>
                    <span className="font-medium">
                      {Number(form.unloadingQty).toFixed(3)} MT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shortage Qty</span>
                    <span
                      className={
                        computedValues.shortageQty > 0
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {computedValues.shortageQty.toFixed(3)} MT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Shortage Amount
                    </span>
                    <span
                      className={
                        computedValues.shortageAmount > 0
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {fmt(computedValues.shortageAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash TDS (2%)</span>
                    <span className="font-medium">
                      {fmt(computedValues.cashTds)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Advance (Cash+Bank)
                    </span>
                    <span className="font-medium">
                      {fmt(
                        computedValues.advanceCash + computedValues.advanceBank,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HSD Amount</span>
                    <span className="font-medium">
                      {fmt(computedValues.hsdAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toll Charges</span>
                    <span className="font-medium">
                      {fmt(computedValues.tollCharges)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle Cost</span>
                    <span className="font-semibold text-foreground">
                      {fmt(computedValues.vehicleCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client Bill</span>
                    <span className="font-semibold text-foreground">
                      {fmt(computedValues.clientBillAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5 col-span-2">
                    <span className="font-semibold text-foreground">
                      Net Payable to Vehicle
                    </span>
                    <span
                      className="font-bold text-sm"
                      style={{
                        color:
                          computedValues.netPayableToVehicle < 0
                            ? "oklch(0.45 0.2 27)"
                            : "oklch(0.4 0.16 150)",
                      }}
                    >
                      {fmt(computedValues.netPayableToVehicle)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="unloading.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSaving || !form.loadingTripId || !form.unloadingDate
                }
                className="text-xs"
                data-ocid="unloading.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Record"
                ) : (
                  "Save Unloading"
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
        <DialogContent className="max-w-sm" data-ocid="unloading.delete_dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Unloading Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete this unloading record? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="unloading.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteUnloading.isPending}
              className="text-xs"
              data-ocid="unloading.delete_confirm_button"
            >
              {deleteUnloading.isPending ? (
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
