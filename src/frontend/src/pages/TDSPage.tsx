import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type TDSRecord,
  useCreateTDSRecord,
  useDeleteTDSRecord,
  useGetAllTDSRecords,
  useUpdateTDSRecord,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

const TODAY = new Date().toISOString().slice(0, 10);

// ─── Advance Cash Form ─────────────────────────────────────────────────────
interface AdvanceCashForm {
  entryDate: string;
  vehicleNo: string;
  challanNo: string;
  ownerPAN: string;
  advanceAmount: string;
  tdsRate: string;
  tdsAmount: string;
  remarks: string;
}
const defaultAdvanceForm: AdvanceCashForm = {
  entryDate: TODAY,
  vehicleNo: "",
  challanNo: "",
  ownerPAN: "",
  advanceAmount: "",
  tdsRate: "2",
  tdsAmount: "",
  remarks: "",
};

// ─── Vehicle Payment Form ───────────────────────────────────────────────────
interface VehiclePaymentForm {
  entryDate: string;
  vehicleNo: string;
  challanNo: string;
  ownerPAN: string;
  advanceAmount: string;
  tdsRate: string;
  tdsAmount: string;
  utrReference: string;
  remarks: string;
}
const defaultVehiclePaymentForm: VehiclePaymentForm = {
  entryDate: TODAY,
  vehicleNo: "",
  challanNo: "",
  ownerPAN: "",
  advanceAmount: "",
  tdsRate: "2",
  tdsAmount: "",
  utrReference: "",
  remarks: "",
};

// ─── TDS Receivable Form ────────────────────────────────────────────────────
interface TDSReceivableForm {
  entryDate: string;
  invoiceNo: string;
  ownerName: string;
  ownerPAN: string;
  billAmount: string;
  tdsRate: string;
  tdsAmount: string;
  referenceNo: string;
  remarks: string;
}
const defaultReceivableForm: TDSReceivableForm = {
  entryDate: TODAY,
  invoiceNo: "",
  ownerName: "",
  ownerPAN: "",
  billAmount: "",
  tdsRate: "2",
  tdsAmount: "",
  referenceNo: "",
  remarks: "",
};

function autoCalcTDS(amount: string, rate: string): string {
  const a = Number(amount || 0);
  const r = Number(rate || 0);
  if (a <= 0 || r <= 0) return "";
  return ((a * r) / 100).toFixed(2);
}

