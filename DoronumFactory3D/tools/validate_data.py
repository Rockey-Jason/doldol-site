from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
state = (root / "scripts/core/game_state.gd").read_text(encoding="utf-8")
world = (root / "scripts/world/world_generator.gd").read_text(encoding="utf-8")

def section(source: str, start: str, end: str) -> str:
    a = source.find(start)
    b = source.find(end, a + len(start))
    if a < 0 or b < 0:
        raise AssertionError(f"Missing section markers: {start} / {end}")
    return source[a:b]

def dictionary_keys(data: str):
    return re.findall(r'^\s*"([^"]+)"\s*:', data, re.M)

items_src = section(state, "const ITEM_DATA :=", "const RESEARCH:")
recipes_src = section(state, "const RECIPES :=", "var inventory:")
machines_src = section(state, "const MACHINE_DEFS :=", "const MACHINE_RESEARCH_REQUIREMENTS")
research_src = section(state, "const RESEARCH:", "const SKILLS:")
skills_src = section(state, "const SKILLS:", "const FUSION_STAGES:")
fusion_src = section(state, "const FUSION_STAGES:", "const MACHINE_DEFS :=")

def assert_unique(label, values):
    duplicates = sorted({v for v in values if values.count(v) > 1})
    if duplicates:
        raise AssertionError(f"{label} duplicate IDs: {duplicates}")

item_ids = set(dictionary_keys(items_src))
machine_ids = set(dictionary_keys(machines_src))
assert_unique("ITEM_DATA", dictionary_keys(items_src))
assert_unique("MACHINE_DEFS", dictionary_keys(machines_src))
recipe_ids = dictionary_keys(recipes_src)
assert_unique("RECIPES", recipe_ids)

research_ids = re.findall(r'"id"\s*:\s*"([^"]+)"', research_src)
skill_ids = re.findall(r'"id"\s*:\s*"([^"]+)"', skills_src)
assert len(research_ids) == 18, f"Expected 18 research entries, found {len(research_ids)}"
assert len(skill_ids) == 20, f"Expected 20 skill nodes, found {len(skill_ids)}"
assert_unique("RESEARCH", research_ids)
assert_unique("SKILLS", skill_ids)

doronium_ids = re.search(r'const DORONUM_IDS: Array\[String\] = \[(.*?)\]', state, re.S)
if not doronium_ids:
    raise AssertionError("Canonical DORONUM_IDS array missing")
canonical_doronium = re.findall(r'"(ITEM_DORONUM_[A-Z0-9_]+)"', doronium_ids.group(1))
if len(canonical_doronium) != 15:
    raise AssertionError(f"Expected 15 canonical Doronium types, got {len(canonical_doronium)}")
assert_unique("DORONUM_IDS", canonical_doronium)
for item_id in canonical_doronium:
    if item_id not in item_ids:
        raise AssertionError(f"Canonical Doronium item missing ITEM_DATA: {item_id}")

missing_items = []
missing_machines = []
for line in recipes_src.splitlines():
    key_match = re.match(r'^\s*"([^"]+)"\s*:\s*\{', line)
    if not key_match:
        continue
    recipe_id = key_match.group(1)
    inputs = re.search(r'"inputs"\s*:\s*\{([^}]*)\}', line)
    outputs = re.search(r'"outputs"\s*:\s*\{([^}]*)\}', line)
    for block in [inputs.group(1) if inputs else "", outputs.group(1) if outputs else ""]:
        for item_id in re.findall(r'"(ITEM_[A-Z0-9_]+)"\s*:', block):
            if item_id not in item_ids:
                missing_items.append((recipe_id, item_id))
    machine = re.search(r'"machine"\s*:\s*"([A-Z0-9_]+)"', line)
    if machine and machine.group(1) and machine.group(1) not in machine_ids:
        missing_machines.append((recipe_id, machine.group(1)))
if missing_items:
    raise AssertionError(f"Recipe items missing ITEM_DATA: {missing_items}")
if missing_machines:
    raise AssertionError(f"Recipe machines missing MACHINE_DEFS: {missing_machines}")

stages = re.findall(r'"seconds"\s*:\s*([0-9.]+)', fusion_src)
if len(stages) != 7:
    raise AssertionError(f"Expected 7 Infinity stages, found {len(stages)}")
stage_total = sum(float(x) for x in stages)
if abs(stage_total - 260.0) > 1e-6:
    raise AssertionError(f"Infinity ideal runtime must be 260s, got {stage_total}")

if "DORI_TREE_CYCLE_SEC := 60.0" not in state or "DORI_TREE_WATER_L := 2" not in state or "DORI_TREE_YIELD := 1" not in state:
    raise AssertionError("Canonical Dori Meat Tree cycle/water/yield rule missing")
if "2048.0" not in world or "ITEM_DORONUM" in world[world.find("func _create_resource_deposits"):world.find("func _create_dori_forest")]:
    raise AssertionError("World size marker missing or Doronium appears as a natural deposit")

print(f"PASS: {len(item_ids)} items, {len(recipe_ids)} recipes, {len(machine_ids)} machines")
print("PASS: 18 research, 20 skills, 15 canonical Doronium types")
print("PASS: 7-stage Infinity Fusion = 260 ideal running seconds")
print("PASS: resource and Dori Meat Tree canonical constraints")
