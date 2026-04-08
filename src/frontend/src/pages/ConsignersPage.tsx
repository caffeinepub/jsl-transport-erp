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
  Download,
  Eye,
  FileText,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Consigner,
  type DeliveryOrder,
  useCreateConsigner,
  useDeleteConsigner,
  useGetAllBillingInvoices,
  useGetAllConsignees,
  useGetAllConsigners,
  useGetAllDeliveryOrders,
  useGetAllLoadingTrips,
  useGetAllUnloadings,
  useUpdateConsigner,
} from "../hooks/useQueries";

interface ConsignerDocument {
  name: string;
  dataUrl: string;
  type: string;
}

interface ConsignerFormData {
  name: string;
  material: string;
  location: string;
  contactPerson: string;
  contactPhone: string;
  defaultConsigneeId: string;
}

const defaultForm: ConsignerFormData = {
  name: "",
  material: "Coal",
  location: "",
  contactPerson: "",
  contactPhone: "",
  defaultConsigneeId: "",
};

const MATERIALS = ["Coal", "Iron Ore", "Fly Ash", "Other"];

function bigIntEqStr(a: bigint | number, b: bigint | number): boolean {
  return BigInt(a) === BigInt(b);
}

function getConsignerUsageCount(
  consignerId: bigint | number,
  dos: DeliveryOrder[],
): number {
  return dos.filter((d) => bigIntEqStr(d.consignerId, consignerId)).length;
}

function getDocsForConsigner(id: bigint | number): ConsignerDocument[] {
  try {
    const raw = localStorage.getItem(`jt_consigner_docs_${id}`);
    return raw ? (JSON.parse(raw) as ConsignerDocument[]) : [];
  } catch {
    return [];
  }
}

function saveDocsForConsigner(id: bigint | number, docs: ConsignerDocument[]) {
  localStorage.setItem(`jt_consigner_docs_${id}`, JSON.stringify(docs));
}

function viewDocFile(fileUrl: string) {
  if (fileUrl.startsWith("data:")) {
    const [header, base64] = fileUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([arr], { type: mime })), "_blank");
  } else {
    window.open(fileUrl, "_blank");
  }
}

function downloadDocFile(fileUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = fileName || "file";
  a.click();
}

function printDocFile(fileUrl: string) {
  const win = window.open(fileUrl, "_blank");
  win?.addEventListener("load", () => win?.print());
}

