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
  CheckCircle,
  CreditCard,
  Info,
  Loader2,
  Pencil,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type Payable,
  syncPayablesFromUnloadings,
  useGetAllLoadingTrips,
  useGetAllPayables,
  useGetAllUnloadings,
  useGetAllVehicles,
  useUpdatePayable,
} from "../hooks/useQueries";
import { formatCurrency, formatDate, formatNumber } from "../utils/format";

const PAYMENT_MODES = ["Cash", "NEFT", "RTGS", "Cheque", "Online"];

interface PaymentFormData {
  amountPaid: string;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
}

const defaultPaymentForm: PaymentFormData = {
  amountPaid: "",
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

  const [activeTab, setActiveTab] = useState("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentDialog, setPaymentDialog] = useState<Payable | null>(null);
  const [paymentForm, setPaymentForm] =
    useState<PaymentFormData>(defaultPaymentForm);

  const allRecords = payablesQuery.data ?? [];
  const unloadings = unloadingsQuery.data ?? [];
  const trips = loadingTripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];

  // Auto-sync payables from unloading records
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — sync only when data counts change
  useEffect(() => {
    if (unloadings.length > 0 || trips.length > 0) {
      syncPayablesFromUnloadings(unloadings, trips, vehicles);
      payablesQuery.refetch();
    }
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
    setPaymentForm({
      amountPaid: record.amountPaid > 0 ? record.amountPaid.toString() : "",
      paymentDate: record.paymentDate,
      paymentMode: record.paymentMode,
      referenceNumber: record.referenceNumber,
      remarks: record.remarks,
    });
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDialog) return;
    const paid = Number(paymentForm.amountPaid || 0);
    const previouslyPaid = paymentDialog.amountPaid;
    const totalPaidNow = previouslyPaid + paid;
    const isFullPayment = totalPaidNow >= paymentDialog.totalPayable;
    try {
      await updatePayable.mutateAsync({
        ...paymentDialog,
        amountPaid: totalPaidNow,
        paymentDate: paymentForm.paymentDate,
        paymentMode: paymentForm.paymentMode,
        referenceNumber: paymentForm.referenceNumber,
        remarks: paymentForm.remarks,
        status: paymentDialog.status, // let mutation recalculate
      });
      if (isFullPayment) {
        toast.success("Full payment recorded. Trip marked as Paid.");
      } else {
        const remaining = paymentDialog.totalPayable - totalPaidNow;
        toast.success(
          `Partial payment of ₹${paid.toLocaleString("en-IN")} recorded. Remaining balance: ₹${remaining.toLocaleString("en-IN")}`,
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
                            Pay
                          </Button>
                        )}
                        {record.status === "paid" && (
                          <div className="flex items-center justify-end gap-1">
                            <CheckCircle
                              className="h-4 w-4"
                              style={{ color: "oklch(0.4 0.16 150)" }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPaymentDialog(record)}
                              className="h-7 w-7 p-0"
                              data-ocid={`payable.edit_button.${index + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
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
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="payable.payment.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Process Payment</DialogTitle>
          </DialogHeader>
          {paymentDialog &&
            (() => {
              const enteredAmt = Number(paymentForm.amountPaid || 0);
              const previouslyPaid = paymentDialog.amountPaid;
              const balanceDue = paymentDialog.balance;
              const totalPaidAfter = previouslyPaid + enteredAmt;
              const remainingAfter = Math.max(
                0,
                paymentDialog.totalPayable - totalPaidAfter,
              );
              const isFullPayment = enteredAmt > 0 && remainingAfter === 0;
              const isPartialPayment = enteredAmt > 0 && remainingAfter > 0;
              return (
                <form onSubmit={handleProcessPayment} className="space-y-4">
                  {/* Trip summary */}
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground">
                      Trip Details
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
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
                        <p className="text-muted-foreground">Loading Date</p>
                        <p className="font-medium">
                          {paymentDialog.loadingDate
                            ? formatDate(paymentDialog.loadingDate)
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deduction breakdown */}
                  <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground mb-2">
                      Payment Calculation
                    </p>
                    {[
                      {
                        label: "Booking Amount",
                        value: paymentDialog.bookingAmount,
                        color: "text-foreground",
                        prefix: "",
                      },
                      {
                        label: "Shortage Deduction",
                        value: paymentDialog.shortageDeduction,
                        color: "text-destructive",
                        prefix: "−",
                      },
                      {
                        label: "GPS Deduction",
                        value: paymentDialog.gpsDeduction,
                        color: "text-muted-foreground",
                        prefix: "−",
                      },
                      {
                        label: "Challan Deduction",
                        value: paymentDialog.challanDeduction,
                        color: "text-muted-foreground",
                        prefix: "−",
                      },
                      {
                        label: "Toll Charges",
                        value: paymentDialog.tollCharges,
                        color: "text-green-700",
                        prefix: "+",
                      },
                      {
                        label: "Advance Deduction",
                        value: paymentDialog.advanceDeduction,
                        color: "text-muted-foreground",
                        prefix: "−",
                      },
                      {
                        label: "HSD Deduction",
                        value: paymentDialog.hsdDeduction,
                        color: "text-muted-foreground",
                        prefix: "−",
                      },
                      {
                        label: "Cash TDS",
                        value: paymentDialog.cashTdsDeduction,
                        color: "text-muted-foreground",
                        prefix: "−",
                      },
                      {
                        label: "Penalty",
                        value: paymentDialog.penaltyDeduction,
                        color: "text-destructive",
                        prefix: "−",
                      },
                    ]
                      .filter((row) => row.value)
                      .map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {row.label}
                          </span>
                          <span className={row.color}>
                            {row.prefix}
                            {formatCurrency(row.value ?? 0)}
                          </span>
                        </div>
                      ))}
                    <div className="flex items-center justify-between text-xs font-bold border-t border-border pt-1.5 mt-1.5">
                      <span className="text-foreground">Net Payable</span>
                      <span className="text-foreground">
                        {formatCurrency(paymentDialog.totalPayable)}
                      </span>
                    </div>
                    {paymentDialog.amountPaid > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Already Paid
                        </span>
                        <span style={{ color: "oklch(0.4 0.16 150)" }}>
                          {formatCurrency(paymentDialog.amountPaid)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">Balance Due</span>
                      <span style={{ color: "oklch(0.45 0.2 27)" }}>
                        {formatCurrency(paymentDialog.balance)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="payAmt" className="text-xs">
                        Amount to Pay Now (₹) *
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentForm((p) => ({
                            ...p,
                            amountPaid: balanceDue.toString(),
                          }))
                        }
                        className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                      >
                        Pay Full (₹{balanceDue.toLocaleString("en-IN")})
                      </button>
                    </div>
                    <Input
                      id="payAmt"
                      type="number"
                      min="0"
                      max={balanceDue}
                      step="0.01"
                      placeholder={balanceDue.toString()}
                      value={paymentForm.amountPaid}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          amountPaid: e.target.value,
                        }))
                      }
                      required
                      className="text-xs"
                      data-ocid="payable.payment.amount_input"
                    />
                    {/* Partial / Full payment indicator */}
                    {enteredAmt > 0 && (
                      <div
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-xs border"
                        style={
                          isFullPayment
                            ? {
                                background: "oklch(0.97 0.04 150)",
                                borderColor: "oklch(0.4 0.16 150 / 0.3)",
                                color: "oklch(0.35 0.14 150)",
                              }
                            : {
                                background: "oklch(0.97 0.06 60)",
                                borderColor: "oklch(0.72 0.18 60 / 0.3)",
                                color: "oklch(0.45 0.14 60)",
                              }
                        }
                      >
                        {isFullPayment ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-semibold">Full Payment</span>
                            <span className="ml-auto">
                              Trip will be marked Paid
                            </span>
                          </>
                        ) : (
                          <>
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-semibold">
                              Partial Payment
                            </span>
                            <span className="ml-auto">
                              Remaining:{" "}
                              <span className="font-bold">
                                ₹{remainingAfter.toLocaleString("en-IN")}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="payDate" className="text-xs">
                        Payment Date *
                      </Label>
                      <Input
                        id="payDate"
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(e) =>
                          setPaymentForm((p) => ({
                            ...p,
                            paymentDate: e.target.value,
                          }))
                        }
                        required
                        className="text-xs"
                        data-ocid="payable.payment.date_input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Payment Mode *</Label>
                      <Select
                        value={paymentForm.paymentMode}
                        onValueChange={(v) =>
                          setPaymentForm((p) => ({ ...p, paymentMode: v }))
                        }
                      >
                        <SelectTrigger
                          className="text-xs"
                          data-ocid="payable.payment.mode_select"
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
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="payRef" className="text-xs">
                        Reference / UTR / Cheque No
                      </Label>
                      <Input
                        id="payRef"
                        placeholder="Reference number"
                        value={paymentForm.referenceNumber}
                        onChange={(e) =>
                          setPaymentForm((p) => ({
                            ...p,
                            referenceNumber: e.target.value,
                          }))
                        }
                        className="text-xs"
                        data-ocid="payable.payment.reference_input"
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
                      value={paymentForm.remarks}
                      onChange={(e) =>
                        setPaymentForm((p) => ({
                          ...p,
                          remarks: e.target.value,
                        }))
                      }
                      className="text-xs resize-none"
                      rows={2}
                      data-ocid="payable.payment.remarks_textarea"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentDialog(null)}
                      data-ocid="payable.payment.cancel_button"
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUpdating || !paymentForm.paymentMode}
                      data-ocid="payable.payment.confirm_button"
                      className="text-xs"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : isPartialPayment ? (
                        "Confirm Partial Payment"
                      ) : (
                        "Confirm Full Payment"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
