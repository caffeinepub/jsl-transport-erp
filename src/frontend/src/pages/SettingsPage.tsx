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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type Client,
  useCreateClient,
  useDeleteClient,
  useGetAllClients,
  useGetUserProfile,
  useSaveUserProfile,
  useUpdateClient,
} from "../hooks/useQueries";

// =================== CLIENTS SECTION ===================
interface ClientFormData {
  clientName: string;
  gstNumber: string;
  address: string;
}
const defaultClientForm: ClientFormData = {
  clientName: "",
  gstNumber: "",
  address: "",
};

function ClientsTab() {
  const clientsQuery = useGetAllClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormData>(defaultClientForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);

  const clients = clientsQuery.data ?? [];

  const openCreateDialog = () => {
    setEditingClient(null);
    setForm(defaultClientForm);
    setDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setForm({
      clientName: client.clientName,
      gstNumber: client.gstNumber,
      address: client.address,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, ...form });
        toast.success("Client updated");
      } else {
        await createClient.mutateAsync(form);
        toast.success("Client added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save client.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteClient.mutateAsync(deleteConfirm.id);
      toast.success("Client deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete client.");
    }
  };

  const isSaving = createClient.isPending || updateClient.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {clients.length} clients
        </p>
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="gap-2 text-xs"
          data-ocid="settings.clients.new_button"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Client
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {clientsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12"
            data-ocid="settings.clients.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No clients registered yet
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold">
                  Client Name
                </TableHead>
                <TableHead className="text-xs font-semibold">
                  GST Number
                </TableHead>
                <TableHead className="text-xs font-semibold">Address</TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => (
                <TableRow
                  key={client.id.toString()}
                  className="table-row-hover"
                  data-ocid={`settings.clients.item.${index + 1}`}
                >
                  <TableCell className="text-xs font-medium">
                    {client.clientName}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {client.gstNumber || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {client.address || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(client)}
                        className="h-7 w-7 p-0"
                        data-ocid={`settings.clients.edit_button.${index + 1}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(client)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        data-ocid={`settings.clients.delete_button.${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Client Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-ocid="settings.clients.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingClient ? "Edit Client" : "Add Client"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-xs">
                Client Name *
              </Label>
              <Input
                id="clientName"
                placeholder="Company or person name"
                value={form.clientName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, clientName: e.target.value }))
                }
                required
                className="text-xs"
                data-ocid="settings.clients.form.client_name_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber" className="text-xs">
                GST Number
              </Label>
              <Input
                id="gstNumber"
                placeholder="27AABCU9603R1ZX"
                value={form.gstNumber}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gstNumber: e.target.value.toUpperCase(),
                  }))
                }
                className="text-xs font-mono"
                data-ocid="settings.clients.form.gst_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs">
                Address
              </Label>
              <Input
                id="address"
                placeholder="Full address"
                value={form.address}
                onChange={(e) =>
                  setForm((p) => ({ ...p, address: e.target.value }))
                }
                className="text-xs"
                data-ocid="settings.clients.form.address_input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="settings.clients.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                data-ocid="settings.clients.form.submit_button"
                className="text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingClient ? (
                  "Update"
                ) : (
                  "Add Client"
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
          data-ocid="settings.clients.delete_modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Delete Client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete client <strong>{deleteConfirm?.clientName}</strong>?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="settings.clients.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteClient.isPending}
              data-ocid="settings.clients.delete_confirm_button"
              className="text-xs"
            >
              {deleteClient.isPending ? (
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

// =================== PROFILE SECTION ===================
function ProfileTab() {
  const profileQuery = useGetUserProfile();
  const saveProfile = useSaveUserProfile();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  // Initialize from profile
  const profile = profileQuery.data;
  const currentName = name || profile?.name || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentName.trim()) return;
    try {
      await saveProfile.mutateAsync({ name: currentName.trim() });
      toast.success("Profile saved successfully");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save profile.");
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">User Profile</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Update your display name for the ERP system
        </p>
      </div>

      {profileQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profileName" className="text-xs">
              Full Name *
            </Label>
            <Input
              id="profileName"
              placeholder="Your full name"
              value={name || profile?.name || ""}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs"
              data-ocid="settings.profile.name_input"
            />
          </div>
          <Button
            type="submit"
            disabled={saveProfile.isPending}
            className="gap-2 text-xs"
            data-ocid="settings.profile.save_button"
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Save className="h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Profile
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

// =================== MAIN SETTINGS PAGE ===================
export default function SettingsPage() {
  return (
    <div className="p-6 space-y-5" data-ocid="settings.page">
      <div>
        <h2 className="text-lg font-bold font-display text-foreground">
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage clients and your profile
        </p>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList className="h-9 bg-muted/50">
          <TabsTrigger
            value="clients"
            className="text-xs h-7"
            data-ocid="settings.clients.tab"
          >
            Clients
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="text-xs h-7"
            data-ocid="settings.profile.tab"
          >
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
