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
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Payment,
  useCreatePayment,
  useDeletePayment,
  useGetAllPayments,
  useGetAllTrips,
  useUpdatePayment,
} from "../hooks/useQueries";
import { formatCurrency } from "../utils/format";

interface PaymentFormData {
  tripId: string;
  totalCost: string;
  paidAmount: string;
  bankDetails: string;
  paymentStatus: string;
}

const defaultForm: PaymentFormData = {
  tripId: "",
  totalCost: "",
  paidAmount: "",
  bankDetails: "",
  paymentStatus: "pending",
};

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

export default function PaymentsPage() {
  const paymentsQuery = useGetAllPayments();
  const tripsQuery = useGetAllTrips();
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState<PaymentFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Payment | null>(null);

  const payments = paymentsQuery.data ?? [];
  const trips = tripsQuery.data ?? [];

  const totalCost = Number(form.totalCost || 0);
  const paidAmount = Number(form.paidAmount || 0);
  const balance = totalCost - paidAmount;

  const summaryStats = useMemo(() => {
    const totalOutstanding = payments
      .filter((p) => p.paymentStatus !== "paid")
      .reduce((s, p) => s + p.balance, 0);
    const totalPaid = payments
      .filter((p) => p.paymentStatus === "paid")
      .reduce((s, p) => s + p.paidAmount, 0);
    const pendingCount = payments.filter(
      (p) => p.paymentStatus === "pending",
    ).length;
    return { totalOutstanding, totalPaid, pendingCount };
  }, [payments]);

  const openCreateDialog = () => {
    setEditingPayment(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setForm({
      tripId: payment.tripId.toString(),
      totalCost: payment.totalCost.toString(),
      paidAmount: payment.paidAmount.toString(),
      bankDetails: payment.bankDetails,
      paymentStatus: payment.paymentStatus,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      tripId: BigInt(form.tripId),
      totalCost,
      paidAmount,
      balance,
      bankDetails: form.bankDetails,
      paymentStatus: form.paymentStatus,
    };
    try {
      if (editingPayment) {
        await updatePayment.mutateAsync({ id: editingPayment.id, ...data });
        toast.success("Payment updated");
      } else {
        await createPayment.mutateAsync(data);
        toast.success("Payment recorded");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save payment.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePayment.mutateAsync(deleteConfirm.id);
      toast.success("Payment record deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const getTripLabel = (tripId: bigint) =>
    trips.find((t) => t.id === tripId)?.tripId ?? tripId.toString();
  const isSaving = createPayment.isPending || updatePayment.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="payments.page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            Client Payments
          </h2>
          <p className="text-sm text-muted-foreground">
            {payments.length} payment records
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="payments.new_button"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Outstanding
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
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Received
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
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Pending Trips
            </p>
            <p className="mt-1 text-xl font-bold font-display">
              {summaryStats.pendingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {paymentsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="payments.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No payment records yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="payments.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Trip ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Total Cost
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Paid
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Balance
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Bank Details
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
                {payments.map((payment, index) => (
                  <TableRow
                    key={payment.id.toString()}
                    className={cn(
                      "transition-colors",
                      getRowClass(payment.paymentStatus),
                    )}
                    data-ocid={`payments.item.${index + 1}`}
                  >
                    <TableCell className="text-xs font-mono font-medium">
                      {getTripLabel(payment.tripId)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {formatCurrency(payment.totalCost)}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right"
                      style={{ color: "oklch(0.4 0.16 150)" }}
                    >
                      {formatCurrency(payment.paidAmount)}
                    </TableCell>
                    <TableCell
                      className="text-xs text-right font-semibold"
                      style={{
                        color:
                          payment.balance > 0
                            ? "oklch(0.45 0.2 27)"
                            : "oklch(0.4 0.16 150)",
                      }}
                    >
                      {formatCurrency(payment.balance)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {payment.bankDetails || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border capitalize ${getStatusClass(payment.paymentStatus)}`}
                      >
                        {payment.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(payment)}
                          className="h-7 w-7 p-0"
                          data-ocid={`payments.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(payment)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`payments.delete_button.${index + 1}`}
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
        <DialogContent className="max-w-lg" data-ocid="payments.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingPayment ? "Edit Payment" : "Record Payment"}
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
                  data-ocid="payments.form.trip_select"
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
                <Label htmlFor="totalCost" className="text-xs">
                  Total Cost (₹) *
                </Label>
                <Input
                  id="totalCost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalCost}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, totalCost: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="payments.form.total_cost_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paidAmount" className="text-xs">
                  Paid Amount (₹) *
                </Label>
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.paidAmount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, paidAmount: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="payments.form.paid_amount_input"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Auto-calculated Balance
              </p>
              <p
                className="text-base font-bold font-display mt-1"
                style={{
                  color:
                    balance > 0 ? "oklch(0.45 0.2 27)" : "oklch(0.4 0.16 150)",
                }}
              >
                {formatCurrency(balance)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankDetails" className="text-xs">
                Bank Details
              </Label>
              <Input
                id="bankDetails"
                placeholder="Account number, IFSC, bank name"
                value={form.bankDetails}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bankDetails: e.target.value }))
                }
                className="text-xs"
                data-ocid="payments.form.bank_details_input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Payment Status</Label>
              <Select
                value={form.paymentStatus}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, paymentStatus: v }))
                }
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="payments.form.status_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="text-xs">
                    Pending
                  </SelectItem>
                  <SelectItem value="partial" className="text-xs">
                    Partial
                  </SelectItem>
                  <SelectItem value="paid" className="text-xs">
                    Paid
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="payments.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.tripId}
                data-ocid="payments.form.submit_button"
                className="text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingPayment ? (
                  "Update"
                ) : (
                  "Record"
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
        <DialogContent className="max-w-sm" data-ocid="payments.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Payment Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this payment record?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="payments.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePayment.isPending}
              data-ocid="payments.delete_confirm_button"
              className="text-xs"
            >
              {deletePayment.isPending ? (
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
