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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Receivable,
  type ReceivablePayment,
  syncReceivablesFromInvoices,
  useAddReceivablePayment,
  useDeleteReceivable,
  useGetAllBillingInvoices,
  useGetAllReceivables,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

const PAYMENT_MODES = ["Cash", "NEFT", "RTGS", "Cheque", "Online"];

interface NewPaymentForm {
  date: string;
  amount: string;
  tdsDeducted: string;
  penalty: string;
  reference: string;
  mode: string;
  remarks: string;
}

const defaultNewPaymentForm: NewPaymentForm = {
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  tdsDeducted: "",
  penalty: "",
  reference: "",
  mode: "",
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
  const deleteReceivable = useDeleteReceivable();
  const addPayment = useAddReceivablePayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Receivable | null>(null);
  const [newPaymentForm, setNewPaymentForm] = useState<NewPaymentForm>(
    defaultNewPaymentForm,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<Receivable | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [penaltyPreview, setPenaltyPreview] = useState<Receivable | null>(null);
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
    setNewPaymentForm({ ...defaultNewPaymentForm });
    setDialogOpen(true);
  };

  const handleAddNewPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const amt = Number(newPaymentForm.amount || 0);
    if (amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    const payment: ReceivablePayment = {
      id: Date.now().toString(),
      date: newPaymentForm.date,
      amount: amt,
      tdsDeducted: Number(newPaymentForm.tdsDeducted || 0),
      penalty: Number(newPaymentForm.penalty || 0),
      reference: newPaymentForm.reference,
      mode: newPaymentForm.mode,
      remarks: newPaymentForm.remarks,
      createdAt: new Date().toISOString(),
    };
    try {
      await addPayment.mutateAsync({ id: editingRecord.id, payment });
      toast.success("Payment recorded successfully.");
      // Refresh editingRecord from updated data
      setNewPaymentForm({ ...defaultNewPaymentForm });
      // Close dialog after adding payment
      setDialogOpen(false);
    } catch {
      toast.error("Failed to record payment.");
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

      {/* Payment Dialog - history + new payment */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="receivable.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Record Payment</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              {/* Invoice Summary */}
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
                    <p className="text-muted-foreground">Invoice Amount</p>
                    <p className="font-bold text-foreground">
                      {formatCurrency(editingRecord.invoiceAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">{editingRecord.clientName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Received</p>
                    <p
                      className="font-bold"
                      style={{ color: "oklch(0.4 0.16 150)" }}
                    >
                      {formatCurrency(editingRecord.amountReceived)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Balance Remaining</p>
                    <p
                      className="font-bold"
                      style={{
                        color:
                          editingRecord.balance > 0
                            ? "oklch(0.45 0.2 27)"
                            : "oklch(0.4 0.16 150)",
                      }}
                    >
                      {formatCurrency(editingRecord.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border capitalize ${getStatusClass(editingRecord.status)}`}
                    >
                      {editingRecord.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {(editingRecord.payments ?? []).length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-muted/30">
                    <p className="text-xs font-semibold text-foreground">
                      Payment History ({(editingRecord.payments ?? []).length}{" "}
                      installment
                      {(editingRecord.payments ?? []).length !== 1 ? "s" : ""})
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/20">
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                            Date
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                            Amount
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                            TDS Ded.
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                            Penalty
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                            Mode
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                            Reference
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(editingRecord.payments ?? []).map((p, idx) => (
                          <tr
                            key={p.id}
                            className={
                              idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                            }
                          >
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {formatDate(p.date)}
                            </td>
                            <td
                              className="px-3 py-2 text-right font-medium"
                              style={{ color: "oklch(0.4 0.16 150)" }}
                            >
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {p.tdsDeducted
                                ? formatCurrency(p.tdsDeducted)
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {p.penalty ? formatCurrency(p.penalty) : "-"}
                            </td>
                            <td className="px-3 py-2">{p.mode || "-"}</td>
                            <td className="px-3 py-2 font-mono">
                              {p.reference || "-"}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-border bg-muted/20 font-semibold">
                          <td className="px-3 py-2">Total</td>
                          <td
                            className="px-3 py-2 text-right"
                            style={{ color: "oklch(0.4 0.16 150)" }}
                          >
                            {formatCurrency(
                              (editingRecord.payments ?? []).reduce(
                                (s, p) => s + p.amount,
                                0,
                              ),
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {formatCurrency(
                              (editingRecord.payments ?? []).reduce(
                                (s, p) => s + (p.tdsDeducted ?? 0),
                                0,
                              ),
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {formatCurrency(
                              (editingRecord.payments ?? []).reduce(
                                (s, p) => s + (p.penalty ?? 0),
                                0,
                              ),
                            )}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New Payment Entry */}
              {editingRecord.balance > 0 ? (
                <form onSubmit={handleAddNewPayment} className="space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-semibold text-foreground mb-3">
                      New Payment Entry
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Date *</Label>
                        <input
                          type="date"
                          value={newPaymentForm.date}
                          onChange={(e) =>
                            setNewPaymentForm((p) => ({
                              ...p,
                              date: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="receivable.new_payment.date.input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Amount (₹) *</Label>
                          <button
                            type="button"
                            onClick={() =>
                              setNewPaymentForm((p) => ({
                                ...p,
                                amount: editingRecord.balance.toString(),
                              }))
                            }
                            className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                          >
                            Full Balance (₹
                            {editingRecord.balance.toLocaleString("en-IN")})
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0.01"
                          max={editingRecord.balance}
                          step="0.01"
                          placeholder="0.00"
                          value={newPaymentForm.amount}
                          onChange={(e) =>
                            setNewPaymentForm((p) => ({
                              ...p,
                              amount: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="receivable.new_payment.amount.input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">TDS Deducted (₹)</Label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={newPaymentForm.tdsDeducted}
                          onChange={(e) =>
                            setNewPaymentForm((p) => ({
                              ...p,
                              tdsDeducted: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="receivable.new_payment.tds.input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Penalty (₹)</Label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={newPaymentForm.penalty}
                          onChange={(e) =>
                            setNewPaymentForm((p) => ({
                              ...p,
                              penalty: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="receivable.new_payment.penalty.input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Payment Mode</Label>
                        <select
                          value={newPaymentForm.mode}
                          onChange={(e) =>
                            setNewPaymentForm((p) => ({
                              ...p,
                              mode: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="receivable.new_payment.mode.select"
                        >
                          <option value="">Select mode</option>
                          {PAYMENT_MODES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Reference No / UTR</Label>
                        <input
                          type="text"
                          placeholder="Cheque / UTR / Reference"
                          value={newPaymentForm.reference}
                          onChange={(e) =>
                            setNewPaymentForm((p) => ({
                              ...p,
                              reference: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="receivable.new_payment.reference.input"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs">Remarks</Label>
                        <input
                          type="text"
                          placeholder="Optional notes"
                          value={newPaymentForm.remarks}
                          onChange={(e) =>
                            setNewPaymentForm((p) => ({
                              ...p,
                              remarks: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="receivable.new_payment.remarks.input"
                        />
                      </div>
                    </div>

                    {/* Payment preview banner */}
                    {Number(newPaymentForm.amount) > 0 &&
                      (() => {
                        const amt = Number(newPaymentForm.amount);
                        const remaining = Math.max(
                          0,
                          editingRecord.balance -
                            amt -
                            Number(newPaymentForm.tdsDeducted || 0) -
                            Number(newPaymentForm.penalty || 0),
                        );
                        const isFull = remaining <= 0;
                        return (
                          <div
                            className={`mt-3 rounded-md p-2 text-xs font-medium ${isFull ? "bg-green-100 text-green-800 border border-green-300" : "bg-amber-50 text-amber-800 border border-amber-300"}`}
                          >
                            {isFull
                              ? "✓ Full Payment — account will be Cleared after saving"
                              : `Partial Payment — remaining balance after this payment: ${formatCurrency(remaining)}`}
                          </div>
                        );
                      })()}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="text-xs"
                      data-ocid="receivable.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addPayment.isPending || !newPaymentForm.amount}
                      className="text-xs"
                      data-ocid="receivable.submit_button"
                    >
                      {addPayment.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : Number(newPaymentForm.amount) >=
                        editingRecord.balance ? (
                        "Confirm Full Payment"
                      ) : (
                        "Confirm Partial Payment"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-800 font-medium">
                  ✓ This invoice is fully cleared. No outstanding balance.
                </div>
              )}
            </div>
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
