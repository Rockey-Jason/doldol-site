# DORONUM FACTORY — INFINITE INDUSTRY
## SAVE_COMPATIBILITY_REPORT · Phase 0 baseline

## 1. Known existing save system

The inspected web prototype doronium-factory/index.html uses browser localStorage:

- Key: rockey_doronium_factory_v1
- Storage scope: browser origin/profile; not a server-side account save.
- Observed state fields from the prototype's JavaScript:
  - money
  - ore
  - alloy
  - energy
  - doronium
  - level
  - xp
  - lifetime
  - totalSold
  - buildings
  - research
  - last
  - started
  - totalSeconds
  - optional logs
- The prototype also calculates offline rewards from elapsed wall-clock time, capped at 8 hours.

This is a browser prototype save format, not a Unity save schema. A browser's actual stored player data was not available for inspection in this audit; only the code's key and serialization shape were inspected.

## 2. Unity save status

| Item | Status |
|---|---|
| Unity save root/path | Not Verifiable |
| Serializer/data classes | Not Verifiable |
| Schema version | Not Verifiable |
| Existing Unity save slots | Not Verifiable |
| Checksum | Not Verifiable |
| Backup/restore | Not Verifiable |
| ItemStack ID aliases | Not Verifiable |
| Migration fixtures | Not Verifiable |
| Crash-recovery validation | Not Verifiable |

The root ProjectSettings/ProjectVersion.txt and Packages/manifest.json were not found, and no Unity Editor was available. No Unity save file was opened or modified.

## 3. Compatibility decision

1. Preserve rockey_doronium_factory_v1 and the existing browser prototype unchanged.
2. Do not interpret its numeric resource counters as canonical ItemStacks.
3. Do not convert its single doronium number into any of the 15 canonical Doronium item IDs.
4. Do not infer Quality, Purity, Synthetic provenance, production history, ownership, reservations, or item IDs from the web save; those values are not represented by the inspected format.
5. Do not import browser last into authoritative production elapsed time. The v4.5.0 default PausePolicy disables offline production.
6. Do not delete or overwrite browser localStorage during a Unity project setup.
7. Treat Unity saves as a separate save system unless a later, explicitly approved, reversible migration is designed from real source/fixture data.

## 4. Required Unity persistence design before implementation

After the actual Unity project is available, inspect existing persistence before choosing the storage format. The canonical requirements include:

- Versioned save schema and stable logical IDs.
- Snapshot only after a completed logical tick and resolved transaction/event dispatch.
- Immutable snapshot before serialization.
- Checksum validation.
- Temporary write and tested replace/move routine.
- At least one previous valid backup.
- Recovery UI that explains invalid saves rather than silently replacing them with an empty world.
- Migration on a copy; original save remains untouched until the new copy validates.
- Alias mapping for renamed IDs; unknown critical IDs must be reported.
- Explicit tests around reservations, production completion, transfers, rewards, shipping, Fusion stages and ending events.

Do not claim atomicity, migration safety or crash recovery until tested in the target Unity environment.

## 5. Migration / rollback status

- Browser-to-Unity migration: Not proposed; no source Unity save/data model to compare.
- Existing browser save rollback: preserve original localStorage key; do not overwrite it.
- Unity migration: Not Verifiable / blocked pending project and save inspection.
- Test fixtures: none supplied or created.
- Actual migration tests: none run.

## 6. Gate

No save migration or destructive save operation was performed during Phase 0. Save compatibility for the future Unity project remains Not Verifiable.
