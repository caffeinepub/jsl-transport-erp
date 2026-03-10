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
  Building2,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Consignee,
  useCreateConsignee,
  useDeleteConsignee,
  useGetAllConsignees,
  useUpdateConsignee,
} from "../hooks/useQueries";

interface ConsigneeDocument {
  name: string;
  dataUrl: string;
  type: string;
}

interface ConsigneeFormData {
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  gstNumber: string;
  documents: ConsigneeDocument[];
}

const defaultForm: ConsigneeFormData = {
  name: "",
  address: "",
  contactPerson: "",
  phone: "",
  gstNumber: "",
  documents: [],
};

function getDocsForConsignee(id: bigint | number): ConsigneeDocument[] {
  try {
    const raw = localStorage.getItem(`jt_consignee_docs_${id}`);
    return raw ? (JSON.parse(raw) as ConsigneeDocument[]) : [];
  } catch {
    return [];
  }
}

function saveDocsForConsignee(id: bigint | number, docs: ConsigneeDocument[]) {
  localStorage.setItem(`jt_consignee_docs_${id}`, JSON.stringify(docs));
}

export default function ConsigneesPage() {
  const consigneesQuery = useGetAllConsignees();
  const createConsignee = useCreateConsignee();
  const updateConsignee = useUpdateConsignee();
  const deleteConsignee = useDeleteConsignee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Consignee | null>(null);
  const [form, setForm] = useState<ConsigneeFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Consignee | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ConsigneeDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const consignees = consigneesQuery.data ?? [];

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({ ...defaultForm, documents: [] });
    setDialogOpen(true);
  };

  const openEditDialog = (item: Consignee) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      address: item.address,
      contactPerson: item.contactPerson,
      phone: item.phone,
      gstNumber: item.gstNumber,
      documents: getDocsForConsignee(item.id),
    });
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setForm((prev) => ({
          ...prev,
          documents: [
            ...prev.documents,
            { name: file.name, dataUrl, type: file.type },
          ],
        }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeDoc = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { documents, ...rest } = form;
      if (editingItem) {
        await updateConsignee.mutateAsync({ id: editingItem.id, ...rest });
        saveDocsForConsignee(editingItem.id, documents);
        toast.success("Consignee updated successfully");
      } else {
        const created = await createConsignee.mutateAsync(rest);
        const newId = (created as { id?: bigint | number })?.id;
        if (newId !== undefined) saveDocsForConsignee(newId, documents);
        toast.success("Consignee created successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save consignee. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteConsignee.mutateAsync(deleteConfirm.id);
      localStorage.removeItem(`jt_consignee_docs_${deleteConfirm.id}`);
      toast.success("Consignee deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete consignee.");
    }
  };

  const isSaving = createConsignee.isPending || updateConsignee.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="consignees.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.55 0.18 240 / 0.12)" }}
          >
            <Building2
              className="h-4 w-4"
              style={{ color: "oklch(0.55 0.18 240)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Consignees
            </h2>
            <p className="text-sm text-muted-foreground">
              {consignees.length} destination
              {consignees.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="consignees.add_button"
        >
          <Plus className="h-4 w-4" />
          Add Consignee
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {consigneesQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : consignees.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="consignees.empty_state"
          >
            <Building2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No consignees registered yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add destination companies (Jindal, Tata, etc.) to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="consignees.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Company Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Address
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Contact Person
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Phone</TableHead>
                  <TableHead className="text-xs font-semibold">
                    GST Number
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Documents
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consignees.map((item, index) => {
                  const docs = getDocsForConsignee(item.id);
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className="table-row-hover"
                      data-ocid={`consignees.item.${index + 1}`}
                    >
                      <TableCell className="text-xs font-semibold text-foreground">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {item.address || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.contactPerson || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {item.phone || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {item.gstNumber || "—"}
                      </TableCell>
                      <TableCell>
                        {docs.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {docs.map((doc) => (
                              <button
                                key={doc.name}
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                title={doc.name}
                              >
                                <FileText className="h-3 w-3" />
                                <span className="max-w-[80px] truncate">
                                  {doc.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                            className="h-7 w-7 p-0"
                            data-ocid={`consignees.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(item)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            data-ocid={`consignees.delete_button.${index + 1}`}
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
        <DialogContent className="max-w-lg" data-ocid="consignees.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? "Edit Consignee" : "Add New Consignee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cse-name" className="text-xs">
                  Company Name *
                </Label>
                <Input
                  id="cse-name"
                  placeholder="e.g. Jindal Steel & Power Ltd"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="consignees.name.input"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cse-address" className="text-xs">
                  Address
                </Label>
                <Input
                  id="cse-address"
                  placeholder="Full address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cse-contact" className="text-xs">
                  Contact Person
                </Label>
                <Input
                  id="cse-contact"
                  placeholder="Name"
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, contactPerson: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cse-phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="cse-phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="consignees.phone.input"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cse-gst" className="text-xs">
                  GST Number
                </Label>
                <Input
                  id="cse-gst"
                  placeholder="e.g. 21AAACD1234A1ZX"
                  value={form.gstNumber}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      gstNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  className="text-xs font-mono"
                />
              </div>

              {/* Document Upload */}
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Documents</Label>
                <button
                  type="button"
                  className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fileInputRef.current?.click()
                  }
                  data-ocid="consignees.dropzone"
                >
                  <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Click to upload documents (PDF, JPG, PNG -- max 5MB each)
                  </p>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  data-ocid="consignees.upload_button"
                />
                {form.documents.length > 0 && (
                  <div className="space-y-1.5">
                    {form.documents.map((doc, idx) => (
                      <div
                        key={doc.name}
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
                            onClick={() => removeDoc(idx)}
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
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="consignees.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="text-xs"
                data-ocid="consignees.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Consignee"
                ) : (
                  "Add Consignee"
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
          data-ocid="consignees.preview.dialog"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!previewDoc) return;
                const a = document.createElement("a");
                a.href = previewDoc.dataUrl;
                a.download = previewDoc.name;
                a.click();
              }}
              className="text-xs"
            >
              Download
            </Button>
            <Button
              size="sm"
              onClick={() => setPreviewDoc(null)}
              className="text-xs"
              data-ocid="consignees.preview.close_button"
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
          data-ocid="consignees.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete Consignee</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>{deleteConfirm?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="consignees.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConsignee.isPending}
              className="text-xs"
              data-ocid="consignees.delete_confirm_button"
            >
              {deleteConsignee.isPending ? (
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
