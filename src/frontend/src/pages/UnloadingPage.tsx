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
  Download,
  Eye,
  Loader2,
  Lock,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchableSelect } from "../components/SearchableSelect";
import {
  type LoadingTrip,
  type Unloading,
  useCreateUnloading,
  useDeleteUnloading,
  useGetAllBillingInvoices,
  useGetAllConsigners,
  useGetAllDeliveryOrders,
  useGetAllLoadingTrips,
  useGetAllUnloadings,
  useGetAllVehicles,
  useUpdateUnloading,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

function viewFile(fileUrl: string) {
  if (fileUrl.startsWith("data:")) {
    const [header, base64] = fileUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const byteChars = atob(base64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++)
      byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: mime });
    window.open(URL.createObjectURL(blob), "_blank");
  } else {
    window.open(fileUrl, "_blank");
  }
}

function downloadFile(fileUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName || "file";
  link.click();
}

function printFile(fileUrl: string) {
  if (fileUrl.startsWith("data:image")) {
    const win = window.open("", "_blank");
    win?.document.write(
      `<html><body style="margin:0"><img src="${fileUrl}" style="max-width:100%" onload="window.print();window.close()"/></body></html>`,
    );
    win?.document.close();
  } else if (
    fileUrl.startsWith("data:application/pdf") ||
    fileUrl.includes(".pdf")
  ) {
    if (fileUrl.startsWith("data:")) {
      const [header, base64] = fileUrl.split(",");
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
      const byteChars = atob(base64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++)
        byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: mime });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      win?.addEventListener("load", () => {
        win.print();
      });
    } else {
      const win = window.open(fileUrl, "_blank");
      win?.addEventListener("load", () => {
        win?.print();
      });
    }
  } else {
    const win = window.open(fileUrl, "_blank");
    win?.addEventListener("load", () => {
      win?.print();
    });
  }
}

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
  shortageRate: string; // per ton, default 5000
  unloadingCopyUrl: string;
  unloadingCopyName: string;
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
  shortageRate: "5000",
  unloadingCopyUrl: "",
  unloadingCopyName: "",
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
  const dosQuery = useGetAllDeliveryOrders();
  const billingInvoicesQuery = useGetAllBillingInvoices();
  const createUnloading = useCreateUnloading();
  const updateUnloading = useUpdateUnloading();
  const deleteUnloading = useDeleteUnloading();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Unloading | null>(null);
  const [form, setForm] = useState<UnloadingFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Unloading | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const unloadings = unloadingsQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const dos = dosQuery.data ?? [];
  const billingInvoices = billingInvoicesQuery.data ?? [];
  const billedUnloadingMap = new Map<string, string>();
  for (const inv of billingInvoices) {
    for (const uid of inv.unloadingIds ?? []) {
      billedUnloadingMap.set(uid.toString(), inv.invoiceNumber);
    }
  }

  const loadedTrips = trips.filter((t) => t.status === "loaded");

  // Helper: get rates from DO or fall back to Consigner master
  const getRatesForTrip = (trip: LoadingTrip) => {
    const consignerList = consignersQuery.data ?? [];
    const consigner = consignerList.find((c) => c.id === trip.consignerId);

    // Try to get rates from the linked DO first
    if (trip.doId && trip.doId !== 0n) {
      const linkedDO = dos.find((d) => {
        try {
          return BigInt(d.id.toString()) === BigInt(trip.doId.toString());
        } catch {
          return false;
        }
      });
      if (linkedDO) {
        return {
          bookingRate: (
            linkedDO.nonAssociationRate ||
            consigner?.nonAssociationRate ||
            0
          ).toString(),
          billingRate: (
            linkedDO.billingRate ||
            consigner?.billingRate ||
            0
          ).toString(),
          gpsDeduction: (linkedDO.gpsCharges || 131).toString(),
          shortageRate: (linkedDO.shortageRate || 5000).toString(),
        };
      }
    }
    // Fall back to Consigner master
    return {
      bookingRate: consigner ? consigner.nonAssociationRate.toString() : "",
      billingRate: consigner ? consigner.billingRate.toString() : "",
      gpsDeduction: "131",
      shortageRate: "5000",
    };
  };

  // Prefill from loading trips page
  useEffect(() => {
    if (!prefillTrip) return;
    const rates = getRatesForTrip(prefillTrip);
    setEditingItem(null);
    setForm({
      ...defaultForm,
      loadingTripId: prefillTrip.id.toString(),
      ...rates,
    });
    setDialogOpen(true);
    onPrefillConsumed?.();
    // biome-ignore lint/correctness/useExhaustiveDependencies: getRatesForTrip is a stable closure
  }, [prefillTrip, onPrefillConsumed, getRatesForTrip]);

  const getTrip = (id: bigint) => trips.find((t) => t.id === id);
  const getVehicleNum = (id: bigint) =>
    vehicles.find((v) => v.id === id)?.vehicleNumber ?? id.toString();

  const filteredUnloadings = unloadings.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const trip = trips.find((t) => {
      try {
        return (
          BigInt(t.id.toString()) === BigInt(item.loadingTripId.toString())
        );
      } catch {
        return false;
      }
    });
    const challanNo = trip?.challanNo ?? "";
    const vehicleNum = trip
      ? (vehicles.find((v) => v.id === trip.vehicleId)?.vehicleNumber ?? "")
      : "";
    const passNo = trip?.passNumber ?? "";
    const doNum =
      trip?.doId && trip.doId !== 0n
        ? (dos.find((d) => {
            try {
              return BigInt(d.id.toString()) === BigInt(trip.doId.toString());
            } catch {
              return false;
            }
          })?.doNumber ?? "")
        : "";
    return (
      challanNo.toLowerCase().includes(q) ||
      vehicleNum.toLowerCase().includes(q) ||
      passNo.toLowerCase().includes(q) ||
      doNum.toLowerCase().includes(q)
    );
  });

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
    const shortageRateVal = Number(form.shortageRate) || 5000;
    const shortageAmount =
      shortageQty > 0.05 ? shortageQty * shortageRateVal : 0;
    const cashTds = advanceCash * 0.02;
    const bookingRate = Number(form.bookingRate) || 0;
    const billingRate = Number(form.billingRate) || 0;
    const gpsDeduction = Number(form.gpsDeduction) || 131;
    const challanDeduction = Number(form.challanDeduction) || 200;
    const penalty = Number(form.penalty) || 0;

    const tollCharges = Number(form.tollCharges) || 0;
    const vehicleCost = unloadingQty * bookingRate;
    const clientBillAmount = unloadingQty * billingRate;
    const gstAmount = clientBillAmount * 0.18;
    const billAmount = clientBillAmount + gstAmount;
    const netPayableToVehicle =
      vehicleCost -
      shortageAmount -
      gpsDeduction -
      challanDeduction -
      advanceCash -
      advanceBank -
      hsdAmount -
      cashTds -
      penalty +
      tollCharges;

    return {
      loadingQty,
      unloadingQty,
      shortageQty,
      shortageAmount,
      cashTds,
      vehicleCost,
      clientBillAmount,
      gstAmount,
      billAmount,
      netPayableToVehicle,
      advanceCash,
      advanceBank,
      hsdAmount,
      tollCharges,
      bookingRate,
      billingRate,
    };
  }, [form, trips]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: Unloading) => {
    setEditingItem(item);
    // Compute shortageRate back from stored data if possible
    const shortageRateFromData =
      item.shortageQty > 0 && item.shortageAmount > 0
        ? Math.round(item.shortageAmount / item.shortageQty).toString()
        : "5000";
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
      shortageRate: shortageRateFromData,
      unloadingCopyUrl: (item as any).unloadingCopyUrl ?? "",
      unloadingCopyName: (item as any).unloadingCopyName ?? "",
    });
    setDialogOpen(true);
  };

  // Auto-fill rates from DO (preferred) or Consigner master when trip is selected
  const handleTripSelect = (tripId: string) => {
    const trip = trips.find(
      (t) => t.id.toString() === tripId || Number(t.id) === Number(tripId),
    );
    if (trip) {
      const rates = getRatesForTrip(trip);
      setForm((p) => ({
        ...p,
        loadingTripId: tripId,
        ...rates,
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

    // Duplicate unloading check — one unloading record per trip (challan) only
    if (!editingItem) {
      const tripIdBig = BigInt(form.loadingTripId);
      const alreadyUnloaded = unloadings.find((u) => {
        try {
          return BigInt(u.loadingTripId.toString()) === tripIdBig;
        } catch {
          return false;
        }
      });
      if (alreadyUnloaded) {
        const trip = trips.find((t) => {
          try {
            return BigInt(t.id.toString()) === tripIdBig;
          } catch {
            return false;
          }
        });
        toast.error(
          `Unloading already recorded for Challan ${trip?.challanNo ?? form.loadingTripId}. Double entry not allowed.`,
          { duration: 6000 },
        );
        return;
      }
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
      ...(form.unloadingCopyUrl
        ? {
            unloadingCopyUrl: form.unloadingCopyUrl,
            unloadingCopyName: form.unloadingCopyName,
          }
        : {}),
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
    const billedInv = billedUnloadingMap.get(deleteConfirm.id.toString());
    if (billedInv) {
      toast.error(
        `Cannot delete: this unloading is included in invoice ${billedInv}.`,
      );
      setDeleteConfirm(null);
      return;
    }
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by challan no, vehicle no, pass no, DO no..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-ocid="unloading.search_input"
        />
        {searchQuery && filteredUnloadings.length < unloadings.length && (
          <p className="mt-1 text-xs text-muted-foreground">
            Showing {filteredUnloadings.length} of {unloadings.length} records
          </p>
        )}
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
                    Challan No
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
                {filteredUnloadings.map((item, index) => {
                  const trip = getTrip(item.loadingTripId);
                  const billedInvoice = billedUnloadingMap.get(
                    item.id.toString(),
                  );
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className={
                        billedInvoice
                          ? "bg-amber-50 hover:bg-amber-100/70"
                          : "table-row-hover"
                      }
                      data-ocid={`unloading.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-mono font-semibold">
                        {trip?.challanNo ?? item.loadingTripId.toString()}
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
                          {billedInvoice && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 mr-1"
                              title={`Locked: included in Invoice ${billedInvoice}`}
                            >
                              <Lock className="h-3 w-3 text-amber-600" />
                              <span className="text-amber-600">🔒</span>
                              Billed
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              !billedInvoice && openEditDialog(item)
                            }
                            className="h-7 w-7 p-0"
                            disabled={!!billedInvoice}
                            title={
                              billedInvoice
                                ? `Locked: included in Invoice ${billedInvoice} — cannot edit`
                                : "Edit"
                            }
                            data-ocid={`unloading.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              !billedInvoice && setDeleteConfirm(item)
                            }
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            disabled={!!billedInvoice}
                            title={
                              billedInvoice
                                ? `Cannot delete: this unloading is included in invoice ${billedInvoice}`
                                : "Delete"
                            }
                            data-ocid={`unloading.delete_button.${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {(item as any).unloadingCopyUrl && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  viewFile((item as any).unloadingCopyUrl)
                                }
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                title="View unloading copy"
                                data-ocid={`unloading.view.button.${index + 1}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  downloadFile(
                                    (item as any).unloadingCopyUrl,
                                    (item as any).unloadingCopyName ||
                                      "unloading-copy",
                                  )
                                }
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                                title="Download unloading copy"
                                data-ocid={`unloading.download.button.${index + 1}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  printFile((item as any).unloadingCopyUrl)
                                }
                                className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                                title="Print unloading copy"
                                data-ocid={`unloading.print.button.${index + 1}`}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
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
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
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
                <SearchableSelect
                  value={form.loadingTripId}
                  onChange={handleTripSelect}
                  placeholder="Search challan / vehicle..."
                  data-ocid="unloading.trip.select"
                  options={(editingItem ? trips : loadedTrips).map((t) => {
                    const alreadyUnloaded =
                      !editingItem &&
                      unloadings.some((u) => {
                        try {
                          return (
                            BigInt(u.loadingTripId.toString()) ===
                            BigInt(t.id.toString())
                          );
                        } catch {
                          return false;
                        }
                      });
                    return {
                      value: t.id.toString(),
                      label: `${t.challanNo} — ${getVehicleNum(t.vehicleId)} (${t.loadingQty.toFixed(2)} MT)${alreadyUnloaded ? " ✓ Already Unloaded" : ""}`,
                      disabled: alreadyUnloaded,
                    };
                  })}
                />
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
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Rates (₹/MT)
                </p>
                {selectedTrip && selectedTrip.doId !== 0n && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: "oklch(0.55 0.16 150 / 0.12)",
                      color: "oklch(0.35 0.16 150)",
                    }}
                  >
                    Auto-filled from DO
                  </span>
                )}
              </div>
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
                Deductions & Rates
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ul-shortage-rate" className="text-xs">
                    Shortage Rate (₹/MT)
                  </Label>
                  <Input
                    id="ul-shortage-rate"
                    type="number"
                    min="0"
                    value={form.shortageRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, shortageRate: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="unloading.shortage_rate.input"
                  />
                </div>
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

            {/* Unloading Copy Upload */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                Unloading Copy <span className="text-destructive">*</span>
              </p>
              {form.unloadingCopyUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="text-xs text-emerald-700 font-medium flex-1 truncate">
                    {form.unloadingCopyName || "Uploaded file"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => viewFile(form.unloadingCopyUrl)}
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    title="View"
                    data-ocid="unloading.copy_view.button"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      downloadFile(
                        form.unloadingCopyUrl,
                        form.unloadingCopyName || "unloading-copy",
                      )
                    }
                    className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700"
                    title="Download"
                    data-ocid="unloading.copy_download.button"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        unloadingCopyUrl: "",
                        unloadingCopyName: "",
                      }))
                    }
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Remove"
                    data-ocid="unloading.copy_remove.button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <label
                  className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-background px-4 py-3 text-xs text-muted-foreground hover:border-primary/40 hover:bg-muted/50 transition-colors"
                  data-ocid="unloading.copy_upload.button"
                >
                  <Download className="h-4 w-4 mb-1 opacity-50" />
                  <span>
                    Click to upload unloading copy (PDF, JPG, PNG — max 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("File too large. Max 5MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setForm((p) => ({
                          ...p,
                          unloadingCopyUrl: ev.target?.result as string,
                          unloadingCopyName: file.name,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Live Calculation Preview — Two-Panel Excel Style */}
            {form.unloadingQty && form.bookingRate && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                    Live Calculation Preview
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: "oklch(0.7 0.05 250 / 0.3)" }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* LEFT PANEL — Live Calculation Preview Payable */}
                  <div
                    className="rounded overflow-hidden border text-xs"
                    style={{ borderColor: "oklch(0.55 0.16 150 / 0.5)" }}
                  >
                    {/* Panel Header */}
                    <div
                      className="px-3 py-2"
                      style={{
                        background: "oklch(0.3 0.1 150)",
                        color: "white",
                      }}
                    >
                      <span className="font-bold text-[11px] tracking-wider uppercase">
                        Live Calculation Preview
                      </span>
                      <br />
                      <span className="font-semibold text-[11px] opacity-90">
                        Payable
                      </span>
                    </div>

                    {/* Spreadsheet rows */}
                    <table
                      className="w-full border-collapse"
                      style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "11px",
                      }}
                    >
                      <tbody>
                        {[
                          {
                            label: "Loading Qty",
                            value: `${computedValues.loadingQty.toFixed(1)}`,
                          },
                          {
                            label: "Unloading Qty",
                            value: `${computedValues.unloadingQty.toFixed(1)}`,
                          },
                          {
                            label: "Booking Rate",
                            value: `${computedValues.bookingRate.toLocaleString("en-IN")}`,
                          },
                          {
                            label: "Vehicle Cost",
                            value: `${computedValues.vehicleCost.toLocaleString("en-IN")}`,
                            bold: true,
                          },
                          {
                            label: "Shortage Qty",
                            value: `${computedValues.shortageQty.toFixed(1)}`,
                            danger: computedValues.shortageQty > 0,
                          },
                          {
                            label: "Shortage Amount",
                            value: `${computedValues.shortageAmount.toLocaleString("en-IN")}`,
                            danger: computedValues.shortageAmount > 0,
                          },
                          {
                            label: "Cash TDS (2%)",
                            value: `${Math.round(computedValues.cashTds).toLocaleString("en-IN")}`,
                          },
                          {
                            label: "Advance (Cash+Bank)",
                            value: `${(computedValues.advanceCash + computedValues.advanceBank).toLocaleString("en-IN")}`,
                          },
                          {
                            label: "HSD Amount",
                            value: `${computedValues.hsdAmount.toLocaleString("en-IN")}`,
                          },
                          {
                            label: "Toll Charges payable",
                            value: `${computedValues.tollCharges.toLocaleString("en-IN")}`,
                          },
                          {
                            label: "GPS Deduction",
                            value: `${(Number(form.gpsDeduction) || 131).toLocaleString("en-IN")}`,
                          },
                          {
                            label: "Challan Deduction",
                            value: `${(Number(form.challanDeduction) || 200).toLocaleString("en-IN")}`,
                          },
                          {
                            label: "Penalty",
                            value: `${(Number(form.penalty) || 0).toLocaleString("en-IN")}`,
                          },
                        ].map((row, i) => (
                          <tr
                            key={row.label}
                            style={{
                              background: i % 2 === 0 ? "#ffffff" : "#f0f4f0",
                            }}
                          >
                            <td
                              style={{
                                padding: "5px 10px",
                                borderBottom: "1px solid #d0ddd0",
                                borderRight: "1px solid #d0ddd0",
                                color: row.danger ? "#c0392b" : "#1a2a1a",
                                fontWeight: row.bold ? 600 : 400,
                                width: "65%",
                              }}
                            >
                              {row.label}
                            </td>
                            <td
                              style={{
                                padding: "5px 10px",
                                borderBottom: "1px solid #d0ddd0",
                                textAlign: "right",
                                color: row.danger
                                  ? "#c0392b"
                                  : row.bold
                                    ? "#0a4020"
                                    : "#1a2a1a",
                                fontWeight: row.bold ? 700 : 400,
                              }}
                            >
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr
                          style={{
                            background:
                              computedValues.netPayableToVehicle < 0
                                ? "#c0392b"
                                : "#1a6b35",
                            color: "white",
                          }}
                        >
                          <td
                            style={{
                              padding: "7px 10px",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            payable
                          </td>
                          <td
                            style={{
                              padding: "7px 10px",
                              textAlign: "right",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            {Math.round(
                              computedValues.netPayableToVehicle,
                            ).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* RIGHT PANEL — Live Calculation Preview Receivable */}
                  <div
                    className="rounded overflow-hidden border text-xs"
                    style={{ borderColor: "oklch(0.45 0.18 250 / 0.5)" }}
                  >
                    {/* Panel Header */}
                    <div
                      className="px-3 py-2"
                      style={{
                        background: "oklch(0.28 0.12 250)",
                        color: "white",
                      }}
                    >
                      <span className="font-bold text-[11px] tracking-wider uppercase">
                        Live Calculation Preview
                      </span>
                      <br />
                      <span className="font-semibold text-[11px] opacity-90">
                        Receivable
                      </span>
                    </div>

                    {/* Spreadsheet rows */}
                    <table
                      className="w-full border-collapse"
                      style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "11px",
                      }}
                    >
                      <tbody>
                        {[
                          {
                            label: "Loading Qty",
                            value: `${computedValues.loadingQty.toFixed(1)}`,
                          },
                          {
                            label: "Unloading Qty",
                            value: `${computedValues.unloadingQty.toFixed(1)}`,
                          },
                          {
                            label: "Billing Rate",
                            value: `${computedValues.billingRate.toLocaleString("en-IN")}`,
                          },
                          {
                            label: "vehicle cost",
                            value: `${computedValues.clientBillAmount.toLocaleString("en-IN")}`,
                            bold: true,
                          },
                          {
                            label: "Gst applicable",
                            value: `${Math.round(computedValues.gstAmount).toLocaleString("en-IN")}`,
                          },
                        ].map((row, i) => (
                          <tr
                            key={row.label}
                            style={{
                              background: i % 2 === 0 ? "#ffffff" : "#f0f2f8",
                            }}
                          >
                            <td
                              style={{
                                padding: "5px 10px",
                                borderBottom: "1px solid #ccd0e0",
                                borderRight: "1px solid #ccd0e0",
                                color: "#1a1a2e",
                                fontWeight: row.bold ? 600 : 400,
                                width: "65%",
                              }}
                            >
                              {row.label}
                            </td>
                            <td
                              style={{
                                padding: "5px 10px",
                                borderBottom: "1px solid #ccd0e0",
                                textAlign: "right",
                                color: row.bold ? "#0a1060" : "#1a1a2e",
                                fontWeight: row.bold ? 700 : 400,
                              }}
                            >
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#1a3080", color: "white" }}>
                          <td
                            style={{
                              padding: "7px 10px",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            bill amount
                          </td>
                          <td
                            style={{
                              padding: "7px 10px",
                              textAlign: "right",
                              fontWeight: 700,
                              fontSize: "12px",
                            }}
                          >
                            {Math.round(
                              computedValues.billAmount,
                            ).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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
