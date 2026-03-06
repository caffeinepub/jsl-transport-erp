import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface T__3 {
    id: bigint;
    remark: string;
    truckId: bigint;
    expenseType: string;
    date: string;
    amount: number;
}
export interface T__2 {
    id: bigint;
    pan: string;
    status: string;
    tripCost: number;
    tripId: bigint;
    tdsPercent: number;
    tdsAmount: number;
}
export interface T {
    id: bigint;
    ownerName: string;
    phone: string;
    truckNumber: string;
}
export interface T__7 {
    id: bigint;
    clientName: string;
    gstNumber: string;
    address: string;
}
export interface T__5 {
    id: bigint;
    billingAmount: number;
    status: string;
    tripId: bigint;
    rate: number;
    gstPercent: number;
    gstAmount: number;
    totalInvoice: number;
}
export interface T__1 {
    id: bigint;
    truckId: bigint;
    clientId: bigint;
    loadingQty: number;
    challanNo: string;
    doNo: string;
    createdBy: string;
    tripId: string;
    tpNo: string;
    unloadingQty: number;
    loadingDate: string;
    associateType: string;
    shortage: number;
    consignee: string;
    consigner: string;
}
export interface T__6 {
    id: bigint;
    truckId: bigint;
    total: number;
    date: string;
    rate: number;
    litre: number;
    vendor: string;
}
export interface UserProfile {
    name: string;
}
export interface T__4 {
    id: bigint;
    paymentStatus: string;
    balance: number;
    bankDetails: string;
    tripId: bigint;
    totalCost: number;
    paidAmount: number;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createClient(clientName: string, gstNumber: string, address: string): Promise<bigint>;
    createDieselEntry(truckId: bigint, date: string, vendor: string, litre: number, rate: number, total: number): Promise<bigint>;
    createInvoice(tripId: bigint, rate: number, billingAmount: number, gstPercent: number, gstAmount: number, totalInvoice: number, status: string): Promise<bigint>;
    createPayment(tripId: bigint, totalCost: number, paidAmount: number, balance: number, bankDetails: string, paymentStatus: string): Promise<bigint>;
    createPettyCash(truckId: bigint, date: string, expenseType: string, amount: number, remark: string): Promise<bigint>;
    createTDSEntry(tripId: bigint, tripCost: number, tdsPercent: number, tdsAmount: number, pan: string, status: string): Promise<bigint>;
    createTrip(challanNo: string, truckId: bigint, clientId: bigint, tpNo: string, doNo: string, consigner: string, consignee: string, loadingDate: string, loadingQty: number, unloadingQty: number, associateType: string, createdBy: string): Promise<bigint>;
    createTruck(truckNumber: string, ownerName: string, phone: string): Promise<bigint>;
    deleteClient(id: bigint): Promise<void>;
    deleteDieselEntry(id: bigint): Promise<void>;
    deleteInvoice(id: bigint): Promise<void>;
    deletePayment(id: bigint): Promise<void>;
    deletePettyCash(id: bigint): Promise<void>;
    deleteTDSEntry(id: bigint): Promise<void>;
    deleteTrip(id: bigint): Promise<void>;
    deleteTruck(id: bigint): Promise<void>;
    getAllClients(): Promise<Array<T__7>>;
    getAllDieselEntries(): Promise<Array<T__6>>;
    getAllInvoices(): Promise<Array<T__5>>;
    getAllPayments(): Promise<Array<T__4>>;
    getAllPettyCashEntries(): Promise<Array<T__3>>;
    getAllTDSEntries(): Promise<Array<T__2>>;
    getAllTrips(): Promise<Array<T__1>>;
    getAllTrucks(): Promise<Array<T>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getClient(id: bigint): Promise<T__7>;
    getDieselEntry(id: bigint): Promise<T__6>;
    getInvoice(id: bigint): Promise<T__5>;
    getPayment(id: bigint): Promise<T__4>;
    getPettyCash(id: bigint): Promise<T__3>;
    getTDSEntry(id: bigint): Promise<T__2>;
    getTrip(id: bigint): Promise<T__1>;
    getTruck(id: bigint): Promise<T>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateClient(id: bigint, clientName: string, gstNumber: string, address: string): Promise<void>;
    updateDieselEntry(id: bigint, truckId: bigint, date: string, vendor: string, litre: number, rate: number, total: number): Promise<void>;
    updateInvoice(id: bigint, tripId: bigint, rate: number, billingAmount: number, gstPercent: number, gstAmount: number, totalInvoice: number, status: string): Promise<void>;
    updatePayment(id: bigint, tripId: bigint, totalCost: number, paidAmount: number, balance: number, bankDetails: string, paymentStatus: string): Promise<void>;
    updatePettyCash(id: bigint, truckId: bigint, date: string, expenseType: string, amount: number, remark: string): Promise<void>;
    updateTDSEntry(id: bigint, tripId: bigint, tripCost: number, tdsPercent: number, tdsAmount: number, pan: string, status: string): Promise<void>;
    updateTrip(id: bigint, challanNo: string, truckId: bigint, clientId: bigint, tpNo: string, doNo: string, consigner: string, consignee: string, loadingDate: string, loadingQty: number, unloadingQty: number, associateType: string, createdBy: string): Promise<void>;
    updateTruck(id: bigint, truckNumber: string, ownerName: string, phone: string): Promise<void>;
}
