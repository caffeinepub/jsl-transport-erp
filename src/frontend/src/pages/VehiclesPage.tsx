import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  ChevronDown,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileUp,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type LoadingTrip,
  type Vehicle,
  useCreateVehicle,
  useDeleteVehicle,
  useGetAllBillingInvoices,
  useGetAllLoadingTrips,
  useGetAllVehicles,
  useUpdateVehicle,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

function bigIntEqStr(a: bigint | number, b: bigint | number): boolean {
  return BigInt(a) === BigInt(b);
}

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

function getVehicleTripCount(
  vehicleId: bigint | number,
  trips: LoadingTrip[],
): number {
  return trips.filter((t) => bigIntEqStr(t.vehicleId, vehicleId)).length;
}

/** Check expiry fields for 'own' or 'vendor' (also 'rented') vehicles */
function getExpiringDocs(vehicle: Vehicle): { label: string; days: number }[] {
  const needsCheck =
    vehicle.vehicleType === "own" ||
    vehicle.vehicleType === "vendor" ||
    vehicle.vehicleType === "rented";
  if (!needsCheck) return [];
  const checks = [
    { label: "Insurance", dateStr: vehicle.insuranceExpiry },
    { label: "Pollution Certificate", dateStr: vehicle.pollutionExpiry },
    { label: "Fitness Certificate", dateStr: vehicle.fitnessExpiry },
  ];
  const result: { label: string; days: number }[] = [];
  for (const c of checks) {
    if (!c.dateStr) continue;
    const days = getDaysUntilExpiry(c.dateStr);
    if (days <= 30) result.push({ label: c.label, days });
  }
  return result;
}

interface VehicleFormData {
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  ownerPhone: string;
  ownerAddress: string;
  panCard: string;
  bank1AccountHolder: string;
  bank1BankName: string;
  bank1AccountNo: string;
  bank1IFSC: string;
  bank1Branch: string;
  bank2AccountHolder: string;
  bank2BankName: string;
  bank2AccountNo: string;
  bank2IFSC: string;
  bank2Branch: string;
  insuranceExpiry: string;
  pollutionExpiry: string;
  fitnessExpiry: string;
  undertakingFileUrl: string;
  undertakingFileName: string;
  isActive: boolean;
}

const VEHICLE_TYPES = [
  { value: "association", label: "Association" },
  { value: "non-association", label: "Non-Association" },
  { value: "own", label: "Own" },
  { value: "vendor", label: "Vendor" },
];

const defaultForm: VehicleFormData = {
  vehicleNumber: "",
  vehicleType: "own",
  ownerName: "",
  ownerPhone: "",
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
  undertakingFileUrl: "",
  undertakingFileName: "",
  isActive: true,
};

function getDaysUntilExpiry(dateStr: string): number {
  if (!dateStr) return 999;
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function ExpiryBadge({ label, dateStr }: { label: string; dateStr: string }) {
  if (!dateStr) return null;
  const days = getDaysUntilExpiry(dateStr);
  let cls = "status-paid";
  if (days < 0) cls = "status-pending";
  else if (days <= 30) cls = "status-partial";

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}
      >
        {days < 0
          ? "Expired"
          : days <= 30
            ? `${days}d left`
            : formatDate(dateStr)}
      </span>
    </div>
  );
}

