import { Badge } from "@/components/ui/badge";
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
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  IndianRupee,
  Info,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type BillingInvoice,
  type BillingLineItem,
  useCreateBillingInvoice,
  useDeleteBillingInvoice,
  useGetAllBillingInvoices,
  useGetAllConsignees,
  useGetAllConsigners,
  useGetAllLoadingTrips,
  useGetAllUnloadings,
  useGetAllVehicles,
  useUpdateBillingInvoice,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

interface InvoiceFormData {
  selectedUnloadingIds: string[];
  invoiceNumber: string;
  invoiceDate: string;
  gstRate: string;
  status: string;
  clientName: string;
  consignerName: string;
}

const defaultForm: InvoiceFormData = {
  selectedUnloadingIds: [],
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  gstRate: "18",
  status: "Pending",
  clientName: "",
  consignerName: "",
};

function getStatusVariant(status: string): {
  className: string;
  icon: React.ReactNode;
  label: string;
} {
  switch (status.toLowerCase()) {
    case "received":
      return {
        className: "status-paid",
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: "Received",
      };
    case "submitted":
      return {
        className: "status-sent",
        icon: <Clock className="h-3 w-3" />,
        label: "Submitted",
      };
    default:
      return {
        className: "status-partial",
        icon: <AlertTriangle className="h-3 w-3" />,
        label: "Pending",
      };
  }
}

