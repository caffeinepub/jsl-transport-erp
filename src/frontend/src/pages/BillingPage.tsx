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
import { FileText, Loader2, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Invoice,
  useCreateInvoice,
  useDeleteInvoice,
  useGetAllConsignees,
  useGetAllConsigners,
  useGetAllInvoices,
  useGetAllLoadingTrips,
  useGetAllUnloadings,
  useGetAllVehicles,
  useUpdateInvoice,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

interface InvoiceFormData {
  unloadingId: string;
  gstPercent: string;
  status: string;
  // auto-filled from unloading
  billingRate: number;
  unloadingQty: number;
  clientBillAmount: number;
}

const defaultForm: InvoiceFormData = {
  unloadingId: "",
  gstPercent: "18",
  status: "draft",
  billingRate: 0,
  unloadingQty: 0,
  clientBillAmount: 0,
};

function getStatusClass(status: string) {
  switch (status) {
    case "paid":
      return "status-paid";
    case "sent":
      return "status-sent";
    default:
      return "status-draft";
  }
}

export default function BillingPage() {
  const invoicesQuery = useGetAllInvoices();
  const unloadingsQuery = useGetAllUnloadings();
  const loadingTripsQuery = useGetAllLoadingTrips();
  const vehiclesQuery = useGetAllVehicles();
  const consignersQuery = useGetAllConsigners();
  const consigneesQuery = useGetAllConsignees();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);

  const invoices = invoicesQuery.data ?? [];
  const unloadings = unloadingsQuery.data ?? [];
  const loadingTrips = loadingTripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];
  const consignees = consigneesQuery.data ?? [];

  // Build enriched unloading list for selector
  const enrichedUnloadings = useMemo(
    () =>
      unloadings.map((u) => {
        const trip = loadingTrips.find(
          (t) =>
            t.id === u.loadingTripId ||
            Number(t.id) === Number(u.loadingTripId),
        );
        const vehicleNum = trip
          ? (vehicles.find(
              (v) =>
                v.id === trip.vehicleId ||
                Number(v.id) === Number(trip.vehicleId),
            )?.vehicleNumber ?? "—")
          : "—";
        const consignerName = trip
          ? (consigners.find(
              (c) =>
                c.id === trip.consignerId ||
                Number(c.id) === Number(trip.consignerId),
            )?.name ?? "—")
          : "—";
        const consigneeName = trip
          ? (consignees.find(
              (c) =>
                c.id === trip.consigneeId ||
                Number(c.id) === Number(trip.consigneeId),
            )?.name ?? "—")
          : "—";
        return {
          ...u,
          tripId: trip?.tripId ?? `LT-${u.loadingTripId}`,
          vehicleNum,
          consignerName,
          consigneeName,
          loadingDate: trip?.loadingDate ?? "",
        };
      }),
    [unloadings, loadingTrips, vehicles, consigners, consignees],
  );

  // Get enriched unloading for a given unloadingId stored in invoice's tripId field
  const getEnrichedForInvoice = (inv: Invoice) => {
    // invoices store unloadingId in tripId field (BigInt)
    const uId = Number(inv.tripId);
    return enrichedUnloadings.find((u) => Number(u.id) === uId);
  };

  // Computed values for form
  const gstPercent = Number(form.gstPercent || 0);
  const gstAmount = form.clientBillAmount * (gstPercent / 100);
  const totalInvoice = form.clientBillAmount + gstAmount;

  const openCreateDialog = () => {
    setEditingInvoice(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (inv: Invoice) => {
    setEditingInvoice(inv);
    const eu = getEnrichedForInvoice(inv);
    setForm({
      unloadingId: inv.tripId.toString(),
      gstPercent: inv.gstPercent.toString(),
      status: inv.status,
      billingRate: eu?.billingRate ?? inv.rate,
      unloadingQty: eu?.unloadingQty ?? 0,
      clientBillAmount: eu?.clientBillAmount ?? inv.billingAmount,
    });
    setDialogOpen(true);
  };

  const handleUnloadingSelect = (unloadingIdStr: string) => {
    const u = enrichedUnloadings.find(
      (x) => x.id.toString() === unloadingIdStr,
    );
    if (u) {
      setForm((p) => ({
        ...p,
        unloadingId: unloadingIdStr,
        billingRate: u.billingRate,
        unloadingQty: u.unloadingQty,
        clientBillAmount: u.clientBillAmount,
      }));
    } else {
      setForm((p) => ({
        ...p,
        unloadingId: unloadingIdStr,
        billingRate: 0,
        unloadingQty: 0,
        clientBillAmount: 0,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      tripId: BigInt(form.unloadingId), // store unloading ID in tripId field
      rate: form.billingRate,
      billingAmount: form.clientBillAmount,
      gstPercent,
      gstAmount,
      totalInvoice,
      status: form.status,
    };
    try {
      if (editingInvoice) {
        await updateInvoice.mutateAsync({ id: editingInvoice.id, ...data });
        toast.success("Invoice updated successfully");
      } else {
        await createInvoice.mutateAsync(data);
        toast.success("Invoice created successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save invoice.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteInvoice.mutateAsync(deleteConfirm.id);
      toast.success("Invoice deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete invoice.");
    }
  };

  const handlePrint = (inv: Invoice) => {
    const eu = getEnrichedForInvoice(inv);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${inv.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            .subtitle { color: #666; margin-bottom: 8px; }
            .meta { margin-bottom: 24px; font-size: 13px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; }
            th { background: #f9fafb; font-weight: 600; }
            .total { font-weight: bold; background: #f9fafb; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>Jeen Trade & Exports Pvt Ltd</h1>
          <div class="subtitle">Tax Invoice #INV-${String(inv.id).padStart(4, "0")}</div>
          ${
            eu
              ? `
          <div class="meta">
            <div>Trip: ${eu.tripId} | Vehicle: ${eu.vehicleNum}</div>
            <div>Consigner: ${eu.consignerName} &rarr; Consignee: ${eu.consigneeName}</div>
            ${eu.loadingDate ? `<div>Date: ${eu.loadingDate}</div>` : ""}
          </div>`
              : ""
          }
          <table>
            <thead><tr><th>Description</th><th>Amount (₹)</th></tr></thead>
            <tbody>
              <tr><td>Freight Charges (${eu?.unloadingQty?.toFixed(3) ?? "-"} MT × ₹${inv.rate}/MT)</td><td>₹${inv.billingAmount.toLocaleString("en-IN")}</td></tr>
              <tr><td>GST @ ${inv.gstPercent}%</td><td>₹${inv.gstAmount.toLocaleString("en-IN")}</td></tr>
              <tr class="total"><td><strong>Total Invoice Amount</strong></td><td><strong>₹${inv.totalInvoice.toLocaleString("en-IN")}</strong></td></tr>
            </tbody>
          </table>
          <div class="footer">Generated by Jeen Trade ERP</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const isSaving = createInvoice.isPending || updateInvoice.isPending;

  // Summary stats
  const totalBilled = invoices.reduce((s, i) => s + i.totalInvoice, 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const pendingInvoices = invoices.filter((i) => i.status !== "paid");
  const totalReceived = paidInvoices.reduce((s, i) => s + i.totalInvoice, 0);
  const totalPending = pendingInvoices.reduce((s, i) => s + i.totalInvoice, 0);

  return (
    <div className="p-6 space-y-5" data-ocid="billing.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.65 0.16 150 / 0.12)" }}
          >
            <FileText
              className="h-4 w-4"
              style={{ color: "oklch(0.45 0.16 150)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Billing
            </h2>
            <p className="text-sm text-muted-foreground">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="billing.new_button"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Total Billed
          </p>
          <p className="mt-1 text-xl font-bold font-display text-foreground">
            {formatCurrency(totalBilled)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoices.length} invoices
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Received
          </p>
          <p
            className="mt-1 text-xl font-bold font-display"
            style={{ color: "oklch(0.45 0.16 150)" }}
          >
            {formatCurrency(totalReceived)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {paidInvoices.length} paid
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Pending
          </p>
          <p
            className="mt-1 text-xl font-bold font-display"
            style={{ color: "oklch(0.577 0.245 27.325)" }}
          >
            {formatCurrency(totalPending)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pendingInvoices.length} unpaid
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {invoicesQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            data-ocid="billing.empty_state"
          >
            <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No invoices created yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create an invoice from a completed unloading record
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="billing.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Invoice #
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Trip ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Vehicle
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consigner
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consignee
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Unload Qty
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Rate/MT
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Bill Amt
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    GST%
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    GST Amt
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Total
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
                {invoices.map((inv, index) => {
                  const eu = getEnrichedForInvoice(inv);
                  return (
                    <TableRow
                      key={inv.id.toString()}
                      className="table-row-hover"
                      data-ocid={`billing.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-mono font-medium">
                        INV-{String(inv.id).padStart(4, "0")}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {eu?.tripId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {eu?.vehicleNum ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">
                        {eu?.consignerName ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">
                        {eu?.consigneeName ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {eu?.unloadingQty?.toFixed(3) ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {formatCurrency(inv.rate)}/MT
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatCurrency(inv.billingAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {inv.gstPercent}%
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {formatCurrency(inv.gstAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        {formatCurrency(inv.totalInvoice)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border capitalize ${getStatusClass(inv.status)}`}
                        >
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(inv)}
                            className="h-7 w-7 p-0"
                            title="Print Invoice"
                            data-ocid={`billing.print_button.${index + 1}`}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(inv)}
                            className="h-7 w-7 p-0"
                            data-ocid={`billing.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(inv)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            data-ocid={`billing.delete_button.${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Invoice Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="billing.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingInvoice ? "Edit Invoice" : "New Invoice"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Unloading record selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Select Unloading Record *</Label>
              <Select
                value={form.unloadingId}
                onValueChange={handleUnloadingSelect}
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="billing.form.unloading_select"
                >
                  <SelectValue placeholder="Select unloading record" />
                </SelectTrigger>
                <SelectContent>
                  {enrichedUnloadings.length === 0 ? (
                    <SelectItem value="_none" disabled className="text-xs">
                      No unloading records found
                    </SelectItem>
                  ) : (
                    enrichedUnloadings.map((u) => (
                      <SelectItem
                        key={u.id.toString()}
                        value={u.id.toString()}
                        className="text-xs"
                      >
                        {u.tripId} — {u.vehicleNum} |{" "}
                        {u.unloadingQty.toFixed(2)} MT | ₹
                        {u.clientBillAmount.toLocaleString("en-IN")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-filled trip details */}
            {form.unloadingId &&
              (() => {
                const eu = enrichedUnloadings.find(
                  (x) => x.id.toString() === form.unloadingId,
                );
                if (!eu) return null;
                return (
                  <div className="rounded-md bg-muted/40 border border-border p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div>
                      <p className="text-muted-foreground">Vehicle</p>
                      <p className="font-medium font-mono">{eu.vehicleNum}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Trip ID</p>
                      <p className="font-medium font-mono">{eu.tripId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Consigner</p>
                      <p className="font-medium">{eu.consignerName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Consignee</p>
                      <p className="font-medium">{eu.consigneeName}</p>
                    </div>
                    {eu.loadingDate && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Loading Date</p>
                        <p className="font-medium">
                          {formatDate(eu.loadingDate)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

            <div className="space-y-1.5">
              <Label htmlFor="gstPercent" className="text-xs">
                GST %
              </Label>
              <Input
                id="gstPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.gstPercent}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gstPercent: e.target.value }))
                }
                required
                className="text-xs w-32"
              />
            </div>

            {/* Auto-calculated values */}
            <div className="rounded-md bg-muted/50 border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Calculated Values
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Unloading Qty</p>
                  <p className="font-medium">
                    {form.unloadingQty.toFixed(3)} MT
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Billing Rate</p>
                  <p className="font-medium">
                    {formatCurrency(form.billingRate)}/MT
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bill Amount</p>
                  <p className="font-medium">
                    {formatCurrency(form.clientBillAmount)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <p className="text-muted-foreground">GST Amount</p>
                  <p className="font-medium">{formatCurrency(gstAmount)}</p>
                </div>
                <div className="pt-2 border-l border-border pl-3">
                  <p className="text-muted-foreground text-xs">Total Invoice</p>
                  <p className="text-base font-bold font-display text-foreground">
                    {formatCurrency(totalInvoice)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="billing.form.status_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                  <SelectItem value="sent" className="text-xs">
                    Sent
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
                data-ocid="billing.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.unloadingId}
                data-ocid="billing.form.submit_button"
                className="text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingInvoice ? (
                  "Update Invoice"
                ) : (
                  "Create Invoice"
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
        <DialogContent className="max-w-sm" data-ocid="billing.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this invoice? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="billing.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
              data-ocid="billing.delete_confirm_button"
              className="text-xs"
            >
              {deleteInvoice.isPending ? (
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
