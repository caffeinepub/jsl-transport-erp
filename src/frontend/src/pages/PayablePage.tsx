import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  History,
  Loader2,
  Lock,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchableSelect } from "../components/SearchableSelect";
import {
  type Payable,
  type PayablePayment,
  syncPayablesFromUnloadings,
  useAddPayablePayment,
  useGetAllLoadingTrips,
  useGetAllPayables,
  useGetAllUnloadings,
  useGetAllVehicles,
  useUpdatePayable,
} from "../hooks/useQueries";
import { formatCurrency, formatDate, formatNumber } from "../utils/format";

const PAYMENT_MODES = ["Cash", "NEFT", "RTGS", "Cheque", "Online"];

interface NewPayablePaymentForm {
  date: string;
  amount: string;
  mode: string;
  utr: string;
  remarks: string;
}

const defaultNewPayableForm: NewPayablePaymentForm = {
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  mode: "",
  utr: "",
  remarks: "",
};

function getRowClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-green-50/80 hover:bg-green-50";
    case "partial":
      return "bg-amber-50/50 hover:bg-amber-50";
    case "payment_requested":
      return "bg-blue-50/50 hover:bg-blue-50";
    default:
      return "bg-red-50/30 hover:bg-red-50/50";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "paid":
      return { label: "Paid", cls: "status-paid" };
    case "partial":
      return { label: "Partial", cls: "status-partial" };
    case "payment_requested":
      return {
        label: "Requested",
        cls: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return { label: "Pending", cls: "status-pending" };
  }
}

