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
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Payable,
  useCreatePayable,
  useDeletePayable,
  useGetAllPayables,
  useUpdatePayable,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

interface PayableFormData {
  date: string;
  vehicleNumber: string;
  ownerName: string;
  tripReference: string;
  totalPayable: string;
  amountPaid: string;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
}

const defaultForm: PayableFormData = {
  date: "",
  vehicleNumber: "",
  ownerName: "",
  tripReference: "",
  totalPayable: "",
  amountPaid: "",
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

export default function PayablePage() {
  const payablesQuery = useGetAllPayables();
  const createPayable = useCreatePayable();
  const updatePayable = useUpdatePayable();
  const deletePayable = useDeletePayable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Payable | null>(null);
  const [form, setForm] = useState<PayableFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Payable | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const allRecords = payablesQuery.data ?? [];

  const filteredRecords = useMemo(() => {
    if (activeTab === "all") return allRecords;
    return allRecords.filter((r) => r.status === activeTab);
  }, [allRecords, activeTab]);

  const summaryStats = useMemo(() => {
    const totalPayable = allRecords.reduce((s, r) => s + r.totalPayable, 0);
    const totalPaid = allRecords.reduce((s, r) => s + r.amountPaid, 0);
    const totalOutstanding = allRecords
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + r.balance, 0);
    return { totalPayable, totalPaid, totalOutstanding };
  }, [allRecords]);

  const totalPayableAmt = Number(form.totalPayable || 0);
  const amountPaid = Number(form.amountPaid || 0);
  const previewBalance = Math.max(0, totalPayableAmt - amountPaid);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (record: Payable) => {
    setEditingRecord(record);
    setForm({
      date: record.date,
      vehicleNumber: record.vehicleNumber,
      ownerName: record.ownerName,
      tripReference: record.tripReference,
      totalPayable: record.totalPayable.toString(),
      amountPaid: record.amountPaid.toString(),
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
      vehicleNumber: form.vehicleNumber,
      ownerName: form.ownerName,
      tripReference: form.tripReference,
      totalPayable: totalPayableAmt,
      amountPaid,
      paymentDate: form.paymentDate,
      paymentMode: form.paymentMode,
      referenceNumber: form.referenceNumber,
      remarks: form.remarks,
    };
    try {
      if (editingRecord) {
        await updatePayable.mutateAsync({ id: editingRecord.id, ...data });
        toast.success("Record updated");
      } else {
        await createPayable.mutateAsync(data);
        toast.success("Payable recorded");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save record.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePayable.mutateAsync(deleteConfirm.id);
      toast.success("Record deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const isSaving = createPayable.isPending || updatePayable.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="payable.page">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown
              className="h-5 w-5"
              style={{ color: "oklch(0.45 0.2 27)" }}
            />
            <h2 className="text-lg font-bold font-display text-foreground">
              Accounts Payable
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allRecords.length} payable records
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="payable.primary_button"
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
              Total Payable
            </p>
            <p className="mt-1 text-xl font-bold font-display text-foreground">
              {formatCurrency(summaryStats.totalPayable)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Paid
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.4 0.16 150)" }}
            >
              {formatCurrency(summaryStats.totalPaid)}
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
            data-ocid="payable.all.tab"
          >
            All ({allRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="text-xs"
            data-ocid="payable.pending.tab"
          >
            Pending ({allRecords.filter((r) => r.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger
            value="partial"
            className="text-xs"
            data-ocid="payable.partial.tab"
          >
            Partial ({allRecords.filter((r) => r.status === "partial").length})
          </TabsTrigger>
          <TabsTrigger
            value="paid"
            className="text-xs"
            data-ocid="payable.paid.tab"
          >
            Paid ({allRecords.filter((r) => r.status === "paid").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {payablesQuery.isLoading ? (
          <div className="p-6 space-y-3" data-ocid="payable.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="payable.empty_state"
          >
            <TrendingDown className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No payable records found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a payment due to a vehicle owner to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="payable.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Vehicle No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Owner</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Trip Ref
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Total Payable
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Paid
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
                    data-ocid={`payable.item.${index + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(record.date)}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-medium">
                      {record.vehicleNumber}
                    </TableCell>
                    <TableCell className="text-xs font-medium max-w-[100px] truncate">
                      {record.ownerName || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {record.tripReference || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {formatCurrency(record.totalPayable)}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right"
                      style={{ color: "oklch(0.4 0.16 150)" }}
                    >
                      {formatCurrency(record.amountPaid)}
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
                          data-ocid={`payable.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(record)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`payable.delete_button.${index + 1}`}
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
        <DialogContent className="max-w-2xl" data-ocid="payable.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRecord ? "Edit Payable Record" : "Add Payable Record"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="payDate" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="payDate"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="payable.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payVehicle" className="text-xs">
                  Vehicle Number *
                </Label>
                <Input
                  id="payVehicle"
                  placeholder="e.g. OD03AB6655"
                  value={form.vehicleNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vehicleNumber: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="payable.vehicle_number.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payOwner" className="text-xs">
                  Owner Name
                </Label>
                <Input
                  id="payOwner"
                  placeholder="Vehicle owner name"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ownerName: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="payable.owner_name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payTripRef" className="text-xs">
                  Trip Reference
                </Label>
                <Input
                  id="payTripRef"
                  placeholder="e.g. LT-00001"
                  value={form.tripReference}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tripReference: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="payable.trip_reference.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payTotal" className="text-xs">
                  Total Payable (₹) *
                </Label>
                <Input
                  id="payTotal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalPayable}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, totalPayable: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="payable.total_payable.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payPaid" className="text-xs">
                  Amount Paid (₹)
                </Label>
                <Input
                  id="payPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amountPaid}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amountPaid: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="payable.amount_paid.input"
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
                <Label htmlFor="payPayDate" className="text-xs">
                  Payment Date
                </Label>
                <Input
                  id="payPayDate"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, paymentDate: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="payable.payment_date.input"
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
                    data-ocid="payable.payment_mode.select"
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
                <Label htmlFor="payRefNo" className="text-xs">
                  Reference Number
                </Label>
                <Input
                  id="payRefNo"
                  placeholder="Cheque / UTR / Reference"
                  value={form.referenceNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, referenceNumber: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="payable.reference_number.input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payRemarks" className="text-xs">
                Remarks
              </Label>
              <Textarea
                id="payRemarks"
                placeholder="Additional notes..."
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
                className="text-xs resize-none"
                rows={2}
                data-ocid="payable.remarks.textarea"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="payable.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                data-ocid="payable.submit_button"
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
        <DialogContent className="max-w-sm" data-ocid="payable.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Payable Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this payable record? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="payable.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePayable.isPending}
              data-ocid="payable.delete_confirm_button"
              className="text-xs"
            >
              {deletePayable.isPending ? (
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
