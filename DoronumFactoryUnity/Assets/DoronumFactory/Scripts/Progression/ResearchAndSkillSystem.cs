using System;
using System.Collections.Generic;
using System.Linq;

namespace DoronumFactory
{
    [Serializable]
    public sealed class SkillDefinition
    {
        public string Id;
        public string Discipline;
        public int Rank;
        public string Description;
        public string PrerequisiteId;
        public SkillDefinition(string id,string discipline,int rank,string description,string prerequisite=null)
        { Id=id;Discipline=discipline;Rank=rank;Description=description;PrerequisiteId=prerequisite; }
    }

    public static class SkillCatalog
    {
        public static readonly SkillDefinition[] All =
        {
            new SkillDefinition("FIELD_SURVEYOR","Exploration",1,"Scanner range +10%."),
            new SkillDefinition("GEOLOGICAL_READOUT","Exploration",2,"Narrower deposit-size estimate range.","FIELD_SURVEYOR"),
            new SkillDefinition("SAFE_PATHFINDER","Exploration",3,"Earlier hazard warnings and safer route hints.","GEOLOGICAL_READOUT"),
            new SkillDefinition("ARCHIVE_SPECIALIST","Exploration",4,"Lore Archive clue links and missing-category guidance.","SAFE_PATHFINDER"),
            new SkillDefinition("STEADY_SWING","Extraction",1,"Mining speed +10%."),
            new SkillDefinition("VEIN_EFFICIENCY","Extraction",2,"By-product chance +2 percentage points, within data cap.","STEADY_SWING"),
            new SkillDefinition("HARDPOINT_CALIBRATION","Extraction",3,"Tool durability wear -10%.","VEIN_EFFICIENCY"),
            new SkillDefinition("DEEP_EXTRACTION","Extraction",4,"Improved deep-zone scanner data and Auto Miner maintenance alerts.","HARDPOINT_CALIBRATION"),
            new SkillDefinition("PRECISE_ALIGNMENT","Manufacturing",1,"Machine condition recovery from maintenance +10%."),
            new SkillDefinition("RECIPE_DISCIPLINE","Manufacturing",2,"Recipe Quality Modifier +2 only where allowed.","PRECISE_ALIGNMENT"),
            new SkillDefinition("PROCESS_CONTROL","Manufacturing",3,"Earlier sensor error detection; does not falsify process values.","RECIPE_DISCIPLINE"),
            new SkillDefinition("FAULT_DIAGNOSTICS","Manufacturing",4,"More detailed failure causes and longer warning lead time.","PROCESS_CONTROL"),
            new SkillDefinition("CONVEYOR_PLANNER","Logistics",1,"Preview belt spacing and port mismatch before building."),
            new SkillDefinition("BUFFER_ENGINEER","Logistics",2,"Buffer building material cost -5% for new builds only.","CONVEYOR_PLANNER"),
            new SkillDefinition("BLUEPRINT_TECHNICIAN","Logistics",3,"Unlock blueprint save/load and connection reconstruction.","BUFFER_ENGINEER"),
            new SkillDefinition("FLOW_OPTIMIZATION","Logistics",4,"Show the three largest power/backpressure bottlenecks.","BLUEPRINT_TECHNICIAN"),
            new SkillDefinition("SAMPLE_EFFICIENCY","Research & Doronum",1,"Sample consumption -5% only for eligible ResearchData."),
            new SkillDefinition("MATERIAL_ANALYST","Research & Doronum",2,"Reveal more detailed quality/purity contribution data.","SAMPLE_EFFICIENCY"),
            new SkillDefinition("CRYSTAL_LATTICE","Research & Doronum",3,"Expanded Doronum crystal-lattice inspection data.","MATERIAL_ANALYST"),
            new SkillDefinition("INFINITY_SAFETY","Research & Doronum",4,"Detailed Infinity preflight causes and predicted risk band.","CRYSTAL_LATTICE")
        };
    }

    public sealed class ResearchAndSkillSystem
    {
        private readonly GameRuntimeState state;
        private readonly InventoryService inventory;
        public event Action ResearchChanged;
        public event Action SkillsChanged;

        public ResearchAndSkillSystem(GameRuntimeState gameState,InventoryService inventoryService)
        { state=gameState;inventory=inventoryService;EnsureResearchRecords(); }

        private void EnsureResearchRecords()
        {
            foreach (var definition in FactoryCatalog.Research)
                if (!state.Research.Exists(x=>x.ResearchId==definition.Id))
                    state.Research.Add(new ResearchProgressData { ResearchId=definition.Id,Completed=definition.Id=="RESEARCH_BASIC_SURVIVAL" });
        }

        public bool IsResearchCompleted(string id)
        {
            var record=state.Research.Find(x=>x.ResearchId==id);
            return record!=null && record.Completed;
        }

        public bool IsResearchUnlocked(ResearchDefinition definition)
        {
            return definition.Prerequisites.All(IsResearchCompleted);
        }

        public string ResearchState(ResearchDefinition definition)
        {
            if (IsResearchCompleted(definition.Id)) return "COMPLETED";
            if (state.ActiveResearchId==definition.Id) return "RUNNING";
            if (!IsResearchUnlocked(definition)) return "BLOCKED_PREREQUISITE";
            return state.ResearchPoints>=definition.CostRP?"AVAILABLE":"WAITING_RP";
        }

