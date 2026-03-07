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
  useGetAllLoadingTrips,
  useGetAllTDSRecords,
  useGetAllVehicles,
  useUpdateTDSRecord,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

interface TDSFormData {
  ownerName: string;
  ownerPAN: string;
  vehicleNo: string;
  tripId: string;
  advanceAmount: string;
  entryDate: string;
  remarks: string;
  status: string;
}

const defaultForm: TDSFormData = {
  ownerName: "",
  ownerPAN: "",
  vehicleNo: "",
  tripId: "0",
  advanceAmount: "",
  entryDate: new Date().toISOString().slice(0, 10),
  remarks: "",
  status: "pending",
};

export default function TDSPage() {
  const tdsQuery = useGetAllTDSRecords();
  const tripsQuery = useGetAllLoadingTrips();
  const vehiclesQuery = useGetAllVehicles();
  const createTDS = useCreateTDSRecord();
  const updateTDS = useUpdateTDSRecord();
  const deleteTDS = useDeleteTDSRecord();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TDSRecord | null>(null);
  const [form, setForm] = useState<TDSFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<TDSRecord | null>(null);

  const records = tdsQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];

  const summary = useMemo(() => {
    const totalAdvance = records.reduce(
      (s, r) => s + Number(r.advanceAmount),
      0,
    );
    const totalTDS = records.reduce((s, r) => s + Number(r.tdsAmount), 0);
    const paidTDS = records
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + Number(r.tdsAmount), 0);
    return { totalAdvance, totalTDS, pendingTDS: totalTDS - paidTDS };
  }, [records]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; advance: number; tds: number }> =
      {};
    for (const r of records) {
      if (!r.entryDate) continue;
      const d = new Date(r.entryDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
      if (!map[key]) map[key] = { month: label, advance: 0, tds: 0 };
      map[key].advance += Number(r.advanceAmount);
      map[key].tds += Number(r.tdsAmount);
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [records]);

  const panData = useMemo(() => {
    const map: Record<
      string,
      {
        pan: string;
        owner: string;
        trips: number;
        advance: number;
        tds: number;
      }
    > = {};
    for (const r of records) {
      const key = r.ownerPAN || "NO-PAN";
      if (!map[key])
        map[key] = {
          pan: key,
          owner: r.ownerName,
          trips: 0,
          advance: 0,
          tds: 0,
        };
      map[key].trips += 1;
      map[key].advance += Number(r.advanceAmount);
      map[key].tds += Number(r.tdsAmount);
    }
    return Object.values(map);
  }, [records]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: TDSRecord) => {
    setEditingItem(item);
    setForm({
      ownerName: item.ownerName,
      ownerPAN: item.ownerPAN,
      vehicleNo: item.vehicleNo,
      tripId: item.tripId.toString(),
      advanceAmount: item.advanceAmount.toString(),
      entryDate: item.entryDate,
      remarks: item.remarks,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const tdsAmount = Number(form.advanceAmount) * 0.02;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ownerName || !form.advanceAmount) {
      toast.error("Owner name and advance amount are required");
      return;
    }
    const data: Omit<TDSRecord, "id"> = {
      ownerName: form.ownerName.trim(),
      ownerPAN: form.ownerPAN.trim().toUpperCase(),
      vehicleNo: form.vehicleNo.trim().toUpperCase(),
      tripId: form.tripId && form.tripId !== "0" ? BigInt(form.tripId) : 0n,
      advanceAmount: Number(form.advanceAmount),
      tdsAmount,
      entryDate: form.entryDate,
      remarks: form.remarks.trim(),
      status: form.status,
    };
    try {
      if (editingItem) {
        await updateTDS.mutateAsync({ id: editingItem.id, ...data });
        toast.success("TDS record updated");
      } else {
        await createTDS.mutateAsync(data);
        toast.success("TDS entry created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save TDS record.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTDS.mutateAsync(deleteConfirm.id);
      toast.success("TDS record deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete TDS record.");
    }
  };

  const isSaving = createTDS.isPending || updateTDS.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="tds.page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.55 0.18 240 / 0.12)" }}
          >
            <Receipt
              className="h-4 w-4"
              style={{ color: "oklch(0.55 0.18 240)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              TDS Management
            </h2>
            <p className="text-sm text-muted-foreground">
              {records.length} record{records.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="tds.add_button"
        >
          <Plus className="h-4 w-4" />
          Add TDS Entry
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Cash Advance
            </p>
            <p className="text-xl font-bold font-display mt-1">
              {formatCurrency(summary.totalAdvance)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total TDS Due (2%)
            </p>
            <p className="text-xl font-bold font-display mt-1 text-amber-600">
              {formatCurrency(summary.totalTDS)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Pending TDS
            </p>
            <p className="text-xl font-bold font-display mt-1 text-red-600">
              {formatCurrency(summary.pendingTDS)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger
            value="entries"
            className="text-xs"
            data-ocid="tds.entries.tab"
          >
            All Entries
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="text-xs"
            data-ocid="tds.monthly.tab"
          >
            Monthly Summary
          </TabsTrigger>
          <TabsTrigger value="pan" className="text-xs" data-ocid="tds.pan.tab">
            PAN-wise Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <div className="rounded-lg border border-border bg-card overflow-hidden mt-4">
            {tdsQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="tds.empty_state"
              >
                <Receipt className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No TDS entries yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add entries for cash advances paid to vehicle owners
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="tds.table">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Vehicle
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Owner
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        PAN
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Trip
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Cash Advance
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        TDS (2%)
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
                    {records.map((item, index) => {
                      const trip = trips.find(
                        (t) =>
                          t.id === item.tripId ||
                          Number(t.id) === Number(item.tripId),
                      );
                      return (
                        <TableRow
                          key={item.id.toString()}
                          className="table-row-hover"
                          data-ocid={`tds.item.${index + 1}`}
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(item.entryDate)}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium">
                            {item.vehicleNo || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.ownerName}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {item.ownerPAN || "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {trip?.tripId ??
                              (item.tripId !== 0n
                                ? item.tripId.toString()
                                : "—")}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {formatCurrency(item.advanceAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-semibold text-amber-600">
                            {formatCurrency(item.tdsAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.status === "paid" ? "default" : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {item.status === "paid" ? "Paid" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(item)}
                                className="h-7 w-7 p-0"
                                data-ocid={`tds.edit_button.${index + 1}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(item)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                data-ocid={`tds.delete_button.${index + 1}`}
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
        </TabsContent>

        <TabsContent value="monthly">
          <div className="rounded-lg border border-border bg-card overflow-hidden mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Month</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Total Cash Advance
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    TDS Amount (2%)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-xs text-muted-foreground py-10"
                    >
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyData.map((m) => (
                    <TableRow key={m.month} className="table-row-hover">
                      <TableCell className="text-xs font-medium">
                        {m.month}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {formatCurrency(m.advance)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-amber-600">
                        {formatCurrency(m.tds)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pan">
          <div className="rounded-lg border border-border bg-card overflow-hidden mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">PAN</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Owner Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Trips
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Total Advance
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Total TDS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {panData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-xs text-muted-foreground py-10"
                    >
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  panData.map((p) => (
                    <TableRow key={p.pan} className="table-row-hover">
                      <TableCell className="text-xs font-mono font-semibold">
                        {p.pan}
                      </TableCell>
                      <TableCell className="text-xs">{p.owner}</TableCell>
                      <TableCell className="text-xs text-right">
                        {p.trips}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {formatCurrency(p.advance)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-amber-600">
                        {formatCurrency(p.tds)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-ocid="tds.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit TDS Entry" : "Add TDS Entry"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tds-owner" className="text-xs">
                  Owner Name *
                </Label>
                <Input
                  id="tds-owner"
                  placeholder="Owner name"
                  value={form.ownerName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ownerName: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="tds.owner.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tds-pan" className="text-xs">
                  PAN Number
                </Label>
                <Input
                  id="tds-pan"
                  placeholder="ABCDE1234F"
                  value={form.ownerPAN}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ownerPAN: e.target.value.toUpperCase(),
                    }))
                  }
                  className="text-xs uppercase"
                  data-ocid="tds.pan.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tds-vehicle" className="text-xs">
                  Vehicle No
                </Label>
                <Input
                  id="tds-vehicle"
                  placeholder="OD03AB6655"
                  value={form.vehicleNo}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      vehicleNo: e.target.value.toUpperCase(),
                    }))
                  }
                  className="text-xs uppercase"
                  data-ocid="tds.vehicle.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Trip Reference</Label>
                <Select
                  value={form.tripId}
                  onValueChange={(v) => setForm((p) => ({ ...p, tripId: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="tds.trip.select"
                  >
                    <SelectValue placeholder="Select trip (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-xs">
                      None
                    </SelectItem>
                    {trips.map((t) => {
                      const v = vehicles.find(
                        (veh) =>
                          veh.id === t.vehicleId ||
                          Number(veh.id) === Number(t.vehicleId),
                      );
                      return (
                        <SelectItem
                          key={t.id.toString()}
                          value={t.id.toString()}
                          className="text-xs"
                        >
                          {t.tripId} — {v?.vehicleNumber ?? "?"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tds-advance" className="text-xs">
                  Cash Advance (₹) *
                </Label>
                <Input
                  id="tds-advance"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.advanceAmount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, advanceAmount: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="tds.advance.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">TDS @ 2% (Auto)</Label>
                <Input
                  value={`₹${tdsAmount.toFixed(2)}`}
                  readOnly
                  className="text-xs bg-muted/30 font-semibold text-amber-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tds-date" className="text-xs">
                  Entry Date *
                </Label>
                <Input
                  id="tds-date"
                  type="date"
                  value={form.entryDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, entryDate: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="tds.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="tds.status.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending" className="text-xs">
                      Pending
                    </SelectItem>
                    <SelectItem value="paid" className="text-xs">
                      Paid
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tds-remarks" className="text-xs">
                Remarks
              </Label>
              <Input
                id="tds-remarks"
                placeholder="Optional notes"
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
                className="text-xs"
                data-ocid="tds.remarks.input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="tds.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.ownerName || !form.advanceAmount}
                className="text-xs"
                data-ocid="tds.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Entry"
                ) : (
                  "Add Entry"
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
        <DialogContent className="max-w-sm" data-ocid="tds.delete_dialog">
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
              data-ocid="tds.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTDS.isPending}
              className="text-xs"
              data-ocid="tds.delete_confirm_button"
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
