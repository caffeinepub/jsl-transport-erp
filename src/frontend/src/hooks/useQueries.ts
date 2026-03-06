import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  T__7 as Client,
  T__6 as DieselEntry,
  T__5 as Invoice,
  T__4 as Payment,
  T__3 as PettyCash,
  T__2 as TDSEntry,
  T__1 as Trip,
  T as Truck,
  UserProfile,
} from "../backend.d";
import { useActor } from "./useActor";

export type {
  Truck,
  Trip,
  TDSEntry,
  PettyCash,
  Payment,
  Invoice,
  DieselEntry,
  Client,
  UserProfile,
};

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
  doQty: number;
  dispatchedQty: number;
  expiryDate: string;
  fileUrl: string;
  status: string;
}

// =================== VEHICLE (LOCAL STATE) ===================
export interface Vehicle {
  id: bigint;
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  ownerPhone: string;
  ownerAddress: string;
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

// =================== LOCAL STORAGE HELPERS ===================
function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    // Parse BigInt from JSON using reviver
    return JSON.parse(raw, (_k, v) => {
      if (typeof v === "string" && /^\d+n$/.test(v))
        return BigInt(v.slice(0, -1));
      return v;
    }) as T[];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(data, (_k, v) => {
        if (typeof v === "bigint") return `${v}n`;
        return v;
      }),
    );
  } catch {
    // ignore
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
      const items = loadFromStorage<Consigner>("jt_consigners");
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
      const items = loadFromStorage<Consigner>("jt_consigners");
      const newItem: Consigner = { ...data, id: nextId(items) };
      saveToStorage("jt_consigners", [...items, newItem]);
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
      const items = loadFromStorage<Consigner>("jt_consigners");
      const updated = items.map((i) => (i.id === data.id ? data : i));
      saveToStorage("jt_consigners", updated);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["consigners"] }),
  });
}

export function useDeleteConsigner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const items = loadFromStorage<Consigner>("jt_consigners");
      saveToStorage(
        "jt_consigners",
        items.filter((i) => i.id !== id),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["consigners"] }),
  });
}

// =================== CONSIGNEE HOOKS ===================
export function useGetAllConsignees() {
  return useQuery<Consignee[]>({
    queryKey: ["consignees"],
    queryFn: async () => loadFromStorage<Consignee>("jt_consignees"),
    // Local storage — no actor needed, always enabled
    staleTime: 0,
  });
}

export function useCreateConsignee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Consignee, "id">) => {
      const items = loadFromStorage<Consignee>("jt_consignees");
      const newItem: Consignee = { ...data, id: nextId(items) };
      saveToStorage("jt_consignees", [...items, newItem]);
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
      const items = loadFromStorage<Consignee>("jt_consignees");
      saveToStorage(
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
      const items = loadFromStorage<Consignee>("jt_consignees");
      saveToStorage(
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
      const items = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      return items.map((item) => ({
        ...item,
        dispatchedQty:
          typeof item.dispatchedQty === "number" ? item.dispatchedQty : 0,
        doQty:
          typeof item.doQty === "number" ? item.doQty : Number(item.doQty) || 0,
      }));
    },
    staleTime: 0,
  });
}

export function useCreateDeliveryOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<DeliveryOrder, "id" | "dispatchedQty">) => {
      const items = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      const id = nextId(items);
      const newItem: DeliveryOrder = {
        ...data,
        id,
        dispatchedQty: 0,
      };
      saveToStorage("jt_delivery_orders", [...items, newItem]);
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
      const items = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      saveToStorage(
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
      const items = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
      saveToStorage(
        "jt_delivery_orders",
        items.filter((i) => i.id !== id),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] }),
  });
}

