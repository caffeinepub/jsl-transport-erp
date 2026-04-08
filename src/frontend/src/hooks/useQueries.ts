import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

// Legacy backend types - defined locally since backend is empty
export interface Truck {
  id: bigint;
  truckNumber: string;
  ownerName: string;
  phone: string;
}
export interface Client {
  id: bigint;
  clientName: string;
  gstNumber: string;
  address: string;
}
export interface Trip {
  id: bigint;
  challanNo: string;
  truckId: bigint;
  clientId: bigint;
  tpNo: string;
  doNo: string;
  consigner: string;
  consignee: string;
  loadingDate: string;
  loadingQty: number;
  unloadingQty: number;
  associateType: string;
  createdBy: string;
  tripId?: string;
  shortage?: number;
}
export interface Invoice {
  id: bigint;
  tripId: bigint;
  rate: number;
  billingAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalInvoice: number;
  status: string;
}
export interface DieselEntry {
  id: bigint;
  truckId: bigint;
  date: string;
  vendor: string;
  litre: number;
  rate: number;
  total: number;
}
export interface PettyCash {
  id: bigint;
  truckId: bigint;
  date: string;
  expenseType: string;
  amount: number;
  remark: string;
}
export interface Payment {
  id: bigint;
  tripId: bigint;
  totalCost: number;
  paidAmount: number;
  balance: number;
  bankDetails: string;
  paymentStatus: string;
}
export interface TDSEntry {
  id: bigint;
  tripId: bigint;
  tripCost: number;
  tdsPercent: number;
  tdsAmount: number;
  pan: string;
  status: string;
}
export interface UserProfile {
  username: string;
  role: string;
  displayName: string;
  name?: string;
}

// =================== TRUCKS ===================
export function useGetAllTrucks() {
  const { actor, isFetching } = useActor();
  return useQuery<Truck[]>({
    queryKey: ["trucks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTrucks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTruck() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      truckNumber: string;
      ownerName: string;
      phone: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTruck(data.truckNumber, data.ownerName, data.phone);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trucks"] }),
  });
}

export function useUpdateTruck() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      truckNumber: string;
      ownerName: string;
      phone: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateTruck(
        data.id,
        data.truckNumber,
        data.ownerName,
        data.phone,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trucks"] }),
  });
}

export function useDeleteTruck() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTruck(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trucks"] }),
  });
}

// =================== CLIENTS ===================
export function useGetAllClients(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllClients();
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!actor && !isFetching,
  });
}

export function useCreateClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      clientName: string;
      gstNumber: string;
      address: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createClient(data.clientName, data.gstNumber, data.address);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      clientName: string;
      gstNumber: string;
      address: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateClient(
        data.id,
        data.clientName,
        data.gstNumber,
        data.address,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteClient(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });
}

// =================== TRIPS ===================
export function useGetAllTrips() {
  const { actor, isFetching } = useActor();
  return useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTrips();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTrip() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      challanNo: string;
      truckId: bigint;
      clientId: bigint;
      tpNo: string;
      doNo: string;
      consigner: string;
      consignee: string;
      loadingDate: string;
      loadingQty: number;
      unloadingQty: number;
      associateType: string;
      createdBy: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTrip(
        data.challanNo,
        data.truckId,
        data.clientId,
        data.tpNo,
        data.doNo,
        data.consigner,
        data.consignee,
        data.loadingDate,
        data.loadingQty,
        data.unloadingQty,
        data.associateType,
        data.createdBy,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useUpdateTrip() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      challanNo: string;
      truckId: bigint;
      clientId: bigint;
      tpNo: string;
      doNo: string;
      consigner: string;
      consignee: string;
      loadingDate: string;
      loadingQty: number;
      unloadingQty: number;
      associateType: string;
      createdBy: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateTrip(
        data.id,
        data.challanNo,
        data.truckId,
        data.clientId,
        data.tpNo,
        data.doNo,
        data.consigner,
        data.consignee,
        data.loadingDate,
        data.loadingQty,
        data.unloadingQty,
        data.associateType,
        data.createdBy,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useDeleteTrip() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTrip(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
  });
}

// =================== INVOICES ===================
export function useGetAllInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      tripId: bigint;
      rate: number;
      billingAmount: number;
      gstPercent: number;
      gstAmount: number;
      totalInvoice: number;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createInvoice(
        data.tripId,
        data.rate,
        data.billingAmount,
        data.gstPercent,
        data.gstAmount,
        data.totalInvoice,
        data.status,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      tripId: bigint;
      rate: number;
      billingAmount: number;
      gstPercent: number;
      gstAmount: number;
      totalInvoice: number;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateInvoice(
        data.id,
        data.tripId,
        data.rate,
        data.billingAmount,
        data.gstPercent,
        data.gstAmount,
        data.totalInvoice,
        data.status,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useDeleteInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteInvoice(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

// =================== DIESEL ===================
export function useGetAllDieselEntries(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  return useQuery<DieselEntry[]>({
    queryKey: ["diesel"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDieselEntries();
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!actor && !isFetching,
  });
}

export function useCreateDieselEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      truckId: bigint;
      date: string;
      vendor: string;
      litre: number;
      rate: number;
      total: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createDieselEntry(
        data.truckId,
        data.date,
        data.vendor,
        data.litre,
        data.rate,
        data.total,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diesel"] }),
  });
}

export function useUpdateDieselEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      truckId: bigint;
      date: string;
      vendor: string;
      litre: number;
      rate: number;
      total: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateDieselEntry(
        data.id,
        data.truckId,
        data.date,
        data.vendor,
        data.litre,
        data.rate,
        data.total,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diesel"] }),
  });
}

export function useDeleteDieselEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteDieselEntry(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diesel"] }),
  });
}

// =================== PETTY CASH ===================
export function useGetAllPettyCash(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  return useQuery<PettyCash[]>({
    queryKey: ["pettycash"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPettyCashEntries();
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!actor && !isFetching,
  });
}

export function useCreatePettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      truckId: bigint;
      date: string;
      expenseType: string;
      amount: number;
      remark: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createPettyCash(
        data.truckId,
        data.date,
        data.expenseType,
        data.amount,
        data.remark,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pettycash"] }),
  });
}

export function useUpdatePettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      truckId: bigint;
      date: string;
      expenseType: string;
      amount: number;
      remark: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updatePettyCash(
        data.id,
        data.truckId,
        data.date,
        data.expenseType,
        data.amount,
        data.remark,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pettycash"] }),
  });
}

export function useDeletePettyCash() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deletePettyCash(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pettycash"] }),
  });
}

// =================== PAYMENTS ===================
export function useGetAllPayments(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  return useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPayments();
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!actor && !isFetching,
  });
}

