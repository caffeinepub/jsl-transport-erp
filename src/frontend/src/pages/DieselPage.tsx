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
import { Fuel, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type DieselEntry,
  useCreateDieselEntry,
  useDeleteDieselEntry,
  useGetAllDieselEntries,
  useGetAllTrucks,
  useUpdateDieselEntry,
} from "../hooks/useQueries";
import { formatCurrency, formatDate, formatNumber } from "../utils/format";

interface DieselFormData {
  truckId: string;
  date: string;
  vendor: string;
  litre: string;
  rate: string;
}

const defaultForm: DieselFormData = {
  truckId: "",
  date: "",
  vendor: "",
  litre: "",
  rate: "",
};

export default function DieselPage() {
  const dieselQuery = useGetAllDieselEntries();
  const trucksQuery = useGetAllTrucks();
  const createDiesel = useCreateDieselEntry();
  const updateDiesel = useUpdateDieselEntry();
  const deleteDiesel = useDeleteDieselEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DieselEntry | null>(null);
  const [form, setForm] = useState<DieselFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<DieselEntry | null>(null);

  const entries = dieselQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];

  const total = Number(form.litre || 0) * Number(form.rate || 0);

  const summaryStats = useMemo(() => {
    const totalLitres = entries.reduce((s, e) => s + e.litre, 0);
    const totalExpense = entries.reduce((s, e) => s + e.total, 0);

    // Truck-wise breakdown
    const truckMap: Record<string, { litres: number; total: number }> = {};
    for (const entry of entries) {
      const key = entry.truckId.toString();
      if (!truckMap[key]) truckMap[key] = { litres: 0, total: 0 };
      truckMap[key].litres += entry.litre;
      truckMap[key].total += entry.total;
    }

    return { totalLitres, totalExpense, truckMap };
  }, [entries]);

  const openCreateDialog = () => {
    setEditingEntry(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: DieselEntry) => {
    setEditingEntry(entry);
    setForm({
      truckId: entry.truckId.toString(),
      date: entry.date,
      vendor: entry.vendor,
      litre: entry.litre.toString(),
      rate: entry.rate.toString(),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      truckId: BigInt(form.truckId),
      date: form.date,
      vendor: form.vendor,
      litre: Number(form.litre),
      rate: Number(form.rate),
      total,
    };
    try {
      if (editingEntry) {
        await updateDiesel.mutateAsync({ id: editingEntry.id, ...data });
        toast.success("Diesel entry updated");
      } else {
        await createDiesel.mutateAsync(data);
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
      await deleteDiesel.mutateAsync(deleteConfirm.id);
      toast.success("Entry deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  const getTruckNumber = (id: bigint) =>
    trucks.find((t) => t.id === id)?.truckNumber ?? id.toString();
  const isSaving = createDiesel.isPending || updateDiesel.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="diesel.page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            Diesel Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Track diesel purchase records by truck — {entries.length} entries
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="diesel.new_button"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Litres
                </p>
                <p className="mt-1 text-xl font-bold font-display">
                  {formatNumber(summaryStats.totalLitres)} L
                </p>
              </div>
              <Fuel className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Total Expense
              </p>
              <p className="mt-1 text-xl font-bold font-display">
                {formatCurrency(summaryStats.totalExpense)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg Rate/Litre
              </p>
              <p className="mt-1 text-xl font-bold font-display">
                {entries.length > 0
                  ? formatCurrency(
                      summaryStats.totalExpense / summaryStats.totalLitres,
                    )
                  : "₹0"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {dieselQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="diesel.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No diesel entries yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="diesel.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Truck No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Petrol Pump / Vendor
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
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => (
                  <TableRow
                    key={entry.id.toString()}
                    className="table-row-hover"
                    data-ocid={`diesel.item.${index + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {getTruckNumber(entry.truckId)}
                    </TableCell>
                    <TableCell className="text-xs">{entry.vendor}</TableCell>
                    <TableCell className="text-xs text-right">
                      {formatNumber(entry.litre)} L
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {formatCurrency(entry.rate)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(entry.total)}
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

      {/* Truck-wise Summary */}
      {Object.keys(summaryStats.truckMap).length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold font-display text-foreground">
              Truck-wise Diesel Summary
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">
                  Truck No
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
              {Object.entries(summaryStats.truckMap).map(([truckId, data]) => (
                <TableRow key={truckId} className="table-row-hover">
                  <TableCell className="text-xs font-medium">
                    {getTruckNumber(BigInt(truckId))}
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

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="diesel.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEntry ? "Edit Diesel Entry" : "Add Diesel Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Truck No *</Label>
                <Select
                  value={form.truckId}
                  onValueChange={(v) => setForm((p) => ({ ...p, truckId: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="diesel.form.truck_select"
                  >
                    <SelectValue placeholder="Select truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((t) => (
                      <SelectItem
                        key={t.id.toString()}
                        value={t.id.toString()}
                        className="text-xs"
                      >
                        {t.truckNumber}
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
                  placeholder="Vendor name"
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
                disabled={isSaving || !form.truckId}
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

      {/* Delete Confirm */}
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
              disabled={deleteDiesel.isPending}
              data-ocid="diesel.delete_confirm_button"
              className="text-xs"
            >
              {deleteDiesel.isPending ? (
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