// =================== VEHICLE HOOKS ===================
export function useGetAllVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => loadFromStorage<Vehicle>("jt_vehicles"),
    // Local storage — no actor needed, always enabled
    staleTime: 0,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Vehicle, "id">) => {
      const items = loadFromStorage<Vehicle>("jt_vehicles");
      const newItem: Vehicle = { ...data, id: nextId(items) };
      saveToStorage("jt_vehicles", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Vehicle) => {
      const items = loadFromStorage<Vehicle>("jt_vehicles");
      saveToStorage(
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
      const items = loadFromStorage<Vehicle>("jt_vehicles");
      saveToStorage(
        "jt_vehicles",
        items.filter((i) => i.id !== id),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

// =================== LOADING TRIP HOOKS ===================
export function useGetAllLoadingTrips() {
  return useQuery<LoadingTrip[]>({
    queryKey: ["loadingTrips"],
    queryFn: async () => loadFromStorage<LoadingTrip>("jt_loading_trips"),
    staleTime: 0,
  });
}

export function useCreateLoadingTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<LoadingTrip, "id" | "tripId">) => {
      const items = loadFromStorage<LoadingTrip>("jt_loading_trips");
      const id = nextId(items);
      const newItem: LoadingTrip = {
        ...data,
        id,
        tripId: `LT-${String(Number(id)).padStart(5, "0")}`,
      };
      saveToStorage("jt_loading_trips", [...items, newItem]);
      // Deduct loading qty from the linked DO
      if (data.doId !== 0n) {
        const dos = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
        saveToStorage(
          "jt_delivery_orders",
          dos.map((d) =>
            bigIntEq(d.id, data.doId)
              ? {
                  ...d,
                  dispatchedQty: (d.dispatchedQty ?? 0) + data.loadingQty,
                }
              : d,
          ),
        );
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.refetchQueries({ queryKey: ["deliveryOrders"] });
    },
  });
}

export function useUpdateLoadingTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoadingTrip) => {
      const items = loadFromStorage<LoadingTrip>("jt_loading_trips");
      const old = items.find((i) => bigIntEq(i.id, data.id));
      // Reverse old deduction
      if (old && old.doId !== 0n) {
        const dos = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
        saveToStorage(
          "jt_delivery_orders",
          dos.map((d) =>
            bigIntEq(d.id, old.doId)
              ? {
                  ...d,
                  dispatchedQty: Math.max(
                    0,
                    (d.dispatchedQty ?? 0) - old.loadingQty,
                  ),
                }
              : d,
          ),
        );
      }
      // Apply new deduction
      if (data.doId !== 0n) {
        const dos = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
        saveToStorage(
          "jt_delivery_orders",
          dos.map((d) =>
            bigIntEq(d.id, data.doId)
              ? {
                  ...d,
                  dispatchedQty: (d.dispatchedQty ?? 0) + data.loadingQty,
                }
              : d,
          ),
        );
      }
      saveToStorage(
        "jt_loading_trips",
        items.map((i) => (bigIntEq(i.id, data.id) ? data : i)),
      );
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
      const items = loadFromStorage<LoadingTrip>("jt_loading_trips");
      const trip = items.find((i) => bigIntEq(i.id, id));
      // Reverse the DO deduction before deleting
      if (trip && trip.doId !== 0n) {
        const dos = loadFromStorage<DeliveryOrder>("jt_delivery_orders");
        saveToStorage(
          "jt_delivery_orders",
          dos.map((d) =>
            bigIntEq(d.id, trip.doId)
              ? {
                  ...d,
                  dispatchedQty: Math.max(
                    0,
                    (d.dispatchedQty ?? 0) - trip.loadingQty,
                  ),
                }
              : d,
          ),
        );
      }
      saveToStorage(
        "jt_loading_trips",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
      queryClient.refetchQueries({ queryKey: ["deliveryOrders"] });
    },
  });
}

// =================== UNLOADING HOOKS ===================
export function useGetAllUnloadings() {
  return useQuery<Unloading[]>({
    queryKey: ["unloadings"],
    queryFn: async () => loadFromStorage<Unloading>("jt_unloadings"),
    // Local storage — no actor needed, always enabled
    staleTime: 0,
  });
}

export function useCreateUnloading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Unloading, "id">) => {
      const items = loadFromStorage<Unloading>("jt_unloadings");
      const newItem: Unloading = { ...data, id: nextId(items) };
      saveToStorage("jt_unloadings", [...items, newItem]);
      // Mark the loading trip as unloaded
      const trips = loadFromStorage<LoadingTrip>("jt_loading_trips");
      saveToStorage(
        "jt_loading_trips",
        trips.map((t) =>
          t.id === data.loadingTripId ? { ...t, status: "unloaded" } : t,
        ),
      );
      return newItem.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unloadings"] });
      queryClient.invalidateQueries({ queryKey: ["loadingTrips"] });
    },
  });
}

export function useUpdateUnloading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Unloading) => {
      const items = loadFromStorage<Unloading>("jt_unloadings");
      saveToStorage(
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
      const items = loadFromStorage<Unloading>("jt_unloadings");
      saveToStorage(
        "jt_unloadings",
        items.filter((i) => i.id !== id),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["unloadings"] }),
  });
}

