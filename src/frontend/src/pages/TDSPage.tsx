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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type TDSEntry,
  useCreateTDSEntry,
  useDeleteTDSEntry,
  useGetAllTDSEntries,
  useGetAllTrips,
  useUpdateTDSEntry,
} from "../hooks/useQueries";
import { formatCurrency } from "../utils/format";

interface TDSFormData {
  tripId: string;
  tripCost: string;
  tdsPercent: string;
  pan: string;
  status: string;
}

const defaultForm: TDSFormData = {
  tripId: "",
  tripCost: "",
  tdsPercent: "2",
  pan: "",
  status: "pending",
};

function getStatusClass(status: string) {
  switch (status) {
    case "filed":
      return "status-filed";
    case "deducted":
      return "status-deducted";
    default:
      return "status-pending";
  }
}

export default function TDSPage() {
  const tdsQuery = useGetAllTDSEntries();
  const tripsQuery = useGetAllTrips();
  const createTDS = useCreateTDSEntry();
  const updateTDS = useUpdateTDSEntry();
  const deleteTDS = useDeleteTDSEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TDSEntry | null>(null);
  const [form, setForm] = useState<TDSFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<TDSEntry | null>(null);

  const entries = tdsQuery.data ?? [];
  const trips = tripsQuery.data ?? [];

  const tripCost = Number(form.tripCost || 0);
  const tdsPercent = Number(form.tdsPercent || 0);
  const tdsAmount = tripCost * (tdsPercent / 100);

  const summaryStats = useMemo(() => {
    const totalTDS = entries.reduce((s, e) => s + e.tdsAmount, 0);
    const pendingCount = entries.filter((e) => e.status === "pending").length;
    const deductedCount = entries.filter((e) => e.status === "deducted").length;
    const filedCount = entries.filter((e) => e.status === "filed").length;
    return { totalTDS, pendingCount, deductedCount, filedCount };
  }, [entries]);

  const openCreateDialog = () => {
    setEditingEntry(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: TDSEntry) => {
    setEditingEntry(entry);
    setForm({
      tripId: entry.tripId.toString(),
      tripCost: entry.tripCost.toString(),
      tdsPercent: entry.tdsPercent.toString(),
      pan: entry.pan,
      status: entry.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      tripId: BigInt(form.tripId),
      tripCost,
      tdsPercent,
      tdsAmount,
      pan: form.pan,
      status: form.status,
    };
    try {
      if (editingEntry) {
        await updateTDS.mutateAsync({ id: editingEntry.id, ...data });
        toast.success("TDS entry updated");
      } else {
        await createTDS.mutateAsync(data);
        toast.success("TDS entry added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save TDS entry.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTDS.mutateAsync(deleteConfirm.id);
      toast.success("TDS entry deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const getTripLabel = (tripId: bigint) =>
    trips.find((t) => t.id === tripId)?.tripId ?? tripId.toString();
  const isSaving = createTDS.isPending || updateTDS.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="tds.page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            TDS Management
          </h2>
          <p className="text-sm text-muted-foreground">
            {entries.length} TDS entries
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="tds.new_button"
        >
          <Plus className="h-4 w-4" />
          Add TDS
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total TDS
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {formatCurrency(summaryStats.totalTDS)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Pending
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.45 0.2 27)" }}
            >
              {summaryStats.pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Deducted
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.4 0.18 240)" }}
            >
              {summaryStats.deductedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Filed
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.4 0.16 150)" }}
            >
              {summaryStats.filedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TDS Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {tdsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="tds.empty_state"
          >
            <p className="text-sm text-muted-foreground">No TDS entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="tds.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Trip ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Trip Cost
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    TDS %
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    TDS Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold">PAN</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Status
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
                    data-ocid={`tds.item.${index + 1}`}
                  >
                    <TableCell className="text-xs font-mono font-medium">
                      {getTripLabel(entry.tripId)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {formatCurrency(entry.tripCost)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {entry.tdsPercent}%
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(entry.tdsAmount)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {entry.pan || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border capitalize ${getStatusClass(entry.status)}`}
                      >
                        {entry.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(entry)}
                          className="h-7 w-7 p-0"
                          data-ocid={`tds.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(entry)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`tds.delete_button.${index + 1}`}
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

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="tds.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEntry ? "Edit TDS Entry" : "Add TDS Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Trip *</Label>
              <Select
                value={form.tripId}
                onValueChange={(v) => setForm((p) => ({ ...p, tripId: v }))}
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="tds.form.trip_select"
                >
                  <SelectValue placeholder="Select trip" />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem
                      key={t.id.toString()}
                      value={t.id.toString()}
                      className="text-xs"
                    >
                      {t.tripId} – {t.consigner} → {t.consignee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tripCost" className="text-xs">
                  Trip Cost (₹) *
                </Label>
                <Input
                  id="tripCost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.tripCost}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tripCost: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="tds.form.trip_cost_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tdsPercent" className="text-xs">
                  TDS % *
                </Label>
                <Input
                  id="tdsPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.tdsPercent}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tdsPercent: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="tds.form.tds_percent_input"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Auto-calculated TDS Amount
              </p>
              <p className="text-base font-bold font-display mt-1">
                {formatCurrency(tdsAmount)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pan" className="text-xs">
                PAN Number
              </Label>
              <Input
                id="pan"
                placeholder="ABCDE1234F"
                value={form.pan}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))
                }
                className="text-xs font-mono"
                data-ocid="tds.form.pan_input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="tds.form.status_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="text-xs">
                    Pending
                  </SelectItem>
                  <SelectItem value="deducted" className="text-xs">
                    Deducted
                  </SelectItem>
                  <SelectItem value="filed" className="text-xs">
                    Filed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="tds.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.tripId}
                data-ocid="tds.form.submit_button"
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
                  "Add TDS"
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
        <DialogContent className="max-w-sm" data-ocid="tds.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">Delete TDS Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this TDS entry?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="tds.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTDS.isPending}
              data-ocid="tds.delete_confirm_button"
              className="text-xs"
            >
              {deleteTDS.isPending ? (
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