export function useCreatePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      tripId: bigint;
      totalCost: number;
      paidAmount: number;
      balance: number;
      bankDetails: string;
      paymentStatus: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createPayment(
        data.tripId,
        data.totalCost,
        data.paidAmount,
        data.balance,
        data.bankDetails,
        data.paymentStatus,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useUpdatePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      tripId: bigint;
      totalCost: number;
      paidAmount: number;
      balance: number;
      bankDetails: string;
      paymentStatus: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updatePayment(
        data.id,
        data.tripId,
        data.totalCost,
        data.paidAmount,
        data.balance,
        data.bankDetails,
        data.paymentStatus,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useDeletePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deletePayment(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
}

// =================== TDS ===================
export function useGetAllTDSEntries(options?: { enabled?: boolean }) {
  const { actor, isFetching } = useActor();
  return useQuery<TDSEntry[]>({
    queryKey: ["tds"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTDSEntries();
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!actor && !isFetching,
  });
}

export function useCreateTDSEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      tripId: bigint;
      tripCost: number;
      tdsPercent: number;
      tdsAmount: number;
      pan: string;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTDSEntry(
        data.tripId,
        data.tripCost,
        data.tdsPercent,
        data.tdsAmount,
        data.pan,
        data.status,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tds"] }),
  });
}

export function useUpdateTDSEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      tripId: bigint;
      tripCost: number;
      tdsPercent: number;
      tdsAmount: number;
      pan: string;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateTDSEntry(
        data.id,
        data.tripId,
        data.tripCost,
        data.tdsPercent,
        data.tdsAmount,
        data.pan,
        data.status,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tds"] }),
  });
}

export function useDeleteTDSEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTDSEntry(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tds"] }),
  });
}

// =================== CONSIGNERS (LOCAL STATE) ===================
export interface Consigner {
  id: bigint;
  name: string;
  material: string;
  location: string;
  associationRate: number;
  nonAssociationRate: number;
  vendorRate: number;
  billingRate: number;
}

// =================== CONSIGNEES (LOCAL STATE) ===================
export interface Consignee {
  id: bigint;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  gstNumber: string;
}

// =================== DELIVERY ORDER (LOCAL STATE) ===================
export interface DeliveryOrder {
  id: bigint;
  doNumber: string;
  consignerId: bigint;
  consigneeId: bigint; // which client this DO is for
  doQty: number;
  dispatchedQty: number;
  expiryDate: string;
  fileUrl: string;
  status: string;
  // Rate configuration per DO (override Consigner master rates)
  associationRate: number;
  nonAssociationRate: number;
  vendorRate: number;
  billingRate: number;
  gpsCharges: number; // default 131
  shortageRate: number; // default 5000 per ton
  allowOverDispatch: boolean; // if true, allow loading beyond DO qty
}

// =================== VEHICLE (LOCAL STATE) ===================
export interface Vehicle {
  id: bigint;
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  ownerPhone: string;
  ownerAddress: string;
  panCard: string;
  // Bank Account 1
  bank1AccountHolder: string;
  bank1BankName: string;
  bank1AccountNo: string;
  bank1IFSC: string;
  bank1Branch: string;
  // Bank Account 2
  bank2AccountHolder: string;
  bank2BankName: string;
  bank2AccountNo: string;
  bank2IFSC: string;
  bank2Branch: string;
  insuranceExpiry: string;
  pollutionExpiry: string;
  fitnessExpiry: string;
  isActive: boolean;
}

// =================== LOADING TRIP (LOCAL STATE) ===================
export interface LoadingTrip {
  id: bigint;
  tripId: string;
  loadingDate: string;
  challanNo: string;
  vehicleId: bigint;
  passNumber: string;
  doId: bigint;
  consignerId: bigint;
  consigneeId: bigint;
  loadingQty: number;
  advanceCash: number;
  advanceBank: number;
  hsdLitres: number;
  hsdAmount: number;
  petrolBunkName: string;
  status: string;
}

// =================== UNLOADING (LOCAL STATE) ===================
export interface Unloading {
  id: bigint;
  loadingTripId: bigint;
  unloadingDate: string;
  unloadingQty: number;
  shortageQty: number;
  shortageAmount: number;
  gpsDeduction: number;
  challanDeduction: number;
  penalty: number;
  tollCharges: number;
  cashTds: number;
  bookingRate: number;
  billingRate: number;
  vehicleCost: number;
  clientBillAmount: number;
  netPayableToVehicle: number;
}

// =================== ACTOR SINGLETON FOR SHARED STORAGE ===================
let _erpActor: any = null;
export function setERPActor(actor: any) {
  _erpActor = actor;
}

// =================== LOCAL STORAGE HELPERS ===================
async function loadFromStorage<T>(key: string): Promise<T[]> {
  const reviver = (_k: string, v: any) => {
    if (typeof v === "string" && /^\d+n$/.test(v))
      return BigInt(v.slice(0, -1));
    return v;
  };
  const parseRaw = (raw: string): T[] => {
    try {
      return JSON.parse(raw, reviver) as T[];
    } catch {
      return [];
    }
  };
  // Try actor first
  if (_erpActor) {
    try {
      const raw: [string] | [] = await _erpActor.getData(key);
      if (raw && raw.length > 0 && raw[0]) {
        const canisterData = parseRaw(raw[0]);
        if (canisterData.length > 0) {
          // Also keep localStorage in sync
          localStorage.setItem(key, raw[0]);
          return canisterData;
        }
      }
    } catch {
      // actor call failed, fall through to localStorage
    }
  }
  // Fallback to localStorage
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  const localData = parseRaw(raw);
  // If we have local data but actor is ready (canister returned empty), push local data to canister
  if (localData.length > 0 && _erpActor) {
    try {
      await _erpActor.setData(key, raw);
    } catch {
      /* ignore */
    }
  }
  return localData;
}

async function saveToStorage<T>(key: string, data: T[]): Promise<void> {
  const serialized = JSON.stringify(data, (_k, v) => {
    if (typeof v === "bigint") return `${v}n`;
    return v;
  });
  // Always write to localStorage immediately as backup
  localStorage.setItem(key, serialized);
  // Also write to canister if actor ready
  if (_erpActor) {
    try {
      await _erpActor.setData(key, serialized);
    } catch {
      // localStorage backup already saved above, so data is not lost
    }
  }
}

function nextId<T extends { id: bigint }>(items: T[]): bigint {
  if (items.length === 0) return 1n;
  return items.reduce((max, item) => (item.id > max ? item.id : max), 0n) + 1n;
}

/** Robust BigInt equality that handles both BigInt and Number (post-JSON-parse) */
function bigIntEq(a: bigint | number, b: bigint | number): boolean {
  try {
    return BigInt(a.toString()) === BigInt(b.toString());
  } catch {
    return false;
  }
}

// =================== CONSIGNER HOOKS ===================
export function useGetAllConsigners() {
  return useQuery<Consigner[]>({
    queryKey: ["consigners"],
    queryFn: async () => {
      const items = await loadFromStorage<Consigner>("jt_consigners");
      // Normalise numeric fields that may have been stored as strings
      return items.map((item) => ({
        ...item,
        associationRate: Number(item.associationRate) || 0,
        nonAssociationRate: Number(item.nonAssociationRate) || 0,
        vendorRate: Number(item.vendorRate) || 0,
        billingRate: Number(item.billingRate) || 0,
      }));
    },
    // Local storage — no actor needed, always enabled
    staleTime: 0,
  });
}

export function useCreateConsigner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Consigner, "id">) => {
      const items = await loadFromStorage<Consigner>("jt_consigners");
      const newItem: Consigner = { ...data, id: nextId(items) };
      await saveToStorage("jt_consigners", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["consigners"] }),
  });
}

