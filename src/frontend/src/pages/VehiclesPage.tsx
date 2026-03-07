import { Badge } from "@/components/ui/badge";
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
  ChevronDown,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type Vehicle,
  useCreateVehicle,
  useDeleteVehicle,
  useGetAllVehicles,
  useUpdateVehicle,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

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
  isActive: boolean;
}

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
      : type === "hired"
        ? "bg-violet-50 text-violet-700 border-violet-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {type}
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
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Vehicle | null>(null);

  const vehicles = vehiclesQuery.data ?? [];

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
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
      isActive: item.isActive,
    });
    setDialogOpen(true);
  };

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
      insuranceExpiry:
        form.vehicleType !== "rented" ? form.insuranceExpiry : "",
      pollutionExpiry:
        form.vehicleType !== "rented" ? form.pollutionExpiry : "",
      fitnessExpiry: form.vehicleType !== "rented" ? form.fitnessExpiry : "",
      isActive: form.isActive,
    };
    try {
      if (editingItem) {
        await updateVehicle.mutateAsync({ id: editingItem.id, ...data });
        toast.success("Vehicle updated successfully");
      } else {
        await createVehicle.mutateAsync(data);
        toast.success("Vehicle added successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save vehicle.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteVehicle.mutateAsync(deleteConfirm.id);
      toast.success("Vehicle deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete vehicle.");
    }
  };

  const isSaving = createVehicle.isPending || updateVehicle.isPending;
  const showDocuments = form.vehicleType !== "rented";

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
          {vehicles.map((item, index) => {
            const bankBadge = getBankAccountBadge(item);
            const bankBadgeClass =
              bankBadge === "2 Accounts"
                ? "bg-green-50 text-green-700 border-green-200"
                : bankBadge === "1 Account"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-gray-50 text-gray-500 border-gray-200";
            return (
              <div
                key={item.id.toString()}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
                data-ocid={`vehicles.item.${index + 1}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
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
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
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

                {/* Document expiry for hired/own */}
                {item.vehicleType !== "rented" && (
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
                  className="flex gap-4"
                  data-ocid="vehicles.type.radio"
                >
                  {["own", "hired", "rented"].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <RadioGroupItem value={type} id={`vtype-${type}`} />
                      <Label
                        htmlFor={`vtype-${type}`}
                        className="text-xs capitalize cursor-pointer"
                      >
                        {type}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
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

            {/* Documents section - only for hired/own */}
            {showDocuments && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground">
                  Document Expiry Dates
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-insurance" className="text-xs">
                      Insurance
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
                      Pollution
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
                      Fitness
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
            <DialogTitle className="font-display">Delete Vehicle</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteConfirm?.vehicleNumber}</strong>? This cannot
            be undone.
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
