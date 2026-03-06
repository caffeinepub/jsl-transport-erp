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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type PettyCash,
  useCreatePettyCash,
  useDeletePettyCash,
  useGetAllPettyCash,
  useGetAllTrucks,
  useUpdatePettyCash,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

interface PettyCashFormData {
  truckId: string;
  date: string;
  expenseType: string;
  amount: string;
  remark: string;
}

const defaultForm: PettyCashFormData = {
  truckId: "",
  date: "",
  expenseType: "",
  amount: "",
  remark: "",
};

const EXPENSE_TYPES = ["Toll", "Repair", "Labour", "Miscellaneous", "Other"];

export default function PettyCashPage() {
  const pettyCashQuery = useGetAllPettyCash();
  const trucksQuery = useGetAllTrucks();
  const createPettyCash = useCreatePettyCash();
  const updatePettyCash = useUpdatePettyCash();
  const deletePettyCash = useDeletePettyCash();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PettyCash | null>(null);
  const [form, setForm] = useState<PettyCashFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<PettyCash | null>(null);

  const entries = pettyCashQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];

  const summaryStats = useMemo(() => {
    const totalAmount = entries.reduce((s, e) => s + e.amount, 0);
    const truckMap: Record<string, number> = {};
    for (const entry of entries) {
      const key = entry.truckId.toString();
      truckMap[key] = (truckMap[key] ?? 0) + entry.amount;
    }
    const expenseTypeMap: Record<string, number> = {};
    for (const entry of entries) {
      expenseTypeMap[entry.expenseType] =
        (expenseTypeMap[entry.expenseType] ?? 0) + entry.amount;
    }
    return { totalAmount, truckMap, expenseTypeMap };
  }, [entries]);

  const openCreateDialog = () => {
    setEditingEntry(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: PettyCash) => {
    setEditingEntry(entry);
    setForm({
      truckId: entry.truckId.toString(),
      date: entry.date,
      expenseType: entry.expenseType,
      amount: entry.amount.toString(),
      remark: entry.remark,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      truckId: BigInt(form.truckId),
      date: form.date,
      expenseType: form.expenseType,
      amount: Number(form.amount),
      remark: form.remark,
    };
    try {
      if (editingEntry) {
        await updatePettyCash.mutateAsync({ id: editingEntry.id, ...data });
        toast.success("Entry updated");
      } else {
        await createPettyCash.mutateAsync(data);
        toast.success("Entry added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save entry.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePettyCash.mutateAsync(deleteConfirm.id);
      toast.success("Entry deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  const getTruckNumber = (id: bigint) =>
    trucks.find((t) => t.id === id)?.truckNumber ?? id.toString();
  const isSaving = createPettyCash.isPending || updatePettyCash.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="pettycash.page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            Petty Cash
          </h2>
          <p className="text-sm text-muted-foreground">
            {entries.length} entries
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="pettycash.new_button"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Expenses
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {formatCurrency(summaryStats.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Entries
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {entries.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Avg per Entry
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {entries.length > 0
                ? formatCurrency(summaryStats.totalAmount / entries.length)
                : "₹0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Entries Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {pettyCashQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="pettycash.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No petty cash entries yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="pettycash.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Truck No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Expense Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Remark
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
                    data-ocid={`pettycash.item.${index + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {getTruckNumber(entry.truckId)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs border border-border">
                        {entry.expenseType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {entry.remark || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(entry)}
                          className="h-7 w-7 p-0"
                          data-ocid={`pettycash.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(entry)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`pettycash.delete_button.${index + 1}`}
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
            <p className="text-xs font-semibold font-display">
              Truck-wise Expense Summary
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">
                  Truck No
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Total Expenses
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summaryStats.truckMap).map(
                ([truckId, amount]) => (
                  <TableRow key={truckId} className="table-row-hover">
                    <TableCell className="text-xs font-medium">
                      {getTruckNumber(BigInt(truckId))}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(amount)}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="pettycash.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEntry ? "Edit Entry" : "Add Petty Cash Entry"}
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
                    data-ocid="pettycash.form.truck_select"
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
                <Label htmlFor="pcDate" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="pcDate"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="pettycash.form.date_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expense Type *</Label>
                <Select
                  value={form.expenseType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, expenseType: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="pettycash.form.expense_type_select"
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pcAmount" className="text-xs">
                  Amount (₹) *
                </Label>
                <Input
                  id="pcAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="pettycash.form.amount_input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pcRemark" className="text-xs">
                Remark
              </Label>
              <Textarea
                id="pcRemark"
                placeholder="Additional notes..."
                value={form.remark}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remark: e.target.value }))
                }
                className="text-xs resize-none"
                rows={2}
                data-ocid="pettycash.form.remark_textarea"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="pettycash.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.truckId || !form.expenseType}
                data-ocid="pettycash.form.submit_button"
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
        <DialogContent className="max-w-sm" data-ocid="pettycash.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this petty cash entry?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="pettycash.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePettyCash.isPending}
              data-ocid="pettycash.delete_confirm_button"
              className="text-xs"
            >
              {deletePettyCash.isPending ? (
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
