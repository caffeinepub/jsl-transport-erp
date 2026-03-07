# Jeen Trade ERP

## Current State
- All 14 modules exist using localStorage for local entities (vehicles, consigners, loading trips, unloading, billing invoices, receivables, payables, diesel, petty cash, TDS)
- Diesel page: standalone entries, no link to trip diesel records, no bill upload, no remark
- Receivable page: manually created records only, not linked to billing invoices
- Payable page: manually created records only, not derived from unloading calculations
- Vehicle model: vehicleNumber, vehicleType, ownerName, ownerPhone, ownerAddress, insurance/pollution/fitness expiry, isActive — no bank account or PAN fields

## Requested Changes (Diff)

### Add
- Vehicle: 2 bank account detail sets (account holder, bank name, account number, IFSC, branch) + PAN card field — applies to all vehicle types
- Diesel page: "Bill from Petrol Bunk" section — a manual upload input (file) and a Remark text box for each diesel entry, diesel entries from loading trips also displayed in the same list
- Receivable page: auto-create receivable record when a billing invoice is generated; show vehicle number, bill no, bill date, bill amount from invoice; additional fields: received amount, TDS deduction amount, penalty amount, penalty bill upload; filters by consigner, consignee, vehicle, date range (same as billing page)
- Payable page: auto-populate from unloading records (status = unloaded, no existing payable); grid shows loading date, loading qty, unloading qty, all deduction amounts; checkbox to raise payment request; payment approval dialog to enter paid amount and close trip; trip auto-closed when balance = 0

### Modify
- Vehicle interface + hooks: add panCard, bank1* and bank2* fields
- VehiclesPage.tsx: add PAN and 2 bank account sections in the Add/Edit dialog and display in the vehicle card
- DieselPage.tsx: show diesel from loading trips as read-only rows; add remark textarea and billFile upload field to Add/Edit form; display remark and bill icon in table
- ReceivablePage.tsx: populate from billingInvoices (auto-sync); enhanced form with TDS deduction, penalty amount, penalty bill file upload; billing-page-style filters
- PayablePage.tsx: rewrite to pull from unloadings; grid view with full deduction breakdown; checkbox for payment request; payment dialog with paid amount; auto-close when balance zero

### Remove
- Remove "Add Record" manual entry button from Receivable page for auto-populated invoices (records are created automatically from invoices; only payment updates allowed)
- Remove "Add Record" manual creation from Payable (replaced with auto-population from unloading records)

## Implementation Plan
1. Extend Vehicle interface + hooks with panCard, bank1AccountHolder, bank1BankName, bank1AccountNo, bank1IFSC, bank1Branch, bank2AccountHolder, bank2BankName, bank2AccountNo, bank2IFSC, bank2Branch
2. Update VehiclesPage: add PAN field and two collapsible bank account sections in form; show PAN in card; show bank account count badge
3. Extend DieselEntry in useQueries with billFile (base64/dataURL) and remark fields; update form; pull HSD from loading trips as read-only rows tagged "(Trip HSD)"
4. Extend Receivable interface with vehicleNo, tdsDeduction, penaltyAmount, penaltyBillFile; add sync logic that creates/updates a receivable for each BillingInvoice; ReceivablePage redesigned with filters and extended form
5. Rewrite PayablePage to compute unpaid trips from unloadings + loadingTrips + vehicles; show full deduction grid; checkbox for payment request; "Process Payment" dialog; auto-close when balance = 0; extend Payable interface with tripId reference and full deduction fields
