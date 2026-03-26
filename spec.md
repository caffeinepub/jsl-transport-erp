# Jeen Trade ERP

## Current State
DieselPage has manual diesel entries with fields: vehicle, date, vendor (bunk), litre, rate, total, remark, billFile, billNo, source (manual/trip), tripRef. Bill number is assigned inline per row. No concept of slip number exists.

## Requested Changes (Diff)

### Add
- `slipNo` field (string) to `LocalDieselEntry` interface
- Slip No input in the manual diesel entry form (the physical slip number given by bunk at time of refueling)
- Slip No column in the manual diesel records table
- **Bill Number grouping UI**: a separate action to assign one bill number to multiple slips at once (multi-select slips → enter bill number → save). Alternatively, assign bill number per slip inline.
- Once a bill number is assigned to a slip, that entire row becomes **read-only** (no edit, no delete). Show a lock icon + bill number badge.
- A locked/billed slip still shows all details (vehicle, date, litre, rate, slip no, bill no) in read-only mode.

### Modify
- `LocalDieselEntry` in `useQueries.ts`: add `slipNo: string` field
- Manual entry form: add Slip No field (required for manual entries)
- Manual diesel table: add Slip No column; when `billNo` is set, disable Edit/Delete and show read-only lock badge with bill number
- Bill number assignment: keep existing inline bill-no edit, but once saved it locks the row

### Remove
- Nothing removed

## Implementation Plan
1. Add `slipNo: string` to `LocalDieselEntry` interface in `useQueries.ts`
2. Update `defaultForm` in DieselPage to include `slipNo: ""`
3. Add Slip No field to the Add Manual Diesel dialog
4. Update `saveManual` to include slipNo in the saved data
5. Add Slip No column in the manual table
6. When `billNo` is non-empty on a row: disable Edit and Delete buttons, show a lock icon, show bill no as a read-only green badge. Row should visually indicate it is locked (e.g. light green background or lock icon).
7. The existing inline bill-no input/save remains, but once saved (billNo set), the row locks completely.