export function useUpdateConsigner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Consigner) => {
      const items = await loadFromStorage<Consigner>("jt_consigners");
      const updated = items.map((i) => (i.id === data.id ? data : i));
      await saveToStorage("jt_consigners", updated);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["consigners"] }),
  });
}

export function useDeleteConsigner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<Consigner>("jt_consigners");
      await saveToStorage(
        "jt_consigners",
        items.filter((i) => i.id !== id),
      );
      // Cascade: remove DOs linked to this consigner
      const dos = await loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      const removedDOs = dos.filter((d) => bigIntEq(d.consignerId ?? 0n, id));
      await saveToStorage(
        "jt_delivery_orders",
        dos.filter((d) => !bigIntEq(d.consignerId ?? 0n, id)),
      );
      // Cascade: remove loading trips linked to removed DOs or directly to consigner
      const trips = await loadFromStorage<LoadingTrip>("jt_loading_trips");
      const removedDOIds = removedDOs.map((d) => d.id);
      await saveToStorage(
        "jt_loading_trips",
        trips.filter(
          (t) =>
            !removedDOIds.some((did) => bigIntEq(did, t.doId)) &&
            !bigIntEq(t.consignerId ?? 0n, id),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consigners"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
    },
  });
}

// =================== CONSIGNEE HOOKS ===================
export function useGetAllConsignees() {
  return useQuery<Consignee[]>({
    queryKey: ["consignees"],
    queryFn: async () => await loadFromStorage<Consignee>("jt_consignees"),
    // Local storage — no actor needed, always enabled
    staleTime: 0,
  });
}

export function useCreateConsignee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Consignee, "id">) => {
      const items = await loadFromStorage<Consignee>("jt_consignees");
      const newItem: Consignee = { ...data, id: nextId(items) };
      await saveToStorage("jt_consignees", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["consignees"] }),
  });
}

export function useUpdateConsignee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Consignee) => {
      const items = await loadFromStorage<Consignee>("jt_consignees");
      await saveToStorage(
        "jt_consignees",
        items.map((i) => (i.id === data.id ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["consignees"] }),
  });
}

export function useDeleteConsignee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<Consignee>("jt_consignees");
      await saveToStorage(
        "jt_consignees",
        items.filter((i) => i.id !== id),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["consignees"] }),
  });
}

// =================== DELIVERY ORDER HOOKS ===================
export function useGetAllDeliveryOrders() {
  return useQuery<DeliveryOrder[]>({
    queryKey: ["deliveryOrders"],
    queryFn: async () => {
      const items = await loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      return items.map((item) => ({
        ...item,
        dispatchedQty:
          typeof item.dispatchedQty === "number" ? item.dispatchedQty : 0,
        doQty:
          typeof item.doQty === "number" ? item.doQty : Number(item.doQty) || 0,
        // Normalize new rate fields with safe defaults for backward compat
        consigneeId: item.consigneeId ?? 0n,
        associationRate: Number(item.associationRate) || 0,
        nonAssociationRate: Number(item.nonAssociationRate) || 0,
        vendorRate: Number(item.vendorRate) || 0,
        billingRate: Number(item.billingRate) || 0,
        gpsCharges: Number(item.gpsCharges) || 131,
        shortageRate: Number(item.shortageRate) || 5000,
        allowOverDispatch: item.allowOverDispatch ?? false,
      }));
    },
    staleTime: 0,
  });
}

export function useCreateDeliveryOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<DeliveryOrder, "id" | "dispatchedQty">) => {
      const items = await loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      const id = nextId(items);
      const newItem: DeliveryOrder = {
        ...data,
        id,
        dispatchedQty: 0,
        // Ensure defaults for rate fields
        gpsCharges: data.gpsCharges ?? 131,
        shortageRate: data.shortageRate ?? 5000,
        allowOverDispatch: data.allowOverDispatch ?? false,
      };
      await saveToStorage("jt_delivery_orders", [...items, newItem]);
      return id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
  });
}

export function useUpdateDeliveryOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DeliveryOrder) => {
      const items = await loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      await saveToStorage(
        "jt_delivery_orders",
        items.map((i) => (i.id === data.id ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
  });
}

export function useDeleteDeliveryOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      await saveToStorage(
        "jt_delivery_orders",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
      // Cascade: remove loading trips linked to this DO
      const trips = await loadFromStorage<LoadingTrip>("jt_loading_trips");
      const removedTrips = trips.filter((t) => bigIntEq(t.doId, id));
      await saveToStorage(
        "jt_loading_trips",
        trips.filter((t) => !bigIntEq(t.doId, id)),
      );
      // Cascade: for each removed trip, clean up unloadings, diesel, petty cash
      for (const trip of removedTrips) {
        const unloadings = await loadFromStorage<Unloading>("jt_unloadings");
        await saveToStorage(
          "jt_unloadings",
          unloadings.filter((u) => !bigIntEq(u.loadingTripId, trip.id)),
        );
        const diesel =
          await loadFromStorage<LocalDieselEntry>("jt_local_diesel");
        await saveToStorage(
          "jt_local_diesel",
          diesel.filter((d) => !(d.remark ?? "").includes(trip.challanNo)),
        );
        const petty = await loadFromStorage<PettyCashLedger>(
          "jt_pettycash_ledger",
        );
        await saveToStorage(
          "jt_pettycash_ledger",
          petty.filter((p) => !(p.narration ?? "").includes(trip.challanNo)),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["unloadings"] });
      queryClient.invalidateQueries({ queryKey: ["localDiesel"] });
      queryClient.invalidateQueries({ queryKey: ["pettycash_ledger"] });
    },
  });
}

