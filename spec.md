# Jeen Trade ERP

## Current State
- CashBankPage exists with Cash Book and Bank Book tabs using localStorage (`jt_cash_bank_entries`). The Add Entry form works manually but payments recorded in Receivable/Payable do NOT auto-create Cash/Bank entries. No multiple bank account support.
- TDSPage exists with 3 tabs (Advance Cash TDS, Vehicle Payment TDS, TDS Receivable) using `jt_tds_entries` localStorage. TDS deducted in Receivable/Payable payments does NOT auto-create TDS entries. Manual entry required.
- DieselPage has Trip HSD Records tab (auto from loading trips) and Manual Bunk Bills tab (separate manual entries). Trip HSD entries from loading do NOT appear in the Manual Bunk Bill tab vehicle-wise for bill number assignment.

## Requested Changes (Diff)

### Add
- `bankAccountName` field to `CashBankEntry` interface in useQueries.ts (for multiple bank accounts)
- When recording a payment in ReceivablePage (client pays us), auto-create a Cash/Bank receipt entry in `jt_cash_bank_entries` with category "Client Receipt", narration = invoice no + client name, mode = Cash or Bank, bankAccountName if bank mode
- When recording a payment in PayablePage (we pay vehicle), auto-create a Cash/Bank payment entry in `jt_cash_bank_entries` with category "Vehicle Payment", narration = challan no + vehicle no
- When recording a payment in ReceivablePage with TDS deducted > 0, auto-create a TDS Receivable record in `jt_tds_entries` with tdsType="tds_receivable"
- When recording a payment in PayablePage with TDS deducted > 0, auto-create a TDS Payable record in `jt_tds_entries` with tdsType="vehicle_payment"
- New Diesel flow: Manual Bunk Bill tab now shows trip HSD entries (from loading trips via `jt_loading_trips`) grouped vehicle-wise. Each entry shows vehicle no, challan no, bunk name, litres, amount. User can enter bill number inline (from bunk physical bill). Once bill number saved, that entry also shows in Trip HSD Records tab with the bill number.

### Modify
- `CashBankPage.tsx`: Add `bankAccountName` text input field (shown only when book = "bank"). Add a filter dropdown at top to filter by bank account name. Bank entries table shows bankAccountName column. Categories for bank include common transaction types.
- `ReceivablePage.tsx`: In `handleAddNewPayment`, after `addPayment.mutateAsync` succeeds, auto-save to `jt_cash_bank_entries` (receipt entry) and if tdsDeducted > 0, auto-save to `jt_tds_entries` (tds_receivable).
- `PayablePage.tsx`: In `handleAddPayablePayment`, after `addPayablePayment.mutateAsync` succeeds, auto-save to `jt_cash_bank_entries` (payment entry). If payment record has TDS deduction, auto-save to `jt_tds_entries` (vehicle_payment).
- `DieselPage.tsx`: Redesign Manual Bunk Bills tab to show trip HSD entries (all loading trips with hsdAmount > 0) listed vehicle-wise. Add inline bill number entry field per trip. When bill number is saved, update the diesel entry in `jt_local_diesel` with billNo. Remove the concept of completely separate manual entries (or keep them as a sub-section).
- `useQueries.ts`: Add `bankAccountName?: string` to `CashBankEntry` interface.

### Remove
- Nothing removed

## Implementation Plan
1. Update `CashBankEntry` interface in useQueries.ts to add `bankAccountName?: string`
2. Update `CashBankPage.tsx`: add bankAccountName input for bank entries, filter by bank account, show bankAccountName in table
3. Update `ReceivablePage.tsx`: after successful payment save, write to `jt_cash_bank_entries` (receipt) and `jt_tds_entries` (if tds > 0)
4. Update `PayablePage.tsx`: after successful payment save, write to `jt_cash_bank_entries` (payment)
5. Update `DieselPage.tsx`: redesign Manual Bunk Bills tab to show trip HSD entries vehicle-wise with inline bill number assignment; saved bill numbers update the trip diesel entry and show in Trip HSD Records
