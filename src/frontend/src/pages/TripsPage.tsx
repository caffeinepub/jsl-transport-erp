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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type Trip,
  useCreateTrip,
  useDeleteTrip,
  useGetAllClients,
  useGetAllTrips,
  useGetAllTrucks,
  useUpdateTrip,
} from "../hooks/useQueries";
import { formatDate } from "../utils/format";

interface TripFormData {
  challanNo: string;
  truckId: string;
  clientId: string;
  tpNo: string;
  doNo: string;
  consigner: string;
  consignee: string;
  loadingDate: string;
  loadingQty: string;
  unloadingQty: string;
  associateType: string;
}

const defaultForm: TripFormData = {
  challanNo: "",
  truckId: "",
  clientId: "",
  tpNo: "",
  doNo: "",
  consigner: "",
  consignee: "",
  loadingDate: "",
  loadingQty: "",
  unloadingQty: "",
  associateType: "associate",
};

export default function TripsPage() {
  const { identity } = useInternetIdentity();
  const tripsQuery = useGetAllTrips();
  const trucksQuery = useGetAllTrucks();
  const clientsQuery = useGetAllClients();
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [form, setForm] = useState<TripFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Trip | null>(null);

  const trips = tripsQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const shortage =
    Number(form.loadingQty || 0) - Number(form.unloadingQty || 0);

  const openCreateDialog = () => {
    setEditingTrip(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEditDialog = (trip: Trip) => {
    setEditingTrip(trip);
    setForm({
      challanNo: trip.challanNo,
      truckId: trip.truckId.toString(),
      clientId: trip.clientId.toString(),
      tpNo: trip.tpNo,
      doNo: trip.doNo,
      consigner: trip.consigner,
      consignee: trip.consignee,
      loadingDate: trip.loadingDate,
      loadingQty: trip.loadingQty.toString(),
      unloadingQty: trip.unloadingQty.toString(),
      associateType: trip.associateType,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const createdBy = identity?.getPrincipal().toString() ?? "admin";
    const data = {
      challanNo: form.challanNo,
      truckId: BigInt(form.truckId),
      clientId: BigInt(form.clientId),
      tpNo: form.tpNo,
      doNo: form.doNo,
      consigner: form.consigner,
      consignee: form.consignee,
      loadingDate: form.loadingDate,
      loadingQty: Number(form.loadingQty),
      unloadingQty: Number(form.unloadingQty),
      associateType: form.associateType,
      createdBy,
    };
    try {
      if (editingTrip) {
        await updateTrip.mutateAsync({ id: editingTrip.id, ...data });
        toast.success("Trip updated successfully");
      } else {
        await createTrip.mutateAsync(data);
        toast.success("Trip created successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save trip. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTrip.mutateAsync(deleteConfirm.id);
      toast.success("Trip deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete trip.");
    }
  };

  const getTruckNumber = (id: bigint) =>
    trucks.find((t) => t.id === id)?.truckNumber ?? id.toString();
  const isSaving = createTrip.isPending || updateTrip.isPending;

  return (
    <div className="p-6 space-y-5" data-ocid="trips.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            Trip Entry
          </h2>
          <p className="text-sm text-muted-foreground">
            {trips.length} total trips
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="trips.new_button"
        >
          <Plus className="h-4 w-4" />
          New Trip
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {tripsQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="trips.empty_state"
          >
            <p className="text-sm font-medium text-muted-foreground">
              No trips recorded yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "New Trip" to add your first trip
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="trips.table">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Trip ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Challan No
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Truck</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consigner
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Consignee
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Loading
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Unloading
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Shortage
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip, index) => (
                  <TableRow
                    key={trip.id.toString()}
                    className="table-row-hover"
                    data-ocid={`trips.item.${index + 1}`}
                  >
                    <TableCell className="text-xs font-mono font-medium">
                      {trip.tripId}
                    </TableCell>
                    <TableCell className="text-xs">{trip.challanNo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(trip.loadingDate)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {getTruckNumber(trip.truckId)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">
                      {trip.consigner}
                    </TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">
                      {trip.consignee}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {trip.loadingQty}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {trip.unloadingQty}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {trip.shortage > 0 ? (
                        <span className="text-destructive font-medium">
                          {trip.shortage}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {trip.associateType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(trip)}
                          className="h-7 w-7 p-0"
                          data-ocid={`trips.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(trip)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          data-ocid={`trips.delete_button.${index + 1}`}
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

      {/* Trip Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="trips.modal"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTrip ? "Edit Trip" : "New Trip"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loadingDate" className="text-xs">
                  Loading Date *
                </Label>
                <Input
                  id="loadingDate"
                  type="date"
                  value={form.loadingDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, loadingDate: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="trips.form.loading_date_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="challanNo" className="text-xs">
                  Challan No *
                </Label>
                <Input
                  id="challanNo"
                  placeholder="CHN-001"
                  value={form.challanNo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, challanNo: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="trips.form.challan_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Truck No *</Label>
                <Select
                  value={form.truckId}
                  onValueChange={(v) => setForm((p) => ({ ...p, truckId: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="trips.form.truck_select"
                  >
                    <SelectValue placeholder="Select truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((t) => (
                      <SelectItem
                        key={t.id.toString()}
                        value={t.id.toString()}
                        className="text-xs"
                      >
                        {t.truckNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Client *</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="trips.form.client_select"
                  >
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem
                        key={c.id.toString()}
                        value={c.id.toString()}
                        className="text-xs"
                      >
                        {c.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpNo" className="text-xs">
                  TP No
                </Label>
                <Input
                  id="tpNo"
                  placeholder="TP-001"
                  value={form.tpNo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tpNo: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doNo" className="text-xs">
                  DO No
                </Label>
                <Input
                  id="doNo"
                  placeholder="DO-001"
                  value={form.doNo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, doNo: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consigner" className="text-xs">
                  Consigner *
                </Label>
                <Input
                  id="consigner"
                  placeholder="Consigner name"
                  value={form.consigner}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, consigner: e.target.value }))
                  }
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consignee" className="text-xs">
                  Consignee *
                </Label>
                <Input
                  id="consignee"
                  placeholder="Consignee name"
                  value={form.consignee}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, consignee: e.target.value }))
                  }
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loadingQty" className="text-xs">
                  Loading Qty (MT) *
                </Label>
                <Input
                  id="loadingQty"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.loadingQty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, loadingQty: e.target.value }))
                  }
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unloadingQty" className="text-xs">
                  Unloading Qty (MT) *
                </Label>
                <Input
                  id="unloadingQty"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.unloadingQty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, unloadingQty: e.target.value }))
                  }
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Associate Type</Label>
                <Select
                  value={form.associateType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, associateType: v }))
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="associate" className="text-xs">
                      Associate
                    </SelectItem>
                    <SelectItem value="non-associate" className="text-xs">
                      Non-Associate
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shortage (Auto-calculated)</Label>
                <div
                  className="flex h-9 items-center rounded-md border border-border bg-muted px-3 text-xs font-medium"
                  style={{
                    color:
                      shortage > 0
                        ? "oklch(0.45 0.2 27)"
                        : "oklch(0.4 0.16 150)",
                  }}
                >
                  {shortage.toFixed(2)} MT
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="trips.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.truckId || !form.clientId}
                data-ocid="trips.form.submit_button"
                className="text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingTrip ? (
                  "Update Trip"
                ) : (
                  "Create Trip"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm" data-ocid="trips.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Trip</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete trip{" "}
            <strong>{deleteConfirm?.tripId}</strong>? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="trips.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTrip.isPending}
              data-ocid="trips.delete_confirm_button"
              className="text-xs"
            >
              {deleteTrip.isPending ? (
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