export default function ConsignersPage() {
  const consignersQuery = useGetAllConsigners();
  const consigneesQuery = useGetAllConsignees();
  const dosQuery = useGetAllDeliveryOrders();
  const tripsQuery = useGetAllLoadingTrips();
  const unloadingsQuery = useGetAllUnloadings();
  const billingInvoicesQuery = useGetAllBillingInvoices();
  const createConsigner = useCreateConsigner();
  const updateConsigner = useUpdateConsigner();
  const deleteConsigner = useDeleteConsigner();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Consigner | null>(null);
  const [form, setForm] = useState<ConsignerFormData>(defaultForm);
  const [formDocs, setFormDocs] = useState<ConsignerDocument[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Consigner | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ConsignerDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const consigners = consignersQuery.data ?? [];
  const consignees = consigneesQuery.data ?? [];
  const dos = dosQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const unloadings = unloadingsQuery.data ?? [];
  const billingInvoices = billingInvoicesQuery.data ?? [];

  // Build set of all billed trip IDs
  const billedTripIds = useMemo(
    () =>
      new Set<string>(
        billingInvoices.flatMap((inv) =>
          (inv.tripIds ?? []).map((id) => id.toString()),
        ),
      ),
    [billingInvoices],
  );

  // Compute usage counts per consigner id
  const usageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of consigners) {
      map.set(c.id.toString(), getConsignerUsageCount(c.id, dos));
    }
    return map;
  }, [consigners, dos]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(defaultForm);
    setFormDocs([]);
    setDialogOpen(true);
  };

  const openEditDialog = (item: Consigner) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      material: item.material,
      location: item.location,
      contactPerson: (item as { contactPerson?: string }).contactPerson ?? "",
      contactPhone: (item as { contactPhone?: string }).contactPhone ?? "",
      defaultConsigneeId:
        (item as { defaultConsigneeId?: string }).defaultConsigneeId ?? "",
    });
    setFormDocs(getDocsForConsigner(item.id));
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormDocs((prev) => [
          ...prev,
          {
            name: file.name,
            dataUrl: ev.target?.result as string,
            type: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      material: form.material,
      location: form.location,
      contactPerson: form.contactPerson,
      contactPhone: form.contactPhone,
      defaultConsigneeId: form.defaultConsigneeId,
      associationRate: 0,
      nonAssociationRate: 0,
      vendorRate: 0,
      billingRate: 0,
    } as Omit<Consigner, "id">;
    try {
      if (editingItem) {
        await updateConsigner.mutateAsync({
          id: editingItem.id,
          ...data,
        } as Consigner);
        saveDocsForConsigner(editingItem.id, formDocs);
        toast.success("Consigner updated successfully");
      } else {
        const newId = await createConsigner.mutateAsync(data);
        if (newId !== undefined)
          saveDocsForConsigner(newId as bigint, formDocs);
        toast.success("Consigner created successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save consigner. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    // Block if any linked trip is billed
    if (deleteIsBilled) {
      toast.error(
        `Cannot delete: "${deleteConfirm.name}" has trips included in billing invoices.`,
      );
      setDeleteConfirm(null);
      return;
    }
    try {
      await deleteConsigner.mutateAsync(deleteConfirm.id);
      localStorage.removeItem(`jt_consigner_docs_${deleteConfirm.id}`);
      toast.success("Consigner deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete consigner.");
    }
  };

  const isSaving = createConsigner.isPending || updateConsigner.isPending;

  const materialBadgeColor = (material: string) => {
    switch (material) {
      case "Coal":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "Iron Ore":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Fly Ash":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  // For delete dialog: recompute usage at time of confirm
  const deleteConfirmUsage = deleteConfirm
    ? (usageMap.get(deleteConfirm.id.toString()) ?? 0)
    : 0;

  // Cascade counts for delete preview
  const deleteConfirmDOs = deleteConfirm
    ? dos.filter((d) => bigIntEqStr(d.consignerId, deleteConfirm.id))
    : [];
  const deleteConfirmDoIds = new Set(
    deleteConfirmDOs.map((d) => d.id.toString()),
  );
  const deleteConfirmTrips = deleteConfirm
    ? trips.filter((t) => deleteConfirmDoIds.has(t.doId?.toString() ?? ""))
    : [];
  const deleteConfirmTripIds = new Set(
    deleteConfirmTrips.map((t) => t.id.toString()),
  );
  const deleteConfirmUnloadings = deleteConfirm
    ? unloadings.filter((u) =>
        deleteConfirmTripIds.has(u.loadingTripId.toString()),
      )
    : [];
  const deleteIsBilled = deleteConfirm
    ? deleteConfirmTrips.some((t) => billedTripIds.has(t.id.toString()))
    : false;

  return (
    <div className="p-6 space-y-5" data-ocid="consigners.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.72 0.18 60 / 0.12)" }}
          >
            <MapPin
              className="h-4 w-4"
              style={{ color: "oklch(0.72 0.18 60)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Consigners (OCP)
            </h2>
            <p className="text-sm text-muted-foreground">
              {consigners.length} loading point
              {consigners.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="consigners.add_button"
        >
          <Plus className="h-4 w-4" />
          Add Consigner
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {consignersQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : consigners.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="consigners.empty_state"
          >
            <MapPin className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No consigners registered yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your OCPs (Origin Colliery Points) to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="consigners.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    OCP Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Material
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Location
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Contact Person
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Default Client
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Docs</TableHead>
                  <TableHead className="text-xs font-semibold">Usage</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consigners.map((item, index) => {
                  const useCount = usageMap.get(item.id.toString()) ?? 0;
                  const isLocked = useCount > 0;
                  const docs = getDocsForConsigner(item.id);
                  const defaultConsigneeId =
                    (item as { defaultConsigneeId?: string })
                      .defaultConsigneeId ?? "";
                  const defaultConsigneeName = defaultConsigneeId
                    ? (consignees.find(
                        (c) => c.id.toString() === defaultConsigneeId,
                      )?.name ?? "—")
                    : "—";
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className="table-row-hover"
                      data-ocid={`consigners.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-semibold text-foreground">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${materialBadgeColor(item.material)}`}
                        >
                          {item.material}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.location || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(item as { contactPerson?: string }).contactPerson ||
                          "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {defaultConsigneeId ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            <Link2 className="h-2.5 w-2.5" />
                            {defaultConsigneeName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {docs.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(docs[0])}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                            title={`${docs.length} document${docs.length !== 1 ? "s" : ""} — click to preview`}
                            data-ocid={`consigners.docs_badge.${index + 1}`}
                          >
                            <Paperclip className="h-2.5 w-2.5" />📎{" "}
                            {docs.length} doc{docs.length !== 1 ? "s" : ""}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isLocked ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                            title={`In use: referenced in ${useCount} Delivery Order${useCount !== 1 ? "s" : ""}. Deleting will cascade to linked trips and unloadings.`}
                            data-ocid={`consigners.lock_badge.${index + 1}`}
                          >
                            <Lock className="h-2.5 w-2.5" />
                            {useCount} DO{useCount !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                            className="h-7 w-7 p-0"
                            data-ocid={`consigners.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(item)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            title={
                              isLocked
                                ? `Delete with cascade — will remove ${useCount} DO${useCount !== 1 ? "s" : ""} and linked trips`
                                : "Delete consigner"
                            }
                            data-ocid={`consigners.delete_button.${index + 1}`}
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
        <DialogContent className="max-w-lg" data-ocid="consigners.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit Consigner (OCP)" : "Add New Consigner (OCP)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="csg-name" className="text-xs">
                  OCP Name *
                </Label>
                <Input
                  id="csg-name"
                  placeholder="e.g. Ananta OCP"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="consigners.name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Material *</Label>
                <Select
                  value={form.material}
                  onValueChange={(v) => setForm((p) => ({ ...p, material: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="consigners.material.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csg-location" className="text-xs">
                  Location
                </Label>
                <Input
                  id="csg-location"
                  placeholder="e.g. Talcher, Odisha"
                  value={form.location}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, location: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csg-contact" className="text-xs">
                  Contact Person
                </Label>
                <Input
                  id="csg-contact"
                  placeholder="Name"
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactPerson: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csg-phone" className="text-xs">
                  Contact Phone
                </Label>
                <Input
                  id="csg-phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactPhone: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>

              {/* Default Consignee Mapping */}
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Link2 className="h-3 w-3 text-blue-600" />
                  Default Client (Consignee) — auto-fills in Delivery Order
                </Label>
                <Select
                  value={form.defaultConsigneeId || "__none__"}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      defaultConsigneeId: v === "__none__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="consigners.default_consignee.select"
                  >
                    <SelectValue placeholder="None (no auto-fill)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__none__"
                      className="text-xs text-muted-foreground"
                    >
                      None (no auto-fill)
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
                <p className="text-[10px] text-muted-foreground">
                  When set, creating a DO with this OCP will auto-select this
                  client
                </p>
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label className="text-xs">Documents</Label>
              <button
                type="button"
                className="w-full border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                data-ocid="consigners.dropzone"
              >
                <Paperclip className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Click to upload documents (PDF, JPG, PNG — max 5MB each)
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              {formDocs.length > 0 && (
                <div className="space-y-1.5">
                  {formDocs.map((doc, idx) => (
                    <div
                      key={`${doc.name}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="text-xs truncate">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormDocs((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-destructive hover:text-destructive/80 p-0.5"
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground bg-muted/30 rounded px-3 py-2">
              Rates (Association, Non-Association, Vendor, Billing) are
              configured per Delivery Order (DO) -- not on the OCP master.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="consigners.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="text-xs"
                data-ocid="consigners.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Consigner"
                ) : (
                  "Add Consigner"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent
          className="max-w-2xl"
          data-ocid="consigners.preview.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {previewDoc?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px] bg-muted/30 rounded-lg overflow-hidden">
            {previewDoc?.type === "application/pdf" ? (
              <iframe
                src={previewDoc.dataUrl}
                className="w-full h-[500px]"
                title={previewDoc.name}
              />
            ) : (
              <img
                src={previewDoc?.dataUrl}
                alt={previewDoc?.name ?? "Document preview"}
                className="max-w-full max-h-[500px] object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => previewDoc && viewDocFile(previewDoc.dataUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
            <button
              type="button"
              onClick={() =>
                previewDoc &&
                downloadDocFile(previewDoc.dataUrl, previewDoc.name)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={() => previewDoc && printDocFile(previewDoc.dataUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <Button
              size="sm"
              onClick={() => setPreviewDoc(null)}
              className="text-xs"
              data-ocid="consigners.preview.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="consigners.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {deleteIsBilled ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Cannot Delete Consigner
                </>
              ) : deleteConfirmUsage > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Confirm Delete with Cascade
                </>
              ) : (
                "Delete Consigner"
              )}
            </DialogTitle>
          </DialogHeader>

          {deleteIsBilled ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{deleteConfirm?.name}</strong> cannot be deleted because
                one or more of its linked trips are included in a billing
                invoice.
              </p>
              <div className="flex items-start gap-2 rounded-md px-3 py-2 text-xs bg-destructive/5 border border-destructive/20 text-destructive">
                <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Reverse the billing invoice first before deleting this
                consigner.
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs w-full"
                  data-ocid="consigners.delete_cancel_button"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : deleteConfirmUsage > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Deleting <strong>{deleteConfirm?.name}</strong> will permanently
                remove:
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground ml-2">
                <li>
                  •{" "}
                  <strong className="text-foreground">
                    {deleteConfirmDOs.length}
                  </strong>{" "}
                  Delivery Order{deleteConfirmDOs.length !== 1 ? "s" : ""}
                </li>
                <li>
                  •{" "}
                  <strong className="text-foreground">
                    {deleteConfirmTrips.length}
                  </strong>{" "}
                  Loading Trip{deleteConfirmTrips.length !== 1 ? "s" : ""}
                </li>
                <li>
                  •{" "}
                  <strong className="text-foreground">
                    {deleteConfirmUnloadings.length}
                  </strong>{" "}
                  Unloading Record
                  {deleteConfirmUnloadings.length !== 1 ? "s" : ""}
                </li>
                <li>• Related Payable, Diesel, and Petty Cash entries</li>
              </ul>
              <div className="flex items-start gap-2 rounded-md px-3 py-2 text-xs bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                This action is irreversible. All linked records will be
                permanently deleted.
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs"
                  data-ocid="consigners.delete_cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConsigner.isPending}
                  className="text-xs"
                  data-ocid="consigners.delete_confirm_button"
                >
                  {deleteConsigner.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Permanently Delete All"
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-xs"
                  data-ocid="consigners.delete_cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConsigner.isPending}
                  className="text-xs"
                  data-ocid="consigners.delete_confirm_button"
                >
                  {deleteConsigner.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