// =================== VEHICLE HOOKS ===================
export function useGetAllVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => await loadFromStorage<Vehicle>("jt_vehicles"),
    // Local storage — no actor needed, always enabled
    staleTime: 0,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Vehicle, "id">) => {
      const items = await loadFromStorage<Vehicle>("jt_vehicles");
      const newItem: Vehicle = { ...data, id: nextId(items) };
      await saveToStorage("jt_vehicles", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Vehicle) => {
      const items = await loadFromStorage<Vehicle>("jt_vehicles");
      await saveToStorage(
        "jt_vehicles",
        items.map((i) => (i.id === data.id ? data : i)),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<Vehicle>("jt_vehicles");
      await saveToStorage(
        "jt_vehicles",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
      // Cascade: remove diesel entries linked to this vehicle
      const diesel = await loadFromStorage<LocalDieselEntry>("jt_local_diesel");
      await saveToStorage(
        "jt_local_diesel",
        diesel.filter((d) => !bigIntEq(d.truckId, id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["localDiesel"] });
    },
  });
}

// =================== LOADING TRIP HOOKS ===================
export function useGetAllLoadingTrips() {
  return useQuery<LoadingTrip[]>({
    queryKey: ["loadingTrips"],
    queryFn: async () => await loadFromStorage<LoadingTrip>("jt_loading_trips"),
    staleTime: 0,
  });
}

/** Recalculate and update DO status based on all trips dispatched qty */
async function updateDOStatusFromTrips(doId: bigint): Promise<void> {
  if (doId === 0n) return;
  const dos = await loadFromStorage<DeliveryOrder>("jt_delivery_orders");
  const do_ = dos.find((d) => bigIntEq(d.id, doId));
  if (!do_) return;
  const allTrips = await loadFromStorage<LoadingTrip>("jt_loading_trips");
  const dispatchedQty = allTrips
    .filter((t) => bigIntEq(t.doId, doId))
    .reduce((sum, t) => sum + (Number(t.loadingQty) || 0), 0);
  let newStatus = do_.status;
  if (dispatchedQty > do_.doQty && do_.allowOverDispatch) {
    newStatus = "Over-Dispatched";
  } else if (dispatchedQty >= do_.doQty && !do_.allowOverDispatch) {
    newStatus = "Closed";
  } else if (dispatchedQty < do_.doQty) {
    // Revert to Active unless expired
    const today = new Date();
    const expiry = do_.expiryDate ? new Date(do_.expiryDate) : null;
    if (expiry && expiry < today) {
      newStatus = "Expired";
    } else if (newStatus === "Closed" || newStatus === "Over-Dispatched") {
      newStatus = "Active";
    }
  }
  await saveToStorage(
    "jt_delivery_orders",
    dos.map((d) =>
      bigIntEq(d.id, doId) ? { ...d, dispatchedQty, status: newStatus } : d,
    ),
  );
}

export function useCreateLoadingTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<LoadingTrip, "id" | "tripId">) => {
      const items = await loadFromStorage<LoadingTrip>("jt_loading_trips");
      const id = nextId(items);
      const newItem: LoadingTrip = {
        ...data,
        id,
        tripId: `LT-${String(Number(id)).padStart(5, "0")}`,
      };
      await saveToStorage("jt_loading_trips", [...items, newItem]);
      // Update DO dispatched qty and status
      if (data.doId !== 0n) {
        await updateDOStatusFromTrips(data.doId);
      }
      // Auto-create Petty Cash entry for cash advance (idempotency: check challanNo + category)
      if ((data.advanceCash ?? 0) > 0 && data.challanNo) {
        const petty = await loadFromStorage<PettyCashLedger>(
          "jt_pettycash_ledger",
        );
        const alreadyExists = petty.some(
          (p) =>
            p.category === "Vehicle Advance (Cash)" &&
            (p.narration ?? "").includes(data.challanNo),
        );
        if (!alreadyExists) {
          const newPetty: PettyCashLedger = {
            id: nextId(petty),
            date: data.loadingDate,
            transactionType: "debit",
            category: "Vehicle Advance (Cash)",
            narration: `Cash advance — ${data.challanNo}`,
            amount: data.advanceCash,
            reference: data.challanNo,
          };
          await saveToStorage("jt_pettycash_ledger", [...petty, newPetty]);
        }
      }
      // Auto-create Diesel entry for HSD (idempotency: check source=trip + challanNo)
      if ((data.hsdAmount ?? 0) > 0 && data.petrolBunkName && data.challanNo) {
        const diesel =
          await loadFromStorage<LocalDieselEntry>("jt_local_diesel");
        const alreadyExists = diesel.some(
          (d) =>
            d.source === "trip" && (d.remark ?? "").includes(data.challanNo),
        );
        if (!alreadyExists) {
          const vehicles = await loadFromStorage<Vehicle>("jt_vehicles");
          const vehicle = vehicles.find((v) => bigIntEq(v.id, data.vehicleId));
          const newDiesel: LocalDieselEntry = {
            id: nextId(diesel),
            truckId: data.vehicleId,
            date: data.loadingDate,
            vendor: data.petrolBunkName,
            litre: data.hsdLitres ?? 0,
            rate: 0,
            total: data.hsdAmount,
            billFile: "",
            remark: `Trip ${data.challanNo}${vehicle ? ` — ${vehicle.vehicleNumber}` : ""}`,
            source: "trip",
            tripRef: `LT-${String(Number(id)).padStart(5, "0")}`,
            billNo: "",
            slipNo: "",
          };
          await saveToStorage("jt_local_diesel", [...diesel, newDiesel]);
        }
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.refetchQueries({ queryKey: ["deliveryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["pettycash_ledger"] });
      queryClient.invalidateQueries({ queryKey: ["localDiesel"] });
    },
  });
}

export function useUpdateLoadingTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoadingTrip) => {
      const items = await loadFromStorage<LoadingTrip>("jt_loading_trips");
      const old = items.find((i) => bigIntEq(i.id, data.id));
      await saveToStorage(
        "jt_loading_trips",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
      // Recalculate DO status for old DO (if DO changed)
      const oldDoId = old?.doId ?? 0n;
      const newDoId = data.doId;
      if (oldDoId !== 0n) await updateDOStatusFromTrips(oldDoId);
      if (newDoId !== 0n && newDoId !== oldDoId)
        await updateDOStatusFromTrips(newDoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.refetchQueries({ queryKey: ["deliveryOrders"] });
    },
  });
}

export function useDeleteLoadingTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<LoadingTrip>("jt_loading_trips");
      const trip = items.find((i) => bigIntEq(i.id, id));
      await saveToStorage(
        "jt_loading_trips",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
      // Recalculate DO status after deletion
      if (trip && trip.doId !== 0n) {
        await updateDOStatusFromTrips(trip.doId);
      }
      if (trip) {
        // Cascade: remove unloadings linked to this trip
        const unloadings = await loadFromStorage<Unloading>("jt_unloadings");
        const removedUnloadings = unloadings.filter((u) =>
          bigIntEq(u.loadingTripId, id),
        );
        await saveToStorage(
          "jt_unloadings",
          unloadings.filter((u) => !bigIntEq(u.loadingTripId, id)),
        );
        // Cascade: remove payables linked to removed unloadings
        for (const u of removedUnloadings) {
          const payables = await loadFromStorage<Payable>("jt_payables");
          await saveToStorage(
            "jt_payables",
            payables.filter((p) => !bigIntEq(p.unloadingId, u.id)),
          );
        }
        // Cascade: remove diesel entries and petty cash entries by challan no
        const diesel =
          await loadFromStorage<LocalDieselEntry>("jt_local_diesel");
        await saveToStorage(
          "jt_local_diesel",
          diesel.filter((d) => !(d.remark ?? "").includes(trip.challanNo)),
        );
        const petty = await loadFromStorage<PettyCashLedger>(
          "jt_pettycash_ledger",
        );
        await saveToStorage(
          "jt_pettycash_ledger",
          petty.filter((p) => !(p.narration ?? "").includes(trip.challanNo)),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.refetchQueries({ queryKey: ["deliveryOrders"] });
      queryClient.invalidateQueries({ queryKey: ["unloadings"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["localDiesel"] });
      queryClient.invalidateQueries({ queryKey: ["pettycash_ledger"] });
    },
  });
}

// =================== UNLOADING HOOKS ===================
export function useGetAllUnloadings() {
  return useQuery<Unloading[]>({
    queryKey: ["unloadings"],
    queryFn: async () => await loadFromStorage<Unloading>("jt_unloadings"),
    // Local storage — no actor needed, always enabled
    staleTime: 0,
  });
}