function VehicleTypeBadge({ type }: { type: string }) {
  const cls =
    type === "own"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : type === "association"
        ? "bg-violet-50 text-violet-700 border-violet-200"
        : type === "non-association"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200";
  const label =
    type === "non-association"
      ? "Non-Assoc."
      : type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function maskPAN(pan: string): string {
  if (!pan || pan.length < 10) return pan;
  return `${pan.slice(0, 5)}*****`;
}

function getBankAccountBadge(vehicle: Vehicle): string {
  const has1 = !!(vehicle.bank1AccountNo || vehicle.bank1BankName);
  const has2 = !!(vehicle.bank2AccountNo || vehicle.bank2BankName);
  if (has1 && has2) return "2 Accounts";
  if (has1) return "1 Account";
  return "No Bank";
}

function BankAccountSection({
  label,
  accountHolder,
  bankName,
  accountNo,
  ifsc,
  branch,
  onChangeHolder,
  onChangeBankName,
  onChangeAccountNo,
  onChangeIFSC,
  onChangeBranch,
  prefix,
}: {
  label: string;
  accountHolder: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  onChangeHolder: (v: string) => void;
  onChangeBankName: (v: string) => void;
  onChangeAccountNo: (v: string) => void;
  onChangeIFSC: (v: string) => void;
  onChangeBranch: (v: string) => void;
  prefix: string;
}) {
  const [open, setOpen] = useState(false);
  const hasFilled = !!(accountNo || bankName || accountHolder);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            {label}
            {hasFilled && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-semibold">
                Filled
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-md border border-border bg-muted/10 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-holder`} className="text-xs">
                Account Holder Name
              </Label>
              <Input
                id={`${prefix}-holder`}
                placeholder="Name on account"
                value={accountHolder}
                onChange={(e) => onChangeHolder(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-bankname`} className="text-xs">
                Bank Name
              </Label>
              <Input
                id={`${prefix}-bankname`}
                placeholder="e.g. SBI, HDFC"
                value={bankName}
                onChange={(e) => onChangeBankName(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-accno`} className="text-xs">
                Account Number
              </Label>
              <Input
                id={`${prefix}-accno`}
                placeholder="Account number"
                value={accountNo}
                onChange={(e) => onChangeAccountNo(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${prefix}-ifsc`} className="text-xs">
                IFSC Code
              </Label>
              <Input
                id={`${prefix}-ifsc`}
                placeholder="e.g. SBIN0001234"
                value={ifsc}
                onChange={(e) => onChangeIFSC(e.target.value.toUpperCase())}
                className="text-xs font-mono uppercase"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor={`${prefix}-branch`} className="text-xs">
                Branch
              </Label>
              <Input
                id={`${prefix}-branch`}
                placeholder="Branch name"
                value={branch}
                onChange={(e) => onChangeBranch(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function VehiclesPage() {
  const vehiclesQuery = useGetAllVehicles();
  const tripsQuery = useGetAllLoadingTrips();
  const billingInvoicesQuery = useGetAllBillingInvoices();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const undertakingFileRef = useRef<HTMLInputElement>(null);

  const vehicles = vehiclesQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const billingInvoices = billingInvoicesQuery.data ?? [];

  // Build set of all billed trip IDs
  const billedTripIds = useMemo(
    () =>
      new Set<string>(
        billingInvoices.flatMap((inv) =>
          (inv.tripIds ?? []).map((id) => id.toString()),
        ),
      ),
    [billingInvoices],
  );

  // Compute trip counts per vehicle id
  const tripCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vehicles) {
      map.set(v.id.toString(), getVehicleTripCount(v.id, trips));
    }
    return map;
  }, [vehicles, trips]);

  // Compute expiry alerts across all own/vendor vehicles
  const expiryAlertVehicles = useMemo(() => {
    return vehicles
      .filter((v) => ["own", "vendor", "rented"].includes(v.vehicleType))
      .map((v) => ({
        vehicle: v,
        expiringDocs: getExpiringDocs(v),
      }))
      .filter((x) => x.expiringDocs.length > 0);
  }, [vehicles]);

  const filteredVehicles = vehicles.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.vehicleNumber.toLowerCase().includes(q) ||
      item.ownerName.toLowerCase().includes(q)
    );
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleUndertakingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((p) => ({
        ...p,
        undertakingFileUrl: dataUrl,
        undertakingFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const openEditDialog = (item: Vehicle) => {
    setEditingItem(item);
    setForm({
      vehicleNumber: item.vehicleNumber,
      vehicleType: item.vehicleType,
      ownerName: item.ownerName,
      ownerPhone: item.ownerPhone,
      ownerAddress: item.ownerAddress,
      panCard: item.panCard ?? "",
      bank1AccountHolder: item.bank1AccountHolder ?? "",
      bank1BankName: item.bank1BankName ?? "",
      bank1AccountNo: item.bank1AccountNo ?? "",
      bank1IFSC: item.bank1IFSC ?? "",
      bank1Branch: item.bank1Branch ?? "",
      bank2AccountHolder: item.bank2AccountHolder ?? "",
      bank2BankName: item.bank2BankName ?? "",
      bank2AccountNo: item.bank2AccountNo ?? "",
      bank2IFSC: item.bank2IFSC ?? "",
      bank2Branch: item.bank2Branch ?? "",
      insuranceExpiry: item.insuranceExpiry,
      pollutionExpiry: item.pollutionExpiry,
      fitnessExpiry: item.fitnessExpiry,
      undertakingFileUrl:
        (item as { undertakingFileUrl?: string }).undertakingFileUrl ?? "",
      undertakingFileName:
        (item as { undertakingFileName?: string }).undertakingFileName ?? "",
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

  const needsDocuments =
    form.vehicleType === "own" ||
    form.vehicleType === "vendor" ||
    form.vehicleType === "rented";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<Vehicle, "id"> = {
      vehicleNumber: form.vehicleNumber.toUpperCase(),
      vehicleType: form.vehicleType,
      ownerName: form.ownerName,
      ownerPhone: form.ownerPhone,
      ownerAddress: form.ownerAddress,
      panCard: form.panCard.toUpperCase(),
      bank1AccountHolder: form.bank1AccountHolder,
      bank1BankName: form.bank1BankName,
      bank1AccountNo: form.bank1AccountNo,
      bank1IFSC: form.bank1IFSC.toUpperCase(),
      bank1Branch: form.bank1Branch,
      bank2AccountHolder: form.bank2AccountHolder,
      bank2BankName: form.bank2BankName,
      bank2AccountNo: form.bank2AccountNo,
      bank2IFSC: form.bank2IFSC.toUpperCase(),
      bank2Branch: form.bank2Branch,
      insuranceExpiry: needsDocuments ? form.insuranceExpiry : "",
      pollutionExpiry: needsDocuments ? form.pollutionExpiry : "",
      fitnessExpiry: needsDocuments ? form.fitnessExpiry : "",
      isActive: form.isActive,
    };
    // Attach undertaking as extra fields (cast to any for the extra fields)
    const dataWithUndertaking = {
      ...data,
      undertakingFileUrl: form.undertakingFileUrl,
      undertakingFileName: form.undertakingFileName,
    } as Omit<Vehicle, "id">;
    try {
      if (editingItem) {
        await updateVehicle.mutateAsync({
          id: editingItem.id,
          ...dataWithUndertaking,
        });
        toast.success("Vehicle updated successfully");
      } else {
        await createVehicle.mutateAsync(dataWithUndertaking);
        toast.success("Vehicle added successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save vehicle.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const tripCount = tripCountMap.get(deleteConfirm.id.toString()) ?? 0;
    // Block if any linked trip is billed
    const hasBilledTrips = trips
      .filter((t) => bigIntEqStr(t.vehicleId, deleteConfirm.id))
      .some((t) => billedTripIds.has(t.id.toString()));
    if (hasBilledTrips) {
      toast.error(
        `Cannot delete: "${deleteConfirm.vehicleNumber}" has trips included in billing invoices.`,
      );
      setDeleteConfirm(null);
      return;
    }
    if (tripCount > 0) {
      toast.error(
        `Cannot delete: "${deleteConfirm.vehicleNumber}" has ${tripCount} loading trip${tripCount !== 1 ? "s" : ""} on record`,
      );
      setDeleteConfirm(null);
      return;
    }
    try {
      await deleteVehicle.mutateAsync(deleteConfirm.id);
      toast.success("Vehicle deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete vehicle.");
    }
  };

  const isSaving = createVehicle.isPending || updateVehicle.isPending;

  const deleteConfirmTripCount = deleteConfirm
    ? (tripCountMap.get(deleteConfirm.id.toString()) ?? 0)
    : 0;
  const deleteConfirmHasBilledTrips = deleteConfirm
    ? trips
        .filter((t) => bigIntEqStr(t.vehicleId, deleteConfirm.id))
        .some((t) => billedTripIds.has(t.id.toString()))
    : false;
  // Count diesel entries from localStorage for this vehicle
  const deleteConfirmDieselCount = (() => {
    if (!deleteConfirm) return 0;
    try {
      const dieselItems = JSON.parse(
        localStorage.getItem("jt_local_diesel") || "[]",
      ) as Array<{ truckId?: string | number }>;
      return dieselItems.filter((d) => {
        try {
          return BigInt(d.truckId?.toString() ?? "") === deleteConfirm.id;
        } catch {
          return false;
        }
      }).length;
    } catch {
      return 0;
    }
  })();

  return (
    <div className="p-6 space-y-5" data-ocid="vehicles.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.45 0.16 60 / 0.12)" }}
          >
            <Truck
              className="h-4 w-4"
              style={{ color: "oklch(0.55 0.18 60)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Fleet Management
            </h2>
            <p className="text-sm text-muted-foreground">
              {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}{" "}
              registered · {vehicles.filter((v) => v.isActive).length} active
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="vehicles.add_button"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Expiry Alert Banner */}
      {expiryAlertVehicles.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          data-ocid="vehicles.expiry_alert_banner"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              ⚠ {expiryAlertVehicles.length} vehicle
              {expiryAlertVehicles.length !== 1 ? "s have" : " has"} expired or
              expiring documents
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Insurance, Pollution Certificate, or Fitness Certificate within 30
              days or already expired
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {expiryAlertVehicles.map(({ vehicle, expiringDocs }) => (
                <span
                  key={vehicle.id.toString()}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                  title={expiringDocs
                    .map(
                      (d) =>
                        `${d.label}: ${d.days < 0 ? "Expired" : `${d.days}d left`}`,
                    )
                    .join(", ")}
                >
                  {vehicle.vehicleNumber}
                  {" — "}
                  {expiringDocs.map((d) => d.label.split(" ")[0]).join(", ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by vehicle number or owner name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-ocid="vehicles.search_input"
        />
        {searchQuery && filteredVehicles.length < vehicles.length && (
          <p className="mt-1 text-xs text-muted-foreground">
            Showing {filteredVehicles.length} of {vehicles.length} vehicles
          </p>
        )}
      </div>

      {/* Grid */}
      {vehiclesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center"
          data-ocid="vehicles.empty_state"
        >
          <Truck className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No vehicles registered yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your fleet to track trips and documents
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((item, index) => {
            const bankBadge = getBankAccountBadge(item);
            const bankBadgeClass =
              bankBadge === "2 Accounts"
                ? "bg-green-50 text-green-700 border-green-200"
                : bankBadge === "1 Account"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-muted text-muted-foreground border-border";
            const tripCount = tripCountMap.get(item.id.toString()) ?? 0;
            const isLocked = tripCount > 0;
            const expiringDocs = getExpiringDocs(item);
            const hasExpiryAlert = expiringDocs.length > 0;
            // Undertaking: check both in the object and in localStorage by vehicle id
            const undertakingUrl =
              (item as { undertakingFileUrl?: string }).undertakingFileUrl ||
              localStorage.getItem(`jt_vehicle_undertaking_${item.id}`) ||
              "";

            return (
              <div
                key={item.id.toString()}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
                data-ocid={`vehicles.item.${index + 1}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold font-mono text-foreground">
                      {item.vehicleNumber}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <VehicleTypeBadge type={item.vehicleType} />
                      {!item.isActive && (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium status-pending">
                          Inactive
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${bankBadgeClass}`}
                      >
                        {bankBadge}
                      </span>
                      {/* Trip count / lock badge */}
                      {isLocked && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                          title={`In use: ${tripCount} loading trip${tripCount !== 1 ? "s" : ""} — cannot be deleted`}
                          data-ocid={`vehicles.lock_badge.${index + 1}`}
                        >
                          <Lock className="h-2.5 w-2.5" />
                          {tripCount} trip{tripCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {/* Doc expiry alert badge */}
                      {hasExpiryAlert && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700"
                          title={expiringDocs
                            .map(
                              (d) =>
                                `${d.label}: ${d.days < 0 ? "Expired" : `${d.days}d left`}`,
                            )
                            .join(", ")}
                          data-ocid={`vehicles.expiry_badge.${index + 1}`}
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />⚠ Doc Expiry
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                      className="h-7 w-7 p-0"
                      data-ocid={`vehicles.edit_button.${index + 1}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(item)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={isLocked}
                      title={
                        isLocked
                          ? `Cannot delete: vehicle has ${tripCount} loading trip${tripCount !== 1 ? "s" : ""}`
                          : "Delete vehicle"
                      }
                      data-ocid={`vehicles.delete_button.${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Owner info */}
                <div className="text-xs space-y-0.5">
                  <p className="font-medium text-foreground">
                    {item.ownerName}
                  </p>
                  {item.ownerPhone && (
                    <p className="text-muted-foreground font-mono">
                      {item.ownerPhone}
                    </p>
                  )}
                  {item.panCard && (
                    <p className="text-muted-foreground font-mono flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      PAN: {maskPAN(item.panCard)}
                    </p>
                  )}
                </div>

                {/* Bank account info */}
                {(item.bank1AccountNo || item.bank1BankName) && (
                  <div className="rounded-md border border-border bg-blue-50/30 px-2.5 py-2 space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Primary Bank
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {item.bank1BankName}
                    </p>
                    {item.bank1AccountNo && (
                      <p className="text-xs font-mono text-muted-foreground">
                        ••••{item.bank1AccountNo.slice(-4)}
                      </p>
                    )}
                    {item.bank1IFSC && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        IFSC: {item.bank1IFSC}
                      </p>
                    )}
                  </div>
                )}

                {/* Document expiry for own/vendor/rented */}
                {(item.vehicleType === "own" ||
                  item.vehicleType === "vendor" ||
                  item.vehicleType === "rented") && (
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 space-y-1.5">
                    <ExpiryBadge
                      label="Insurance"
                      dateStr={item.insuranceExpiry}
                    />
                    <ExpiryBadge
                      label="Pollution"
                      dateStr={item.pollutionExpiry}
                    />
                    <ExpiryBadge label="Fitness" dateStr={item.fitnessExpiry} />
                  </div>
                )}

                {/* 194C(6) Undertaking badge — shows if undertakingFileUrl on object OR in localStorage */}
                {undertakingUrl ? (
                  <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                    <FileCheck className="h-3 w-3 shrink-0" />
                    <span className="font-medium flex-1">
                      194C(6) Undertaking ✓
                    </span>
                    <button
                      type="button"
                      onClick={() => viewFile(undertakingUrl)}
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-emerald-200 transition-colors"
                      title="View"
                      data-ocid={`vehicles.undertaking_view.button.${index + 1}`}
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadFile(
                          undertakingUrl,
                          (item as { undertakingFileName?: string })
                            .undertakingFileName || "194C6-undertaking",
                        )
                      }
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-emerald-200 transition-colors"
                      title="Download"
                      data-ocid={`vehicles.undertaking_download.button.${index + 1}`}
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => printFile(undertakingUrl)}
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-emerald-200 transition-colors"
                      title="Print"
                      data-ocid={`vehicles.undertaking_print.button.${index + 1}`}
                    >
                      <Printer className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="vehicles.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="v-number" className="text-xs">
                  Vehicle Number *
                </Label>
                <Input
                  id="v-number"
                  placeholder="e.g. OD03AB6655"
                  value={form.vehicleNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vehicleNumber: e.target.value }))
                  }
                  required
                  className="text-xs font-mono uppercase"
                  data-ocid="vehicles.number.input"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Vehicle Type *</Label>
                <RadioGroup
                  value={form.vehicleType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, vehicleType: v }))
                  }
                  className="grid grid-cols-2 gap-2"
                  data-ocid="vehicles.type.radio"
                >
                  {VEHICLE_TYPES.map(({ value, label }) => (
                    <div
                      key={value}
                      className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                    >
                      <RadioGroupItem value={value} id={`vtype-${value}`} />
                      <Label
                        htmlFor={`vtype-${value}`}
                        className="text-xs cursor-pointer font-medium"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-[10px] text-muted-foreground">
                  Document expiry dates required for Own, Vendor, and Rented
                  vehicles.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="v-owner" className="text-xs">
                  Owner Name *
                </Label>
                <Input
                  id="v-owner"
                  placeholder="Owner's full name"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ownerName: e.target.value }))
                  }
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-phone" className="text-xs">
                  Owner Phone
                </Label>
                <Input
                  id="v-phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.ownerPhone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ownerPhone: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="v-addr" className="text-xs">
                  Owner Address
                </Label>
                <Input
                  id="v-addr"
                  placeholder="Full address"
                  value={form.ownerAddress}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ownerAddress: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="v-pan" className="text-xs">
                  PAN Card Number
                </Label>
                <Input
                  id="v-pan"
                  placeholder="e.g. ABCDE1234F"
                  value={form.panCard}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      panCard: e.target.value.toUpperCase(),
                    }))
                  }
                  className="text-xs font-mono uppercase"
                  maxLength={10}
                  data-ocid="vehicles.pan.input"
                />
              </div>
            </div>

            {/* Bank Accounts */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                Bank Account Details
              </p>
              <BankAccountSection
                label="Bank Account 1 (Primary)"
                accountHolder={form.bank1AccountHolder}
                bankName={form.bank1BankName}
                accountNo={form.bank1AccountNo}
                ifsc={form.bank1IFSC}
                branch={form.bank1Branch}
                onChangeHolder={(v) =>
                  setForm((p) => ({ ...p, bank1AccountHolder: v }))
                }
                onChangeBankName={(v) =>
                  setForm((p) => ({ ...p, bank1BankName: v }))
                }
                onChangeAccountNo={(v) =>
                  setForm((p) => ({ ...p, bank1AccountNo: v }))
                }
                onChangeIFSC={(v) => setForm((p) => ({ ...p, bank1IFSC: v }))}
                onChangeBranch={(v) =>
                  setForm((p) => ({ ...p, bank1Branch: v }))
                }
                prefix="bank1"
              />
              <BankAccountSection
                label="Bank Account 2 (Secondary)"
                accountHolder={form.bank2AccountHolder}
                bankName={form.bank2BankName}
                accountNo={form.bank2AccountNo}
                ifsc={form.bank2IFSC}
                branch={form.bank2Branch}
                onChangeHolder={(v) =>
                  setForm((p) => ({ ...p, bank2AccountHolder: v }))
                }
                onChangeBankName={(v) =>
                  setForm((p) => ({ ...p, bank2BankName: v }))
                }
                onChangeAccountNo={(v) =>
                  setForm((p) => ({ ...p, bank2AccountNo: v }))
                }
                onChangeIFSC={(v) => setForm((p) => ({ ...p, bank2IFSC: v }))}
                onChangeBranch={(v) =>
                  setForm((p) => ({ ...p, bank2Branch: v }))
                }
                prefix="bank2"
              />
            </div>

            {/* Documents section - only for own/vendor/rented */}
            {needsDocuments && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground">
                  Document Expiry Dates
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-insurance" className="text-xs">
                      Insurance Expiry
                    </Label>
                    <Input
                      id="v-insurance"
                      type="date"
                      value={form.insuranceExpiry}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          insuranceExpiry: e.target.value,
                        }))
                      }
                      className="text-xs"
                      data-ocid="vehicles.insurance.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-pollution" className="text-xs">
                      Pollution Expiry
                    </Label>
                    <Input
                      id="v-pollution"
                      type="date"
                      value={form.pollutionExpiry}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          pollutionExpiry: e.target.value,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="v-fitness" className="text-xs">
                      Fitness Expiry
                    </Label>
                    <Input
                      id="v-fitness"
                      type="date"
                      value={form.fitnessExpiry}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          fitnessExpiry: e.target.value,
                        }))
                      }
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 194C(6) Undertaking Upload */}
            <div
              className="rounded-lg border p-3 space-y-2"
              style={{
                borderColor: "oklch(0.55 0.18 250 / 0.3)",
                background: "oklch(0.55 0.18 250 / 0.05)",
              }}
            >
              <div>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.35 0.18 250)" }}
                >
                  Undertaking u/s 194C(6) — Non-Deduction of TDS
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Upload signed undertaking declaring owner does not own more
                  than 10 vehicles
                </p>
              </div>
              <input
                ref={undertakingFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleUndertakingUpload}
                className="hidden"
                id="v-undertaking-upload"
              />
              {form.undertakingFileUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs text-emerald-800 flex-1 truncate font-medium">
                    {form.undertakingFileName || "Undertaking uploaded"} ✓
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={form.undertakingFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center h-6 w-6 justify-center rounded text-emerald-600 hover:bg-emerald-100"
                      title="View file"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((p) => ({
                          ...p,
                          undertakingFileUrl: "",
                          undertakingFileName: "",
                        }));
                        if (undertakingFileRef.current)
                          undertakingFileRef.current.value = "";
                      }}
                      className="inline-flex items-center h-6 w-6 justify-center rounded text-destructive hover:bg-destructive/10"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => undertakingFileRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/40 hover:border-primary/40 transition-colors"
                  data-ocid="vehicles.undertaking.upload_button"
                >
                  <FileUp className="h-4 w-4 shrink-0" />
                  Upload 194C(6) Undertaking (PDF, JPG, PNG — max 5MB)
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <Switch
                id="v-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                data-ocid="vehicles.active.switch"
              />
              <Label htmlFor="v-active" className="text-xs cursor-pointer">
                {form.isActive ? "Vehicle is Active" : "Vehicle is Inactive"}
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="vehicles.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="text-xs"
                data-ocid="vehicles.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Vehicle"
                ) : (
                  "Add Vehicle"
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
        <DialogContent className="max-w-sm" data-ocid="vehicles.delete_dialog">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {deleteConfirmHasBilledTrips ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Cannot Delete Vehicle
                </>
              ) : deleteConfirmTripCount > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Confirm Delete with Cascade
                </>
              ) : (
                "Delete Vehicle"
              )}
            </DialogTitle>
          </DialogHeader>
          {deleteConfirmHasBilledTrips ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{deleteConfirm?.vehicleNumber}</strong> cannot be
                deleted because one or more of its trips are included in a
                billing invoice.
              </p>
              <div className="flex items-start gap-2 rounded-md px-3 py-2 text-xs bg-destructive/5 border border-destructive/20 text-destructive">
                <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Reverse the billing invoice first before deleting this vehicle.
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs w-full"
                  data-ocid="vehicles.delete_cancel_button"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : deleteConfirmTripCount > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Deleting <strong>{deleteConfirm?.vehicleNumber}</strong> will
                permanently remove:
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-2">
                <li>
                  •{" "}
                  <strong className="text-foreground">
                    {deleteConfirmTripCount}
                  </strong>{" "}
                  Loading Trip{deleteConfirmTripCount !== 1 ? "s" : ""}
                </li>
                {deleteConfirmDieselCount > 0 && (
                  <li>
                    •{" "}
                    <strong className="text-foreground">
                      {deleteConfirmDieselCount}
                    </strong>{" "}
                    Diesel Entr{deleteConfirmDieselCount !== 1 ? "ies" : "y"}
                  </li>
                )}
                <li>• Related Payable and Petty Cash entries</li>
              </ul>
              <div className="flex items-start gap-2 rounded-md px-3 py-2 text-xs bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                This action is irreversible. All linked records will be
                permanently deleted.
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs"
                  data-ocid="vehicles.delete_cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteVehicle.isPending}
                  className="text-xs"
                  data-ocid="vehicles.delete_confirm_button"
                >
                  {deleteVehicle.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Permanently Delete All"
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Delete <strong>{deleteConfirm?.vehicleNumber}</strong>? This
                cannot be undone.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs"
                  data-ocid="vehicles.delete_cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteVehicle.isPending}
                  className="text-xs"
                  data-ocid="vehicles.delete_confirm_button"
                >
                  {deleteVehicle.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
