# Database & Sync Skill
This guide covers Dexie.js (v3) schema and Supabase sync logic.

## Dexie Tables
- `employees`: (id, idcardNumber, employeeCode, name, departmentId, isActive)
- `mealLogs`: (id, userId, mealType, date, timestamp, sync_status, sync_key)
- **Index:** [userId+mealType+date] is used for duplicate prevention.

## Schema Versioning Rule
- Dexie primary keys are immutable. 
- To change a PK: Set version schema to `null` in `db.version(x).stores()`, then define new schema in `db.version(x+1)`.

## Sync Policy
- **Push:** Local `mealLogs` (unsynced) -> Supabase. Upsert with `sync_key`.
- **Pull:** Supabase -> Local (Employees, Configs). Clear local then bulk-add.