function amountInWords(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const convert = (n: number): string => {
    if (n < 20) return ones[n] ?? "";
    if (n < 100)
      return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
    if (n < 1000)
      return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${convert(n % 100)}` : ""}`;
    if (n < 100000)
      return `${convert(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${convert(n % 1000)}` : ""}`;
    if (n < 10000000)
      return `${convert(Math.floor(n / 100000))} Lakh${n % 100000 ? ` ${convert(n % 100000)}` : ""}`;
    return `${convert(Math.floor(n / 10000000))} Crore${n % 10000000 ? ` ${convert(n % 10000000)}` : ""}`;
  };
  const rounded = Math.round(amount);
  return `${convert(rounded) || "Zero"} Rupees Only`;
}

export default function BillingPage() {
  const invoicesQuery = useGetAllBillingInvoices();
  const unloadingsQuery = useGetAllUnloadings();
  const tripsQuery = useGetAllLoadingTrips();
  const vehiclesQuery = useGetAllVehicles();
  const consignersQuery = useGetAllConsigners();
  const consigneesQuery = useGetAllConsignees();
  const createInvoice = useCreateBillingInvoice();
  const updateInvoice = useUpdateBillingInvoice();
  const deleteInvoice = useDeleteBillingInvoice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BillingInvoice | null>(null);
  const [form, setForm] = useState<InvoiceFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<BillingInvoice | null>(
    null,
  );
  const [printItem, setPrintItem] = useState<BillingInvoice | null>(null);

  // Trip selection filters (inside dialog)
  const [tripFilterConsigner, setTripFilterConsigner] = useState("All");
  const [tripFilterConsignee, setTripFilterConsignee] = useState("All");
  const [tripFilterVehicle, setTripFilterVehicle] = useState("All");

  // Invoice list filter states
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterConsigner, setFilterConsigner] = useState("All");
  const [filterClient, setFilterClient] = useState("All");
  const [filterVehicle, setFilterVehicle] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const invoices = invoicesQuery.data ?? [];
  const unloadings = unloadingsQuery.data ?? [];
  const trips = tripsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const consigners = consignersQuery.data ?? [];
  const consignees = consigneesQuery.data ?? [];

  // All unloading IDs already invoiced (across all invoices)
  const invoicedUnloadingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const inv of invoices) {
      if (inv.unloadingIds?.length) {
        for (const uid of inv.unloadingIds) ids.add(uid.toString());
      } else if (inv.unloadingId) {
        ids.add(inv.unloadingId.toString());
      }
    }
    return ids;
  }, [invoices]);

  // Unloadings not yet invoiced (excluding those in current edit)
  const pendingUnloadings = useMemo(() => {
    const editIds = editingItem
      ? new Set(
          (editingItem.unloadingIds?.length
            ? editingItem.unloadingIds
            : [editingItem.unloadingId]
          ).map((x) => x.toString()),
        )
      : new Set<string>();
    return unloadings.filter(
      (u) =>
        !invoicedUnloadingIds.has(u.id.toString()) ||
        editIds.has(u.id.toString()),
    );
  }, [unloadings, invoicedUnloadingIds, editingItem]);

  // Helper: resolve lookup data for a single unloading record
  const resolveUnloadingData = (unloadingId: string) => {
    const ul = unloadings.find(
      (u) =>
        u.id.toString() === unloadingId || Number(u.id) === Number(unloadingId),
    );
    if (!ul) return null;
    const trip = trips.find(
      (t) =>
        t.id === ul.loadingTripId || Number(t.id) === Number(ul.loadingTripId),
    );
    const vehicle = trip
      ? vehicles.find(
          (v) =>
            v.id === trip.vehicleId || Number(v.id) === Number(trip.vehicleId),
        )
      : null;
    const consigner = trip
      ? consigners.find(
          (c) =>
            c.id === trip.consignerId ||
            Number(c.id) === Number(trip.consignerId),
        )
      : null;
    const consignee = trip
      ? consignees.find(
          (c) =>
            c.id === trip.consigneeId ||
            Number(c.id) === Number(trip.consigneeId),
        )
      : null;
    return { ul, trip, vehicle, consigner, consignee };
  };

  // Build per-trip line items from selected IDs (inline to satisfy exhaustive-deps)
  const selectedLineItems = useMemo((): BillingLineItem[] => {
    return form.selectedUnloadingIds.flatMap((uid) => {
      const ul = unloadings.find(
        (u) => u.id.toString() === uid || Number(u.id) === Number(uid),
      );
      if (!ul) return [];
      const trip = trips.find(
        (t) =>
          t.id === ul.loadingTripId ||
          Number(t.id) === Number(ul.loadingTripId),
      );
      const vehicle = trip
        ? vehicles.find(
            (v) =>
              v.id === trip.vehicleId ||
              Number(v.id) === Number(trip.vehicleId),
          )
        : null;
      const consigner = trip
        ? consigners.find(
            (c) =>
              c.id === trip.consignerId ||
              Number(c.id) === Number(trip.consignerId),
          )
        : null;
      const qty = Number(ul.unloadingQty) || 0;
      const rate = Number(ul.billingRate) || 0;
      return [
        {
          tripId: trip?.tripId ?? uid,
          vehicleNo: vehicle?.vehicleNumber ?? "—",
          consignerName: consigner?.name ?? "—",
          unloadingQty: qty,
          billingRate: rate,
          amount: qty * rate,
        },
      ];
    });
  }, [form.selectedUnloadingIds, unloadings, trips, vehicles, consigners]);

  const computedTotals = useMemo(() => {
    const subtotal = selectedLineItems.reduce((s, li) => s + li.amount, 0);
    const gstRate = Number(form.gstRate) || 0;
    const gstAmount = subtotal * (gstRate / 100);
    const totalAmount = subtotal + gstAmount;
    return { subtotal, gstAmount, totalAmount };
  }, [selectedLineItems, form.gstRate]);

  // Rate trace: collect rates per DO linked to selected trips for display in Step 2
  const rateTraceInfo = useMemo(() => {
    if (form.selectedUnloadingIds.length === 0) return null;
    // Collect unique DO numbers from selected trips
    const doNumbers = new Set<string>();
    let singleBillingRate: number | null = null;
    let ratesVary = false;
    for (const uid of form.selectedUnloadingIds) {
      const ul = unloadings.find(
        (u) => u.id.toString() === uid || Number(u.id) === Number(uid),
      );
      if (!ul) continue;
      const trip = trips.find(
        (t) =>
          t.id === ul.loadingTripId ||
          Number(t.id) === Number(ul.loadingTripId),
      );
      if (trip?.doId && trip.doId !== 0n) {
        doNumbers.add(trip.doId.toString());
      }
      const bRate = Number(ul.billingRate) || 0;
      if (singleBillingRate === null) singleBillingRate = bRate;
      else if (singleBillingRate !== bRate) ratesVary = true;
    }
    const multipleDOs = doNumbers.size > 1;
    return {
      multipleDOs,
      ratesVary,
      billingRate: ratesVary ? null : singleBillingRate,
      gstRate: Number(form.gstRate) || 0,
      doCount: doNumbers.size,
    };
  }, [form.selectedUnloadingIds, form.gstRate, unloadings, trips]);

  const summaryCards = useMemo(() => {
    const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalReceived = invoices
      .filter((i) => i.status === "Received")
      .reduce((s, i) => s + i.totalAmount, 0);
    const totalOutstanding = totalBilled - totalReceived;
    const thisMonthCount = invoices.filter((i) =>
      i.invoiceDate.startsWith(new Date().toISOString().slice(0, 7)),
    ).length;
    return { totalBilled, totalReceived, totalOutstanding, thisMonthCount };
  }, [invoices]);

  // Unique filter options for invoice list
  const uniqueConsigners = useMemo(
    () => [...new Set(invoices.map((i) => i.consignerName).filter(Boolean))],
    [invoices],
  );
  const uniqueClients = useMemo(
    () => [...new Set(invoices.map((i) => i.clientName).filter(Boolean))],
    [invoices],
  );
  const uniqueVehicles = useMemo(
    () => [...new Set(invoices.map((i) => i.vehicleNo).filter(Boolean))],
    [invoices],
  );

  // Unique trip-filter options (for dialog)
  const dialogConsignerOptions = useMemo(
    () => [...new Set(consigners.map((c) => c.name).filter(Boolean))],
    [consigners],
  );
  const dialogConsigneeOptions = useMemo(
    () => [...new Set(consignees.map((c) => c.name).filter(Boolean))],
    [consignees],
  );
  const dialogVehicleOptions = useMemo(
    () => [...new Set(vehicles.map((v) => v.vehicleNumber).filter(Boolean))],
    [vehicles],
  );

  // Pending unloadings visible in dialog (respecting trip filters)
  const filteredPendingUnloadings = useMemo(() => {
    return pendingUnloadings.filter((u) => {
      const trip = trips.find(
        (t) =>
          t.id === u.loadingTripId || Number(t.id) === Number(u.loadingTripId),
      );
      if (!trip)
        return (
          tripFilterConsigner === "All" &&
          tripFilterConsignee === "All" &&
          tripFilterVehicle === "All"
        );
      if (tripFilterConsigner !== "All") {
        const c = consigners.find(
          (cs) =>
            cs.id === trip.consignerId ||
            Number(cs.id) === Number(trip.consignerId),
        );
        if (!c || c.name !== tripFilterConsigner) return false;
      }
      if (tripFilterConsignee !== "All") {
        const cn = consignees.find(
          (cs) =>
            cs.id === trip.consigneeId ||
            Number(cs.id) === Number(trip.consigneeId),
        );
        if (!cn || cn.name !== tripFilterConsignee) return false;
      }
      if (tripFilterVehicle !== "All") {
        const v = vehicles.find(
          (vv) =>
            vv.id === trip.vehicleId ||
            Number(vv.id) === Number(trip.vehicleId),
        );
        if (!v || v.vehicleNumber !== tripFilterVehicle) return false;
      }
      return true;
    });
  }, [
    pendingUnloadings,
    trips,
    consigners,
    consignees,
    vehicles,
    tripFilterConsigner,
    tripFilterConsignee,
    tripFilterVehicle,
  ]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== "All" && inv.status !== filterStatus) return false;
      if (
        searchQuery &&
        !inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !inv.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (filterConsigner !== "All" && inv.consignerName !== filterConsigner)
        return false;
      if (filterClient !== "All" && inv.clientName !== filterClient)
        return false;
      if (filterVehicle !== "All" && inv.vehicleNo !== filterVehicle)
        return false;
      if (filterDateFrom && inv.invoiceDate < filterDateFrom) return false;
      if (filterDateTo && inv.invoiceDate > filterDateTo) return false;
      return true;
    });
  }, [
    invoices,
    filterStatus,
    searchQuery,
    filterConsigner,
    filterClient,
    filterVehicle,
    filterDateFrom,
    filterDateTo,
  ]);

  const hasActiveFilters =
    filterConsigner !== "All" ||
    filterClient !== "All" ||
    filterVehicle !== "All" ||
    filterDateFrom !== "" ||
    filterDateTo !== "";

  const nextInvoiceNumber = () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthCount = invoices.filter(
      (inv) =>
        inv.invoiceDate?.startsWith(
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        ) || inv.invoiceNumber?.includes(`/${ym}/`),
    ).length;
    return `INV/${ym}/${String(thisMonthCount + 1).padStart(3, "0")}`;
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({ ...defaultForm, invoiceNumber: nextInvoiceNumber() });
    setTripFilterConsigner("All");
    setTripFilterConsignee("All");
    setTripFilterVehicle("All");
    setDialogOpen(true);
  };

  const openEditDialog = (item: BillingInvoice) => {
    setEditingItem(item);
    const existingIds = (
      item.unloadingIds?.length ? item.unloadingIds : [item.unloadingId]
    ).map((x) => x.toString());
    const gstPct =
      item.subtotal > 0
        ? ((item.gstAmount / item.subtotal) * 100).toFixed(0)
        : "18";

    // Derive clientName/consignerName from existing data
    const firstResolved = existingIds.length
      ? resolveUnloadingData(existingIds[0])
      : null;
    const uniqueClients_ = [
      ...new Set(
        existingIds.flatMap((uid) => {
          const r = resolveUnloadingData(uid);
          return r?.consignee?.name ? [r.consignee.name] : [];
        }),
      ),
    ];
    const uniqueOcps = [
      ...new Set(
        existingIds.flatMap((uid) => {
          const r = resolveUnloadingData(uid);
          return r?.consigner?.name ? [r.consigner.name] : [];
        }),
      ),
    ];

    setForm({
      selectedUnloadingIds: existingIds,
      invoiceNumber: item.invoiceNumber,
      invoiceDate: item.invoiceDate,
      gstRate: gstPct,
      status: item.status,
      clientName:
        uniqueClients_.length === 1
          ? uniqueClients_[0]
          : uniqueClients_.length > 1
            ? "Multiple"
            : (firstResolved?.consignee?.name ?? item.clientName),
      consignerName:
        uniqueOcps.length === 1
          ? uniqueOcps[0]
          : uniqueOcps.length > 1
            ? "Multiple"
            : (firstResolved?.consigner?.name ?? item.consignerName),
    });
    setTripFilterConsigner("All");
    setTripFilterConsignee("All");
    setTripFilterVehicle("All");
    setDialogOpen(true);
  };

  const toggleUnloadingSelection = (uid: string) => {
    setForm((prev) => {
      const already = prev.selectedUnloadingIds.includes(uid);
      const next = already
        ? prev.selectedUnloadingIds.filter((x) => x !== uid)
        : [...prev.selectedUnloadingIds, uid];

      // Re-derive clientName and consignerName from selections
      const clients = [
        ...new Set(
          next.flatMap((id) => {
            const r = resolveUnloadingData(id);
            return r?.consignee?.name ? [r.consignee.name] : [];
          }),
        ),
      ];
      const ocps = [
        ...new Set(
          next.flatMap((id) => {
            const r = resolveUnloadingData(id);
            return r?.consigner?.name ? [r.consigner.name] : [];
          }),
        ),
      ];
      return {
        ...prev,
        selectedUnloadingIds: next,
        clientName:
          clients.length === 1
            ? clients[0]
            : clients.length > 1
              ? "Multiple"
              : "",
        consignerName:
          ocps.length === 1 ? ocps[0] : ocps.length > 1 ? "Multiple" : "",
      };
    });
  };

  const toggleSelectAll = () => {
    if (
      filteredPendingUnloadings.every((u) =>
        form.selectedUnloadingIds.includes(u.id.toString()),
      )
    ) {
      // Deselect all visible
      const visibleIds = new Set(
        filteredPendingUnloadings.map((u) => u.id.toString()),
      );
      setForm((prev) => ({
        ...prev,
        selectedUnloadingIds: prev.selectedUnloadingIds.filter(
          (id) => !visibleIds.has(id),
        ),
      }));
    } else {
      // Select all visible (add them)
      const toAdd = filteredPendingUnloadings
        .map((u) => u.id.toString())
        .filter((id) => !form.selectedUnloadingIds.includes(id));
      setForm((prev) => ({
        ...prev,
        selectedUnloadingIds: [...prev.selectedUnloadingIds, ...toAdd],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.selectedUnloadingIds.length === 0 || !form.invoiceNumber) {
      toast.error("Please select at least one trip and enter invoice number");
      return;
    }

    const lineItems = selectedLineItems;
    const totalUnloadingQty = lineItems.reduce(
      (s, li) => s + li.unloadingQty,
      0,
    );
    const firstResolved = resolveUnloadingData(form.selectedUnloadingIds[0]);

    // Build unloadingIds + tripIds bigint arrays
    const unloadingIds = form.selectedUnloadingIds.map((uid) => BigInt(uid));
    const tripIds = form.selectedUnloadingIds.flatMap((uid) => {
      const r = resolveUnloadingData(uid);
      return r?.trip ? [r.trip.id] : [];
    });

    // Unique vehicle display
    const uniqueVehicleNos = [...new Set(lineItems.map((li) => li.vehicleNo))];
    const vehicleNoDisplay =
      uniqueVehicleNos.length === 1
        ? uniqueVehicleNos[0]
        : `${form.selectedUnloadingIds.length} Trips`;

    const data: Omit<BillingInvoice, "id"> = {
      invoiceNumber: form.invoiceNumber,
      unloadingIds,
      tripIds,
      unloadingId: unloadingIds[0] ?? 0n,
      tripId: tripIds[0] ?? 0n,
      clientName: form.clientName,
      vehicleNo: vehicleNoDisplay,
      consignerName: form.consignerName,
      unloadingQty: totalUnloadingQty,
      billingRate: firstResolved?.ul
        ? Number(firstResolved.ul.billingRate) || 0
        : 0,
      subtotal: computedTotals.subtotal,
      gstAmount: computedTotals.gstAmount,
      totalAmount: computedTotals.totalAmount,
      status: form.status,
      invoiceDate: form.invoiceDate,
      lineItems,
    };
    try {
      if (editingItem) {
        await updateInvoice.mutateAsync({ id: editingItem.id, ...data });
        toast.success("Invoice updated successfully");
      } else {
        await createInvoice.mutateAsync(data);
        toast.success("Invoice created successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save invoice.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteInvoice.mutateAsync(deleteConfirm.id);
      toast.success("Invoice deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete invoice.");
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Tax Invoice - Jeen Trade & Exports Pvt Ltd</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      padding: 0;
    }
    .invoice-wrap {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm 14mm;
      position: relative;
    }
    .company-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 3px solid #1a3a5c;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .company-logo-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 64px;
      height: 64px;
      background: #ffffff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #dde3ea;
      overflow: hidden;
      padding: 2px;
    }
    .logo-box img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .company-name h1 {
      font-size: 17px;
      font-weight: 800;
      color: #1a3a5c;
      letter-spacing: 0.3px;
      line-height: 1.1;
    }
    .company-name p {
      font-size: 9.5px;
      color: #555;
      margin-top: 2px;
    }
    .company-name .gstin {
      font-size: 8.5px;
      color: #888;
      margin-top: 1px;
    }
    .invoice-badge { text-align: right; }
    .invoice-badge .tax-label {
      background: #1a3a5c;
      color: #d4a017;
      font-size: 13px;
      font-weight: 800;
      padding: 5px 16px;
      letter-spacing: 2px;
      border-radius: 2px;
    }
    .invoice-badge .inv-number {
      font-size: 12px;
      font-weight: 700;
      color: #1a3a5c;
      margin-top: 5px;
    }
    .invoice-badge .inv-date {
      font-size: 10px;
      color: #555;
      margin-top: 2px;
    }
    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 14px 0;
      padding: 12px;
      background: #f7f9fc;
      border: 1px solid #dde3ea;
      border-radius: 4px;
    }
    .info-block h3 {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 5px;
      padding-bottom: 3px;
      border-bottom: 1px solid #e0e4ea;
    }
    .info-block p { font-size: 10.5px; color: #222; line-height: 1.6; }
    .info-block .highlight { font-weight: 700; font-size: 12px; color: #1a3a5c; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    .items-table thead tr { background: #1a3a5c; color: #fff; }
    .items-table thead th {
      padding: 8px 10px;
      text-align: left;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .items-table thead th.right { text-align: right; }
    .items-table tbody tr { border-bottom: 1px solid #eee; }
    .items-table tbody tr:nth-child(even) { background: #f9fafb; }
    .items-table tbody td {
      padding: 9px 10px;
      font-size: 10.5px;
      color: #222;
      vertical-align: top;
    }
    .items-table tbody td.right { text-align: right; }
    .items-table tfoot tr { background: #e8edf4; }
    .items-table tfoot td {
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 700;
      color: #1a3a5c;
    }
    .items-table tfoot td.right { text-align: right; }
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin: 8px 0 12px;
    }
    .totals-box { width: 260px; }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      font-size: 10.5px;
      border-bottom: 1px solid #eee;
    }
    .total-row.grand {
      background: #1a3a5c;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 10px;
      border-radius: 2px;
      margin-top: 4px;
    }
    .total-row.grand span:last-child { color: #d4a017; }
    .amount-words {
      background: #fffbf0;
      border: 1px solid #f0d060;
      border-radius: 4px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 10.5px;
      font-style: italic;
      color: #664d00;
    }
    .amount-words strong {
      font-style: normal;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #999;
      display: block;
      margin-bottom: 3px;
    }
    .invoice-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 2px solid #1a3a5c;
    }
    .bank-details h3 {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 6px;
    }
    .bank-details p { font-size: 10px; color: #333; line-height: 1.7; }
    .signatory { text-align: center; }
    .signatory .sign-box {
      border: 1px dashed #bbb;
      height: 55px;
      border-radius: 4px;
      margin-bottom: 6px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
      font-size: 9px;
      color: #bbb;
    }
    .signatory p { font-size: 9.5px; color: #555; font-weight: 600; }
    .signatory .company-sign { font-size: 10px; font-weight: 700; color: #1a3a5c; }
    .thank-you {
      text-align: center;
      margin-top: 16px;
      padding: 8px;
      border-top: 1px solid #eee;
      font-size: 10px;
      color: #888;
      font-style: italic;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .invoice-wrap { padding: 10mm 12mm; }
    }
  </style>
</head>
<body>
  ${printContents}
</body>
</html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const isSaving = createInvoice.isPending || updateInvoice.isPending;

  const clearAllFilters = () => {
    setFilterConsigner("All");
    setFilterClient("All");
    setFilterVehicle("All");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  // Summary bar for selected trips in dialog
  const selectionSummary = useMemo(() => {
    const count = form.selectedUnloadingIds.length;
    const totalQty = selectedLineItems.reduce(
      (s, li) => s + li.unloadingQty,
      0,
    );
    const subtotal = selectedLineItems.reduce((s, li) => s + li.amount, 0);
    return { count, totalQty, subtotal };
  }, [form.selectedUnloadingIds, selectedLineItems]);

  // All visible rows selected?
  const allVisibleSelected =
    filteredPendingUnloadings.length > 0 &&
    filteredPendingUnloadings.every((u) =>
      form.selectedUnloadingIds.includes(u.id.toString()),
    );

  return (
    <div className="p-6 space-y-5" data-ocid="billing.page">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
            style={{ background: "oklch(0.55 0.18 240 / 0.12)" }}
          >
            <Receipt
              className="h-5 w-5"
              style={{ color: "oklch(0.55 0.18 240)" }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground leading-tight">
              Billing &amp; Invoicing
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage client invoices for Jeen Trade &amp; Exports
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2 h-10 px-5 font-semibold shadow-sm"
          data-ocid="billing.add_button"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Summary Strip — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border overflow-hidden relative">
          <div
            className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
            style={{ background: "oklch(0.55 0.18 240)" }}
          />
          <CardContent className="p-4 pl-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Total Invoiced
                </p>
                <p className="text-xl font-bold font-display mt-1 tabular-nums">
                  {formatCurrency(summaryCards.totalBilled)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invoices.length} invoices total
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.55 0.18 240 / 0.1)" }}
              >
                <TrendingUp
                  className="h-4 w-4"
                  style={{ color: "oklch(0.55 0.18 240)" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border overflow-hidden relative">
          <div
            className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
            style={{ background: "oklch(0.65 0.16 150)" }}
          />
          <CardContent className="p-4 pl-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Amount Received
                </p>
                <p
                  className="text-xl font-bold font-display mt-1 tabular-nums"
                  style={{ color: "oklch(0.4 0.16 150)" }}
                >
                  {formatCurrency(summaryCards.totalReceived)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invoices.filter((i) => i.status === "Received").length} paid
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.65 0.16 150 / 0.1)" }}
              >
                <CheckCircle2
                  className="h-4 w-4"
                  style={{ color: "oklch(0.65 0.16 150)" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border overflow-hidden relative">
          <div
            className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
            style={{ background: "oklch(0.72 0.18 60)" }}
          />
          <CardContent className="p-4 pl-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Outstanding
                </p>
                <p
                  className="text-xl font-bold font-display mt-1 tabular-nums"
                  style={{ color: "oklch(0.45 0.16 60)" }}
                >
                  {formatCurrency(summaryCards.totalOutstanding)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {invoices.filter((i) => i.status !== "Received").length}{" "}
                  outstanding
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.72 0.18 60 / 0.1)" }}
              >
                <IndianRupee
                  className="h-4 w-4"
                  style={{ color: "oklch(0.72 0.18 60)" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border overflow-hidden relative">
          <div
            className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
            style={{ background: "oklch(0.65 0.2 300)" }}
          />
          <CardContent className="p-4 pl-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  This Month
                </p>
                <p className="text-xl font-bold font-display mt-1 tabular-nums">
                  {summaryCards.thisMonthCount}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  invoices created
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.65 0.2 300 / 0.1)" }}
              >
                <FileText
                  className="h-4 w-4"
                  style={{ color: "oklch(0.65 0.2 300)" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice, client, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-ocid="billing.search_input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Tabs value={filterStatus} onValueChange={setFilterStatus}>
            <TabsList className="h-9">
              <TabsTrigger
                value="All"
                className="text-xs px-3"
                data-ocid="billing.status.tab"
              >
                All
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-xs px-1.5 py-0 h-4"
                >
                  {invoices.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="Pending"
                className="text-xs px-3"
                data-ocid="billing.status.tab"
              >
                Pending
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-xs px-1.5 py-0 h-4"
                >
                  {invoices.filter((i) => i.status === "Pending").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="Submitted"
                className="text-xs px-3"
                data-ocid="billing.status.tab"
              >
                Submitted
              </TabsTrigger>
              <TabsTrigger
                value="Received"
                className="text-xs px-3"
                data-ocid="billing.status.tab"
              >
                Received
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="h-9 gap-2 text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <Badge className="ml-1 text-xs px-1.5 py-0 h-4 bg-primary-foreground text-primary">
                {[filterConsigner, filterClient, filterVehicle].filter(
                  (f) => f !== "All",
                ).length +
                  (filterDateFrom ? 1 : 0) +
                  (filterDateTo ? 1 : 0)}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-lg border border-border bg-muted/20">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                OCP / Consigner
              </Label>
              <Select
                value={filterConsigner}
                onValueChange={setFilterConsigner}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-ocid="billing.consigner.select"
                >
                  <SelectValue placeholder="All OCPs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" className="text-xs">
                    All OCPs
                  </SelectItem>
                  {uniqueConsigners.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger
                  className="h-8 text-xs"
                  data-ocid="billing.client.select"
                >
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" className="text-xs">
                    All Clients
                  </SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Vehicle No
              </Label>
              <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                <SelectTrigger
                  className="h-8 text-xs"
                  data-ocid="billing.vehicle.select"
                >
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" className="text-xs">
                    All Vehicles
                  </SelectItem>
                  {uniqueVehicles.map((v) => (
                    <SelectItem key={v} value={v} className="text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date From</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-8 text-xs"
                data-ocid="billing.date_from.input"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date To</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-8 text-xs"
                data-ocid="billing.date_to.input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {filteredInvoices.length === invoices.length
                ? `All Invoices (${invoices.length})`
                : `Filtered: ${filteredInvoices.length} of ${invoices.length}`}
            </span>
          </div>
        </div>

        {invoicesQuery.isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center"
            data-ocid="billing.empty_state"
          >
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(0.55 0.18 240 / 0.08)" }}
            >
              <Receipt
                className="h-7 w-7"
                style={{ color: "oklch(0.55 0.18 240 / 0.5)" }}
              />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No invoices found
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {hasActiveFilters || searchQuery
                ? "Try adjusting your filters or search query"
                : "Create your first invoice from unloading records"}
            </p>
            {!hasActiveFilters && !searchQuery && (
              <Button
                size="sm"
                className="mt-4 gap-2 text-xs"
                onClick={openCreateDialog}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="billing.table">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide py-3 pl-4">
                    Invoice #
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide">
                    Client
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide">
                    OCP
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide">
                    Trips
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide text-right">
                    Qty (MT)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide text-right">
                    Subtotal
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide text-right">
                    GST
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide text-right">
                    Total Amt
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold text-foreground/70 uppercase tracking-wide text-right pr-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((item, index) => {
                  const sv = getStatusVariant(item.status);
                  const tripCount =
                    item.unloadingIds?.length || (item.unloadingId ? 1 : 0);
                  return (
                    <TableRow
                      key={item.id.toString()}
                      className="table-row-hover border-b border-border/50 last:border-0"
                      data-ocid={`billing.item.${index + 1}`}
                    >
                      <TableCell className="py-3 pl-4">
                        <span
                          className="font-mono font-bold text-xs"
                          style={{ color: "oklch(0.4 0.18 240)" }}
                        >
                          {item.invoiceNumber}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.invoiceDate)}
                      </TableCell>
                      <TableCell className="max-w-[130px]">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {item.clientName || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
                        {item.consignerName || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-mono">
                            {tripCount > 1 ? (
                              <Badge
                                variant="secondary"
                                className="text-xs px-1.5 py-0 h-5 font-medium"
                              >
                                {tripCount} Trips
                              </Badge>
                            ) : (
                              item.vehicleNo || "—"
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {item.unloadingQty.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                        {formatCurrency(item.gstAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-bold tabular-nums">
                          {formatCurrency(item.totalAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${sv.className}`}
                        >
                          {sv.icon}
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPrintItem(item);
                              setTimeout(handlePrint, 100);
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Print Invoice"
                            data-ocid={`billing.print_button.${index + 1}`}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit Invoice"
                            data-ocid={`billing.edit_button.${index + 1}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(item)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Invoice"
                            data-ocid={`billing.delete_button.${index + 1}`}
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

      {/* Hidden Print Template */}
      <div className="hidden">
        <div ref={printRef}>
          {printItem &&
            (() => {
              const gstPct =
                printItem.subtotal > 0
                  ? ((printItem.gstAmount / printItem.subtotal) * 100).toFixed(
                      0,
                    )
                  : "18";
              // Use lineItems if available, otherwise fall back to single row
              const lines: BillingLineItem[] =
                printItem.lineItems && printItem.lineItems.length > 0
                  ? printItem.lineItems
                  : [
                      {
                        tripId: printItem.tripId?.toString() ?? "—",
                        vehicleNo: printItem.vehicleNo,
                        consignerName: printItem.consignerName,
                        unloadingQty: printItem.unloadingQty,
                        billingRate: printItem.billingRate,
                        amount: printItem.subtotal,
                      },
                    ];
              return (
                <div className="invoice-wrap">
                  {/* Company Header */}
                  <div className="company-header">
                    <div className="company-logo-block">
                      <div className="logo-box">
                        <img
                          src="/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png"
                          alt="JTPL Logo"
                        />
                      </div>
                      <div className="company-name">
                        <h1>JEEN TRADE &amp; EXPORTS PVT LTD</h1>
                        <p>
                          Transport &amp; Logistics | Coal, Iron Ore &amp; Fly
                          Ash Movement
                        </p>
                        <p className="gstin">
                          GSTIN: XXXXXXXXXXXX &nbsp;|&nbsp; PAN: XXXXXXXX
                          &nbsp;|&nbsp; CIN: UXXXXXXX
                        </p>
                        <p className="gstin">
                          Address: Village / Town, District, State - PIN
                          &nbsp;|&nbsp; Phone: +91 XXXXX XXXXX
                        </p>
                      </div>
                    </div>
                    <div className="invoice-badge">
                      <div className="tax-label">TAX INVOICE</div>
                      <div className="inv-number">
                        #{printItem.invoiceNumber}
                      </div>
                      <div className="inv-date">
                        Date: {formatDate(printItem.invoiceDate)}
                      </div>
                    </div>
                  </div>

                  {/* Bill To / Invoice Info */}
                  <div className="info-row">
                    <div className="info-block">
                      <h3>Invoice Details</h3>
                      <p>
                        <strong>Invoice No:</strong> {printItem.invoiceNumber}
                      </p>
                      <p>
                        <strong>Invoice Date:</strong>{" "}
                        {formatDate(printItem.invoiceDate)}
                      </p>
                      <p>
                        <strong>Status:</strong> {printItem.status}
                      </p>
                      <p>
                        <strong>Total Trips:</strong> {lines.length}
                      </p>
                    </div>
                    <div className="info-block">
                      <h3>Bill To</h3>
                      <p className="highlight">{printItem.clientName}</p>
                      <p>Client / Consignee</p>
                    </div>
                  </div>

                  {/* Items Table — one row per trip */}
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: "12%" }}>Trip ID</th>
                        <th style={{ width: "14%" }}>Vehicle</th>
                        <th style={{ width: "20%" }}>OCP / Consigner</th>
                        <th className="right" style={{ width: "13%" }}>
                          Qty (MT)
                        </th>
                        <th className="right" style={{ width: "13%" }}>
                          Rate (₹/MT)
                        </th>
                        <th className="right" style={{ width: "14%" }}>
                          Amount (₹)
                        </th>
                        <th className="right" style={{ width: "7%" }}>
                          GST%
                        </th>
                        <th className="right" style={{ width: "7%" }}>
                          GST (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((li) => {
                        const lineGst = li.amount * (Number(gstPct) / 100);
                        return (
                          <tr key={`${li.tripId}-${li.vehicleNo}`}>
                            <td style={{ fontFamily: "monospace" }}>
                              {li.tripId}
                            </td>
                            <td style={{ fontFamily: "monospace" }}>
                              {li.vehicleNo}
                            </td>
                            <td>{li.consignerName}</td>
                            <td className="right">
                              {li.unloadingQty.toFixed(3)}
                            </td>
                            <td className="right">
                              {li.billingRate.toLocaleString("en-IN")}
                            </td>
                            <td className="right">
                              {li.amount.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="right">{gstPct}%</td>
                            <td className="right">
                              {lineGst.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {lines.length > 1 && (
                      <tfoot>
                        <tr>
                          <td colSpan={3}>
                            <strong>TOTAL ({lines.length} trips)</strong>
                          </td>
                          <td className="right">
                            {lines
                              .reduce((s, li) => s + li.unloadingQty, 0)
                              .toFixed(3)}
                          </td>
                          <td className="right">—</td>
                          <td className="right">
                            {printItem.subtotal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="right">{gstPct}%</td>
                          <td className="right">
                            {printItem.gstAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {/* Totals */}
                  <div className="totals-section">
                    <div className="totals-box">
                      <div className="total-row">
                        <span>Subtotal</span>
                        <span>
                          ₹
                          {printItem.subtotal.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="total-row">
                        <span>GST @ {gstPct}%</span>
                        <span>
                          ₹
                          {printItem.gstAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="total-row grand">
                        <span>GRAND TOTAL</span>
                        <span>
                          ₹
                          {printItem.totalAmount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="amount-words">
                    <strong>Amount in Words</strong>
                    {amountInWords(printItem.totalAmount)}
                  </div>

                  <div className="invoice-footer">
                    <div className="bank-details">
                      <h3>Bank Details</h3>
                      <p>
                        <strong>Bank Name:</strong> XXXX Bank
                        <br />
                        <strong>Account No:</strong> XXXXXXXXXXXXXXXX
                        <br />
                        <strong>IFSC Code:</strong> XXXX0XXXXXX
                        <br />
                        <strong>Branch:</strong> XXXXX Branch
                        <br />
                        <strong>Account Type:</strong> Current
                      </p>
                    </div>
                    <div className="signatory">
                      <div className="sign-box">Signature</div>
                      <p className="company-sign">
                        Jeen Trade &amp; Exports Pvt Ltd
                      </p>
                      <p>Authorized Signatory</p>
                    </div>
                  </div>

                  <div className="thank-you">
                    Thank you for your business. For queries, contact us at the
                    above address. &nbsp;|&nbsp; This is a computer-generated
                    invoice.
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-4xl max-h-[95vh] overflow-y-auto"
          data-ocid="billing.dialog"
        >
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.55 0.18 240 / 0.12)" }}
              >
                <Receipt
                  className="h-4 w-4"
                  style={{ color: "oklch(0.55 0.18 240)" }}
                />
              </div>
              <DialogTitle className="font-display text-base">
                {editingItem ? "Edit Invoice" : "Create New Invoice"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* ── Step 1: Multi-Trip Selection ── */}
            <div
              className="rounded-lg border border-border p-3 space-y-3"
              style={{ background: "oklch(0.97 0.005 240)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                  Step 1 — Select Trips to Bill
                </p>
                <span className="text-xs text-muted-foreground">
                  {pendingUnloadings.length} trips available
                </span>
              </div>

              {/* Trip Filters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Filter by OCP
                  </Label>
                  <Select
                    value={tripFilterConsigner}
                    onValueChange={setTripFilterConsigner}
                  >
                    <SelectTrigger
                      className="h-7 text-xs bg-card"
                      data-ocid="billing.trip_consigner.select"
                    >
                      <SelectValue placeholder="All OCPs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All" className="text-xs">
                        All OCPs
                      </SelectItem>
                      {dialogConsignerOptions.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Filter by Client
                  </Label>
                  <Select
                    value={tripFilterConsignee}
                    onValueChange={setTripFilterConsignee}
                  >
                    <SelectTrigger
                      className="h-7 text-xs bg-card"
                      data-ocid="billing.trip_consignee.select"
                    >
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All" className="text-xs">
                        All Clients
                      </SelectItem>
                      {dialogConsigneeOptions.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Filter by Vehicle
                  </Label>
                  <Select
                    value={tripFilterVehicle}
                    onValueChange={setTripFilterVehicle}
                  >
                    <SelectTrigger
                      className="h-7 text-xs bg-card"
                      data-ocid="billing.trip_vehicle.select"
                    >
                      <SelectValue placeholder="All Vehicles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All" className="text-xs">
                        All Vehicles
                      </SelectItem>
                      {dialogVehicleOptions.map((v) => (
                        <SelectItem key={v} value={v} className="text-xs">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trips Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="py-2 pl-3 w-10">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all visible trips"
                            data-ocid="billing.select_all.checkbox"
                          />
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-foreground/60 py-2">
                          Trip ID
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-foreground/60 py-2">
                          Vehicle
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-foreground/60 py-2">
                          OCP
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-foreground/60 py-2">
                          Client
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-foreground/60 py-2 text-right">
                          Qty (MT)
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-foreground/60 py-2 text-right">
                          Rate ₹
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-foreground/60 py-2 text-right pr-3">
                          Amount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPendingUnloadings.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-xs text-muted-foreground"
                          >
                            No pending trips available
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPendingUnloadings.map((u, idx) => {
                          const trip = trips.find(
                            (t) =>
                              t.id === u.loadingTripId ||
                              Number(t.id) === Number(u.loadingTripId),
                          );
                          const vehicle = trip
                            ? vehicles.find(
                                (v) =>
                                  v.id === trip.vehicleId ||
                                  Number(v.id) === Number(trip.vehicleId),
                              )
                            : null;
                          const consigner = trip
                            ? consigners.find(
                                (c) =>
                                  c.id === trip.consignerId ||
                                  Number(c.id) === Number(trip.consignerId),
                              )
                            : null;
                          const consignee = trip
                            ? consignees.find(
                                (c) =>
                                  c.id === trip.consigneeId ||
                                  Number(c.id) === Number(trip.consigneeId),
                              )
                            : null;
                          const qty = Number(u.unloadingQty) || 0;
                          const rate = Number(u.billingRate) || 0;
                          const amount = qty * rate;
                          const isSelected = form.selectedUnloadingIds.includes(
                            u.id.toString(),
                          );
                          return (
                            <TableRow
                              key={u.id.toString()}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/5 border-l-2 border-l-primary"
                                  : "hover:bg-muted/20"
                              }`}
                              onClick={() =>
                                toggleUnloadingSelection(u.id.toString())
                              }
                              data-ocid={`billing.trip_row.${idx + 1}`}
                            >
                              <TableCell className="pl-3 py-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleUnloadingSelection(u.id.toString())
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  data-ocid={`billing.trip_checkbox.${idx + 1}`}
                                />
                              </TableCell>
                              <TableCell className="py-2 font-mono text-xs font-semibold">
                                {trip?.tripId ?? `U-${u.id}`}
                              </TableCell>
                              <TableCell className="py-2 font-mono text-xs">
                                {vehicle?.vehicleNumber ?? "—"}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-muted-foreground max-w-[100px] truncate">
                                {consigner?.name ?? "—"}
                              </TableCell>
                              <TableCell className="py-2 text-xs max-w-[100px] truncate">
                                {consignee?.name ?? "—"}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-right tabular-nums">
                                {qty.toFixed(3)}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-right tabular-nums text-muted-foreground">
                                ₹{rate.toLocaleString("en-IN")}
                              </TableCell>
                              <TableCell className="py-2 text-xs text-right tabular-nums font-semibold pr-3">
                                {formatCurrency(amount)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Selection Summary Bar */}
              {selectionSummary.count > 0 && (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium"
                  style={{
                    background: "oklch(0.55 0.18 240 / 0.1)",
                    borderLeft: "3px solid oklch(0.55 0.18 240)",
                  }}
                  data-ocid="billing.selection_summary.panel"
                >
                  <div className="flex items-center gap-4">
                    <span
                      style={{ color: "oklch(0.35 0.18 240)" }}
                      className="font-semibold"
                    >
                      {selectionSummary.count}{" "}
                      {selectionSummary.count === 1 ? "trip" : "trips"} selected
                    </span>
                    <span className="text-muted-foreground">
                      Total Qty:{" "}
                      <strong className="text-foreground">
                        {selectionSummary.totalQty.toFixed(3)} MT
                      </strong>
                    </span>
                    <span className="text-muted-foreground">
                      Subtotal:{" "}
                      <strong style={{ color: "oklch(0.35 0.18 240)" }}>
                        {formatCurrency(selectionSummary.subtotal)}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        selectedUnloadingIds: [],
                        clientName: "",
                        consignerName: "",
                      }))
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Step 2: Invoice Details ── */}
            <div
              className="rounded-lg border border-border p-3 space-y-3"
              style={{ background: "oklch(0.97 0.005 240)" }}
            >
              <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                Step 2 — Invoice Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-no" className="text-xs font-medium">
                    Invoice Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      id="inv-no"
                      placeholder="INV/2024-03/001"
                      value={form.invoiceNumber}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          invoiceNumber: e.target.value,
                        }))
                      }
                      required
                      className="text-xs font-mono bg-card"
                      data-ocid="billing.invoice_number.input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          invoiceNumber: nextInvoiceNumber(),
                        }))
                      }
                      className="h-9 px-2 text-xs shrink-0"
                      title="Auto-generate invoice number"
                      data-ocid="billing.auto_invoice.button"
                    >
                      Auto
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-date" className="text-xs font-medium">
                    Invoice Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="inv-date"
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, invoiceDate: e.target.value }))
                    }
                    required
                    className="text-xs bg-card"
                    data-ocid="billing.invoice_date.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-gst" className="text-xs font-medium">
                    GST Rate (%)
                  </Label>
                  <Input
                    id="inv-gst"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.gstRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gstRate: e.target.value }))
                    }
                    className="text-xs bg-card"
                    data-ocid="billing.gst_rate.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger
                      className="text-xs bg-card"
                      data-ocid="billing.status.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending" className="text-xs">
                        Pending
                      </SelectItem>
                      <SelectItem value="Submitted" className="text-xs">
                        Submitted
                      </SelectItem>
                      <SelectItem value="Received" className="text-xs">
                        Received
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-filled client/consigner display */}
              {form.selectedUnloadingIds.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Bill To (Client)
                    </Label>
                    <p className="text-xs font-semibold mt-0.5 text-foreground">
                      {form.clientName || "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      OCP / Consigner
                    </Label>
                    <p className="text-xs font-semibold mt-0.5 text-foreground">
                      {form.consignerName || "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Rates Applied info card */}
              {rateTraceInfo && (
                <div
                  className="rounded-md border px-3 py-2.5 space-y-2"
                  style={{
                    background: "oklch(0.97 0.02 240)",
                    borderColor: "oklch(0.75 0.12 240)",
                  }}
                  data-ocid="billing.rates_applied.panel"
                >
                  <div className="flex items-center gap-1.5">
                    <Info
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: "oklch(0.45 0.18 240)" }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: "oklch(0.45 0.18 240)" }}
                    >
                      Rates Applied
                    </span>
                  </div>
                  {rateTraceInfo.multipleDOs || rateTraceInfo.ratesVary ? (
                    <p
                      className="text-xs italic"
                      style={{ color: "oklch(0.5 0.14 240)" }}
                    >
                      Multiple DOs selected — rates vary by trip. Check
                      individual line items in the calculation below.
                    </p>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr
                          className="text-[10px] uppercase tracking-wide"
                          style={{ color: "oklch(0.5 0.1 240)" }}
                        >
                          <th className="text-left pb-1 font-semibold">
                            Rate Type
                          </th>
                          <th className="text-right pb-1 font-semibold">
                            Amount
                          </th>
                          <th className="text-right pb-1 font-semibold">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-blue-100">
                          <td className="py-1 font-medium">Billing Rate</td>
                          <td className="py-1 text-right tabular-nums">
                            ₹
                            {(rateTraceInfo.billingRate ?? 0).toLocaleString(
                              "en-IN",
                            )}
                            /MT
                          </td>
                          <td className="py-1 text-right text-muted-foreground">
                            from unloading record
                          </td>
                        </tr>
                        <tr className="border-t border-blue-100">
                          <td className="py-1 font-medium">GST Rate</td>
                          <td className="py-1 text-right tabular-nums">
                            {rateTraceInfo.gstRate}%
                          </td>
                          <td className="py-1 text-right text-muted-foreground">
                            applied on subtotal
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* ── Live Calculation Preview ── */}
            {form.selectedUnloadingIds.length > 0 && (
              <div
                className="rounded-lg border-2 overflow-hidden"
                style={{ borderColor: "oklch(0.72 0.18 60 / 0.35)" }}
              >
                <div
                  className="px-3 py-2 flex items-center gap-2"
                  style={{ background: "oklch(0.72 0.18 60 / 0.12)" }}
                >
                  <IndianRupee
                    className="h-3.5 w-3.5"
                    style={{ color: "oklch(0.45 0.16 60)" }}
                  />
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "oklch(0.45 0.16 60)" }}
                  >
                    Live Calculation Preview
                  </p>
                </div>

                {/* Per-trip breakdown table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="text-left py-2 px-3 font-semibold text-foreground/60 text-[10px] uppercase tracking-wide">
                          Trip ID
                        </th>
                        <th className="text-left py-2 px-2 font-semibold text-foreground/60 text-[10px] uppercase tracking-wide">
                          Vehicle
                        </th>
                        <th className="text-right py-2 px-2 font-semibold text-foreground/60 text-[10px] uppercase tracking-wide">
                          Qty (MT)
                        </th>
                        <th className="text-right py-2 px-2 font-semibold text-foreground/60 text-[10px] uppercase tracking-wide">
                          Rate ₹
                        </th>
                        <th className="text-right py-2 px-3 font-semibold text-foreground/60 text-[10px] uppercase tracking-wide">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLineItems.map((li) => (
                        <tr
                          key={`${li.tripId}-${li.vehicleNo}`}
                          className="border-t border-border/30 hover:bg-muted/10"
                        >
                          <td className="py-1.5 px-3 font-mono font-medium">
                            {li.tripId}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-muted-foreground">
                            {li.vehicleNo}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums">
                            {li.unloadingQty.toFixed(3)}
                          </td>
                          <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">
                            ₹{li.billingRate.toLocaleString("en-IN")}
                          </td>
                          <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                            {formatCurrency(li.amount)}
                          </td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr
                        className="border-t-2 font-bold"
                        style={{ borderColor: "oklch(0.72 0.18 60 / 0.35)" }}
                      >
                        <td
                          className="py-2 px-3"
                          style={{ color: "oklch(0.45 0.16 60)" }}
                        >
                          Total ({selectedLineItems.length}{" "}
                          {selectedLineItems.length === 1 ? "trip" : "trips"})
                        </td>
                        <td />
                        <td
                          className="py-2 px-2 text-right tabular-nums"
                          style={{ color: "oklch(0.45 0.16 60)" }}
                        >
                          {selectedLineItems
                            .reduce((s, li) => s + li.unloadingQty, 0)
                            .toFixed(3)}
                        </td>
                        <td />
                        <td
                          className="py-2 px-3 text-right tabular-nums text-base"
                          style={{ color: "oklch(0.45 0.16 60)" }}
                        >
                          {formatCurrency(computedTotals.subtotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* GST + Grand Total */}
                <div className="p-3 pt-0 space-y-1">
                  <div className="flex justify-between items-center py-1.5 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">
                      GST @ {form.gstRate}%
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(computedTotals.gstAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold">
                      Total Invoice Amount
                    </span>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: "oklch(0.45 0.16 60)" }}
                    >
                      {formatCurrency(computedTotals.totalAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic pt-0.5">
                    {amountInWords(computedTotals.totalAmount)}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
                data-ocid="billing.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSaving ||
                  form.selectedUnloadingIds.length === 0 ||
                  !form.invoiceNumber
                }
                className="text-xs min-w-[120px]"
                data-ocid="billing.submit_button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update Invoice"
                ) : (
                  `Create Invoice (${form.selectedUnloadingIds.length} ${form.selectedUnloadingIds.length === 1 ? "trip" : "trips"})`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm" data-ocid="billing.delete_dialog">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <DialogTitle className="font-display text-base">
                Delete Invoice
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-1 space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete invoice{" "}
              <span className="font-mono font-semibold text-foreground">
                {deleteConfirm?.invoiceNumber}
              </span>
              ?
            </p>
            <p className="text-xs text-destructive/80 font-medium">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="text-xs"
              data-ocid="billing.delete_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
              className="text-xs"
              data-ocid="billing.delete_confirm_button"
            >
              {deleteInvoice.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Invoice"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
