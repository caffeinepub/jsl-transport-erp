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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type PettyCashLedger,
  useCreatePettyCashLedger,
  useDeletePettyCashLedger,
  useGetAllPettyCashLedger,
  useUpdatePettyCashLedger,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

interface LedgerFormData {
  date: string;
  transactionType: string;
  category: string;
  narration: string;
  amount: string;
  reference: string;
}

const defaultForm: LedgerFormData = {
  date: "",
  transactionType: "debit",
  category: "",
  narration: "",
  amount: "",
  reference: "",
};

const DEBIT_CATEGORIES = [
  "Vehicle Advance (Cash)",
  "Toll",
  "Repair",
  "Labour",
  "Fuel",
  "Office",
  "Miscellaneous",
  "Other",
];
const CREDIT_CATEGORIES = [
  "Cash Received",
  "Bank Transfer",
  "Opening Balance",
  "Recovery",
  "Other",
];

export default function PettyCashLedgerPage() {
  const ledgerQuery = useGetAllPettyCashLedger();
  const createEntry = useCreatePettyCashLedger();
  const updateEntry = useUpdatePettyCashLedger();
  const deleteEntry = useDeletePettyCashLedger();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PettyCashLedger | null>(
    null,
  );
  const [form, setForm] = useState<LedgerFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<PettyCashLedger | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("all");

  const allEntries = ledgerQuery.data ?? [];

  // Sort entries by date asc, then by id asc for running balance computation
  const sortedEntries = useMemo(() => {
    return [...allEntries].sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return Number(a.id) - Number(b.id);
    });
  }, [allEntries]);

  // Compute running balances
  const entriesWithBalance = useMemo(() => {
    let running = 0;
    return sortedEntries.map((entry) => {
      if (entry.transactionType === "credit") {
        running += entry.amount;
      } else {
        running -= entry.amount;
      }
      return { ...entry, runningBalance: running };
    });
  }, [sortedEntries]);

  const filteredEntries = useMemo(() => {
    if (activeTab === "all") return entriesWithBalance;
    return entriesWithBalance.filter((e) => e.transactionType === activeTab);
  }, [entriesWithBalance, activeTab]);

  const summaryStats = useMemo(() => {
    const totalCredits = allEntries
      .filter((e) => e.transactionType === "credit")
      .reduce((s, e) => s + e.amount, 0);
    const totalDebits = allEntries
      .filter((e) => e.transactionType === "debit")
      .reduce((s, e) => s + e.amount, 0);
    const closingBalance = totalCredits - totalDebits;
    return { totalCredits, totalDebits, closingBalance };
  }, [allEntries]);

  const categoryOptions =
    form.transactionType === "credit" ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;

  const openCreateDialog = () => {
    setEditingEntry(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: PettyCashLedger) => {
    setEditingEntry(entry);
    setForm({
      date: entry.date,
      transactionType: entry.transactionType,
      category: entry.category,
      narration: entry.narration,
      amount: entry.amount.toString(),
      reference: entry.reference,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<PettyCashLedger, "id"> = {
      date: form.date,
      transactionType: form.transactionType,
      category: form.category,
      narration: form.narration,
      amount: Number(form.amount),
      reference: form.reference,
    };
    try {
      if (editingEntry) {
        await updateEntry.mutateAsync({ id: editingEntry.id, ...data });
        toast.success("Entry updated");
      } else {
        await createEntry.mutateAsync(data);
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
      await deleteEntry.mutateAsync(deleteConfirm.id);
      toast.success("Entry deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const isSaving = createEntry.isPending || updateEntry.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="pettycash-ledger.page">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold font-display text-foreground">
              Petty Cash Ledger
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allEntries.length} ledger entries
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="pettycash-ledger.primary_button"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Credits
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.4 0.16 150)" }}
            >
              {formatCurrency(summaryStats.totalCredits)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Debits
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.45 0.2 27)" }}
            >
              {formatCurrency(summaryStats.totalDebits)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Closing Balance
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{
                color:
                  summaryStats.closingBalance >= 0
                    ? "oklch(0.4 0.16 150)"
                    : "oklch(0.45 0.2 27)",
              }}
            >
              {formatCurrency(Math.abs(summaryStats.closingBalance))}
              {summaryStats.closingBalance < 0 && (
                <span className="text-xs font-normal ml-1">(Deficit)</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger
            value="all"
            className="text-xs"
            data-ocid="pettycash-ledger.all.tab"
          >
            All ({allEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="credit"
            className="text-xs"
            data-ocid="pettycash-ledger.credit.tab"
          >
            Credits (
            {allEntries.filter((e) => e.transactionType === "credit").length})
          </TabsTrigger>
          <TabsTrigger
            value="debit"
            className="text-xs"
            data-ocid="pettycash-ledger.debit.tab"
          >
            Debits (
            {allEntries.filter((e) => e.transactionType === "debit").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {ledgerQuery.isLoading ? (
          <div
            className="p-6 space-y-3"
            data-ocid="pettycash-ledger.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="pettycash-ledger.empty_state"
          >
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No ledger entries found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first entry to start tracking petty cash
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="pettycash-ledger.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Narration
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Debit (₹)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Credit (₹)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Balance (₹)
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Reference
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry, index) => (
                  <TableRow
                    key={entry.id.toString()}
                    className="table-row-hover transition-colors"
                    data-ocid={`pettycash-ledger.item.${index + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs px-2 py-0.5 rounded border capitalize font-medium"
                        style={
                          entry.transactionType === "credit"
                            ? {
                                color: "oklch(0.4 0.16 150)",
                                borderColor: "oklch(0.4 0.16 150 / 0.3)",
                                background: "oklch(0.97 0.03 150)",
                              }
                            : {
                                color: "oklch(0.45 0.2 27)",
                                borderColor: "oklch(0.45 0.2 27 / 0.3)",
                                background: "oklch(0.97 0.03 27)",
                              }
                        }
                      >
                        {entry.transactionType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs border border-border">
                        {entry.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {entry.narration || "-"}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right font-semibold"
                      style={{
                        color:
                          entry.transactionType === "debit"
                            ? "oklch(0.45 0.2 27)"
                            : undefined,
                      }}
                    >
                      {entry.transactionType === "debit"
                        ? formatCurrency(entry.amount)
                        : "-"}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right font-semibold"
                      style={{
                        color:
                          entry.transactionType === "credit"
                            ? "oklch(0.4 0.16 150)"
                            : undefined,
                      }}
                    >
                      {entry.transactionType === "credit"
                        ? formatCurrency(entry.amount)
                        : "-"}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right font-bold"
                      style={{
                        color:
                          entry.runningBalance >= 0
                            ? "oklch(0.4 0.16 150)"
                            : "oklch(0.45 0.2 27)",
                      }}
                    >
                      {formatCurrency(Math.abs(entry.runningBalance))}
                      {entry.runningBalance < 0 && (
                        <span className="text-xs font-normal ml-0.5">Dr</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {entry.reference || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(entry)}
                          className="h-7 w-7 p-0"
                          data-ocid={`pettycash-ledger.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(entry)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`pettycash-ledger.delete_button.${index + 1}`}
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
        <DialogContent className="max-w-lg" data-ocid="pettycash-ledger.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEntry ? "Edit Ledger Entry" : "Add Ledger Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ledgerDate" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="ledgerDate"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="pettycash-ledger.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Transaction Type *</Label>
                <Select
                  value={form.transactionType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, transactionType: v, category: "" }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="pettycash-ledger.type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit" className="text-xs">
                      Credit (Money In)
                    </SelectItem>
                    <SelectItem value="debit" className="text-xs">
                      Debit (Money Out)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="pettycash-ledger.category.select"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ledgerAmount" className="text-xs">
                  Amount (₹) *
                </Label>
                <Input
                  id="ledgerAmount"
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
                  data-ocid="pettycash-ledger.amount.input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ledgerNarration" className="text-xs">
                Narration
              </Label>
              <Textarea
                id="ledgerNarration"
                placeholder="Description of this transaction..."
                value={form.narration}
                onChange={(e) =>
                  setForm((p) => ({ ...p, narration: e.target.value }))
                }
                className="text-xs resize-none"
                rows={2}
                data-ocid="pettycash-ledger.narration.textarea"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ledgerRef" className="text-xs">
                Reference (optional)
              </Label>
              <Input
                id="ledgerRef"
                placeholder="Voucher / Receipt / Note number"
                value={form.reference}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reference: e.target.value }))
                }
                className="text-xs"
                data-ocid="pettycash-ledger.reference.input"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="pettycash-ledger.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.category}
                data-ocid="pettycash-ledger.submit_button"
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
        <DialogContent
          className="max-w-sm"
          data-ocid="pettycash-ledger.delete_modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Ledger Entry
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this ledger entry? This will affect
            the running balance.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="pettycash-ledger.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
              data-ocid="pettycash-ledger.delete_confirm_button"
              className="text-xs"
            >
              {deleteEntry.isPending ? (
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
