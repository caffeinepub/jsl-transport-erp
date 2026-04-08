import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import AccessControl "mo:caffeineai-authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();

  // Include authorization logic
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller cannot access profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous caller cannot save profile");
    };
    userProfiles.add(caller, profile);
  };

  // =================== SHARED KEY-VALUE STORE ===================
  // Stores all ERP data as JSON text blobs, shared across all users.
  // Keys: jt_consigners, jt_consignees, jt_vehicles, jt_petrol_bunks,
  //       jt_delivery_orders, jt_loading_trips, jt_unloadings,
  //       jt_billing_invoices, jt_local_diesel, jt_bunk_payments,
  //       jt_pettycash_ledger, jt_tds_entries, jt_cash_bank_entries,
  //       jt_receivables, jt_payables, jt_erp_settings

  // Shared KV store — persists automatically via enhanced orthogonal persistence
  let erpDataStore = Map.empty<Text, Text>();

  public shared func setData(key : Text, value : Text) : async () {
    erpDataStore.add(key, value);
  };

  public query func getData(key : Text) : async ?Text {
    erpDataStore.get(key);
  };

  public shared func deleteData(key : Text) : async () {
    erpDataStore.remove(key);
  };

  public query func getAllKeys() : async [Text] {
    erpDataStore.keys().toArray();
  };

  // =================== LEGACY TYPED MODULES ===================
  // (kept for backward compatibility with any existing data)

  module Truck {
    public type T = {
      id : Nat;
      truckNumber : Text;
      ownerName : Text;
      phone : Text;
    };
  };

  module Client {
    public type T = {
      id : Nat;
      clientName : Text;
      gstNumber : Text;
      address : Text;
    };
  };

  module Trip {
    public type T = {
      id : Nat;
      tripId : Text;
      challanNo : Text;
      truckId : Nat;
      clientId : Nat;
      tpNo : Text;
      doNo : Text;
      consigner : Text;
      consignee : Text;
      loadingDate : Text;
      loadingQty : Float;
      unloadingQty : Float;
      shortage : Float;
      associateType : Text;
      createdBy : Text;
    };
  };

  module Invoice {
    public type T = {
      id : Nat;
      tripId : Nat;
      rate : Float;
      billingAmount : Float;
      gstPercent : Float;
      gstAmount : Float;
      totalInvoice : Float;
      status : Text;
    };
  };

  module DieselEntry {
    public type T = {
      id : Nat;
      truckId : Nat;
      date : Text;
      vendor : Text;
      litre : Float;
      rate : Float;
      total : Float;
    };
  };

  module PettyCash {
    public type T = {
      id : Nat;
      truckId : Nat;
      date : Text;
      expenseType : Text;
      amount : Float;
      remark : Text;
    };
  };

  module Payment {
    public type T = {
      id : Nat;
      tripId : Nat;
      totalCost : Float;
      paidAmount : Float;
      balance : Float;
      bankDetails : Text;
      paymentStatus : Text;
    };
  };

  module TDSEntry {
    public type T = {
      id : Nat;
      tripId : Nat;
      tripCost : Float;
      tdsPercent : Float;
      tdsAmount : Float;
      pan : Text;
      status : Text;
    };
  };

  var nextTruckId = 1;
  var nextClientId = 1;
  var nextTripId = 1;
  var nextInvoiceId = 1;
  var nextDieselEntryId = 1;
  var nextPettyCashId = 1;
  var nextPaymentId = 1;
  var nextTDSEntryId = 1;

  let trucks = Map.empty<Nat, Truck.T>();
  let clients = Map.empty<Nat, Client.T>();
  let trips = Map.empty<Nat, Trip.T>();
  let invoices = Map.empty<Nat, Invoice.T>();
  let dieselEntries = Map.empty<Nat, DieselEntry.T>();
  let pettyCashEntries = Map.empty<Nat, PettyCash.T>();
  let payments = Map.empty<Nat, Payment.T>();
  let tdsEntries = Map.empty<Nat, TDSEntry.T>();

  private func requireUser(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
  };

  public shared ({ caller }) func createTruck(truckNumber : Text, ownerName : Text, phone : Text) : async Nat {
    requireUser(caller);
    let id = nextTruckId;
    trucks.add(id, { id; truckNumber; ownerName; phone });
    nextTruckId += 1;
    id;
  };

  public query ({ caller }) func getTruck(id : Nat) : async Truck.T {
    requireUser(caller);
    switch (trucks.get(id)) {
      case (null) { Runtime.trap("Truck does not exist") };
      case (?truck) { truck };
    };
  };

  public shared ({ caller }) func updateTruck(id : Nat, truckNumber : Text, ownerName : Text, phone : Text) : async () {
    requireUser(caller);
    trucks.add(id, { id; truckNumber; ownerName; phone });
  };

  public shared ({ caller }) func deleteTruck(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete trucks");
    };
    trucks.remove(id);
  };

  public query ({ caller }) func getAllTrucks() : async [Truck.T] {
    requireUser(caller);
    trucks.values().toArray();
  };

  public shared ({ caller }) func createClient(clientName : Text, gstNumber : Text, address : Text) : async Nat {
    requireUser(caller);
    let id = nextClientId;
    clients.add(id, { id; clientName; gstNumber; address });
    nextClientId += 1;
    id;
  };

  public query ({ caller }) func getClient(id : Nat) : async Client.T {
    requireUser(caller);
    switch (clients.get(id)) {
      case (null) { Runtime.trap("Client does not exist") };
      case (?client) { client };
    };
  };

  public shared ({ caller }) func updateClient(id : Nat, clientName : Text, gstNumber : Text, address : Text) : async () {
    requireUser(caller);
    clients.add(id, { id; clientName; gstNumber; address });
  };

  public shared ({ caller }) func deleteClient(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete clients");
    };
    clients.remove(id);
  };

  public query ({ caller }) func getAllClients() : async [Client.T] {
    requireUser(caller);
    clients.values().toArray();
  };

  public shared ({ caller }) func createTrip(challanNo : Text, truckId : Nat, clientId : Nat, tpNo : Text, doNo : Text, consigner : Text, consignee : Text, loadingDate : Text, loadingQty : Float, unloadingQty : Float, associateType : Text, createdBy : Text) : async Nat {
    requireUser(caller);
    let id = nextTripId;
    trips.add(id, { id; tripId = "TRIP-" # id.toText(); challanNo; truckId; clientId; tpNo; doNo; consigner; consignee; loadingDate; loadingQty; unloadingQty; shortage = loadingQty - unloadingQty; associateType; createdBy });
    nextTripId += 1;
    id;
  };

  public query ({ caller }) func getTrip(id : Nat) : async Trip.T {
    requireUser(caller);
    switch (trips.get(id)) {
      case (null) { Runtime.trap("Trip does not exist") };
      case (?trip) { trip };
    };
  };

  public shared ({ caller }) func updateTrip(id : Nat, challanNo : Text, truckId : Nat, clientId : Nat, tpNo : Text, doNo : Text, consigner : Text, consignee : Text, loadingDate : Text, loadingQty : Float, unloadingQty : Float, associateType : Text, createdBy : Text) : async () {
    requireUser(caller);
    trips.add(id, { id; tripId = "TRIP-" # id.toText(); challanNo; truckId; clientId; tpNo; doNo; consigner; consignee; loadingDate; loadingQty; unloadingQty; shortage = loadingQty - unloadingQty; associateType; createdBy });
  };

  public shared ({ caller }) func deleteTrip(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete trips");
    };
    trips.remove(id);
  };

  public query ({ caller }) func getAllTrips() : async [Trip.T] {
    requireUser(caller);
    trips.values().toArray();
  };

  public shared ({ caller }) func createInvoice(tripId : Nat, rate : Float, billingAmount : Float, gstPercent : Float, gstAmount : Float, totalInvoice : Float, status : Text) : async Nat {
    requireUser(caller);
    let id = nextInvoiceId;
    invoices.add(id, { id; tripId; rate; billingAmount; gstPercent; gstAmount; totalInvoice; status });
    nextInvoiceId += 1;
    id;
  };

  public query ({ caller }) func getInvoice(id : Nat) : async Invoice.T {
    requireUser(caller);
    switch (invoices.get(id)) {
      case (null) { Runtime.trap("Invoice does not exist") };
      case (?invoice) { invoice };
    };
  };

  public shared ({ caller }) func updateInvoice(id : Nat, tripId : Nat, rate : Float, billingAmount : Float, gstPercent : Float, gstAmount : Float, totalInvoice : Float, status : Text) : async () {
    requireUser(caller);
    invoices.add(id, { id; tripId; rate; billingAmount; gstPercent; gstAmount; totalInvoice; status });
  };

  public shared ({ caller }) func deleteInvoice(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete invoices");
    };
    invoices.remove(id);
  };

  public query ({ caller }) func getAllInvoices() : async [Invoice.T] {
    requireUser(caller);
    invoices.values().toArray();
  };

  public shared ({ caller }) func createDieselEntry(truckId : Nat, date : Text, vendor : Text, litre : Float, rate : Float, total : Float) : async Nat {
    requireUser(caller);
    let id = nextDieselEntryId;
    dieselEntries.add(id, { id; truckId; date; vendor; litre; rate; total });
    nextDieselEntryId += 1;
    id;
  };

  public query ({ caller }) func getDieselEntry(id : Nat) : async DieselEntry.T {
    requireUser(caller);
    switch (dieselEntries.get(id)) {
      case (null) { Runtime.trap("Diesel entry does not exist") };
      case (?dieselEntry) { dieselEntry };
    };
  };

  public shared ({ caller }) func updateDieselEntry(id : Nat, truckId : Nat, date : Text, vendor : Text, litre : Float, rate : Float, total : Float) : async () {
    requireUser(caller);
    dieselEntries.add(id, { id; truckId; date; vendor; litre; rate; total });
  };

  public shared ({ caller }) func deleteDieselEntry(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete diesel entries");
    };
    dieselEntries.remove(id);
  };

  public query ({ caller }) func getAllDieselEntries() : async [DieselEntry.T] {
    requireUser(caller);
    dieselEntries.values().toArray();
  };

  public shared ({ caller }) func createPettyCash(truckId : Nat, date : Text, expenseType : Text, amount : Float, remark : Text) : async Nat {
    requireUser(caller);
    let id = nextPettyCashId;
    pettyCashEntries.add(id, { id; truckId; date; expenseType; amount; remark });
    nextPettyCashId += 1;
    id;
  };

  public query ({ caller }) func getPettyCash(id : Nat) : async PettyCash.T {
    requireUser(caller);
    switch (pettyCashEntries.get(id)) {
      case (null) { Runtime.trap("Petty cash entry does not exist") };
      case (?pettyCash) { pettyCash };
    };
  };

  public shared ({ caller }) func updatePettyCash(id : Nat, truckId : Nat, date : Text, expenseType : Text, amount : Float, remark : Text) : async () {
    requireUser(caller);
    pettyCashEntries.add(id, { id; truckId; date; expenseType; amount; remark });
  };

  public shared ({ caller }) func deletePettyCash(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete petty cash entries");
    };
    pettyCashEntries.remove(id);
  };

  public query ({ caller }) func getAllPettyCashEntries() : async [PettyCash.T] {
    requireUser(caller);
    pettyCashEntries.values().toArray();
  };

  public shared ({ caller }) func createPayment(tripId : Nat, totalCost : Float, paidAmount : Float, balance : Float, bankDetails : Text, paymentStatus : Text) : async Nat {
    requireUser(caller);
    let id = nextPaymentId;
    payments.add(id, { id; tripId; totalCost; paidAmount; balance; bankDetails; paymentStatus });
    nextPaymentId += 1;
    id;
  };

  public query ({ caller }) func getPayment(id : Nat) : async Payment.T {
    requireUser(caller);
    switch (payments.get(id)) {
      case (null) { Runtime.trap("Payment does not exist") };
      case (?payment) { payment };
    };
  };

  public shared ({ caller }) func updatePayment(id : Nat, tripId : Nat, totalCost : Float, paidAmount : Float, balance : Float, bankDetails : Text, paymentStatus : Text) : async () {
    requireUser(caller);
    payments.add(id, { id; tripId; totalCost; paidAmount; balance; bankDetails; paymentStatus });
  };

  public shared ({ caller }) func deletePayment(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete payments");
    };
    payments.remove(id);
  };

  public query ({ caller }) func getAllPayments() : async [Payment.T] {
    requireUser(caller);
    payments.values().toArray();
  };

  public shared ({ caller }) func createTDSEntry(tripId : Nat, tripCost : Float, tdsPercent : Float, tdsAmount : Float, pan : Text, status : Text) : async Nat {
    requireUser(caller);
    let id = nextTDSEntryId;
    tdsEntries.add(id, { id; tripId; tripCost; tdsPercent; tdsAmount; pan; status });
    nextTDSEntryId += 1;
    id;
  };

  public query ({ caller }) func getTDSEntry(id : Nat) : async TDSEntry.T {
    requireUser(caller);
    switch (tdsEntries.get(id)) {
      case (null) { Runtime.trap("TDS entry does not exist") };
      case (?tdsEntry) { tdsEntry };
    };
  };

  public shared ({ caller }) func updateTDSEntry(id : Nat, tripId : Nat, tripCost : Float, tdsPercent : Float, tdsAmount : Float, pan : Text, status : Text) : async () {
    requireUser(caller);
    tdsEntries.add(id, { id; tripId; tripCost; tdsPercent; tdsAmount; pan; status });
  };

  public shared ({ caller }) func deleteTDSEntry(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete TDS entries");
    };
    tdsEntries.remove(id);
  };

  public query ({ caller }) func getAllTDSEntries() : async [TDSEntry.T] {
    requireUser(caller);
    tdsEntries.values().toArray();
  };

  public type Truck = Truck.T;
  public type Client = Client.T;
  public type Trip = Trip.T;
  public type Invoice = Invoice.T;
  public type DieselEntry = DieselEntry.T;
  public type PettyCash = PettyCash.T;
  public type Payment = Payment.T;
  public type TDSEntry = TDSEntry.T;
};