// =================== RECEIVABLE (LOCAL STATE) ===================
export interface Receivable {
  id: bigint;
  date: string;
  invoiceNumber: string;
  clientName: string;
  invoiceAmount: number;
  amountReceived: number;
  balance: number;
  paymentDate: string;
  paymentMode: string; // Cash | NEFT | RTGS | Cheque | Online
  referenceNumber: string;
  remarks: string;
  status: string; // pending | partial | paid
}

function calcReceivableStatus(
  invoiceAmount: number,
  amountReceived: number,
): { balance: number; status: string } {
  const balance = invoiceAmount - amountReceived;
  let status = "pending";
  if (balance <= 0) status = "paid";
  else if (amountReceived > 0) status = "partial";
  return { balance: Math.max(0, balance), status };
}

export function useGetAllReceivables() {
  return useQuery<Receivable[]>({
    queryKey: ["receivables"],
    queryFn: async () => loadFromStorage<Receivable>("jt_receivables"),
    staleTime: 0,
  });
}

export function useCreateReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Receivable, "id" | "balance" | "status">) => {
      const items = loadFromStorage<Receivable>("jt_receivables");
      const { balance, status } = calcReceivableStatus(
        data.invoiceAmount,
        data.amountReceived,
      );
      const newItem: Receivable = {
        ...data,
        id: nextId(items),
        balance,
        status,
      };
      saveToStorage("jt_receivables", [...items, newItem]);
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
      const items = loadFromStorage<Receivable>("jt_receivables");
      const { balance, status } = calcReceivableStatus(
        data.invoiceAmount,
        data.amountReceived,
      );
      const updated: Receivable = { ...data, balance, status };
      saveToStorage(
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
      const items = loadFromStorage<Receivable>("jt_receivables");
      saveToStorage(
        "jt_receivables",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });
}

// =================== PAYABLE (LOCAL STATE) ===================
export interface Payable {
  id: bigint;
  date: string;
  vehicleNumber: string;
  ownerName: string;
  tripReference: string;
  totalPayable: number;
  amountPaid: number;
  balance: number;
  paymentDate: string;
  paymentMode: string; // Cash | NEFT | RTGS | Cheque | Online
  referenceNumber: string;
  remarks: string;
  status: string; // pending | partial | paid
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

export function useGetAllPayables() {
  return useQuery<Payable[]>({
    queryKey: ["payables"],
    queryFn: async () => loadFromStorage<Payable>("jt_payables"),
    staleTime: 0,
  });
}

export function useCreatePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Payable, "id" | "balance" | "status">) => {
      const items = loadFromStorage<Payable>("jt_payables");
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
      saveToStorage("jt_payables", [...items, newItem]);
      return newItem.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });
}

export function useUpdatePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<Payable, "balance" | "status"> & { id: bigint },
    ) => {
      const items = loadFromStorage<Payable>("jt_payables");
      const { balance, status } = calcPayableStatus(
        data.totalPayable,
        data.amountPaid,
      );
      const updated: Payable = { ...data, balance, status };
      saveToStorage(
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
      const items = loadFromStorage<Payable>("jt_payables");
      saveToStorage(
        "jt_payables",
        items.filter((i) => !bigIntEq(i.id, id)),
      );
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
      loadFromStorage<PettyCashLedger>("jt_pettycash_ledger"),
    staleTime: 0,
  });
}

export function useCreatePettyCashLedger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PettyCashLedger, "id">) => {
      const items = loadFromStorage<PettyCashLedger>("jt_pettycash_ledger");
      const newItem: PettyCashLedger = { ...data, id: nextId(items) };
      saveToStorage("jt_pettycash_ledger", [...items, newItem]);
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
      const items = loadFromStorage<PettyCashLedger>("jt_pettycash_ledger");
      saveToStorage(
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
      const items = loadFromStorage<PettyCashLedger>("jt_pettycash_ledger");
      saveToStorage(
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
  const { actor } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    // Only gate on actor being present — do NOT gate on isFetching.
    // isFetching stays true while _initializeAccessControlWithSecret runs,
    // which would deadlock the profile query and leave App.tsx in an infinite loading state.
    enabled: !!actor,
    // Keep profile data fresh for 10 minutes — no need to re-fetch on every page visit
    staleTime: 10 * 60 * 1000,
    // Don't refetch on window focus — profile rarely changes
    refetchOnWindowFocus: false,
  });
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}