export function useCreateUnloading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Unloading, "id">) => {
      const items = await loadFromStorage<Unloading>("jt_unloadings");
      const newItem: Unloading = { ...data, id: nextId(items) };
      await saveToStorage("jt_unloadings", [...items, newItem]);
      // Mark the loading trip as unloaded
      const trips = await loadFromStorage<LoadingTrip>("jt_loading_trips");
      await saveToStorage(
        "jt_loading_trips",
        trips.map((t) =>
          t.id === data.loadingTripId ? { ...t, status: "unloaded" } : t,
        ),
      );
      // Auto-create payable entry if not already present
      if (newItem.netPayableToVehicle > 0) {
        const trip = trips.find((t) => bigIntEq(t.id, data.loadingTripId));
        if (trip) {
          const vehicles = await loadFromStorage<Vehicle>("jt_vehicles");
          const vehicle = vehicles.find((v) => bigIntEq(v.id, trip.vehicleId));
          const vehicleNumber =
            vehicle?.vehicleNumber ?? trip.vehicleId.toString();
          const ownerName = vehicle?.ownerName ?? "";
          const payables = await loadFromStorage<Payable>("jt_payables");
          const existingPayable = payables.find((p) =>
            bigIntEq(p.unloadingId, newItem.id),
          );
          if (!existingPayable) {
            const newPayable: Payable = {
              id: nextId(payables),
              unloadingId: newItem.id,
              loadingTripId: trip.id,
              date: newItem.unloadingDate,
              vehicleNumber,
              ownerName,
              tripReference: trip.challanNo,
              loadingDate: trip.loadingDate,
              loadingQty: trip.loadingQty,
              unloadingQty: newItem.unloadingQty,
              bookingAmount: newItem.vehicleCost,
              shortageDeduction: newItem.shortageAmount,
              gpsDeduction: newItem.gpsDeduction,
              challanDeduction: newItem.challanDeduction,
              tollCharges: newItem.tollCharges,
              advanceDeduction:
                (trip.advanceCash ?? 0) + (trip.advanceBank ?? 0),
              hsdDeduction: trip.hsdAmount ?? 0,
              cashTdsDeduction: newItem.cashTds,
              penaltyDeduction: newItem.penalty,
              totalPayable: newItem.netPayableToVehicle,
              amountPaid: 0,
              balance: newItem.netPayableToVehicle,
              paymentDate: "",
              paymentMode: "",
              referenceNumber: "",
              remarks: "",
              status: "pending",
            };
            await saveToStorage("jt_payables", [...payables, newPayable]);
          }
        }
      }
      return newItem.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unloadings"] });
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
    },
  });
}

export function useUpdateUnloading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Unloading) => {
      const items = await loadFromStorage<Unloading>("jt_unloadings");
      await saveToStorage(
        "jt_unloadings",
        items.map((i) => (i.id === data.id ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["unloadings"] }),
  });
}

export function useDeleteUnloading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<Unloading>("jt_unloadings");
      const unloading = items.find((i) => bigIntEq(i.id, id));
      await saveToStorage(
        "jt_unloadings",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
      if (unloading) {
        // Reset the matching loading trip status back to "loaded"
        const trips = await loadFromStorage<LoadingTrip>("jt_loading_trips");
        await saveToStorage(
          "jt_loading_trips",
          trips.map((t) =>
            bigIntEq(t.id, unloading.loadingTripId)
              ? { ...t, status: "loaded" }
              : t,
          ),
        );
        // Remove matching payable
        const payables = await loadFromStorage<Payable>("jt_payables");
        await saveToStorage(
          "jt_payables",
          payables.filter((p) => !bigIntEq(p.unloadingId, id)),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unloadings"] });
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
    },
  });
}

// =================== LOCAL DIESEL ENTRY (LOCAL STATE) ===================
export interface LocalDieselEntry {
  id: bigint;
  truckId: bigint; // references Vehicle id
  date: string;
  vendor: string; // petrol bunk name
  litre: number;
  rate: number;
  total: number;
  billFile: string; // base64 dataURL of uploaded bill image/pdf
  remark: string;
  source: string; // "manual" | "trip"
  tripRef: string; // trip ID like "LT-00001" if source="trip"
  billNo: string; // Bill number from petrol bunk
  slipNo: string; // Physical slip number from bunk at time of refueling
}

export function useGetAllLocalDieselEntries() {
  return useQuery<LocalDieselEntry[]>({
    queryKey: ["localDiesel"],
    queryFn: async () =>
      await loadFromStorage<LocalDieselEntry>("jt_local_diesel"),
    staleTime: 0,
  });
}

export function useCreateLocalDieselEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<LocalDieselEntry, "id">) => {
      const items = await loadFromStorage<LocalDieselEntry>("jt_local_diesel");
      const newItem: LocalDieselEntry = { ...data, id: nextId(items) };
      await saveToStorage("jt_local_diesel", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["localDiesel"] }),
  });
}

export function useUpdateLocalDieselEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LocalDieselEntry) => {
      const items = await loadFromStorage<LocalDieselEntry>("jt_local_diesel");
      await saveToStorage(
        "jt_local_diesel",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["localDiesel"] }),
  });
}

export function useDeleteLocalDieselEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<LocalDieselEntry>("jt_local_diesel");
      await saveToStorage(
        "jt_local_diesel",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["localDiesel"] }),
  });
}

// =================== BUNK PAYMENT (LOCAL STATE) ===================
export interface BunkPayment {
  id: bigint;
  date: string;
  bunkName: string;
  amount: number;
  paymentMode: string; // "cash" | "bank"
  utrNo: string;
  remark: string;
  createdBy: string;
  createdDate: string;
}

export function useGetAllBunkPayments() {
  return useQuery<BunkPayment[]>({
    queryKey: ["bunkPayments"],
    queryFn: async () => await loadFromStorage<BunkPayment>("jt_bunk_payments"),
    staleTime: 0,
  });
}

export function useCreateBunkPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<BunkPayment, "id">) => {
      const items = await loadFromStorage<BunkPayment>("jt_bunk_payments");
      const newItem: BunkPayment = { ...data, id: nextId(items) };
      await saveToStorage("jt_bunk_payments", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bunkPayments"] }),
  });
}

export function useUpdateBunkPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BunkPayment) => {
      const items = await loadFromStorage<BunkPayment>("jt_bunk_payments");
      await saveToStorage(
        "jt_bunk_payments",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bunkPayments"] }),
  });
}

export function useDeleteBunkPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<BunkPayment>("jt_bunk_payments");
      await saveToStorage(
        "jt_bunk_payments",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["bunkPayments"] }),
  });
}

// =================== CASH & BANK ENTRY (LOCAL STATE) ===================
export interface CashBankEntry {
  id: bigint;
  date: string;
  book: string; // "cash" | "bank"
  transactionType: string; // "receipt" | "payment"
  category: string;
  amount: number;
  narration: string;
  reference: string;
  bankAccountName?: string;
  createdBy: string;
  createdDate: string;
  sourceRef?: string; // idempotency key: e.g. "receivable_payment_{paymentId}"
}