export default function TDSPage() {
  const tdsQuery = useGetAllTDSRecords();
  const createTDS = useCreateTDSRecord();
  const updateTDS = useUpdateTDSRecord();
  const deleteTDS = useDeleteTDSRecord();

  const [activeTab, setActiveTab] = useState("advance_cash");

  // Advance Cash dialog
  const [acDialog, setAcDialog] = useState(false);
  const [acEditing, setAcEditing] = useState<TDSRecord | null>(null);
  const [acForm, setAcForm] = useState<AdvanceCashForm>(defaultAdvanceForm);

  // Vehicle Payment dialog
  const [vpDialog, setVpDialog] = useState(false);
  const [vpEditing, setVpEditing] = useState<TDSRecord | null>(null);
  const [vpForm, setVpForm] = useState<VehiclePaymentForm>(
    defaultVehiclePaymentForm,
  );

  // TDS Receivable dialog
  const [trDialog, setTrDialog] = useState(false);
  const [trEditing, setTrEditing] = useState<TDSRecord | null>(null);
  const [trForm, setTrForm] = useState<TDSReceivableForm>(
    defaultReceivableForm,
  );

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<TDSRecord | null>(null);

  const allRecords = tdsQuery.data ?? [];

  const advanceCashRecords = allRecords.filter(
    (r) => !r.tdsType || r.tdsType === "advance_cash",
  );
  const vehiclePaymentRecords = allRecords.filter(
    (r) => r.tdsType === "vehicle_payment",
  );
  const tdsReceivableRecords = allRecords.filter(
    (r) => r.tdsType === "tds_receivable",
  );

  const summary = useMemo(() => {
    const acTotal = advanceCashRecords.reduce(
      (s, r) => s + (r.tdsAmount ?? 0),
      0,
    );
    const vpTotal = vehiclePaymentRecords.reduce(
      (s, r) => s + (r.tdsAmount ?? 0),
      0,
    );
    const trTotal = tdsReceivableRecords.reduce(
      (s, r) => s + (r.tdsAmount ?? 0),
      0,
    );
    return { acTotal, vpTotal, trTotal, grand: acTotal + vpTotal + trTotal };
  }, [advanceCashRecords, vehiclePaymentRecords, tdsReceivableRecords]);

  // PAN-wise summary
  const panSummary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of allRecords) {
      const pan = r.ownerPAN || "N/A";
      map[pan] = (map[pan] ?? 0) + (r.tdsAmount ?? 0);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [allRecords]);

  // Month-wise summary
  const monthSummary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of allRecords) {
      if (!r.entryDate) continue;
      const month = r.entryDate.slice(0, 7);
      map[month] = (map[month] ?? 0) + (r.tdsAmount ?? 0);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allRecords]);

  // ─── Advance Cash Handlers ──────────────────────────────────────────────
  const openAcDialog = (record?: TDSRecord) => {
    if (record) {
      setAcEditing(record);
      setAcForm({
        entryDate: record.entryDate,
        vehicleNo: record.vehicleNo,
        challanNo: record.challanNo ?? "",
        ownerPAN: record.ownerPAN,
        advanceAmount: record.advanceAmount.toString(),
        tdsRate: (record.tdsRate ?? 2).toString(),
        tdsAmount: record.tdsAmount.toString(),
        remarks: record.remarks,
      });
    } else {
      setAcEditing(null);
      setAcForm(defaultAdvanceForm);
    }
    setAcDialog(true);
  };

  const handleAcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<TDSRecord, "id"> = {
      tdsType: "advance_cash",
      entryDate: acForm.entryDate,
      vehicleNo: acForm.vehicleNo,
      challanNo: acForm.challanNo,
      ownerName: acForm.vehicleNo,
      ownerPAN: acForm.ownerPAN,
      advanceAmount: Number(acForm.advanceAmount || 0),
      tdsRate: Number(acForm.tdsRate || 0),
      tdsAmount: Number(acForm.tdsAmount || 0),
      remarks: acForm.remarks,
      status: "pending",
      tripId: 0n,
    };
    try {
      if (acEditing) {
        await updateTDS.mutateAsync({ ...data, id: acEditing.id });
        toast.success("TDS entry updated");
      } else {
        await createTDS.mutateAsync(data);
        toast.success("TDS entry added");
      }
      setAcDialog(false);
    } catch {
      toast.error("Failed to save TDS entry");
    }
  };

  // ─── Vehicle Payment Handlers ───────────────────────────────────────────
  const openVpDialog = (record?: TDSRecord) => {
    if (record) {
      setVpEditing(record);
      setVpForm({
        entryDate: record.entryDate,
        vehicleNo: record.vehicleNo,
        challanNo: record.challanNo ?? "",
        ownerPAN: record.ownerPAN,
        advanceAmount: record.advanceAmount.toString(),
        tdsRate: (record.tdsRate ?? 2).toString(),
        tdsAmount: record.tdsAmount.toString(),
        utrReference: record.utrReference ?? "",
        remarks: record.remarks,
      });
    } else {
      setVpEditing(null);
      setVpForm(defaultVehiclePaymentForm);
    }
    setVpDialog(true);
  };

  const handleVpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<TDSRecord, "id"> = {
      tdsType: "vehicle_payment",
      entryDate: vpForm.entryDate,
      vehicleNo: vpForm.vehicleNo,
      challanNo: vpForm.challanNo,
      ownerName: vpForm.vehicleNo,
      ownerPAN: vpForm.ownerPAN,
      advanceAmount: Number(vpForm.advanceAmount || 0),
      tdsRate: Number(vpForm.tdsRate || 0),
      tdsAmount: Number(vpForm.tdsAmount || 0),
      utrReference: vpForm.utrReference,
      remarks: vpForm.remarks,
      status: "pending",
      tripId: 0n,
    };
    try {
      if (vpEditing) {
        await updateTDS.mutateAsync({ ...data, id: vpEditing.id });
        toast.success("TDS entry updated");
      } else {
        await createTDS.mutateAsync(data);
        toast.success("TDS entry added");
      }
      setVpDialog(false);
    } catch {
      toast.error("Failed to save TDS entry");
    }
  };

  // ─── TDS Receivable Handlers ────────────────────────────────────────────
  const openTrDialog = (record?: TDSRecord) => {
    if (record) {
      setTrEditing(record);
      setTrForm({
        entryDate: record.entryDate,
        invoiceNo: record.invoiceNo ?? "",
        ownerName: record.ownerName,
        ownerPAN: record.ownerPAN,
        billAmount: (record.billAmount ?? record.advanceAmount).toString(),
        tdsRate: (record.tdsRate ?? 2).toString(),
        tdsAmount: record.tdsAmount.toString(),
        referenceNo: record.referenceNo ?? "",
        remarks: record.remarks,
      });
    } else {
      setTrEditing(null);
      setTrForm(defaultReceivableForm);
    }
    setTrDialog(true);
  };

  const handleTrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const billAmt = Number(trForm.billAmount || 0);
    const data: Omit<TDSRecord, "id"> = {
      tdsType: "tds_receivable",
      entryDate: trForm.entryDate,
      vehicleNo: "",
      invoiceNo: trForm.invoiceNo,
      ownerName: trForm.ownerName,
      ownerPAN: trForm.ownerPAN,
      billAmount: billAmt,
      advanceAmount: billAmt,
      tdsRate: Number(trForm.tdsRate || 0),
      tdsAmount: Number(trForm.tdsAmount || 0),
      referenceNo: trForm.referenceNo,
      remarks: trForm.remarks,
      status: "pending",
      tripId: 0n,
    };
    try {
      if (trEditing) {
        await updateTDS.mutateAsync({ ...data, id: trEditing.id });
        toast.success("TDS receivable entry updated");
      } else {
        await createTDS.mutateAsync(data);
        toast.success("TDS receivable entry added");
      }
      setTrDialog(false);
    } catch {
      toast.error("Failed to save TDS entry");
    }
  };

  // ─── Delete Handlers ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTDS.mutateAsync(deleteConfirm.id);
      toast.success("TDS entry deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const isSaving = createTDS.isPending || updateTDS.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="tds.page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt
              className="h-5 w-5"
              style={{ color: "oklch(0.55 0.18 60)" }}
            />
            <h2 className="text-lg font-bold font-display text-foreground">
              TDS Management
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track TDS on advance cash, vehicle payments, and receivables from
            consigners
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              TDS on Advance
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.55 0.18 60)" }}
            >
              {formatCurrency(summary.acTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              TDS on Payment
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.45 0.2 27)" }}
            >
              {formatCurrency(summary.vpTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              TDS Receivable
            </p>
            <p
              className="mt-1 text-xl font-bold font-display"
              style={{ color: "oklch(0.4 0.16 150)" }}
            >
              {formatCurrency(summary.trTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Grand Total TDS
            </p>
            <p className="mt-1 text-xl font-bold font-display text-foreground">
              {formatCurrency(summary.grand)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger
            value="advance_cash"
            className="text-xs"
            data-ocid="tds.advance_cash.tab"
          >
            TDS on Advance Cash ({advanceCashRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="vehicle_payment"
            className="text-xs"
            data-ocid="tds.vehicle_payment.tab"
          >
            TDS at Vehicle Payment ({vehiclePaymentRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="tds_receivable"
            className="text-xs"
            data-ocid="tds.tds_receivable.tab"
          >
            TDS Receivable ({tdsReceivableRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="text-xs"
            data-ocid="tds.summary.tab"
          >
            Summary
          </TabsTrigger>
        </TabsList>

        {/* ─── Advance Cash Tab ─────────────────────────────────────────── */}
        <TabsContent value="advance_cash" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-foreground">
              TDS deducted at the time of cash advance to vehicle
            </p>
            <Button
              size="sm"
              onClick={() => openAcDialog()}
              className="gap-2 text-xs"
              data-ocid="tds.advance_cash.open_modal_button"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {tdsQuery.isLoading ? (
              <div className="p-6 space-y-3" data-ocid="tds.loading_state">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : advanceCashRecords.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16"
                data-ocid="tds.advance_cash.empty_state"
              >
                <Receipt className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No advance cash TDS entries
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="tds.advance_cash.table">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Vehicle No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Challan No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        PAN No
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Advance Amt
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        TDS Rate %
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        TDS Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Remarks
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advanceCashRecords.map((record, index) => (
                      <TableRow
                        key={record.id.toString()}
                        data-ocid={`tds.advance_cash.item.${index + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(record.entryDate)}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {record.vehicleNo || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {record.challanNo || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {record.ownerPAN || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(record.advanceAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {record.tdsRate ? `${record.tdsRate}%` : "-"}
                        </TableCell>
                        <TableCell
                          className="text-xs text-right font-semibold"
                          style={{ color: "oklch(0.55 0.18 60)" }}
                        >
                          {formatCurrency(record.tdsAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {record.remarks || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAcDialog(record)}
                              className="h-7 w-7 p-0"
                              data-ocid={`tds.advance_cash.edit_button.${index + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(record)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              data-ocid={`tds.advance_cash.delete_button.${index + 1}`}
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
        </TabsContent>

        {/* ─── Vehicle Payment Tab ──────────────────────────────────────── */}
        <TabsContent value="vehicle_payment" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-foreground">
              TDS deducted at the time of final balance payment to vehicle
            </p>
            <Button
              size="sm"
              onClick={() => openVpDialog()}
              className="gap-2 text-xs"
              data-ocid="tds.vehicle_payment.open_modal_button"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {tdsQuery.isLoading ? (
              <div className="p-6 space-y-3" data-ocid="tds.vp.loading_state">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : vehiclePaymentRecords.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16"
                data-ocid="tds.vehicle_payment.empty_state"
              >
                <Receipt className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No vehicle payment TDS entries
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="tds.vehicle_payment.table">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Vehicle No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Challan No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        PAN No
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Payment Amt
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        TDS Rate %
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        TDS Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        UTR/Ref
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Remarks
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehiclePaymentRecords.map((record, index) => (
                      <TableRow
                        key={record.id.toString()}
                        data-ocid={`tds.vehicle_payment.item.${index + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(record.entryDate)}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {record.vehicleNo || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {record.challanNo || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {record.ownerPAN || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(record.advanceAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {record.tdsRate ? `${record.tdsRate}%` : "-"}
                        </TableCell>
                        <TableCell
                          className="text-xs text-right font-semibold"
                          style={{ color: "oklch(0.45 0.2 27)" }}
                        >
                          {formatCurrency(record.tdsAmount)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {record.utrReference || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
                          {record.remarks || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openVpDialog(record)}
                              className="h-7 w-7 p-0"
                              data-ocid={`tds.vehicle_payment.edit_button.${index + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(record)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              data-ocid={`tds.vehicle_payment.delete_button.${index + 1}`}
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
        </TabsContent>

        {/* ─── TDS Receivable Tab ───────────────────────────────────────── */}
        <TabsContent value="tds_receivable" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-foreground">
              TDS deducted by clients (e.g., Jindal) on final bill amount
            </p>
            <Button
              size="sm"
              onClick={() => openTrDialog()}
              className="gap-2 text-xs"
              data-ocid="tds.tds_receivable.open_modal_button"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {tdsQuery.isLoading ? (
              <div className="p-6 space-y-3" data-ocid="tds.tr.loading_state">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : tdsReceivableRecords.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16"
                data-ocid="tds.tds_receivable.empty_state"
              >
                <Receipt className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No TDS receivable entries
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="tds.tds_receivable.table">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Invoice No
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Consignee
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        PAN No
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Bill Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        TDS Rate %
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        TDS Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Reference
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Remarks
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tdsReceivableRecords.map((record, index) => (
                      <TableRow
                        key={record.id.toString()}
                        data-ocid={`tds.tds_receivable.item.${index + 1}`}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(record.entryDate)}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {record.invoiceNo || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {record.ownerName || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {record.ownerPAN || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(
                            record.billAmount ?? record.advanceAmount,
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {record.tdsRate ? `${record.tdsRate}%` : "-"}
                        </TableCell>
                        <TableCell
                          className="text-xs text-right font-semibold"
                          style={{ color: "oklch(0.4 0.16 150)" }}
                        >
                          {formatCurrency(record.tdsAmount)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {record.referenceNo || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
                          {record.remarks || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTrDialog(record)}
                              className="h-7 w-7 p-0"
                              data-ocid={`tds.tds_receivable.edit_button.${index + 1}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(record)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              data-ocid={`tds.tds_receivable.delete_button.${index + 1}`}
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
        </TabsContent>

        {/* ─── Summary Tab ──────────────────────────────────────────────── */}
        <TabsContent value="summary" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* PAN-wise Summary */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  PAN-wise TDS Summary
                </p>
              </div>
              {panSummary.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4">No data</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        PAN No
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Total TDS
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {panSummary.map(([pan, total], i) => (
                      <TableRow
                        key={pan}
                        data-ocid={`tds.pan_summary.item.${i + 1}`}
                      >
                        <TableCell className="text-xs font-mono">
                          {pan}
                        </TableCell>
                        <TableCell
                          className="text-xs text-right font-semibold"
                          style={{ color: "oklch(0.55 0.18 60)" }}
                        >
                          {formatCurrency(total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Month-wise Summary */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  Month-wise TDS Summary
                </p>
              </div>
              {monthSummary.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4">No data</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Month
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Total TDS
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthSummary.map(([month, total], i) => (
                      <TableRow
                        key={month}
                        data-ocid={`tds.month_summary.item.${i + 1}`}
                      >
                        <TableCell className="text-xs">{month}</TableCell>
                        <TableCell
                          className="text-xs text-right font-semibold"
                          style={{ color: "oklch(0.55 0.18 60)" }}
                        >
                          {formatCurrency(total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Type-wise breakdown */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">
                TDS Type Breakdown
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    No. of Entries
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Total TDS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        color: "oklch(0.55 0.18 60)",
                        borderColor: "oklch(0.55 0.18 60)",
                      }}
                    >
                      TDS on Advance Cash
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {advanceCashRecords.length}
                  </TableCell>
                  <TableCell
                    className="text-xs text-right font-semibold"
                    style={{ color: "oklch(0.55 0.18 60)" }}
                  >
                    {formatCurrency(summary.acTotal)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        color: "oklch(0.45 0.2 27)",
                        borderColor: "oklch(0.45 0.2 27)",
                      }}
                    >
                      TDS at Vehicle Payment
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {vehiclePaymentRecords.length}
                  </TableCell>
                  <TableCell
                    className="text-xs text-right font-semibold"
                    style={{ color: "oklch(0.45 0.2 27)" }}
                  >
                    {formatCurrency(summary.vpTotal)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        color: "oklch(0.4 0.16 150)",
                        borderColor: "oklch(0.4 0.16 150)",
                      }}
                    >
                      TDS Receivable
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {tdsReceivableRecords.length}
                  </TableCell>
                  <TableCell
                    className="text-xs text-right font-semibold"
                    style={{ color: "oklch(0.4 0.16 150)" }}
                  >
                    {formatCurrency(summary.trTotal)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/20 font-bold">
                  <TableCell className="text-xs font-bold">
                    Grand Total
                  </TableCell>
                  <TableCell className="text-xs text-right font-bold">
                    {allRecords.length}
                  </TableCell>
                  <TableCell className="text-xs text-right font-bold text-foreground">
                    {formatCurrency(summary.grand)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Advance Cash Dialog ─────────────────────────────────────────── */}
      <Dialog open={acDialog} onOpenChange={setAcDialog}>
        <DialogContent className="max-w-lg" data-ocid="tds.advance_cash.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {acEditing ? "Edit" : "Add"} TDS on Advance Cash
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAcSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={acForm.entryDate}
                  onChange={(e) =>
                    setAcForm((p) => ({ ...p, entryDate: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.ac.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vehicle No *</Label>
                <Input
                  placeholder="MH-12-AB-1234"
                  value={acForm.vehicleNo}
                  onChange={(e) =>
                    setAcForm((p) => ({ ...p, vehicleNo: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.ac.vehicle_no.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Challan No</Label>
                <Input
                  placeholder="Challan No"
                  value={acForm.challanNo}
                  onChange={(e) =>
                    setAcForm((p) => ({ ...p, challanNo: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.ac.challan_no.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PAN No</Label>
                <Input
                  placeholder="AAAAA0000A"
                  value={acForm.ownerPAN}
                  onChange={(e) =>
                    setAcForm((p) => ({
                      ...p,
                      ownerPAN: e.target.value.toUpperCase(),
                    }))
                  }
                  className="text-xs"
                  data-ocid="tds.ac.pan.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Advance Amount (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={acForm.advanceAmount}
                  onChange={(e) =>
                    setAcForm((p) => ({
                      ...p,
                      advanceAmount: e.target.value,
                      tdsAmount: autoCalcTDS(e.target.value, p.tdsRate),
                    }))
                  }
                  className="text-xs"
                  data-ocid="tds.ac.advance_amount.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">TDS Rate (%)</Label>
                <Select
                  value={acForm.tdsRate}
                  onValueChange={(v) =>
                    setAcForm((p) => ({
                      ...p,
                      tdsRate: v,
                      tdsAmount: autoCalcTDS(p.advanceAmount, v),
                    }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="tds.ac.tds_rate.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "5", "10"].map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">
                  TDS Amount (₹) — Auto-calculated
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={acForm.tdsAmount}
                  onChange={(e) =>
                    setAcForm((p) => ({ ...p, tdsAmount: e.target.value }))
                  }
                  className="text-xs font-semibold"
                  data-ocid="tds.ac.tds_amount.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Remarks</Label>
                <Input
                  placeholder="Optional notes"
                  value={acForm.remarks}
                  onChange={(e) =>
                    setAcForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.ac.remarks.input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAcDialog(false)}
                className="text-xs"
                data-ocid="tds.ac.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSaving || !acForm.vehicleNo || !acForm.advanceAmount
                }
                className="text-xs"
                data-ocid="tds.ac.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : acEditing ? (
                  "Update"
                ) : (
                  "Add Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Vehicle Payment Dialog ──────────────────────────────────────── */}
      <Dialog open={vpDialog} onOpenChange={setVpDialog}>
        <DialogContent
          className="max-w-lg"
          data-ocid="tds.vehicle_payment.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {vpEditing ? "Edit" : "Add"} TDS at Vehicle Final Payment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVpSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={vpForm.entryDate}
                  onChange={(e) =>
                    setVpForm((p) => ({ ...p, entryDate: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.vp.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vehicle No *</Label>
                <Input
                  placeholder="MH-12-AB-1234"
                  value={vpForm.vehicleNo}
                  onChange={(e) =>
                    setVpForm((p) => ({ ...p, vehicleNo: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.vp.vehicle_no.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Challan No</Label>
                <Input
                  placeholder="Challan No"
                  value={vpForm.challanNo}
                  onChange={(e) =>
                    setVpForm((p) => ({ ...p, challanNo: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.vp.challan_no.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PAN No</Label>
                <Input
                  placeholder="AAAAA0000A"
                  value={vpForm.ownerPAN}
                  onChange={(e) =>
                    setVpForm((p) => ({
                      ...p,
                      ownerPAN: e.target.value.toUpperCase(),
                    }))
                  }
                  className="text-xs"
                  data-ocid="tds.vp.pan.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={vpForm.advanceAmount}
                  onChange={(e) =>
                    setVpForm((p) => ({
                      ...p,
                      advanceAmount: e.target.value,
                      tdsAmount: autoCalcTDS(e.target.value, p.tdsRate),
                    }))
                  }
                  className="text-xs"
                  data-ocid="tds.vp.payment_amount.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">TDS Rate (%)</Label>
                <Select
                  value={vpForm.tdsRate}
                  onValueChange={(v) =>
                    setVpForm((p) => ({
                      ...p,
                      tdsRate: v,
                      tdsAmount: autoCalcTDS(p.advanceAmount, v),
                    }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="tds.vp.tds_rate.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "5", "10"].map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">
                  TDS Amount (₹) — Auto-calculated
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={vpForm.tdsAmount}
                  onChange={(e) =>
                    setVpForm((p) => ({ ...p, tdsAmount: e.target.value }))
                  }
                  className="text-xs font-semibold"
                  data-ocid="tds.vp.tds_amount.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">UTR / Reference No</Label>
                <Input
                  placeholder="UTR number"
                  value={vpForm.utrReference}
                  onChange={(e) =>
                    setVpForm((p) => ({ ...p, utrReference: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.vp.utr.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Remarks</Label>
                <Input
                  placeholder="Optional notes"
                  value={vpForm.remarks}
                  onChange={(e) =>
                    setVpForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.vp.remarks.input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVpDialog(false)}
                className="text-xs"
                data-ocid="tds.vp.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSaving || !vpForm.vehicleNo || !vpForm.advanceAmount
                }
                className="text-xs"
                data-ocid="tds.vp.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : vpEditing ? (
                  "Update"
                ) : (
                  "Add Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── TDS Receivable Dialog ───────────────────────────────────────── */}
      <Dialog open={trDialog} onOpenChange={setTrDialog}>
        <DialogContent
          className="max-w-lg"
          data-ocid="tds.tds_receivable.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {trEditing ? "Edit" : "Add"} TDS Receivable from Consignee
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTrSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={trForm.entryDate}
                  onChange={(e) =>
                    setTrForm((p) => ({ ...p, entryDate: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.tr.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice No *</Label>
                <Input
                  placeholder="INV/2026-03/001"
                  value={trForm.invoiceNo}
                  onChange={(e) =>
                    setTrForm((p) => ({ ...p, invoiceNo: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.tr.invoice_no.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Consignee Name *</Label>
                <Input
                  placeholder="e.g., Jindal Steel Works"
                  value={trForm.ownerName}
                  onChange={(e) =>
                    setTrForm((p) => ({ ...p, ownerName: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.tr.consignee_name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PAN No</Label>
                <Input
                  placeholder="AAAAA0000A"
                  value={trForm.ownerPAN}
                  onChange={(e) =>
                    setTrForm((p) => ({
                      ...p,
                      ownerPAN: e.target.value.toUpperCase(),
                    }))
                  }
                  className="text-xs"
                  data-ocid="tds.tr.pan.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reference No</Label>
                <Input
                  placeholder="Ref No"
                  value={trForm.referenceNo}
                  onChange={(e) =>
                    setTrForm((p) => ({ ...p, referenceNo: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.tr.reference_no.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bill Amount (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={trForm.billAmount}
                  onChange={(e) =>
                    setTrForm((p) => ({
                      ...p,
                      billAmount: e.target.value,
                      tdsAmount: autoCalcTDS(e.target.value, p.tdsRate),
                    }))
                  }
                  className="text-xs"
                  data-ocid="tds.tr.bill_amount.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">TDS Rate (%)</Label>
                <Select
                  value={trForm.tdsRate}
                  onValueChange={(v) =>
                    setTrForm((p) => ({
                      ...p,
                      tdsRate: v,
                      tdsAmount: autoCalcTDS(p.billAmount, v),
                    }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="tds.tr.tds_rate.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "2", "5", "10"].map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">
                  TDS Amount (₹) — Auto-calculated
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={trForm.tdsAmount}
                  onChange={(e) =>
                    setTrForm((p) => ({ ...p, tdsAmount: e.target.value }))
                  }
                  className="text-xs font-semibold"
                  data-ocid="tds.tr.tds_amount.input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Remarks</Label>
                <Input
                  placeholder="Optional notes"
                  value={trForm.remarks}
                  onChange={(e) =>
                    setTrForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="tds.tr.remarks.input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTrDialog(false)}
                className="text-xs"
                data-ocid="tds.tr.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !trForm.ownerName || !trForm.billAmount}
                className="text-xs"
                data-ocid="tds.tr.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : trEditing ? (
                  "Update"
                ) : (
                  "Add Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ───────────────────────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm" data-ocid="tds.delete.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete TDS Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete this TDS entry? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="tds.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTDS.isPending}
              className="text-xs"
              data-ocid="tds.delete.confirm_button"
            >
              {deleteTDS.isPending ? (
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
