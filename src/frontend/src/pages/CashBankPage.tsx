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
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building2,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type CashBankEntry,
  useCreateCashBankEntry,
  useDeleteCashBankEntry,
  useGetAllCashBankEntries,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

const CASH_CATEGORIES = [
  "Cash Received",
  "Vehicle Advance",
  "Rent",
  "Electricity Bill",
  "Water Bill",
  "DO Expenses",
  "Courier Charges",
  "Fuel",
  "Printing & Stationery",
  "Other Expenses",
];

const BANK_CATEGORIES = [
  "Bank Receipt",
  "Bank Transfer",
  "Vehicle Payment",
  "Salary",
  "GST Payment",
  "TDS Payment",
  "Other",
];

const AUTO_CATEGORIES = new Set(["Client Receipt", "Vehicle Payment"]);

function isAutoEntry(entry: CashBankEntry): boolean {
  return AUTO_CATEGORIES.has(entry.category);
}

interface EntryFormData {
  date: string;
  book: string;
  transactionType: string;
  category: string;
  amount: string;
  narration: string;
  reference: string;
  bankAccountName: string;
}

const defaultForm: EntryFormData = {
  date: "",
  book: "cash",
  transactionType: "receipt",
  category: "",
  amount: "",
  narration: "",
  reference: "",
  bankAccountName: "",
};

