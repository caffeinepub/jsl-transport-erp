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
  Paperclip,
  Pencil,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Receivable,
  syncReceivablesFromInvoices,
  useDeleteReceivable,
  useGetAllBillingInvoices,
  useGetAllReceivables,
  useUpdateReceivable,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

const PAYMENT_MODES = ["Cash", "NEFT", "RTGS", "Cheque", "Online"];

interface EditFormData {
  amountReceived: string;
  tdsDeduction: string;
  penaltyAmount: string;
  penaltyBillFile: string;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
}

const defaultEditForm: EditFormData = {
  amountReceived: "",
  tdsDeduction: "",
  penaltyAmount: "",
  penaltyBillFile: "",
  paymentDate: "",
  paymentMode: "",
  referenceNumber: "",
  remarks: "",
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

export default function ReceivablePage() {
  const receivablesQuery = useGetAllReceivables();
  const invoicesQuery = useGetAllBillingInvoices();
  const updateReceivable = useUpdateReceivable();
  const deleteReceivable = useDeleteReceivable();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Receivable | null>(null);
  const [form, setForm] = useState<EditFormData>(defaultEditForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Receivable | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [penaltyPreview, setPenaltyPreview] = useState<Receivable | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterClient, setFilterClient] = useState("all");
  const [filterConsigner, setFilterConsigner] = useState("all");
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const allRecords = receivablesQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];

  // Auto-sync receivables from invoices whenever invoices change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — sync only when invoice count changes
  useEffect(() => {
    if (invoices.length > 0) {
      syncReceivablesFromInvoices(invoices);
      receivablesQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices.length]);

  // Unique filter options
  const clientOptions = useMemo(() => {
    const set = new Set(allRecords.map((r) => r.clientName).filter(Boolean));
    return [...set].sort();
  }, [allRecords]);

  const consignerOptions = useMemo(() => {
    const set = new Set(allRecords.map((r) => r.consignerName).filter(Boolean));
    return [...set].sort();
  }, [allRecords]);

  const vehicleOptions = useMemo(() => {
    const set = new Set(allRecords.map((r) => r.vehicleNo).filter(Boolean));
    return [...set].sort();
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    let records = allRecords;
    if (activeTab !== "all")
      records = records.filter((r) => r.status === activeTab);
    if (filterClient !== "all")
      records = records.filter((r) => r.clientName === filterClient);
    if (filterConsigner !== "all")
      records = records.filter((r) => r.consignerName === filterConsigner);
    if (filterVehicle !== "all")
      records = records.filter((r) => r.vehicleNo === filterVehicle);
    if (filterFrom) records = records.filter((r) => r.date >= filterFrom);
    if (filterTo) records = records.filter((r) => r.date <= filterTo);
    return records;
  }, [
    allRecords,
    activeTab,
    filterClient,
    filterConsigner,
    filterVehicle,
    filterFrom,
    filterTo,
  ]);

  const summaryStats = useMemo(() => {
    const totalInvoiced = allRecords.reduce((s, r) => s + r.invoiceAmount, 0);
    const totalReceived = allRecords.reduce((s, r) => s + r.amountReceived, 0);
    const totalTDS = allRecords.reduce((s, r) => s + (r.tdsDeduction ?? 0), 0);
    const totalPenalty = allRecords.reduce(
      (s, r) => s + (r.penaltyAmount ?? 0),
      0,
    );
    const totalOutstanding = allRecords
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + r.balance, 0);
    return {
      totalInvoiced,
      totalReceived,
      totalTDS,
      totalPenalty,
      totalOutstanding,
    };
  }, [allRecords]);

  const openEditDialog = (record: Receivable) => {
    setEditingRecord(record);
    setForm({
      amountReceived: record.amountReceived.toString(),
      tdsDeduction: (record.tdsDeduction ?? 0).toString(),
      penaltyAmount: (record.penaltyAmount ?? 0).toString(),
      penaltyBillFile: record.penaltyBillFile ?? "",
      paymentDate: record.paymentDate,
      paymentMode: record.paymentMode,
      referenceNumber: record.referenceNumber,
      remarks: record.remarks,
    });
    setDialogOpen(true);
  };

  const invoiceAmount = editingRecord?.invoiceAmount ?? 0;
  const amountReceived = Number(form.amountReceived || 0);
  const tdsDeduction = Number(form.tdsDeduction || 0);
  const penaltyAmount = Number(form.penaltyAmount || 0);
  const previewBalance = Math.max(
    0,
    invoiceAmount - amountReceived - tdsDeduction - penaltyAmount,
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, penaltyBillFile: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await updateReceivable.mutateAsync({
        id: editingRecord.id,
        billingInvoiceId: editingRecord.billingInvoiceId ?? 0n,
        invoiceDate: editingRecord.invoiceDate ?? editingRecord.date,
        date: editingRecord.date,
        invoiceNumber: editingRecord.invoiceNumber,
        clientName: editingRecord.clientName,
        vehicleNo: editingRecord.vehicleNo ?? "",
        consignerName: editingRecord.consignerName ?? "",
        invoiceAmount: editingRecord.invoiceAmount,
        amountReceived,
        tdsDeduction,
        penaltyAmount,
        penaltyBillFile: form.penaltyBillFile,
        paymentDate: form.paymentDate,
        paymentMode: form.paymentMode,
        referenceNumber: form.referenceNumber,
        remarks: form.remarks,
      });
      toast.success("Record updated");
      setDialogOpen(false);
    } catch {
      toast.error("Failed to update record.");
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

  const isSaving = updateReceivable.isPending;

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
            {allRecords.length} invoice records — auto-synced from billing
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              TDS Deducted
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.55 0.18 60)" }}
            >
              {formatCurrency(summaryStats.totalTDS)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Penalties
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.45 0.2 27)" }}
            >
              {formatCurrency(summaryStats.totalPenalty)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border col-span-2 sm:col-span-1">
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
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Client</Label>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger
                className="text-xs h-8"
                data-ocid="receivable.client_filter.select"
              >
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Clients
                </SelectItem>
                {clientOptions.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Consigner (OCP)</Label>
            <Select value={filterConsigner} onValueChange={setFilterConsigner}>
              <SelectTrigger
                className="text-xs h-8"
                data-ocid="receivable.consigner_filter.select"
              >
                <SelectValue placeholder="All OCPs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All OCPs
                </SelectItem>
                {consignerOptions.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vehicle No</Label>
            <Select value={filterVehicle} onValueChange={setFilterVehicle}>
              <SelectTrigger
                className="text-xs h-8"
                data-ocid="receivable.vehicle_filter.select"
              >
                <SelectValue placeholder="All Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Vehicles
                </SelectItem>
                {vehicleOptions.map((v) => (
                  <SelectItem key={v} value={v} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="text-xs h-8"
              data-ocid="receivable.date_from.input"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="text-xs h-8"
              data-ocid="receivable.date_to.input"
            />
          </div>
        </div>
        {(filterClient !== "all" ||
          filterConsigner !== "all" ||
          filterVehicle !== "all" ||
          filterFrom ||
          filterTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs h-7"
            onClick={() => {
              setFilterClient("all");
              setFilterConsigner("all");
              setFilterVehicle("all");
              setFilterFrom("");
              setFilterTo("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Status Tabs */}
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
              Generate bills from the Billing page — they will appear here
              automatically
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="receivable.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Bill Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Invoice No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Vehicle No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consigner
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
                    TDS Ded.
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Penalty
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Balance
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
                    <TableCell className="text-xs font-mono">
                      {record.vehicleNo || "-"}
                    </TableCell>
                    <TableCell className="text-xs max-w-[100px] truncate">
                      {record.consignerName || "-"}
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
                      className="text-xs text-right"
                      style={{ color: "oklch(0.55 0.18 60)" }}
                    >
                      {record.tdsDeduction
                        ? formatCurrency(record.tdsDeduction)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <div className="flex items-center justify-end gap-1">
                        {record.penaltyAmount ? (
                          <>
                            <span style={{ color: "oklch(0.45 0.2 27)" }}>
                              {formatCurrency(record.penaltyAmount)}
                            </span>
                            {record.penaltyBillFile && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPenaltyPreview(record)}
                                className="h-5 w-5 p-0 text-muted-foreground"
                                title="View penalty bill"
                              >
                                <Paperclip className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
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

      {/* Edit Dialog (payment recording) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="receivable.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Record Payment</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invoice details (read-only) */}
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Invoice Details
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Invoice No</p>
                    <p className="font-mono font-medium">
                      {editingRecord.invoiceNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {formatDate(editingRecord.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Invoice Amount</p>
                    <p className="font-bold text-foreground">
                      {formatCurrency(editingRecord.invoiceAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vehicle</p>
                    <p className="font-mono">
                      {editingRecord.vehicleNo || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Consigner (OCP)</p>
                    <p className="font-medium">
                      {editingRecord.consignerName || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">{editingRecord.clientName}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-1.5">
                  <Label htmlFor="rcvTDS" className="text-xs">
                    TDS Deduction (₹)
                  </Label>
                  <Input
                    id="rcvTDS"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.tdsDeduction}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tdsDeduction: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="receivable.tds_deduction.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rcvPenalty" className="text-xs">
                    Penalty Amount (₹)
                  </Label>
                  <Input
                    id="rcvPenalty"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.penaltyAmount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, penaltyAmount: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="receivable.penalty_amount.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Upload Penalty Bill (optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs gap-1.5 h-8"
                      data-ocid="receivable.penalty_bill.upload_button"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {form.penaltyBillFile ? "Change" : "Attach"}
                    </Button>
                    {form.penaltyBillFile && (
                      <span className="text-xs text-green-700">✓ Attached</span>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Balance preview */}
              <div className="rounded-md bg-muted/50 border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Balance = Invoice ({formatCurrency(invoiceAmount)}) - Received
                  ({formatCurrency(amountReceived)}) - TDS (
                  {formatCurrency(tdsDeduction)}) - Penalty (
                  {formatCurrency(penaltyAmount)})
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
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="rcvRefNo" className="text-xs">
                    Reference Number
                  </Label>
                  <Input
                    id="rcvRefNo"
                    placeholder="Cheque / UTR / Reference"
                    value={form.referenceNumber}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        referenceNumber: e.target.value,
                      }))
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
                  ) : (
                    "Save Payment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
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

      {/* Penalty Bill Preview */}
      <Dialog
        open={!!penaltyPreview}
        onOpenChange={() => setPenaltyPreview(null)}
      >
        <DialogContent
          className="max-w-2xl"
          data-ocid="receivable.penalty_preview.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Penalty Bill — {penaltyPreview?.clientName}
            </DialogTitle>
          </DialogHeader>
          {penaltyPreview?.penaltyBillFile && (
            <div className="rounded-lg overflow-hidden border border-border">
              {penaltyPreview.penaltyBillFile.startsWith("data:image") ? (
                <img
                  src={penaltyPreview.penaltyBillFile}
                  alt="Penalty bill"
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : (
                <iframe
                  src={penaltyPreview.penaltyBillFile}
                  title="Penalty bill PDF"
                  className="w-full h-[60vh]"
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPenaltyPreview(null)}
              data-ocid="receivable.penalty_preview.close_button"
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