export function useGetAllCashBankEntries() {
  return useQuery<CashBankEntry[]>({
    queryKey: ["cashBankEntries"],
    queryFn: async () =>
      await loadFromStorage<CashBankEntry>("jt_cash_bank_entries"),
    staleTime: 0,
  });
}

export function useCreateCashBankEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CashBankEntry, "id">) => {
      const items = await loadFromStorage<CashBankEntry>(
        "jt_cash_bank_entries",
      );
      const newItem: CashBankEntry = { ...data, id: nextId(items) };
      await saveToStorage("jt_cash_bank_entries", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cashBankEntries"] }),
  });
}

export function useUpdateCashBankEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CashBankEntry) => {
      const items = await loadFromStorage<CashBankEntry>(
        "jt_cash_bank_entries",
      );
      await saveToStorage(
        "jt_cash_bank_entries",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cashBankEntries"] }),
  });
}

export function useDeleteCashBankEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<CashBankEntry>(
        "jt_cash_bank_entries",
      );
      await saveToStorage(
        "jt_cash_bank_entries",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cashBankEntries"] }),
  });
}

// =================== RECEIVABLE (LOCAL STATE) ===================
export interface ReceivablePayment {
  id: string;
  date: string;
  amount: number;
  tdsDeducted: number;
  penalty: number;
  reference: string;
  mode: string;
  remarks: string;
  createdAt: string;
}

export interface Receivable {
  id: bigint;
  billingInvoiceId: bigint; // 0n if manually created
  invoiceDate: string;
  date: string;
  invoiceNumber: string;
  clientName: string;
  vehicleNo: string;
  consignerName: string;
  invoiceAmount: number;
  amountReceived: number;
  tdsDeduction: number;
  penaltyAmount: number;
  penaltyBillFile: string;
  balance: number;
  paymentDate: string;
  paymentMode: string; // Cash | NEFT | RTGS | Cheque | Online
  referenceNumber: string;
  remarks: string;
  status: string; // pending | partial | paid
  payments?: ReceivablePayment[];
}

function calcReceivableStatus(
  invoiceAmount: number,
  amountReceived: number,
  tdsDeduction = 0,
  penaltyAmount = 0,
): { balance: number; status: string } {
  const balance = invoiceAmount - amountReceived - tdsDeduction - penaltyAmount;
  let status = "pending";
  if (balance <= 0) status = "paid";
  else if (amountReceived > 0 || tdsDeduction > 0 || penaltyAmount > 0)
    status = "partial";
  return { balance: Math.max(0, balance), status };
}

export async function syncReceivablesFromInvoices(
  invoices: BillingInvoice[],
): Promise<void> {
  const existing = await loadFromStorage<Receivable>("jt_receivables");
  let changed = false;
  const updated = [...existing];

  for (const invoice of invoices) {
    const found = existing.find((r) =>
      bigIntEq(r.billingInvoiceId, invoice.id),
    );
    if (!found) {
      // Create new receivable from invoice
      const newRec: Receivable = {
        id: nextId(updated),
        billingInvoiceId: invoice.id,
        invoiceDate: invoice.invoiceDate,
        date: invoice.invoiceDate,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        vehicleNo: invoice.vehicleNo,
        consignerName: invoice.consignerName,
        invoiceAmount: invoice.totalAmount,
        amountReceived: 0,
        tdsDeduction: 0,
        penaltyAmount: 0,
        penaltyBillFile: "",
        balance: invoice.totalAmount,
        paymentDate: "",
        paymentMode: "",
        referenceNumber: "",
        remarks: "",
        status: "pending",
      };
      updated.push(newRec);
      changed = true;
    } else {
      // Update invoice amount and client info if changed (preserve payment data)
      if (
        found.invoiceAmount !== invoice.totalAmount ||
        found.clientName !== invoice.clientName ||
        found.vehicleNo !== invoice.vehicleNo
      ) {
        const idx = updated.findIndex((r) => bigIntEq(r.id, found.id));
        if (idx >= 0) {
          const { balance, status } = calcReceivableStatus(
            invoice.totalAmount,
            found.amountReceived,
            found.tdsDeduction,
            found.penaltyAmount,
          );
          updated[idx] = {
            ...found,
            invoiceAmount: invoice.totalAmount,
            clientName: invoice.clientName,
            vehicleNo: invoice.vehicleNo,
            consignerName: invoice.consignerName,
            balance,
            status,
          };
          changed = true;
        }
      }
    }
  }

  if (changed) {
    await saveToStorage("jt_receivables", updated);
  }
}

export function useGetAllReceivables() {
  return useQuery<Receivable[]>({
    queryKey: ["receivables"],
    queryFn: async () => await loadFromStorage<Receivable>("jt_receivables"),
    staleTime: 0,
  });
}

export function useCreateReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Receivable, "id" | "balance" | "status">) => {
      const items = await loadFromStorage<Receivable>("jt_receivables");
      const { balance, status } = calcReceivableStatus(
        data.invoiceAmount,
        data.amountReceived,
        data.tdsDeduction,
        data.penaltyAmount,
      );
      const newItem: Receivable = {
        ...data,
        id: nextId(items),
        balance,
        status,
      };
      await saveToStorage("jt_receivables", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });
}

export function useUpdateReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<Receivable, "balance" | "status"> & { id: bigint },
    ) => {
      const items = await loadFromStorage<Receivable>("jt_receivables");
      const { balance, status } = calcReceivableStatus(
        data.invoiceAmount,
        data.amountReceived,
        data.tdsDeduction,
        data.penaltyAmount,
      );
      const updated: Receivable = { ...data, balance, status };
      await saveToStorage(
        "jt_receivables",
        items.map((i) => (bigIntEq(i.id, data.id) ? updated : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });
}

export function useDeleteReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<Receivable>("jt_receivables");
      await saveToStorage(
        "jt_receivables",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });
}

export function useAddReceivablePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payment,
    }: {
      id: bigint;
      payment: ReceivablePayment;
    }) => {
      const items = await loadFromStorage<Receivable>("jt_receivables");
      const idx = items.findIndex((i) => bigIntEq(i.id, id));
      if (idx < 0) throw new Error("Receivable not found");
      const rec = items[idx];
      const existingPayments = rec.payments ?? [];
      const newPayments = [...existingPayments, payment];
      const newAmountReceived = newPayments.reduce((s, p) => s + p.amount, 0);
      const newTDS = newPayments.reduce((s, p) => s + (p.tdsDeducted ?? 0), 0);
      const newPenalty = newPayments.reduce((s, p) => s + (p.penalty ?? 0), 0);
      const { balance, status } = calcReceivableStatus(
        rec.invoiceAmount,
        newAmountReceived,
        newTDS,
        newPenalty,
      );
      const updated: Receivable = {
        ...rec,
        payments: newPayments,
        amountReceived: newAmountReceived,
        tdsDeduction: newTDS,
        penaltyAmount: newPenalty,
        paymentDate: payment.date,
        paymentMode: payment.mode,
        referenceNumber: payment.reference,
        balance,
        status,
      };
      items[idx] = updated;
      await saveToStorage("jt_receivables", items);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });
}

// =================== PAYABLE (LOCAL STATE) ===================
export interface PayablePayment {
  id: string;
  date: string;
  amount: number;
  mode: string;
  utr: string;
  remarks: string;
  createdAt: string;
}

