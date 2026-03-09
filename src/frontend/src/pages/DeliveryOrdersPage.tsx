import { Badge } from "@/components/ui/badge";
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
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  FileCheck,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  type DeliveryOrder,
  useCreateDeliveryOrder,
  useDeleteDeliveryOrder,
  useGetAllConsignees,
  useGetAllConsigners,
  useGetAllDeliveryOrders,
  useGetAllLoadingTrips,
  useUpdateDeliveryOrder,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

interface DOFormData {
  doNumber: string;
  consignerId: string;
  consigneeId: string;
  doQty: string;
  expiryDate: string;
  fileUrl: string;
  fileName: string;
  status: string;
  // Rates
  associationRate: string;
  nonAssociationRate: string;
  vendorRate: string;
  billingRate: string;
  gpsCharges: string;
  shortageRate: string;
  allowOverDispatch: boolean;
}

const defaultForm: DOFormData = {
  doNumber: "",
  consignerId: "",
  consigneeId: "",
  doQty: "",
  expiryDate: "",
  fileUrl: "",
  fileName: "",
  status: "Active",
  associationRate: "",
  nonAssociationRate: "",
  vendorRate: "",
  billingRate: "",
  gpsCharges: "131",
  shortageRate: "5000",
  allowOverDispatch: false,
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
  const consigneesQuery = useGetAllConsignees();
  const loadingTripsQuery = useGetAllLoadingTrips();
  const createDO = useCreateDeliveryOrder();
  const updateDO = useUpdateDeliveryOrder();
  const deleteDO = useDeleteDeliveryOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeliveryOrder | null>(null);
  const [form, setForm] = useState<DOFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<DeliveryOrder | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dos = dosQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];
  const consignees = consigneesQuery.data ?? [];
  const loadingTrips = loadingTripsQuery.data ?? [];

  // Compute dispatched qty directly from loading trips for accurate real-time values
  const getDispatchedQty = (doId: bigint): number => {
    return loadingTrips
      .filter((t) => {
        try {
          return BigInt(t.doId.toString()) === BigInt(doId.toString());
        } catch {
          return false;
        }
      })
      .reduce((sum, t) => sum + (Number(t.loadingQty) || 0), 0);
  };

  const getConsignerName = (id: bigint) =>
    consigners.find((c) => c.id === id)?.name ?? id.toString();

  const getConsigneeName = (id: bigint) =>
    id === 0n ? "—" : (consignees.find((c) => c.id === id)?.name ?? "—");

  const filteredDos = dos.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const consignerName = getConsignerName(item.consignerId).toLowerCase();
    return item.doNumber.toLowerCase().includes(q) || consignerName.includes(q);
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((p) => ({ ...p, fileUrl: dataUrl, fileName: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const openEditDialog = (item: DeliveryOrder) => {
    setEditingItem(item);
    setForm({
      doNumber: item.doNumber,
      consignerId: item.consignerId.toString(),
      consigneeId: item.consigneeId ? item.consigneeId.toString() : "",
      doQty: item.doQty.toString(),
      expiryDate: item.expiryDate,
      fileUrl: item.fileUrl,
      fileName:
        (item as any).fileName ??
        (item.fileUrl && !item.fileUrl.startsWith("http")
          ? "Uploaded file"
          : ""),
      status: item.status,
      associationRate: item.associationRate
        ? item.associationRate.toString()
        : "",
      nonAssociationRate: item.nonAssociationRate
        ? item.nonAssociationRate.toString()
        : "",
      vendorRate: item.vendorRate ? item.vendorRate.toString() : "",
      billingRate: item.billingRate ? item.billingRate.toString() : "",
      gpsCharges: item.gpsCharges ? item.gpsCharges.toString() : "131",
      shortageRate: item.shortageRate ? item.shortageRate.toString() : "5000",
      allowOverDispatch: item.allowOverDispatch ?? false,
    });
    setDialogOpen(true);
  };

  // When a consigner is selected, auto-populate rates as defaults
  const handleConsignerChange = (v: string) => {
    const consigner = consigners.find((c) => c.id === BigInt(v));
    setForm((p) => ({
      ...p,
      consignerId: v,
      associationRate: consigner
        ? consigner.associationRate.toString()
        : p.associationRate,
      nonAssociationRate: consigner
        ? consigner.nonAssociationRate.toString()
        : p.nonAssociationRate,
      vendorRate: consigner ? consigner.vendorRate.toString() : p.vendorRate,
      billingRate: consigner ? consigner.billingRate.toString() : p.billingRate,
    }));
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
      consigneeId: form.consigneeId ? BigInt(form.consigneeId) : 0n,
      doQty: Number(form.doQty),
      expiryDate: form.expiryDate,
      fileUrl: form.fileUrl,
      status: form.status,
      associationRate: Number(form.associationRate) || 0,
      nonAssociationRate: Number(form.nonAssociationRate) || 0,
      vendorRate: Number(form.vendorRate) || 0,
      billingRate: Number(form.billingRate) || 0,
      gpsCharges: Number(form.gpsCharges) || 131,
      shortageRate: Number(form.shortageRate) || 5000,
      allowOverDispatch: form.allowOverDispatch,
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by DO number, OCP / Consigner name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-ocid="delivery_orders.search_input"
        />
        {searchQuery && filteredDos.length < dos.length && (
          <p className="mt-1 text-xs text-muted-foreground">
            Showing {filteredDos.length} of {dos.length} orders
          </p>
        )}
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
              Create a DO to authorize material movement and configure rates
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
                  <TableHead className="text-xs font-semibold">
                    Consignee
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
                  <TableHead className="text-xs font-semibold text-right">
                    Booking Rate
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Billing Rate
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    GPS
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Expiry
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
                {filteredDos.map((item, index) => {
                  const dispatched = getDispatchedQty(item.id);
                  const remaining = item.doQty - dispatched;
                  const pct = item.doQty > 0 ? remaining / item.doQty : 0;
                  const remainingColor =
                    remaining < 0
                      ? "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400"
                      : remaining <= 0
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : pct <= 0.1
                          ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className="table-row-hover"
                      data-ocid={`delivery_orders.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-mono font-semibold">
                        {item.doNumber}
                        {item.allowOverDispatch && (
                          <span className="ml-1 text-[10px] text-purple-600 font-normal">
                            (OD)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {getConsignerName(item.consignerId)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {getConsigneeName(item.consigneeId)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {item.doQty.toFixed(3)} MT
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {dispatched.toFixed(3)} MT
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono ${remainingColor}`}
                        >
                          {remaining.toFixed(3)} MT
                          {remaining < 0 && (
                            <span className="ml-1 text-[10px]">Over</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {item.nonAssociationRate > 0 ? (
                          <span className="text-foreground font-medium">
                            ₹{item.nonAssociationRate.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {item.billingRate > 0 ? (
                          <span
                            className="font-medium"
                            style={{ color: "oklch(0.45 0.16 150)" }}
                          >
                            ₹{item.billingRate.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        ₹{(item.gpsCharges || 131).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.expiryDate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 h-7 w-7 justify-center rounded text-primary hover:bg-muted"
                              title="View DO file"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          )}
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="delivery_orders.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem
                ? `Edit ${editingItem.doNumber}`
                : "Create Delivery Order"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
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
                  onValueChange={handleConsignerChange}
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

              <div className="space-y-1.5">
                <Label className="text-xs">Consignee (Client)</Label>
                <Select
                  value={form.consigneeId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, consigneeId: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="delivery_orders.consignee.select"
                  >
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0" className="text-xs">
                      Not specified
                    </SelectItem>
                    {consignees.map((c) => (
                      <SelectItem
                        key={c.id.toString()}
                        value={c.id.toString()}
                        className="text-xs"
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    <SelectItem value="Closed" className="text-xs">
                      Closed
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rates Configuration */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  Rate Configuration
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Auto-filled from OCP master · editable per DO
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="do-assoc-rate" className="text-xs">
                    Association Rate (₹/MT)
                  </Label>
                  <Input
                    id="do-assoc-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.associationRate}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        associationRate: e.target.value,
                      }))
                    }
                    className="text-xs"
                    data-ocid="delivery_orders.assoc_rate.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-non-assoc-rate" className="text-xs">
                    Non-Association Rate (₹/MT)
                  </Label>
                  <Input
                    id="do-non-assoc-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.nonAssociationRate}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        nonAssociationRate: e.target.value,
                      }))
                    }
                    className="text-xs"
                    data-ocid="delivery_orders.non_assoc_rate.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-vendor-rate" className="text-xs">
                    Vendor Rate (₹/MT)
                  </Label>
                  <Input
                    id="do-vendor-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.vendorRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, vendorRate: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="delivery_orders.vendor_rate.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-billing-rate" className="text-xs">
                    Billing Rate — Jeen Trade → Client (₹/MT)
                  </Label>
                  <Input
                    id="do-billing-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.billingRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, billingRate: e.target.value }))
                    }
                    className="text-xs font-semibold"
                    style={{ borderColor: "oklch(0.55 0.16 150 / 0.5)" }}
                    data-ocid="delivery_orders.billing_rate.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-gps" className="text-xs">
                    GPS Charges (₹/trip)
                  </Label>
                  <Input
                    id="do-gps"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="131"
                    value={form.gpsCharges}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gpsCharges: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="delivery_orders.gps_charges.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="do-shortage" className="text-xs">
                    Shortage Rate (₹/MT)
                  </Label>
                  <Input
                    id="do-shortage"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="5000"
                    value={form.shortageRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, shortageRate: e.target.value }))
                    }
                    className="text-xs"
                    data-ocid="delivery_orders.shortage_rate.input"
                  />
                </div>
              </div>

              {/* DO File Upload */}
              <div className="space-y-1.5">
                <Label className="text-xs">DO Copy (Upload File)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="do-file-upload"
                />
                {form.fileUrl ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                    <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-foreground flex-1 truncate">
                      {form.fileName || "Uploaded file"}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {form.fileUrl.startsWith("data:image") && (
                        <a
                          href={form.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-6 w-6 justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {form.fileUrl.startsWith("data:application/pdf") && (
                        <a
                          href={form.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-6 w-6 justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="View PDF"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setForm((p) => ({ ...p, fileUrl: "", fileName: "" }));
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        className="inline-flex items-center h-6 w-6 justify-center rounded text-destructive hover:bg-destructive/10"
                        title="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/40 hover:border-primary/40 transition-colors"
                    data-ocid="delivery_orders.file.upload_button"
                  >
                    <FileUp className="h-4 w-4 shrink-0" />
                    Click to upload DO copy (PDF, JPG, PNG — max 5MB)
                  </button>
                )}
              </div>

              {/* Over-dispatch toggle */}
              <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                <Checkbox
                  id="do-over-dispatch"
                  checked={form.allowOverDispatch}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({
                      ...p,
                      allowOverDispatch: checked === true,
                    }))
                  }
                  data-ocid="delivery_orders.over_dispatch.checkbox"
                />
                <div>
                  <Label
                    htmlFor="do-over-dispatch"
                    className="text-xs cursor-pointer font-medium"
                  >
                    Allow Over-Dispatch
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Permits loading trips beyond the DO quantity (shown with
                    "Over" badge)
                  </p>
                </div>
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
