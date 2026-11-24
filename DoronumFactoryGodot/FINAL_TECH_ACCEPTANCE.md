# Final Tech Acceptance Checklist

This file defines the intended endgame gate. The final technology is not accepted merely because a recipe or button exists.

## A. Story and research gates

- [ ] All 18 research nodes complete with their declared RP costs and prerequisites.
- [ ] Four BLUE FURNACE INCIDENT lore records restored.
- [ ] Abandoned First Factory found.
- [ ] First Factory Archive, Cooling Core and Resonance Chamber restored at their physical POIs.
- [ ] ORBIT 04 gate unlocked by the actual story/research conditions.
- [ ] Three final safety diagnostics passed against physical hardware and actual stored power.

## B. Doronum production

- [ ] Natural Dori Meat Tree consumes 2L water, grows for 60s, yields one natural Dori Meat and regrows without destruction.
- [ ] Synthetic Dori Meat is rejected by all Doronum recipes.
- [ ] Normal Doronum is 10 natural Dori Meat → 1 Normal Doronum.
- [ ] All 14 variant recipes are assigned to their specified machine.
- [ ] Rusted Doronum purification consumes the declared batch and applies its recorded Purity bonus.
- [ ] Special Edition requires Archive Pattern and the restored Archive contract.
- [ ] Limited Edition requires Contract Seal and the Legacy Batch contract.
- [ ] Edition supply counters stop at 100 each.

## C. Infinity Fusion preflight

- [ ] Infinity Fusion Machine, Fusion Power Buffer, Containment Shield, Emergency Cooling System, Pressure Calibration Rig and Cooling Stabilizer exist and are in service.
- [ ] Fusion Power Buffer has at least 400kWh.
- [ ] Each of the 15 canonical IDs has at least 100 available units.
- [ ] Every reserved lot is natural, Quality≥90.0 and Purity≥90.0 before display rounding.
- [ ] Exact manifest (stack IDs, IDs, quantities, Quality, Purity, provenance) and checksum are persisted.
- [ ] Any failed preflight or reservation attempt leaves inventory unchanged.

## D. Seven-stage process

| Stage | Temperature | Pressure | Max power | Ideal progress |
|---|---:|---:|---:|---:|
| 1 | 500°C | 100MPa | 0.5MW | 20s |
| 2 | 1,200°C | 500MPa | 1.0MW | 25s |
| 3 | 1,800°C | 1,000MPa | 1.5MW | 30s |
| 4 | 2,500°C | 5,000MPa | 2.5MW | 35s |
| 5 | 3,500°C | 10,000MPa | 3.5MW | 40s |
| 6 | 4,500°C | 15,000MPa | 4.5MW | 50s |
| 7 | 5,000°C | 20,000MPa | 5.0MW | 60s |

- [ ] Ramp time and pauses extend wall-clock time; target values never snap instantly.
- [ ] RUNNING/BROWNOUT_RUNNING samples drive measured temperature/pressure/condition/power scores.
- [ ] Output Quality uses the canonical 40/20/20/10/10 formula.
- [ ] Output Purity uses weighted input Purity minus loss plus purification and output modifiers.
- [ ] Exactly one Infinity output payload is committed and can be collected only once.
- [ ] Minor/Major/Critical failure profiles record their return/loss manifest and can be recovered once.
- [ ] Save/load in every stage preserves the same job, manifest, progress, RNG index and output ownership.

## E. Planetary ending

- [ ] Exactly three distinct Stabilization Relays are installed and activated.
- [ ] One Stabilization Core is installed and consumes the single Infinity item.
- [ ] Phase 1, 2 and 3 complete for 60/90/120 seconds with required power and all relay/core interlocks.
- [ ] Ending triggers once, and Continue unlocks Infinite Industry free play.

## Current status

This is the acceptance contract, not a claim that every checkbox has passed. The Godot CI workflow must pass, then an actual full campaign playthrough must verify the complete path.