export interface Payable {
  id: bigint;
  unloadingId: bigint; // 0n if manually created
  loadingTripId: bigint;
  date: string;
  vehicleNumber: string;
  ownerName: string;
  tripReference: string; // trip ID like "LT-00001"
  loadingDate: string;
  loadingQty: number;
  unloadingQty: number;
  bookingAmount: number;
  shortageDeduction: number;
  gpsDeduction: number;
  challanDeduction: number;
  tollCharges: number;
  advanceDeduction: number;
  hsdDeduction: number;
  cashTdsDeduction: number;
  penaltyDeduction: number;
  totalPayable: number; // = netPayableToVehicle from unloading
  amountPaid: number;
  balance: number;
  paymentDate: string;
  paymentMode: string; // Cash | NEFT | RTGS | Cheque | Online
  referenceNumber: string;
  remarks: string;
  status: string; // pending | payment_requested | partial | paid
  payments?: PayablePayment[];
}

function calcPayableStatus(
  totalPayable: number,
  amountPaid: number,
): { balance: number; status: string } {
  const balance = totalPayable - amountPaid;
  let status = "pending";
  if (balance <= 0) status = "paid";
  else if (amountPaid > 0) status = "partial";
  return { balance: Math.max(0, balance), status };
}

export async function syncPayablesFromUnloadings(
  unloadings: Unloading[],
  loadingTrips: LoadingTrip[],
  vehicles: Vehicle[],
): Promise<void> {
  const existing = await loadFromStorage<Payable>("jt_payables");
  let changed = false;
  const updated = [...existing];

  for (const unloading of unloadings) {
    if (unloading.netPayableToVehicle <= 0) continue;
    const found = existing.find((p) => bigIntEq(p.unloadingId, unloading.id));
    if (found) continue;

    // Look up the loading trip
    const trip = loadingTrips.find((t) =>
      bigIntEq(t.id, unloading.loadingTripId),
    );
    if (!trip) continue;

    // Look up vehicle and owner
    const vehicle = vehicles.find((v) => bigIntEq(v.id, trip.vehicleId));
    const vehicleNumber = vehicle?.vehicleNumber ?? trip.vehicleId.toString();
    const ownerName = vehicle?.ownerName ?? "";

    const newPayable: Payable = {
      id: nextId(updated),
      unloadingId: unloading.id,
      loadingTripId: trip.id,
      date: unloading.unloadingDate,
      vehicleNumber,
      ownerName,
      tripReference: trip.tripId,
      loadingDate: trip.loadingDate,
      loadingQty: trip.loadingQty,
      unloadingQty: unloading.unloadingQty,
      bookingAmount: unloading.vehicleCost,
      shortageDeduction: unloading.shortageAmount,
      gpsDeduction: unloading.gpsDeduction,
      challanDeduction: unloading.challanDeduction,
      tollCharges: unloading.tollCharges,
      advanceDeduction: (trip.advanceCash ?? 0) + (trip.advanceBank ?? 0),
      hsdDeduction: trip.hsdAmount ?? 0,
      cashTdsDeduction: unloading.cashTds,
      penaltyDeduction: unloading.penalty,
      totalPayable: unloading.netPayableToVehicle,
      amountPaid: 0,
      balance: unloading.netPayableToVehicle,
      paymentDate: "",
      paymentMode: "",
      referenceNumber: "",
      remarks: "",
      status: "pending",
    };
    updated.push(newPayable);
    changed = true;
  }

  if (changed) {
    await saveToStorage("jt_payables", updated);
  }
}

export function useGetAllPayables() {
  return useQuery<Payable[]>({
    queryKey: ["payables"],
    queryFn: async () => await loadFromStorage<Payable>("jt_payables"),
    staleTime: 0,
  });
}

export function useCreatePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Payable, "id" | "balance" | "status">) => {
      const items = await loadFromStorage<Payable>("jt_payables");
      const { balance, status } = calcPayableStatus(
        data.totalPayable,
        data.amountPaid,
      );
      const newItem: Payable = {
        ...data,
        id: nextId(items),
        balance,
        status,
      };
      await saveToStorage("jt_payables", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });
}

export function useUpdatePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Payable, "balance"> & { id: bigint }) => {
      const items = await loadFromStorage<Payable>("jt_payables");
      const { balance, status: autoStatus } = calcPayableStatus(
        data.totalPayable,
        data.amountPaid,
      );
      // If data.status is "payment_requested", preserve it unless paid
      const status =
        data.status === "payment_requested" && balance > 0
          ? "payment_requested"
          : autoStatus;
      const updated: Payable = { ...data, balance, status };
      await saveToStorage(
        "jt_payables",
        items.map((i) => (bigIntEq(i.id, data.id) ? updated : i)),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });
}

export function useDeletePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<Payable>("jt_payables");
      await saveToStorage(
        "jt_payables",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });
}

export function useAddPayablePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payment,
    }: {
      id: bigint;
      payment: PayablePayment;
    }) => {
      const items = await loadFromStorage<Payable>("jt_payables");
      const idx = items.findIndex((i) => bigIntEq(i.id, id));
      if (idx < 0) throw new Error("Payable not found");
      const rec = items[idx];
      const existingPayments = rec.payments ?? [];
      const newPayments = [...existingPayments, payment];
      const newAmountPaid = newPayments.reduce((s, p) => s + p.amount, 0);
      const { balance, status: autoStatus } = calcPayableStatus(
        rec.totalPayable,
        newAmountPaid,
      );
      const status =
        autoStatus === "pending" && rec.status === "payment_requested"
          ? "payment_requested"
          : autoStatus;
      const updated: Payable = {
        ...rec,
        payments: newPayments,
        amountPaid: newAmountPaid,
        paymentDate: payment.date,
        paymentMode: payment.mode,
        referenceNumber: payment.utr,
        balance,
        status,
      };
      items[idx] = updated;
      await saveToStorage("jt_payables", items);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });
}

// =================== PETTY CASH LEDGER (LOCAL STATE) ===================
export interface PettyCashLedger {
  id: bigint;
  date: string;
  transactionType: string; // credit | debit
  category: string;
  narration: string;
  amount: number;
  reference: string;
}

export function useGetAllPettyCashLedger() {
  return useQuery<PettyCashLedger[]>({
    queryKey: ["pettycash_ledger"],
    queryFn: async () =>
      await loadFromStorage<PettyCashLedger>("jt_pettycash_ledger"),
    staleTime: 0,
  });
}

export function useCreatePettyCashLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PettyCashLedger, "id">) => {
      const items = await loadFromStorage<PettyCashLedger>(
        "jt_pettycash_ledger",
      );
      const newItem: PettyCashLedger = { ...data, id: nextId(items) };
      await saveToStorage("jt_pettycash_ledger", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pettycash_ledger"] }),
  });
}

export function useUpdatePettyCashLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PettyCashLedger) => {
      const items = await loadFromStorage<PettyCashLedger>(
        "jt_pettycash_ledger",
      );
      await saveToStorage(
        "jt_pettycash_ledger",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pettycash_ledger"] }),
  });
}

