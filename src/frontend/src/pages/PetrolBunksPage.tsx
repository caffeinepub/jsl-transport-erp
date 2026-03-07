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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Fuel, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type PetrolBunk,
  useCreatePetrolBunk,
  useDeletePetrolBunk,
  useGetAllPetrolBunks,
  useUpdatePetrolBunk,
} from "../hooks/useQueries";
import { formatCurrency } from "../utils/format";

interface PetrolBunkFormData {
  bunkName: string;
  location: string;
  contact: string;
  creditLimit: string;
}

const defaultForm: PetrolBunkFormData = {
  bunkName: "",
  location: "",
  contact: "",
  creditLimit: "0",
};

export default function PetrolBunksPage() {
  const bunksQuery = useGetAllPetrolBunks();
  const createBunk = useCreatePetrolBunk();
  const updateBunk = useUpdatePetrolBunk();
  const deleteBunk = useDeletePetrolBunk();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PetrolBunk | null>(null);
  const [form, setForm] = useState<PetrolBunkFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<PetrolBunk | null>(null);

  const bunks = bunksQuery.data ?? [];

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: PetrolBunk) => {
    setEditingItem(item);
    setForm({
      bunkName: item.bunkName,
      location: item.location,
      contact: item.contact,
      creditLimit: item.creditLimit.toString(),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bunkName.trim()) {
      toast.error("Bunk name is required");
      return;
    }
    const data: Omit<PetrolBunk, "id"> = {
      bunkName: form.bunkName.trim(),
      location: form.location.trim(),
      contact: form.contact.trim(),
      creditLimit: Number(form.creditLimit) || 0,
    };
    try {
      if (editingItem) {
        await updateBunk.mutateAsync({ id: editingItem.id, ...data });
        toast.success("Petrol bunk updated");
      } else {
        await createBunk.mutateAsync(data);
        toast.success("Petrol bunk added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save petrol bunk.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteBunk.mutateAsync(deleteConfirm.id);
      toast.success("Petrol bunk deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete petrol bunk.");
    }
  };

  const isSaving = createBunk.isPending || updateBunk.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="petrol_bunks.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.72 0.18 60 / 0.12)" }}
          >
            <Fuel
              className="h-4 w-4"
              style={{ color: "oklch(0.72 0.18 60)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Petrol Bunks
            </h2>
            <p className="text-sm text-muted-foreground">
              {bunks.length} bunk{bunks.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="petrol_bunks.add_button"
        >
          <Plus className="h-4 w-4" />
          Add Bunk
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {bunksQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : bunks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="petrol_bunks.empty_state"
          >
            <Fuel className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No petrol bunks added yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add petrol bunks to link them with diesel refill records
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="petrol_bunks.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">#</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Bunk Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Location
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Contact
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Credit Limit
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bunks.map((item, index) => (
                  <TableRow
                    key={item.id.toString()}
                    className="table-row-hover"
                    data-ocid={`petrol_bunks.item.${index + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Fuel className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-xs font-medium">
                          {item.bunkName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.contact || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {item.creditLimit > 0
                        ? formatCurrency(item.creditLimit)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-7 w-7 p-0"
                          data-ocid={`petrol_bunks.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(item)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`petrol_bunks.delete_button.${index + 1}`}
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
        <DialogContent className="max-w-md" data-ocid="petrol_bunks.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit Petrol Bunk" : "Add Petrol Bunk"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pb-name" className="text-xs">
                Bunk Name *
              </Label>
              <Input
                id="pb-name"
                placeholder="e.g. Indian Oil - Rourkela"
                value={form.bunkName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bunkName: e.target.value }))
                }
                required
                className="text-xs"
                data-ocid="petrol_bunks.name.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-location" className="text-xs">
                Location
              </Label>
              <Input
                id="pb-location"
                placeholder="e.g. NH-5, Rourkela"
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                className="text-xs"
                data-ocid="petrol_bunks.location.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-contact" className="text-xs">
                Contact
              </Label>
              <Input
                id="pb-contact"
                placeholder="Phone number"
                value={form.contact}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contact: e.target.value }))
                }
                className="text-xs"
                data-ocid="petrol_bunks.contact.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pb-credit" className="text-xs">
                Credit Limit (₹)
              </Label>
              <Input
                id="pb-credit"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={form.creditLimit}
                onChange={(e) =>
                  setForm((p) => ({ ...p, creditLimit: e.target.value }))
                }
                className="text-xs"
                data-ocid="petrol_bunks.credit_limit.input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="petrol_bunks.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="text-xs"
                data-ocid="petrol_bunks.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Bunk"
                ) : (
                  "Add Bunk"
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
          data-ocid="petrol_bunks.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Petrol Bunk
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteConfirm?.bunkName}</strong>? This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="petrol_bunks.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBunk.isPending}
              className="text-xs"
              data-ocid="petrol_bunks.delete_confirm_button"
            >
              {deleteBunk.isPending ? (
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
