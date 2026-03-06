import { Badge } from "@/components/ui/badge";
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
import {
  AlertTriangle,
  ExternalLink,
  FileCheck,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type DeliveryOrder,
  useCreateDeliveryOrder,
  useDeleteDeliveryOrder,
  useGetAllConsigners,
  useGetAllDeliveryOrders,
  useUpdateDeliveryOrder,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

interface DOFormData {
  doNumber: string;
  consignerId: string;
  doQty: string;
  expiryDate: string;
  fileUrl: string;
  status: string;
}

const defaultForm: DOFormData = {
  doNumber: "",
  consignerId: "",
  doQty: "",
  expiryDate: "",
  fileUrl: "",
  status: "Active",
};

function getDaysUntilExpiry(dateStr: string): number {
  if (!dateStr) return 999;
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export default function DeliveryOrdersPage() {
  const dosQuery = useGetAllDeliveryOrders();
  const consignersQuery = useGetAllConsigners();
  const createDO = useCreateDeliveryOrder();
  const updateDO = useUpdateDeliveryOrder();
  const deleteDO = useDeleteDeliveryOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryOrder | null>(null);
  const [form, setForm] = useState<DOFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<DeliveryOrder | null>(
    null,
  );

  const dos = dosQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];

  const getConsignerName = (id: bigint) =>
    consigners.find((c) => c.id === id)?.name ?? id.toString();

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: DeliveryOrder) => {
    setEditingItem(item);
    setForm({
      doNumber: item.doNumber,
      consignerId: item.consignerId.toString(),
      doQty: item.doQty.toString(),
      expiryDate: item.expiryDate,
      fileUrl: item.fileUrl,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doNumber.trim()) {
      toast.error("Please enter a DO number");
      return;
    }
    if (!form.consignerId) {
      toast.error("Please select a consigner");
      return;
    }
    const data = {
      doNumber: form.doNumber.trim(),
      consignerId: BigInt(form.consignerId),
      doQty: Number(form.doQty),
      expiryDate: form.expiryDate,
      fileUrl: form.fileUrl,
      status: form.status,
    };
    try {
      if (editingItem) {
        await updateDO.mutateAsync({
          id: editingItem.id,
          dispatchedQty: editingItem.dispatchedQty ?? 0,
          ...data,
        });
        toast.success("Delivery Order updated");
      } else {
        await createDO.mutateAsync(data);
        toast.success("Delivery Order created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save Delivery Order.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDO.mutateAsync(deleteConfirm.id);
      toast.success("Delivery Order deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete Delivery Order.");
    }
  };

  const isSaving = createDO.isPending || updateDO.isPending;

  const getStatusBadge = (item: DeliveryOrder) => {
    const days = getDaysUntilExpiry(item.expiryDate);
    if (item.status === "Expired" || days < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium status-pending">
          Expired
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium status-partial">
          <AlertTriangle className="h-3 w-3" />
          Expires in {days}d
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium status-paid">
        Active
      </span>
    );
  };

  return (
    <div className="p-6 space-y-5" data-ocid="delivery_orders.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.65 0.16 150 / 0.12)" }}
          >
            <FileCheck
              className="h-4 w-4"
              style={{ color: "oklch(0.45 0.16 150)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Delivery Orders (DO)
            </h2>
            <p className="text-sm text-muted-foreground">
              {dos.length} order{dos.length !== 1 ? "s" : ""} on record
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="delivery_orders.add_button"
        >
          <Plus className="h-4 w-4" />
          Create DO
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {dosQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : dos.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="delivery_orders.empty_state"
          >
            <FileCheck className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No Delivery Orders yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a DO to authorize material movement
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="delivery_orders.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">DO #</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consigner (OCP)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    DO Qty (MT)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Dispatched (MT)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Remaining (MT)
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Expiry Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold">File</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dos.map((item, index) => (
                  <TableRow
                    key={item.id.toString()}
                    className="table-row-hover"
                    data-ocid={`delivery_orders.item.${index + 1}`}
                  >
                    <TableCell className="text-xs font-mono font-semibold">
                      {item.doNumber}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {getConsignerName(item.consignerId)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {item.doQty.toFixed(3)} MT
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {(item.dispatchedQty ?? 0).toFixed(3)} MT
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {(() => {
                        const remaining =
                          item.doQty - (item.dispatchedQty ?? 0);
                        const pct = item.doQty > 0 ? remaining / item.doQty : 0;
                        const color =
                          remaining <= 0
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : pct <= 0.1
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
                        return (
                          <Badge
                            variant="outline"
                            className={`text-xs font-mono ${color}`}
                          >
                            {remaining.toFixed(3)} MT
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(item.expiryDate)}
                    </TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell>
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-7 w-7 p-0"
                          data-ocid={`delivery_orders.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(item)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`delivery_orders.delete_button.${index + 1}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="delivery_orders.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem
                ? `Edit ${editingItem.doNumber}`
                : "Create Delivery Order"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="do-number" className="text-xs">
                DO Number *
              </Label>
              <Input
                id="do-number"
                placeholder="e.g. OCP/DO/2024/001"
                value={form.doNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, doNumber: e.target.value }))
                }
                required
                className="text-xs"
                data-ocid="delivery_orders.do_number.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Consigner (OCP) *</Label>
              <Select
                value={form.consignerId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, consignerId: v }))
                }
              >
                <SelectTrigger
                  className="text-xs"
                  data-ocid="delivery_orders.consigner.select"
                >
                  <SelectValue placeholder="Select OCP" />
                </SelectTrigger>
                <SelectContent>
                  {consigners.map((c) => (
                    <SelectItem
                      key={c.id.toString()}
                      value={c.id.toString()}
                      className="text-xs"
                    >
                      {c.name} ({c.material})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="do-qty" className="text-xs">
                  DO Quantity (MT) *
                </Label>
                <Input
                  id="do-qty"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={form.doQty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, doQty: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="delivery_orders.qty.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="do-expiry" className="text-xs">
                  Expiry Date *
                </Label>
                <Input
                  id="do-expiry"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expiryDate: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="delivery_orders.expiry.input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="delivery_orders.status.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active" className="text-xs">
                      Active
                    </SelectItem>
                    <SelectItem value="Expired" className="text-xs">
                      Expired
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="do-file" className="text-xs">
                  File URL (optional)
                </Label>
                <Input
                  id="do-file"
                  placeholder="https://..."
                  value={form.fileUrl}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fileUrl: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="delivery_orders.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.consignerId}
                className="text-xs"
                data-ocid="delivery_orders.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update DO"
                ) : (
                  "Create DO"
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
        <DialogContent
          className="max-w-sm"
          data-ocid="delivery_orders.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Delivery Order
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{deleteConfirm?.doNumber}</strong>? This cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="delivery_orders.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDO.isPending}
              className="text-xs"
              data-ocid="delivery_orders.delete_confirm_button"
            >
              {deleteDO.isPending ? (
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
