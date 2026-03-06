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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
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
          {vehicles.map((item, index) => (
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
                  <div className="flex items-center gap-1.5 mt-1">
                    <VehicleTypeBadge type={item.vehicleType} />
                    {!item.isActive && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium status-pending">
                        Inactive
                      </span>
                    )}
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
                <p className="font-medium text-foreground">{item.ownerName}</p>
                {item.ownerPhone && (
                  <p className="text-muted-foreground font-mono">
                    {item.ownerPhone}
                  </p>
                )}
              </div>

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
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="vehicles.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
