# Jeen Trade ERP

## Current State
- TDS page records manual TDS entries but lacks structured separation by type (advance cash TDS, vehicle payment TDS, receivable TDS)
- Accounts Receivable supports partial payments but remaining balance is not tracked as a separate installment entry with full history
- Accounts Payable supports partial payments but same limitation - no installment history per trip

## Requested Changes (Diff)

### Add
- TDS Page: 3 distinct TDS entry types:
  1. **TDS on Advance Cash** - linked to cash advance at loading
  2. **TDS at Vehicle Final Payment** - linked to Accounts Payable settlement
  3. **TDS Receivable** - linked to Accounts Receivable bill receipt from consigner
- TDS Page: filter tabs by type, PAN-wise summary, monthly summary
- Receivable: installment history per invoice - each partial payment recorded as a separate row with date, amount, reference number
- Payable: installment history per trip - each partial payment recorded as a separate row with date, amount, UTR
- Both: "Add Payment" button always visible on Partial/Pending records to record next installment

### Modify
- TDS Page: restructure UI into 3 sections/tabs with separate entry forms and tables per type
- Receivable: payment dialog shows full installment history before allowing new entry
- Payable: payment dialog shows full installment history before allowing new entry
- Remaining balance computed from sum of all installments subtracted from total

### Remove
- Nothing removed

## Implementation Plan
1. Update TDS localStorage schema to store `tdsType` field: 'advance_cash' | 'vehicle_payment' | 'tds_receivable'
2. Restructure TDSPage with 3 tabs, separate add forms, and filtered tables per type
3. Add PAN-wise and monthly summary cards
4. Update Receivable: store `payments[]` array per invoice with {date, amount, reference, mode}
5. Update Payable: store `payments[]` array per trip with {date, amount, utr, mode}
6. Both pages: show payment history in dialog before new entry form; compute balance from payments array
7. "Add Payment" button on all Partial/Pending rows
