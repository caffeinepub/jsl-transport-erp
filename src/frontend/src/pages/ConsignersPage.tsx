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
import { Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type Consigner,
  useCreateConsigner,
  useDeleteConsigner,
  useGetAllConsigners,
  useUpdateConsigner,
} from "../hooks/useQueries";

interface ConsignerFormData {
  name: string;
  material: string;
  location: string;
  contactPerson: string;
  contactPhone: string;
}

const defaultForm: ConsignerFormData = {
  name: "",
  material: "Coal",
  location: "",
  contactPerson: "",
  contactPhone: "",
};

const MATERIALS = ["Coal", "Iron Ore", "Fly Ash", "Other"];

export default function ConsignersPage() {
  const consignersQuery = useGetAllConsigners();
  const createConsigner = useCreateConsigner();
  const updateConsigner = useUpdateConsigner();
  const deleteConsigner = useDeleteConsigner();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Consigner | null>(null);
  const [form, setForm] = useState<ConsignerFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Consigner | null>(null);

  const consigners = consignersQuery.data ?? [];

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: Consigner) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      material: item.material,
      location: item.location,
      contactPerson: (item as any).contactPerson ?? "",
      contactPhone: (item as any).contactPhone ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      material: form.material,
      location: form.location,
      associationRate: 0,
      nonAssociationRate: 0,
      vendorRate: 0,
      billingRate: 0,
    };
    try {
      if (editingItem) {
        await updateConsigner.mutateAsync({ id: editingItem.id, ...data });
        toast.success("Consigner updated successfully");
      } else {
        await createConsigner.mutateAsync(data);
        toast.success("Consigner created successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save consigner. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteConsigner.mutateAsync(deleteConfirm.id);
      toast.success("Consigner deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete consigner.");
    }
  };

  const isSaving = createConsigner.isPending || updateConsigner.isPending;

  const materialBadgeColor = (material: string) => {
    switch (material) {
      case "Coal":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "Iron Ore":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Fly Ash":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="p-6 space-y-5" data-ocid="consigners.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.72 0.18 60 / 0.12)" }}
          >
            <MapPin
              className="h-4 w-4"
              style={{ color: "oklch(0.72 0.18 60)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Consigners (OCP)
            </h2>
            <p className="text-sm text-muted-foreground">
              {consigners.length} loading point
              {consigners.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="consigners.add_button"
        >
          <Plus className="h-4 w-4" />
          Add Consigner
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {consignersQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : consigners.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="consigners.empty_state"
          >
            <MapPin className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No consigners registered yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your OCPs (Origin Colliery Points) to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="consigners.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    OCP Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Material
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Location
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Contact Person
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consigners.map((item, index) => (
                  <TableRow
                    key={item.id.toString()}
                    className="table-row-hover"
                    data-ocid={`consigners.item.${index + 1}`}
                  >
                    <TableCell className="text-xs font-semibold text-foreground">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${materialBadgeColor(item.material)}`}
                      >
                        {item.material}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.location || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(item as any).contactPerson || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-7 w-7 p-0"
                          data-ocid={`consigners.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(item)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`consigners.delete_button.${index + 1}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="consigners.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit Consigner (OCP)" : "Add New Consigner (OCP)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="csg-name" className="text-xs">
                  OCP Name *
                </Label>
                <Input
                  id="csg-name"
                  placeholder="e.g. Ananta OCP"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="consigners.name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Material *</Label>
                <Select
                  value={form.material}
                  onValueChange={(v) => setForm((p) => ({ ...p, material: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="consigners.material.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csg-location" className="text-xs">
                  Location
                </Label>
                <Input
                  id="csg-location"
                  placeholder="e.g. Talcher, Odisha"
                  value={form.location}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, location: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csg-contact" className="text-xs">
                  Contact Person
                </Label>
                <Input
                  id="csg-contact"
                  placeholder="Name"
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactPerson: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csg-phone" className="text-xs">
                  Contact Phone
                </Label>
                <Input
                  id="csg-phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactPhone: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground bg-muted/30 rounded px-3 py-2">
              Rates (Association, Non-Association, Vendor, Billing) are
              configured per Delivery Order (DO) -- not on the OCP master.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="consigners.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="text-xs"
                data-ocid="consigners.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Consigner"
                ) : (
                  "Add Consigner"
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
          data-ocid="consigners.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete Consigner</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="consigners.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConsigner.isPending}
              className="text-xs"
              data-ocid="consigners.delete_confirm_button"
            >
              {deleteConsigner.isPending ? (
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
