import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  CheckSquare,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type Invoice,
  useCreateInvoice,
  useDeleteInvoice,
  useGetAllInvoices,
  useGetAllTrips,
  useGetAllTrucks,
  useUpdateInvoice,
} from "../hooks/useQueries";
import { formatCurrency } from "../utils/format";

interface InvoiceFormData {
  tripId: string;
  rate: string;
  gstPercent: string;
  status: string;
}

const defaultForm: InvoiceFormData = {
  tripId: "",
  rate: "",
  gstPercent: "18",
  status: "draft",
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
  const tripsQuery = useGetAllTrips();
  const trucksQuery = useGetAllTrucks();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [selectedTruckIds, setSelectedTruckIds] = useState<Set<string>>(
    new Set(),
  );

  const invoices = invoicesQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];

  const toggleTruckSelection = (truckId: string) => {
    setSelectedTruckIds((prev) => {
      const next = new Set(prev);
      if (next.has(truckId)) {
        next.delete(truckId);
      } else {
        next.add(truckId);
      }
      return next;
    });
  };

  // Filter trips based on selected trucks — if none selected, show all
  const filteredTrips =
    selectedTruckIds.size === 0
      ? trips
      : trips.filter((t) => selectedTruckIds.has(t.truckId.toString()));

  // Find trip for form
  const selectedTrip = trips.find((t) => t.id.toString() === form.tripId);
  const loadingQty = selectedTrip?.loadingQty ?? 0;
  const rate = Number(form.rate || 0);
  const billingAmount = loadingQty * rate;
  const gstPercent = Number(form.gstPercent || 0);
  const gstAmount = billingAmount * (gstPercent / 100);
  const totalInvoice = billingAmount + gstAmount;

  const openCreateDialog = () => {
    setEditingInvoice(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (inv: Invoice) => {
    setEditingInvoice(inv);
    setForm({
      tripId: inv.tripId.toString(),
      rate: inv.rate.toString(),
      gstPercent: inv.gstPercent.toString(),
      status: inv.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      tripId: BigInt(form.tripId),
      rate,
      billingAmount,
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
    const trip = trips.find((t) => t.id === inv.tripId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${inv.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            .subtitle { color: #666; margin-bottom: 32px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px 12px; border: 1px solid #e5e7eb; text-align: left; }
            th { background: #f9fafb; font-weight: 600; }
            .total { font-weight: bold; background: #f9fafb; }
            .footer { margin-top: 40px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>JSL Transport</h1>
          <div class="subtitle">Tax Invoice #INV-${String(inv.id).padStart(4, "0")}</div>
          ${trip ? `<p>Trip: ${trip.tripId} | ${trip.consigner} → ${trip.consignee}</p>` : ""}
          <table>
            <thead><tr><th>Description</th><th>Amount (₹)</th></tr></thead>
            <tbody>
              <tr><td>Freight Charges (${trip?.loadingQty ?? "-"} MT × ₹${inv.rate})</td><td>₹${inv.billingAmount.toLocaleString("en-IN")}</td></tr>
              <tr><td>GST @ ${inv.gstPercent}%</td><td>₹${inv.gstAmount.toLocaleString("en-IN")}</td></tr>
              <tr class="total"><td><strong>Total Invoice Amount</strong></td><td><strong>₹${inv.totalInvoice.toLocaleString("en-IN")}</strong></td></tr>
            </tbody>
          </table>
          <div class="footer">Generated by JSL Transport ERP</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const isSaving = createInvoice.isPending || updateInvoice.isPending;

  const getTripLabel = (tripId: bigint) => {
    const trip = trips.find((t) => t.id === tripId);
    return trip
      ? `${trip.tripId} (${trip.consigner}→${trip.consignee})`
      : tripId.toString();
  };

  return (
    <div className="p-6 space-y-5" data-ocid="billing.page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            Billing
          </h2>
          <p className="text-sm text-muted-foreground">
            {invoices.length} invoices
          </p>
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

      {/* Vehicle Selection Grid */}
      <div
        className="rounded-lg border border-border bg-card overflow-hidden"
        data-ocid="billing.vehicle_grid.section"
      >
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold font-display text-foreground">
              Select Vehicles for Billing
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedTruckIds.size > 0 && (
              <>
                <span className="text-xs font-medium text-primary flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" />
                  {selectedTruckIds.size} vehicle
                  {selectedTruckIds.size !== 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                  onClick={() => setSelectedTruckIds(new Set())}
                >
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          {trucksQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : trucks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No vehicles registered yet. Add trucks in Settings.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {trucks.map((truck, index) => {
                  const truckIdStr = truck.id.toString();
                  const isSelected = selectedTruckIds.has(truckIdStr);
                  return (
                    <button
                      key={truckIdStr}
                      type="button"
                      onClick={() => toggleTruckSelection(truckIdStr)}
                      className={cn(
                        "relative w-full text-left rounded-md border-2 p-3 cursor-pointer transition-all duration-150 select-none",
                        "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/40",
                      )}
                      data-ocid={`billing.vehicle_card.${index + 1}`}
                    >
                      {/* Checkbox top-right */}
                      <div className="absolute top-2 right-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            toggleTruckSelection(truckIdStr)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                          data-ocid={`billing.vehicle_checkbox.${index + 1}`}
                        />
                      </div>

                      <div className="pr-6">
                        <p
                          className={cn(
                            "text-sm font-bold font-display leading-tight truncate",
                            isSelected ? "text-primary" : "text-foreground",
                          )}
                        >
                          {truck.truckNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {truck.ownerName}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedTruckIds.size === 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Select one or more vehicles to filter trips in the New Invoice
                  dialog.
                </p>
              )}
            </>
          )}
        </div>
      </div>

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
            <p className="text-sm text-muted-foreground">
              No invoices created yet
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
                  <TableHead className="text-xs font-semibold">Trip</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Rate
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Billing
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
                {invoices.map((inv, index) => (
                  <TableRow
                    key={inv.id.toString()}
                    className="table-row-hover"
                    data-ocid={`billing.item.${index + 1}`}
                  >
                    <TableCell className="text-xs font-mono font-medium">
                      INV-{String(inv.id).padStart(4, "0")}
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">
                      {getTripLabel(inv.tripId)}
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
                ))}
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
            <div className="space-y-1.5">
              <Label className="text-xs">Select Trip *</Label>
              <Select
                value={form.tripId}
                onValueChange={(v) => setForm((p) => ({ ...p, tripId: v }))}
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="billing.form.trip_select"
                >
                  <SelectValue placeholder="Select trip" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTrips.map((t) => (
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
              {selectedTruckIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  Showing trips for {selectedTruckIds.size} selected vehicle
                  {selectedTruckIds.size !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rate" className="text-xs">
                  Rate per MT (₹) *
                </Label>
                <Input
                  id="rate"
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
                  data-ocid="billing.form.rate_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gstPercent" className="text-xs">
                  GST % *
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
                  className="text-xs"
                />
              </div>
            </div>

            {/* Auto-calculated values */}
            <div className="rounded-md bg-muted/50 border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Calculated Values
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Loading Qty</p>
                  <p className="font-medium">{loadingQty} MT</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Billing Amount</p>
                  <p className="font-medium">{formatCurrency(billingAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">GST Amount</p>
                  <p className="font-medium">{formatCurrency(gstAmount)}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground text-xs">Total Invoice</p>
                <p className="text-base font-bold font-display text-foreground">
                  {formatCurrency(totalInvoice)}
                </p>
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
                disabled={isSaving || !form.tripId || !form.rate}
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
