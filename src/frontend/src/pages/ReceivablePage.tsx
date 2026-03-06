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
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Receivable,
  useCreateReceivable,
  useDeleteReceivable,
  useGetAllReceivables,
  useUpdateReceivable,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

interface ReceivableFormData {
  date: string;
  invoiceNumber: string;
  clientName: string;
  invoiceAmount: string;
  amountReceived: string;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
}

const defaultForm: ReceivableFormData = {
  date: "",
  invoiceNumber: "",
  clientName: "",
  invoiceAmount: "",
  amountReceived: "",
  paymentDate: "",
  paymentMode: "",
  referenceNumber: "",
  remarks: "",
};

const PAYMENT_MODES = ["Cash", "NEFT", "RTGS", "Cheque", "Online"];

function getRowClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-50/50 hover:bg-green-50";
    case "partial":
      return "bg-amber-50/50 hover:bg-amber-50";
    default:
      return "bg-red-50/30 hover:bg-red-50/50";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "paid":
      return "status-paid";
    case "partial":
      return "status-partial";
    default:
      return "status-pending";
  }
}

export default function ReceivablePage() {
  const receivablesQuery = useGetAllReceivables();
  const createReceivable = useCreateReceivable();
  const updateReceivable = useUpdateReceivable();
  const deleteReceivable = useDeleteReceivable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Receivable | null>(null);
  const [form, setForm] = useState<ReceivableFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Receivable | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const allRecords = receivablesQuery.data ?? [];

  const filteredRecords = useMemo(() => {
    if (activeTab === "all") return allRecords;
    return allRecords.filter((r) => r.status === activeTab);
  }, [allRecords, activeTab]);

  const summaryStats = useMemo(() => {
    const totalInvoiced = allRecords.reduce((s, r) => s + r.invoiceAmount, 0);
    const totalReceived = allRecords.reduce((s, r) => s + r.amountReceived, 0);
    const totalOutstanding = allRecords
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + r.balance, 0);
    return { totalInvoiced, totalReceived, totalOutstanding };
  }, [allRecords]);

  const invoiceAmount = Number(form.invoiceAmount || 0);
  const amountReceived = Number(form.amountReceived || 0);
  const previewBalance = Math.max(0, invoiceAmount - amountReceived);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (record: Receivable) => {
    setEditingRecord(record);
    setForm({
      date: record.date,
      invoiceNumber: record.invoiceNumber,
      clientName: record.clientName,
      invoiceAmount: record.invoiceAmount.toString(),
      amountReceived: record.amountReceived.toString(),
      paymentDate: record.paymentDate,
      paymentMode: record.paymentMode,
      referenceNumber: record.referenceNumber,
      remarks: record.remarks,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      date: form.date,
      invoiceNumber: form.invoiceNumber,
      clientName: form.clientName,
      invoiceAmount,
      amountReceived,
      paymentDate: form.paymentDate,
      paymentMode: form.paymentMode,
      referenceNumber: form.referenceNumber,
      remarks: form.remarks,
    };
    try {
      if (editingRecord) {
        await updateReceivable.mutateAsync({ id: editingRecord.id, ...data });
        toast.success("Record updated");
      } else {
        await createReceivable.mutateAsync(data);
        toast.success("Receivable recorded");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save record.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteReceivable.mutateAsync(deleteConfirm.id);
      toast.success("Record deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const isSaving = createReceivable.isPending || updateReceivable.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="receivable.page">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp
              className="h-5 w-5"
              style={{ color: "oklch(0.4 0.16 150)" }}
            />
            <h2 className="text-lg font-bold font-display text-foreground">
              Accounts Receivable
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allRecords.length} invoice records
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="receivable.primary_button"
        >
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Invoiced
            </p>
            <p className="mt-1 text-xl font-bold font-display text-foreground">
              {formatCurrency(summaryStats.totalInvoiced)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Received
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.4 0.16 150)" }}
            >
              {formatCurrency(summaryStats.totalReceived)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Outstanding
                </p>
                <p
                  className="mt-1 text-xl font-bold font-display"
                  style={{ color: "oklch(0.45 0.2 27)" }}
                >
                  {formatCurrency(summaryStats.totalOutstanding)}
                </p>
              </div>
              {summaryStats.totalOutstanding > 0 && (
                <AlertTriangle
                  className="h-5 w-5"
                  style={{ color: "oklch(0.577 0.245 27)" }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger
            value="all"
            className="text-xs"
            data-ocid="receivable.all.tab"
          >
            All ({allRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="text-xs"
            data-ocid="receivable.pending.tab"
          >
            Pending ({allRecords.filter((r) => r.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger
            value="partial"
            className="text-xs"
            data-ocid="receivable.partial.tab"
          >
            Partial ({allRecords.filter((r) => r.status === "partial").length})
          </TabsTrigger>
          <TabsTrigger
            value="paid"
            className="text-xs"
            data-ocid="receivable.paid.tab"
          >
            Paid ({allRecords.filter((r) => r.status === "paid").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {receivablesQuery.isLoading ? (
          <div className="p-6 space-y-3" data-ocid="receivable.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="receivable.empty_state"
          >
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No receivable records found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first invoice record to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="receivable.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Invoice No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Client
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Invoice Amt
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Received
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Balance
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Pay Mode
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Ref No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, index) => (
                  <TableRow
                    key={record.id.toString()}
                    className={cn(
                      "transition-colors",
                      getRowClass(record.status),
                    )}
                    data-ocid={`receivable.item.${index + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(record.date)}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-medium">
                      {record.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs font-medium max-w-[120px] truncate">
                      {record.clientName}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {formatCurrency(record.invoiceAmount)}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right"
                      style={{ color: "oklch(0.4 0.16 150)" }}
                    >
                      {formatCurrency(record.amountReceived)}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right font-semibold"
                      style={{
                        color:
                          record.balance > 0
                            ? "oklch(0.45 0.2 27)"
                            : "oklch(0.4 0.16 150)",
                      }}
                    >
                      {formatCurrency(record.balance)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.paymentMode || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {record.referenceNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border capitalize ${getStatusClass(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(record)}
                          className="h-7 w-7 p-0"
                          data-ocid={`receivable.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(record)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`receivable.delete_button.${index + 1}`}
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
        <DialogContent className="max-w-2xl" data-ocid="receivable.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRecord
                ? "Edit Receivable Record"
                : "Add Receivable Record"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rcvDate" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="rcvDate"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="receivable.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcvInvNo" className="text-xs">
                  Invoice Number *
                </Label>
                <Input
                  id="rcvInvNo"
                  placeholder="e.g. INV-2024-001"
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, invoiceNumber: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="receivable.invoice_number.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="rcvClient" className="text-xs">
                  Client Name *
                </Label>
                <Input
                  id="rcvClient"
                  placeholder="e.g. Jindal Steel & Power"
                  value={form.clientName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, clientName: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="receivable.client_name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcvInvAmt" className="text-xs">
                  Invoice Amount (₹) *
                </Label>
                <Input
                  id="rcvInvAmt"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.invoiceAmount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, invoiceAmount: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="receivable.invoice_amount.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcvReceived" className="text-xs">
                  Amount Received (₹)
                </Label>
                <Input
                  id="rcvReceived"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amountReceived}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amountReceived: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="receivable.amount_received.input"
                />
              </div>
            </div>

            {/* Auto-calculated balance */}
            <div className="rounded-md bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Auto-calculated Balance
              </p>
              <p
                className="text-base font-bold font-display mt-1"
                style={{
                  color:
                    previewBalance > 0
                      ? "oklch(0.45 0.2 27)"
                      : "oklch(0.4 0.16 150)",
                }}
              >
                {formatCurrency(previewBalance)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rcvPayDate" className="text-xs">
                  Payment Date
                </Label>
                <Input
                  id="rcvPayDate"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, paymentDate: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="receivable.payment_date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Mode</Label>
                <Select
                  value={form.paymentMode}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, paymentMode: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="receivable.payment_mode.select"
                  >
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcvRefNo" className="text-xs">
                  Reference Number
                </Label>
                <Input
                  id="rcvRefNo"
                  placeholder="Cheque / UTR / Reference"
                  value={form.referenceNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, referenceNumber: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="receivable.reference_number.input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rcvRemarks" className="text-xs">
                Remarks
              </Label>
              <Textarea
                id="rcvRemarks"
                placeholder="Additional notes..."
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
                className="text-xs resize-none"
                rows={2}
                data-ocid="receivable.remarks.textarea"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="receivable.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                data-ocid="receivable.submit_button"
                className="text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingRecord ? (
                  "Update"
                ) : (
                  "Add Record"
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
        <DialogContent className="max-w-sm" data-ocid="receivable.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Receivable Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this receivable record? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="receivable.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteReceivable.isPending}
              data-ocid="receivable.delete_confirm_button"
              className="text-xs"
            >
              {deleteReceivable.isPending ? (
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