export default function PayablePage() {
  const payablesQuery = useGetAllPayables();
  const unloadingsQuery = useGetAllUnloadings();
  const loadingTripsQuery = useGetAllLoadingTrips();
  const vehiclesQuery = useGetAllVehicles();
  const updatePayable = useUpdatePayable();
  const addPayablePayment = useAddPayablePayment();

  const [activeTab, setActiveTab] = useState("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentDialog, setPaymentDialog] = useState<Payable | null>(null);
  const [newPayableForm, setNewPayableForm] = useState<NewPayablePaymentForm>(
    defaultNewPayableForm,
  );

  const allRecords = payablesQuery.data ?? [];
  const unloadings = unloadingsQuery.data ?? [];
  const trips = loadingTripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];

  // Auto-sync payables from unloading records
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — sync only when data counts change
  useEffect(() => {
    const run = async () => {
      if (unloadings.length > 0 || trips.length > 0) {
        await syncPayablesFromUnloadings(unloadings, trips, vehicles);
        payablesQuery.refetch();
      }
    };
    run();
  }, [unloadings.length, trips.length, vehicles.length]);

  const summaryStats = useMemo(() => {
    const totalPayable = allRecords.reduce((s, r) => s + r.totalPayable, 0);
    const totalPaid = allRecords.reduce((s, r) => s + r.amountPaid, 0);
    const outstanding = allRecords
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + r.balance, 0);
    const requestedCount = allRecords.filter(
      (r) => r.status === "payment_requested",
    ).length;
    return { totalPayable, totalPaid, outstanding, requestedCount };
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    if (activeTab === "all") return allRecords;
    return allRecords.filter((r) => r.status === activeTab);
  }, [allRecords, activeTab]);

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const pendingInTab = filteredRecords.filter((r) => r.status === "pending");
    if (selectedIds.size === pendingInTab.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInTab.map((r) => r.id.toString())));
    }
  };

  const handleRequestPayment = async () => {
    if (selectedIds.size === 0) return;
    const toUpdate = allRecords.filter((r) => selectedIds.has(r.id.toString()));
    try {
      await Promise.all(
        toUpdate.map((r) =>
          updatePayable.mutateAsync({
            ...r,
            status: "payment_requested",
          }),
        ),
      );
      toast.success(
        `${toUpdate.length} record${toUpdate.length > 1 ? "s" : ""} marked as Payment Requested`,
      );
      setSelectedIds(new Set());
      setActiveTab("payment_requested");
    } catch {
      toast.error("Failed to update payment requests.");
    }
  };

  const openPaymentDialog = (record: Payable) => {
    setPaymentDialog(record);
    setNewPayableForm({ ...defaultNewPayableForm });
  };

  const handleAddPayablePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDialog) return;
    const amt = Number(newPayableForm.amount || 0);
    if (amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    const payment: PayablePayment = {
      id: Date.now().toString(),
      date: newPayableForm.date,
      amount: amt,
      mode: newPayableForm.mode,
      utr: newPayableForm.utr,
      remarks: newPayableForm.remarks,
      createdAt: new Date().toISOString(),
    };
    const isFullPayment = amt >= paymentDialog.balance;
    try {
      await addPayablePayment.mutateAsync({ id: paymentDialog.id, payment });
      // Auto-create Cash/Bank entry with idempotency via sourceRef
      try {
        const sourceRef = `payable_payment_${payment.id}`;
        const cashBankEntries = JSON.parse(
          localStorage.getItem("jt_cash_bank_entries") || "[]",
        );
        const alreadyExists = cashBankEntries.some(
          (e: { sourceRef?: string }) => e.sourceRef === sourceRef,
        );
        if (!alreadyExists) {
          const maxId = cashBankEntries.reduce(
            (max: number, e: { id: number }) =>
              Math.max(max, Number(e.id) || 0),
            0,
          );
          cashBankEntries.push({
            id: maxId + 1,
            date: payment.date,
            book: payment.mode === "Cash" ? "cash" : "bank",
            transactionType: "payment",
            category: "Vehicle Payment",
            amount: payment.amount,
            narration: `${paymentDialog.vehicleNumber} - ${paymentDialog.tripReference}`,
            reference: payment.utr || "",
            bankAccountName: "",
            sourceRef,
            createdBy: localStorage.getItem("jt_user_role") || "User",
            createdDate: new Date().toISOString().split("T")[0],
          });
          localStorage.setItem(
            "jt_cash_bank_entries",
            JSON.stringify(cashBankEntries),
          );
        }
      } catch (_) {
        /* silent */
      }
      if (isFullPayment) {
        toast.success("Full payment recorded. Trip marked as Paid.");
      } else {
        const remaining = Math.max(0, paymentDialog.balance - amt);
        toast.success(
          `Partial payment of ${formatCurrency(amt)} recorded. Remaining: ${formatCurrency(remaining)}`,
        );
      }
      setPaymentDialog(null);
    } catch {
      toast.error("Failed to process payment.");
    }
  };

  const isUpdating = updatePayable.isPending;

  const tabCounts = {
    all: allRecords.length,
    pending: allRecords.filter((r) => r.status === "pending").length,
    payment_requested: allRecords.filter(
      (r) => r.status === "payment_requested",
    ).length,
    partial: allRecords.filter((r) => r.status === "partial").length,
    paid: allRecords.filter((r) => r.status === "paid").length,
  };

  const showCheckboxes = activeTab === "pending" || activeTab === "all";
  const pendingInCurrentTab = filteredRecords.filter(
    (r) => r.status === "pending",
  );

  return (
    <div className="p-6 space-y-5" data-ocid="payable.page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
            {allRecords.length} vehicle payment records — auto-synced from
            unloading
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            onClick={handleRequestPayment}
            className="gap-2"
            disabled={isUpdating}
            data-ocid="payable.request_payment.primary_button"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Request Payment ({selectedIds.size} selected)
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                  {formatCurrency(summaryStats.outstanding)}
                </p>
              </div>
              {summaryStats.outstanding > 0 && (
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
              Payment Requests
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.55 0.18 230)" }}
            >
              {summaryStats.requestedCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            setSelectedIds(new Set());
          }}
        >
          <TabsList className="h-8">
            <TabsTrigger
              value="all"
              className="text-xs"
              data-ocid="payable.all.tab"
            >
              All ({tabCounts.all})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="text-xs"
              data-ocid="payable.pending.tab"
            >
              Pending ({tabCounts.pending})
            </TabsTrigger>
            <TabsTrigger
              value="payment_requested"
              className="text-xs"
              data-ocid="payable.requested.tab"
            >
              Requested ({tabCounts.payment_requested})
            </TabsTrigger>
            <TabsTrigger
              value="partial"
              className="text-xs"
              data-ocid="payable.partial.tab"
            >
              Partial ({tabCounts.partial})
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="text-xs"
              data-ocid="payable.paid.tab"
            >
              Paid ({tabCounts.paid})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {showCheckboxes && pendingInCurrentTab.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={
                selectedIds.size === pendingInCurrentTab.length &&
                pendingInCurrentTab.length > 0
              }
              onCheckedChange={handleSelectAll}
              id="selectAll"
              data-ocid="payable.select_all.checkbox"
            />
            <Label htmlFor="selectAll" className="text-xs cursor-pointer">
              Select All Pending ({pendingInCurrentTab.length})
            </Label>
          </div>
        )}
      </div>

      {/* Grid Table */}
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
              No payable records in this category
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Payables are auto-created from unloading records
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="payable.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  {showCheckboxes && (
                    <TableHead className="w-10 text-xs font-semibold">
                      Sel
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-semibold">
                    Trip ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Vehicle No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Owner</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Load Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Load Qty
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Unload Qty
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Booking Amt
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Shortage
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    GPS
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Challan
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Toll
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Advance
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    HSD
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Cash TDS
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Penalty
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Net Payable
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Paid
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Balance
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, index) => {
                  const { label, cls } = getStatusLabel(record.status);
                  const isSelectable = record.status === "pending";
                  const isSelected = selectedIds.has(record.id.toString());
                  return (
                    <TableRow
                      key={record.id.toString()}
                      className={cn(
                        "transition-colors",
                        getRowClass(record.status),
                      )}
                      data-ocid={`payable.item.${index + 1}`}
                    >
                      {showCheckboxes && (
                        <TableCell>
                          {isSelectable && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                handleSelectToggle(record.id.toString())
                              }
                              data-ocid={`payable.checkbox.${index + 1}`}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-xs font-mono font-medium text-primary whitespace-nowrap">
                        {record.tripReference}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium whitespace-nowrap">
                        {record.vehicleNumber}
                      </TableCell>
                      <TableCell className="text-xs max-w-[80px] truncate">
                        {record.ownerName || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {record.loadingDate
                          ? formatDate(record.loadingDate)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {record.loadingQty
                          ? formatNumber(record.loadingQty)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {record.unloadingQty
                          ? formatNumber(record.unloadingQty)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatCurrency(record.bookingAmount ?? 0)}
                      </TableCell>
                      <TableCell
                        className="text-xs text-right"
                        style={{
                          color: record.shortageDeduction
                            ? "oklch(0.45 0.2 27)"
                            : undefined,
                        }}
                      >
                        {record.shortageDeduction
                          ? formatCurrency(record.shortageDeduction)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {record.gpsDeduction
                          ? formatCurrency(record.gpsDeduction)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {record.challanDeduction
                          ? formatCurrency(record.challanDeduction)
                          : "-"}
                      </TableCell>
                      <TableCell
                        className="text-xs text-right"
                        style={{
                          color: record.tollCharges
                            ? "oklch(0.4 0.16 150)"
                            : undefined,
                        }}
                      >
                        {record.tollCharges
                          ? `+${formatCurrency(record.tollCharges)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {record.advanceDeduction
                          ? formatCurrency(record.advanceDeduction)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {record.hsdDeduction
                          ? formatCurrency(record.hsdDeduction)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {record.cashTdsDeduction
                          ? formatCurrency(record.cashTdsDeduction)
                          : "-"}
                      </TableCell>
                      <TableCell
                        className="text-xs text-right"
                        style={{
                          color: record.penaltyDeduction
                            ? "oklch(0.45 0.2 27)"
                            : undefined,
                        }}
                      >
                        {record.penaltyDeduction
                          ? formatCurrency(record.penaltyDeduction)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(record.totalPayable)}
                      </TableCell>
                      <TableCell
                        className="text-xs text-right"
                        style={{ color: "oklch(0.4 0.16 150)" }}
                      >
                        {record.amountPaid > 0
                          ? formatCurrency(record.amountPaid)
                          : "-"}
                      </TableCell>
                      <TableCell
                        className="text-xs text-right font-semibold whitespace-nowrap"
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
                          className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${cls}`}
                        >
                          {label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {record.status !== "paid" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentDialog(record)}
                            className="h-7 gap-1 px-2 text-[10px] whitespace-nowrap"
                            data-ocid={`payable.pay_button.${index + 1}`}
                          >
                            <CreditCard className="h-3 w-3" />
                            {record.status === "partial"
                              ? `Pay Remaining (₹${record.balance.toLocaleString("en-IN")})`
                              : "Pay"}
                          </Button>
                        )}
                        {record.status === "paid" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-green-400 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"
                              title="Full payment made — this trip is closed"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Paid
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPaymentDialog(record)}
                              className="h-7 gap-1 px-2 text-[10px] text-muted-foreground whitespace-nowrap"
                              title="View payment history"
                              data-ocid={`payable.history_button.${index + 1}`}
                            >
                              <History className="h-3 w-3" />
                              History
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Process Payment Dialog */}
      <Dialog
        open={!!paymentDialog}
        onOpenChange={() => setPaymentDialog(null)}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="payable.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {paymentDialog?.status === "paid" ? (
                <>
                  <Lock className="h-4 w-4 text-green-600" />
                  Payment History
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-green-400 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Paid
                  </span>
                </>
              ) : (
                "Process Payment"
              )}
            </DialogTitle>
          </DialogHeader>
          {paymentDialog && (
            <div className="space-y-4">
              {/* Trip Summary */}
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Trip Details
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Trip ID</p>
                    <p className="font-mono font-medium">
                      {paymentDialog.tripReference}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vehicle</p>
                    <p className="font-mono font-medium">
                      {paymentDialog.vehicleNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Owner</p>
                    <p className="font-medium">
                      {paymentDialog.ownerName || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Payable</p>
                    <p className="font-bold text-foreground">
                      {formatCurrency(paymentDialog.totalPayable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Paid</p>
                    <p
                      className="font-bold"
                      style={{ color: "oklch(0.4 0.16 150)" }}
                    >
                      {formatCurrency(paymentDialog.amountPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Balance Due</p>
                    <p
                      className="font-bold"
                      style={{
                        color:
                          paymentDialog.balance > 0
                            ? "oklch(0.45 0.2 27)"
                            : "oklch(0.4 0.16 150)",
                      }}
                    >
                      {formatCurrency(paymentDialog.balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {(paymentDialog.payments ?? []).length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-muted/30">
                    <p className="text-xs font-semibold text-foreground">
                      Payment History ({(paymentDialog.payments ?? []).length}{" "}
                      installment
                      {(paymentDialog.payments ?? []).length !== 1 ? "s" : ""})
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
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                            Mode
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                            UTR/Ref
                          </th>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(paymentDialog.payments ?? []).map((p, idx) => (
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
                            <td className="px-3 py-2">{p.mode || "-"}</td>
                            <td className="px-3 py-2 font-mono">
                              {p.utr || "-"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {p.remarks || "-"}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-border bg-muted/20 font-semibold">
                          <td className="px-3 py-2">Total Paid</td>
                          <td
                            className="px-3 py-2 text-right"
                            style={{ color: "oklch(0.4 0.16 150)" }}
                          >
                            {formatCurrency(
                              (paymentDialog.payments ?? []).reduce(
                                (s, p) => s + p.amount,
                                0,
                              ),
                            )}
                          </td>
                          <td colSpan={3} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New Payment Entry */}
              {paymentDialog.balance > 0 ? (
                <form onSubmit={handleAddPayablePayment} className="space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-semibold text-foreground mb-3">
                      New Payment Entry
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Date *</Label>
                        <input
                          type="date"
                          value={newPayableForm.date}
                          onChange={(e) =>
                            setNewPayableForm((p) => ({
                              ...p,
                              date: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="payable.new_payment.date.input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Amount (₹) *</Label>
                          <button
                            type="button"
                            onClick={() =>
                              setNewPayableForm((p) => ({
                                ...p,
                                amount: paymentDialog.balance.toString(),
                              }))
                            }
                            className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                            data-ocid="payable.pay_full.button"
                          >
                            Pay Full (₹
                            {paymentDialog.balance.toLocaleString("en-IN")})
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0.01"
                          max={paymentDialog.balance}
                          step="0.01"
                          placeholder="0.00"
                          value={newPayableForm.amount}
                          onChange={(e) =>
                            setNewPayableForm((p) => ({
                              ...p,
                              amount: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="payable.new_payment.amount.input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Payment Mode</Label>
                        <SearchableSelect
                          value={newPayableForm.mode}
                          onChange={(v) =>
                            setNewPayableForm((p) => ({ ...p, mode: v }))
                          }
                          placeholder="Select mode..."
                          data-ocid="payable.new_payment.mode.select"
                          options={[
                            { value: "", label: "Select mode" },
                            ...PAYMENT_MODES.map((m) => ({
                              value: m,
                              label: m,
                            })),
                          ]}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">UTR / Reference No</Label>
                        <input
                          type="text"
                          placeholder="UTR number"
                          value={newPayableForm.utr}
                          onChange={(e) =>
                            setNewPayableForm((p) => ({
                              ...p,
                              utr: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="payable.new_payment.utr.input"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs">Remarks</Label>
                        <input
                          type="text"
                          placeholder="Optional notes"
                          value={newPayableForm.remarks}
                          onChange={(e) =>
                            setNewPayableForm((p) => ({
                              ...p,
                              remarks: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-ocid="payable.new_payment.remarks.input"
                        />
                      </div>
                    </div>

                    {/* Payment banner */}
                    {Number(newPayableForm.amount) > 0 &&
                      (() => {
                        const amt = Number(newPayableForm.amount);
                        const remaining = Math.max(
                          0,
                          paymentDialog.balance - amt,
                        );
                        const isFull = remaining <= 0;
                        return (
                          <div
                            className={`mt-3 rounded-md p-2 text-xs font-medium ${isFull ? "bg-green-100 text-green-800 border border-green-300" : "bg-amber-50 text-amber-800 border border-amber-300"}`}
                          >
                            {isFull
                              ? "✓ Full Payment — trip will be marked as Paid"
                              : `Partial Payment — remaining balance after this payment: ${formatCurrency(remaining)}`}
                          </div>
                        );
                      })()}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentDialog(null)}
                      className="text-xs"
                      data-ocid="payable.cancel_button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        addPayablePayment.isPending || !newPayableForm.amount
                      }
                      className="text-xs"
                      data-ocid="payable.confirm_payment.primary_button"
                    >
                      {addPayablePayment.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : Number(newPayableForm.amount) >=
                        paymentDialog.balance ? (
                        "Confirm Full Payment"
                      ) : (
                        "Confirm Partial Payment"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-800 font-medium">
                  ✓ This trip is fully paid. No outstanding balance.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