        public bool StartResearch(string researchId)
        {
            var def=FactoryCatalog.Research.FirstOrDefault(x=>x.Id==researchId);
            if (def==null || !string.IsNullOrEmpty(state.ActiveResearchId) || IsResearchCompleted(researchId) ||
                !IsResearchUnlocked(def) || state.ResearchPoints<def.CostRP) return false;
            int labTier=def.Tier<=2?0:(def.Tier<=4?1:2);
            var lab=state.Machines.FirstOrDefault(m=>m.MachineId=="RESEARCH_LAB" && m.Condition>0f && m.PowerRatio>=0.8f);
            if (lab==null) return false;
            float requiredPower=labTier==0?25f:(labTier==1?100f:250f);
            if (lab.PowerRatio<0.8f || state.LastPowerGenerationKW<requiredPower) return false;
            state.ResearchPoints-=def.CostRP;
            state.ActiveResearchId=researchId;
            var progress=state.Research.Find(x=>x.ResearchId==researchId);
            progress.Running=true;
            progress.ProgressSeconds=state.ActiveResearchProgress;
            ResearchChanged?.Invoke();
            return true;
        }

        public void Tick(float deltaSeconds)
        {
            if (string.IsNullOrEmpty(state.ActiveResearchId)) return;
            var def=FactoryCatalog.Research.FirstOrDefault(x=>x.Id==state.ActiveResearchId);
            if (def==null) { state.ActiveResearchId=null;state.ActiveResearchProgress=0f;return; }
            var lab=state.Machines.FirstOrDefault(m=>m.MachineId=="RESEARCH_LAB" && m.Condition>0f);
            if (lab==null || lab.PowerRatio<0.8f) return;
            int researchTier=def.Tier;
            float multiplier=lab.PowerRatio;
            state.ActiveResearchProgress+=deltaSeconds*multiplier;
            var record=state.Research.Find(x=>x.ResearchId==def.Id);
            record.ProgressSeconds=state.ActiveResearchProgress;
            if (record.ProgressSeconds<def.DurationSeconds) return;
            record.Completed=true;
            record.Running=false;
            state.TryClaim("RESEARCH_COMPLETE:"+def.Id,"RESEARCH_COMPLETED",0);
            state.SetFlag("RESEARCH_COMPLETED:"+def.Id);
            state.ActiveResearchId=null;
            state.ActiveResearchProgress=0f;
            int reachedTier=FactoryCatalog.Research.Where(x=>IsResearchCompleted(x.Id)).Select(x=>x.Tier).DefaultIfEmpty(0).Max();
            for (int tier=1;tier<=Math.Min(7,reachedTier);tier++)
                GrantSkillPointOnce("TIER_FIRST_REACH:"+tier,1);
            ResearchChanged?.Invoke();
        }

        public bool AnalyzeSample(string itemId)
        {
            if (!FactoryCatalog.Items.ContainsKey(itemId)) return false;
            string claim="SAMPLE_ANALYSIS:"+state.WorldSeed+":"+itemId;
            if (state.HasClaim(claim) || inventory.Count(itemId)<1) return false;
            int rp=500;
            string category=FactoryCatalog.Items[itemId].Category;
            if (category=="Ore" || category=="Metal" || category=="Part" || category=="Electronics") rp=1000;
            if (category=="Crystal" || category=="Doronum") rp=1500;
            if (itemId=="ITEM_DIAMOND" || itemId=="ITEM_NEODYMIUM_ORE" || itemId=="ITEM_HEAT_CRYSTAL" || itemId=="ITEM_COLD_CRYSTAL") rp=2500;
            if (!inventory.TryReserveEligible(itemId,1,0f,0f,false,out var sample)) return false;
            state.TryClaim(claim,"SAMPLE_ANALYSIS",rp);
            state.ResearchPoints+=rp;
            ResearchChanged?.Invoke();
            return true;
        }

        public bool GrantFirstScan(string itemId)
        {
            int rp=100;
            if (new[]{"ITEM_NICKEL_ORE","ITEM_LEAD_ORE","ITEM_MAGNETITE","ITEM_QUARTZ","ITEM_CHROME_ORE","ITEM_GOLD_ORE","ITEM_ALUMINUM_ORE","ITEM_TITANIUM_ORE"}.Contains(itemId)) rp=250;
            if (new[]{"ITEM_DIAMOND","ITEM_NEODYMIUM_ORE","ITEM_HEAT_CRYSTAL","ITEM_COLD_CRYSTAL"}.Contains(itemId)) rp=500;
            string claim="FIRST_SCAN:"+state.WorldSeed+":"+itemId;
            if (!state.TryClaim(claim,"RESOURCE_SCAN",rp)) return false;
            state.ResearchPoints+=rp; ResearchChanged?.Invoke(); return true;
        }

        public void GrantFirstRecipe(RecipeDefinition recipe)
        {
            if (recipe==null) return;
            string claim="FIRST_RECIPE:"+recipe.Id;
            if (!state.TryClaim(claim,"FIRST_RECIPE",FactorySimulation.RecipeRp(recipe))) return;
            state.ResearchPoints+=FactorySimulation.RecipeRp(recipe);
            ResearchChanged?.Invoke();
        }

        public bool TryPurchaseSkill(string skillId)
        {
            var skill=SkillCatalog.All.FirstOrDefault(x=>x.Id==skillId);
            if (skill==null || state.PurchasedSkills.Contains(skillId) || state.SkillPoints<1) return false;
            if (!string.IsNullOrEmpty(skill.PrerequisiteId) && !state.PurchasedSkills.Contains(skill.PrerequisiteId)) return false;
            state.SkillPoints--;
            state.PurchasedSkills.Add(skillId);
            SkillsChanged?.Invoke();
            return true;
        }

        public bool GrantSkillPointOnce(string claimId,int amount=1)
        {
            if (amount<=0 || !state.TryClaim("SKILL_POINT:"+claimId,"SKILL_MILESTONE",amount)) return false;
            state.SkillPoints+=amount;
            SkillsChanged?.Invoke();
            return true;
        }
    }
}