export function useDeletePettyCashLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<PettyCashLedger>(
        "jt_pettycash_ledger",
      );
      await saveToStorage(
        "jt_pettycash_ledger",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["pettycash_ledger"] }),
  });
}

// =================== USER PROFILE ===================
export function useGetUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const raw = localStorage.getItem("jt_user_profile");
      if (!raw) return null;
      try {
        return JSON.parse(raw) as UserProfile;
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSaveUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: { name: string; role?: string }) => {
      const saved: UserProfile = {
        username: profile.name,
        displayName: profile.name,
        name: profile.name,
        role: profile.role ?? localStorage.getItem("jt_user_role") ?? "User",
      };
      localStorage.setItem("jt_user_profile", JSON.stringify(saved));
      return saved;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}

// =================== PETROL BUNK (LOCAL STATE) ===================
export interface PetrolBunk {
  id: bigint;
  bunkName: string;
  location: string;
  contact: string;
  creditLimit: number;
}

export function useGetAllPetrolBunks() {
  return useQuery<PetrolBunk[]>({
    queryKey: ["petrolBunks"],
    queryFn: async () => await loadFromStorage<PetrolBunk>("jt_petrol_bunks"),
    staleTime: 0,
  });
}

export function useCreatePetrolBunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PetrolBunk, "id">) => {
      const items = await loadFromStorage<PetrolBunk>("jt_petrol_bunks");
      const newItem: PetrolBunk = { ...data, id: nextId(items) };
      await saveToStorage("jt_petrol_bunks", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["petrolBunks"] }),
  });
}

export function useUpdatePetrolBunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PetrolBunk) => {
      const items = await loadFromStorage<PetrolBunk>("jt_petrol_bunks");
      await saveToStorage(
        "jt_petrol_bunks",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["petrolBunks"] }),
  });
}

export function useDeletePetrolBunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<PetrolBunk>("jt_petrol_bunks");
      await saveToStorage(
        "jt_petrol_bunks",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["petrolBunks"] }),
  });
}

// =================== BILLING INVOICE (LOCAL STATE) ===================
export interface BillingLineItem {
  tripId: string; // e.g. "LT-00001"
  vehicleNo: string;
  consignerName: string;
  unloadingQty: number;
  billingRate: number;
  amount: number;
}

export interface BillingInvoice {
  id: bigint;
  invoiceNumber: string;
  // Multi-trip support
  unloadingIds: bigint[]; // all selected unloading IDs
  tripIds: bigint[]; // all linked trip IDs
  // Backward compat: first entry (or 0n)
  unloadingId: bigint;
  tripId: bigint;
  clientName: string;
  vehicleNo: string; // "Multiple" if more than one vehicle
  consignerName: string;
  unloadingQty: number; // total across all trips
  billingRate: number; // rate of first trip (for backward compat)
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: string; // Pending | Submitted | Received
  invoiceDate: string;
  lineItems: BillingLineItem[]; // per-trip breakdown
}

export function useGetAllBillingInvoices() {
  return useQuery<BillingInvoice[]>({
    queryKey: ["billingInvoices"],
    queryFn: async () => {
      const items = await loadFromStorage<BillingInvoice>(
        "jt_billing_invoices",
      );
      // Normalise old records that lack multi-trip fields
      return items.map((item) => ({
        ...item,
        unloadingIds:
          item.unloadingIds && item.unloadingIds.length > 0
            ? item.unloadingIds
            : [item.unloadingId ?? 0n],
        tripIds:
          item.tripIds && item.tripIds.length > 0
            ? item.tripIds
            : [item.tripId ?? 0n],
        lineItems: item.lineItems ?? [],
      }));
    },
    staleTime: 0,
  });
}

export function useCreateBillingInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<BillingInvoice, "id">) => {
      const items = await loadFromStorage<BillingInvoice>(
        "jt_billing_invoices",
      );
      const newItem: BillingInvoice = { ...data, id: nextId(items) };
      await saveToStorage("jt_billing_invoices", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["billingInvoices"] }),
  });
}

export function useUpdateBillingInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BillingInvoice) => {
      const items = await loadFromStorage<BillingInvoice>(
        "jt_billing_invoices",
      );
      await saveToStorage(
        "jt_billing_invoices",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["billingInvoices"] }),
  });
}

export function useDeleteBillingInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<BillingInvoice>(
        "jt_billing_invoices",
      );
      await saveToStorage(
        "jt_billing_invoices",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
      // Cascade: remove matching receivable
      const receivables = await loadFromStorage<Receivable>("jt_receivables");
      await saveToStorage(
        "jt_receivables",
        receivables.filter((r) => !bigIntEq(r.billingInvoiceId, id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });
}

// =================== TDS RECORD (LOCAL STATE) ===================
export interface TDSRecord {
  id: bigint;
  tdsType?: string; // advance_cash | vehicle_payment | tds_receivable
  ownerName: string;
  ownerPAN: string;
  vehicleNo: string;
  tripId: bigint;
  challanNo?: string;
  advanceAmount: number;
  tdsRate?: number;
  tdsAmount: number;
  entryDate: string;
  remarks: string;
  status: string; // pending | paid
  // Extra fields for tds_receivable type
  invoiceNo?: string;
  billAmount?: number;
  referenceNo?: string;
  // Extra fields for vehicle_payment type
  utrReference?: string;
}

export function useGetAllTDSRecords() {
  return useQuery<TDSRecord[]>({
    queryKey: ["tdsRecords"],
    queryFn: async () => await loadFromStorage<TDSRecord>("jt_tds_entries"),
    staleTime: 0,
  });
}

export function useCreateTDSRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<TDSRecord, "id">) => {
      const items = await loadFromStorage<TDSRecord>("jt_tds_entries");
      const newItem: TDSRecord = { ...data, id: nextId(items) };
      await saveToStorage("jt_tds_entries", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tdsRecords"] }),
  });
}

export function useUpdateTDSRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TDSRecord) => {
      const items = await loadFromStorage<TDSRecord>("jt_tds_entries");
      await saveToStorage(
        "jt_tds_entries",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tdsRecords"] }),
  });
}

export function useDeleteTDSRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = await loadFromStorage<TDSRecord>("jt_tds_entries");
      await saveToStorage(
        "jt_tds_entries",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tdsRecords"] }),
  });
}

// =================== ERP SETTINGS (LOCAL STATE) ===================
export interface ERPSettings {
  companyName: string;
  companyAddress: string;
  companyGST: string;
  gpsDeduction: number;
  challanRate: number;
  shortageRate: number;
  gstRate: number;
}

const DEFAULT_SETTINGS: ERPSettings = {
  companyName: "Jeen Trade & Exports Pvt Ltd",
  companyAddress: "",
  companyGST: "",
  gpsDeduction: 131,
  challanRate: 200,
  shortageRate: 5000,
  gstRate: 18,
};

export function useGetSettings() {
  return useQuery<ERPSettings>({
    queryKey: ["erpSettings"],
    queryFn: async () => {
      try {
        const raw = localStorage.getItem("jt_erp_settings");
        if (!raw) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as ERPSettings;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 0,
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ERPSettings) => {
      localStorage.setItem("jt_erp_settings", JSON.stringify(data));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["erpSettings"] }),
  });
}