export default function CashBankPage() {
  const entriesQuery = useGetAllCashBankEntries();
  const createEntry = useCreateCashBankEntry();
  const deleteEntry = useDeleteCashBankEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EntryFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<CashBankEntry | null>(
    null,
  );

  const allEntries = entriesQuery.data ?? [];
  const [bankAccountFilter, setBankAccountFilter] = useState("");

  const uniqueBankAccounts = useMemo(() => {
    const names = new Set<string>();
    for (const e of allEntries) {
      if (e.book === "bank" && e.bankAccountName) names.add(e.bankAccountName);
    }
    return Array.from(names).sort();
  }, [allEntries]);

  const cashEntries = useMemo(
    () => allEntries.filter((e) => e.book === "cash"),
    [allEntries],
  );
  const bankEntries = useMemo(
    () =>
      allEntries.filter(
        (e) =>
          e.book === "bank" &&
          (!bankAccountFilter || e.bankAccountName === bankAccountFilter),
      ),
    [allEntries, bankAccountFilter],
  );

  const cashSummary = useMemo(() => {
    const receipts = cashEntries
      .filter((e) => e.transactionType === "receipt")
      .reduce((s, e) => s + e.amount, 0);
    const payments = cashEntries
      .filter((e) => e.transactionType === "payment")
      .reduce((s, e) => s + e.amount, 0);
    return { receipts, payments, balance: receipts - payments };
  }, [cashEntries]);

  const bankSummary = useMemo(() => {
    const receipts = bankEntries
      .filter((e) => e.transactionType === "receipt")
      .reduce((s, e) => s + e.amount, 0);
    const payments = bankEntries
      .filter((e) => e.transactionType === "payment")
      .reduce((s, e) => s + e.amount, 0);
    return { receipts, payments, balance: receipts - payments };
  }, [bankEntries]);

  const openCreateDialog = () => {
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const categories = form.book === "cash" ? CASH_CATEGORIES : BANK_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    const userRole = localStorage.getItem("jt_user_role") ?? "User";
    const data: Omit<CashBankEntry, "id"> = {
      date: form.date,
      book: form.book,
      transactionType: form.transactionType,
      category: form.category,
      amount: Number(form.amount),
      narration: form.narration,
      reference: form.reference,
      bankAccountName: form.bankAccountName,
      createdBy: userRole,
      createdDate: new Date().toISOString().split("T")[0],
    };
    try {
      await createEntry.mutateAsync(data);
      toast.success("Entry recorded successfully");
      setDialogOpen(false);
      setForm(defaultForm);
    } catch {
      toast.error("Failed to save entry.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteEntry.mutateAsync(deleteConfirm.id);
      toast.success("Entry deleted");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete entry.");
    }
  };

  function EntriesTable({
    entries,
    book,
  }: { entries: CashBankEntry[]; book: string }) {
    if (entriesQuery.isLoading) {
      return (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      );
    }
    if (entries.length === 0) {
      return (
        <div
          className="flex flex-col items-center justify-center py-12"
          data-ocid={`cashbank.${book}.empty_state`}
        >
          {book === "cash" ? (
            <Banknote className="h-8 w-8 text-muted-foreground/30 mb-3" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
          )}
          <p className="text-sm text-muted-foreground">No {book} entries yet</p>
          <Button
            onClick={openCreateDialog}
            className="mt-4 gap-2 text-xs"
            size="sm"
            data-ocid={`cashbank.${book}.new_button`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Entry
          </Button>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <Table data-ocid={`cashbank.${book}.table`}>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold">Date</TableHead>
              <TableHead className="text-xs font-semibold">Type</TableHead>
              <TableHead className="text-xs font-semibold">Category</TableHead>
              {book === "bank" && (
                <TableHead className="text-xs font-semibold">
                  Bank Account
                </TableHead>
              )}
              <TableHead className="text-xs font-semibold text-right">
                Amount
              </TableHead>
              <TableHead className="text-xs font-semibold">Narration</TableHead>
              <TableHead className="text-xs font-semibold">Reference</TableHead>
              <TableHead className="text-xs font-semibold">
                Created By
              </TableHead>
              <TableHead className="text-xs font-semibold text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow
                key={entry.id.toString()}
                className={`table-row-hover${isAutoEntry(entry) ? " bg-blue-50/20" : ""}`}
                data-ocid={`cashbank.${book}.item.${index + 1}`}
              >
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(entry.date)}
                </TableCell>
                <TableCell>
                  {entry.transactionType === "receipt" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      <ArrowDownCircle className="h-2.5 w-2.5" />
                      Receipt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-700">
                      <ArrowUpCircle className="h-2.5 w-2.5" />
                      Payment
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{entry.category}</span>
                    {isAutoEntry(entry) && (
                      <span
                        title={`Auto-recorded from ${entry.category === "Client Receipt" ? "Accounts Receivable" : "Accounts Payable"} — modify via source module`}
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium border"
                        style={{
                          background: "oklch(0.97 0.02 240)",
                          color: "oklch(0.4 0.18 240)",
                          borderColor: "oklch(0.75 0.1 240)",
                        }}
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Auto
                      </span>
                    )}
                  </div>
                </TableCell>
                {book === "bank" && (
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.bankAccountName || "—"}
                  </TableCell>
                )}
                <TableCell
                  className={`text-xs text-right font-semibold ${entry.transactionType === "receipt" ? "text-green-600" : "text-red-600"}`}
                >
                  {entry.transactionType === "receipt" ? "+" : "-"}
                  {formatCurrency(entry.amount)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                  {entry.narration || "—"}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {entry.reference || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {entry.createdBy}
                </TableCell>
                <TableCell className="text-right">
                  {isAutoEntry(entry) ? (
                    <div
                      className="flex items-center justify-end gap-1"
                      title={`Auto-recorded from ${entry.category === "Client Receipt" ? "Receivable" : "Payable"} payment — modify via the source module`}
                    >
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                        style={{
                          background: "oklch(0.97 0.02 240)",
                          color: "oklch(0.4 0.18 240)",
                          borderColor: "oklch(0.75 0.1 240)",
                        }}
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Auto
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(entry)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      data-ocid={`cashbank.${book}.delete_button.${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" data-ocid="cashbank.page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "oklch(0.55 0.18 250 / 0.12)" }}
          >
            <Wallet
              className="h-4 w-4"
              style={{ color: "oklch(0.5 0.18 250)" }}
            />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-foreground">
              Cash &amp; Bank Records
            </h2>
            <p className="text-sm text-muted-foreground">
              {cashEntries.length} cash entries · {bankEntries.length} bank
              entries
            </p>
          </div>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2"
          data-ocid="cashbank.new_button"
        >
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      <Tabs defaultValue="cash" data-ocid="cashbank.tabs">
        <TabsList className="h-8">
          <TabsTrigger
            value="cash"
            className="text-xs"
            data-ocid="cashbank.cash.tab"
          >
            Cash Book ({cashEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="bank"
            className="text-xs"
            data-ocid="cashbank.bank.tab"
          >
            Bank Book ({bankEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="text-xs"
            data-ocid="cashbank.summary.tab"
          >
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Cash Book */}
        <TabsContent value="cash" className="mt-3">
          {/* Cash summary strip */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Receipts
                </p>
                <p className="mt-1 text-xl font-bold font-display text-green-600">
                  {formatCurrency(cashSummary.receipts)}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Payments
                </p>
                <p className="mt-1 text-xl font-bold font-display text-red-600">
                  {formatCurrency(cashSummary.payments)}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Cash Balance
                </p>
                <p
                  className={`mt-1 text-xl font-bold font-display ${cashSummary.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(cashSummary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                Cash Transactions
              </p>
            </div>
            <EntriesTable entries={cashEntries} book="cash" />
          </div>
        </TabsContent>

        {/* Bank Book */}
        <TabsContent value="bank" className="mt-3">
          {/* Bank account filter */}
          {uniqueBankAccounts.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <label
                htmlFor="bankAccountFilterSelect"
                className="text-xs text-muted-foreground font-medium"
              >
                Filter by Bank Account:
              </label>
              <select
                value={bankAccountFilter}
                onChange={(e) => setBankAccountFilter(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-white text-gray-900"
                data-ocid="cashbank.bank_account.select"
              >
                <option value="">All Accounts</option>
                {uniqueBankAccounts.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Receipts
                </p>
                <p className="mt-1 text-xl font-bold font-display text-green-600">
                  {formatCurrency(bankSummary.receipts)}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Payments
                </p>
                <p className="mt-1 text-xl font-bold font-display text-red-600">
                  {formatCurrency(bankSummary.payments)}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Bank Balance
                </p>
                <p
                  className={`mt-1 text-xl font-bold font-display ${bankSummary.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(bankSummary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">
                Bank Transactions
              </p>
            </div>
            <EntriesTable entries={bankEntries} book="bank" />
          </div>
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Summary */}
            <Card className="border border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <Banknote className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-semibold font-display">
                    Cash Summary
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">
                      Opening Balance
                    </span>
                    <span className="text-xs font-semibold">
                      {formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-green-700 flex items-center gap-1">
                      <ArrowDownCircle className="h-3 w-3" /> Total Receipts
                    </span>
                    <span className="text-xs font-semibold text-green-600">
                      + {formatCurrency(cashSummary.receipts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-red-700 flex items-center gap-1">
                      <ArrowUpCircle className="h-3 w-3" /> Total Payments
                    </span>
                    <span className="text-xs font-semibold text-red-600">
                      - {formatCurrency(cashSummary.payments)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 rounded-md bg-muted/50 px-2">
                    <span className="text-xs font-bold">Closing Balance</span>
                    <span
                      className={`text-sm font-bold ${cashSummary.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(cashSummary.balance)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
                    Category Breakdown
                  </p>
                  <div className="space-y-1">
                    {CASH_CATEGORIES.map((cat) => {
                      const catEntries = cashEntries.filter(
                        (e) => e.category === cat,
                      );
                      if (catEntries.length === 0) return null;
                      const total = catEntries.reduce(
                        (s, e) =>
                          s +
                          (e.transactionType === "receipt"
                            ? e.amount
                            : -e.amount),
                        0,
                      );
                      return (
                        <div
                          key={cat}
                          className="flex justify-between items-center text-[10px]"
                        >
                          <span className="text-muted-foreground">{cat}</span>
                          <span
                            className={
                              total >= 0
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {total >= 0 ? "+" : ""}
                            {formatCurrency(total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Summary */}
            <Card className="border border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold font-display">
                    Bank Summary
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">
                      Opening Balance
                    </span>
                    <span className="text-xs font-semibold">
                      {formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-green-700 flex items-center gap-1">
                      <ArrowDownCircle className="h-3 w-3" /> Total Receipts
                    </span>
                    <span className="text-xs font-semibold text-green-600">
                      + {formatCurrency(bankSummary.receipts)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-red-700 flex items-center gap-1">
                      <ArrowUpCircle className="h-3 w-3" /> Total Payments
                    </span>
                    <span className="text-xs font-semibold text-red-600">
                      - {formatCurrency(bankSummary.payments)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 rounded-md bg-muted/50 px-2">
                    <span className="text-xs font-bold">Closing Balance</span>
                    <span
                      className={`text-sm font-bold ${bankSummary.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(bankSummary.balance)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wide">
                    Category Breakdown
                  </p>
                  <div className="space-y-1">
                    {BANK_CATEGORIES.map((cat) => {
                      const catEntries = bankEntries.filter(
                        (e) => e.category === cat,
                      );
                      if (catEntries.length === 0) return null;
                      const total = catEntries.reduce(
                        (s, e) =>
                          s +
                          (e.transactionType === "receipt"
                            ? e.amount
                            : -e.amount),
                        0,
                      );
                      return (
                        <div
                          key={cat}
                          className="flex justify-between items-center text-[10px]"
                        >
                          <span className="text-muted-foreground">{cat}</span>
                          <span
                            className={
                              total >= 0
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {total >= 0 ? "+" : ""}
                            {formatCurrency(total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-ocid="cashbank.modal">
          <DialogHeader>
            <DialogTitle className="font-display">
              New Cash / Bank Entry
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cbDate" className="text-xs">
                  Date *
                </Label>
                <Input
                  id="cbDate"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="cashbank.form.date_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Book *</Label>
                <Select
                  value={form.book}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, book: v, category: "" }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="cashbank.form.book_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="text-xs">
                      Cash
                    </SelectItem>
                    <SelectItem value="bank" className="text-xs">
                      Bank
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Transaction Type *</Label>
                <Select
                  value={form.transactionType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, transactionType: v }))
                  }
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="cashbank.form.type_select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt" className="text-xs">
                      Receipt (Money In)
                    </SelectItem>
                    <SelectItem value="payment" className="text-xs">
                      Payment (Money Out)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger
                    className="text-xs"
                    data-ocid="cashbank.form.category_select"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="cbAmount" className="text-xs">
                  Amount (₹) *
                </Label>
                <Input
                  id="cbAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  required
                  className="text-xs"
                  data-ocid="cashbank.form.amount_input"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="cbNarration" className="text-xs">
                  Narration / Description
                </Label>
                <Textarea
                  id="cbNarration"
                  placeholder="Brief description of the transaction..."
                  value={form.narration}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, narration: e.target.value }))
                  }
                  className="text-xs resize-none"
                  rows={2}
                  data-ocid="cashbank.form.narration_textarea"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="cbReference" className="text-xs">
                  Reference / Cheque No
                </Label>
                <Input
                  id="cbReference"
                  placeholder="Reference number, cheque no, UTR..."
                  value={form.reference}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, reference: e.target.value }))
                  }
                  className="text-xs"
                  data-ocid="cashbank.form.reference_input"
                />
              </div>
              {form.book === "bank" && (
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="cbBankAccount" className="text-xs">
                    Bank Account Name
                  </Label>
                  <Input
                    id="cbBankAccount"
                    placeholder="e.g. SBI Current A/c, HDFC Bank..."
                    value={form.bankAccountName}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        bankAccountName: e.target.value,
                      }))
                    }
                    className="text-xs"
                    data-ocid="cashbank.form.bank_account_input"
                  />
                </div>
              )}
            </div>

            {/* Preview badge */}
            {form.amount && (
              <div
                className={`rounded-md p-3 border flex items-center gap-2 ${form.transactionType === "receipt" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              >
                {form.transactionType === "receipt" ? (
                  <ArrowDownCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowUpCircle className="h-4 w-4 text-red-600" />
                )}
                <div>
                  <p className="text-xs font-semibold">
                    {form.transactionType === "receipt" ? "Receipt" : "Payment"}{" "}
                    of {formatCurrency(Number(form.amount))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {form.book === "cash" ? "Cash" : "Bank"} ·{" "}
                    {form.category || "No category"}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="cashbank.form.cancel_button"
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEntry.isPending}
                data-ocid="cashbank.form.submit_button"
                className="text-xs"
              >
                {createEntry.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Entry"
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
        <DialogContent className="max-w-sm" data-ocid="cashbank.delete_modal">
          <DialogHeader>
            <DialogTitle className="font-display">Delete Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this {deleteConfirm?.book} entry of{" "}
            {deleteConfirm ? formatCurrency(deleteConfirm.amount) : ""}?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="cashbank.delete_cancel_button"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
              data-ocid="cashbank.delete_confirm_button"
              className="text-xs"
            >
              {deleteEntry.isPending ? (
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
