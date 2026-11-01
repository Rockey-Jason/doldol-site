#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace DoronumFactory.Editor
{
    public static class FactoryDataValidator
    {
        [MenuItem("Doronum Factory/Validate Canonical Data")]
        public static void Validate()
        {
            var errors=new List<string>();
            var warnings=new List<string>();
            var itemIds=new HashSet<string>(FactoryCatalog.Items.Keys,StringComparer.Ordinal);
            var recipeIds=new HashSet<string>(FactoryCatalog.Recipes.Keys,StringComparer.Ordinal);
            var machineIds=new HashSet<string>(MachineCatalog.All.Keys,StringComparer.Ordinal);
            var researchIds=new HashSet<string>(FactoryCatalog.Research.Select(x=>x.Id),StringComparer.Ordinal);
            var skillIds=new HashSet<string>(SkillCatalog.All.Select(x=>x.Id),StringComparer.Ordinal);

            if(FactoryCatalog.Research.Length!=18) errors.Add("Research count must be exactly 18.");
            if(SkillCatalog.All.Length!=20) errors.Add("Skill node count must be exactly 20.");
            if(GameIds.InfinityInputs.Length!=15 || GameIds.InfinityInputs.Distinct(StringComparer.Ordinal).Count()!=15)
                errors.Add("Infinity input manifest must contain 15 unique canonical IDs.");
            foreach(var id in GameIds.InfinityInputs)
                if(!itemIds.Contains(id)) errors.Add("Missing canonical Infinity item: "+id);

            if(FactoryCatalog.FusionStages.Length!=7) errors.Add("Infinity Fusion must have 7 stages.");
            float total=FactoryCatalog.FusionStages.Sum(x=>x.RunningSeconds);
            if(Math.Abs(total-260f)>0.001f) errors.Add("Infinity ideal running time must equal 260 seconds.");
            float[] expectedPowers={0.5f,1f,1.5f,2.5f,3.5f,4.5f,5f};
            for(int i=0;i<Math.Min(expectedPowers.Length,FactoryCatalog.FusionStages.Length);i++)
                if(Math.Abs(FactoryCatalog.FusionStages[i].MaxPowerMW-expectedPowers[i])>0.001f)
                    errors.Add("Wrong Fusion stage power at index "+i);
            if(Math.Abs(FactorySimulation.TickSeconds-0.1f)>0.00001f) errors.Add("Simulation tick must be exactly 0.10 seconds.");

            foreach(var recipe in FactoryCatalog.Recipes.Values)
            {
                if(!string.IsNullOrEmpty(recipe.MachineId) && !machineIds.Contains(recipe.MachineId))
                    errors.Add(recipe.Id+": unknown required machine "+recipe.MachineId);
                foreach(var input in recipe.Inputs)
                    if(!itemIds.Contains(input.ItemId)) errors.Add(recipe.Id+": unknown input "+input.ItemId);
                foreach(var output in recipe.Outputs)
                    if(!itemIds.Contains(output.ItemId)) errors.Add(recipe.Id+": unknown output "+output.ItemId);
                if(recipe.DurationSeconds<=0f) errors.Add(recipe.Id+": duration must be positive.");
                if(recipe.PowerKW<0f) errors.Add(recipe.Id+": power cannot be negative.");
            }

            foreach(var research in FactoryCatalog.Research)
            {
                foreach(var prereq in research.Prerequisites)
                    if(!researchIds.Contains(prereq)) errors.Add(research.Id+": unknown prerequisite "+prereq);
                if(research.CostRP<0 || research.DurationSeconds<0f) errors.Add(research.Id+": negative cost/duration.");
            }
            if(HasResearchCycle()) errors.Add("Research prerequisite graph contains a cycle.");

            foreach(var skill in SkillCatalog.All)
                if(!string.IsNullOrEmpty(skill.PrerequisiteId) && !skillIds.Contains(skill.PrerequisiteId))
                    errors.Add(skill.Id+": unknown skill prerequisite "+skill.PrerequisiteId);

            if(FactoryCatalog.Recipes.TryGetValue("DORONUM_NORMAL",out var normal))
            {
                if(normal.Inputs.Count!=1 || normal.Inputs[0].ItemId!="ITEM_DORI_MEAT" || normal.Inputs[0].Quantity!=10)
                    errors.Add("Normal Doronum must use exactly 10 natural Dori Meat.");
                if(normal.Outputs.Count!=1 || normal.Outputs[0].ItemId!=GameIds.Normal || normal.Outputs[0].Quantity!=1)
                    errors.Add("Normal Doronum output must be exactly 1.");
                if(normal.AllowSyntheticInput) errors.Add("Normal Doronum cannot allow synthetic input.");
            }
            if(errors.Count>0)
            {
                foreach(var e in errors) Debug.LogError("[DORONUM DATA] "+e);
                throw new InvalidOperationException("Doronum Factory validation failed: "+errors.Count+" error(s).");
            }
            Debug.Log("[DORONUM DATA] PASS · 18 research · 20 skills · 15 Infinity IDs · 7 fusion stages / 260s · "+
                FactoryCatalog.Items.Count+" items · "+FactoryCatalog.Recipes.Count+" recipes · "+MachineCatalog.All.Count+" machines.");
            foreach(var w in warnings) Debug.LogWarning("[DORONUM DATA] "+w);
        }

        private static bool HasResearchCycle()
        {
            var visiting=new HashSet<string>(StringComparer.Ordinal);
            var visited=new HashSet<string>(StringComparer.Ordinal);
            bool Visit(string id)
            {
                if(visiting.Contains(id)) return true;
                if(visited.Contains(id)) return false;
                visiting.Add(id);
                var node=FactoryCatalog.Research.FirstOrDefault(x=>x.Id==id);
                if(node!=null)
                    foreach(var p in node.Prerequisites)
                        if(Visit(p)) return true;
                visiting.Remove(id);visited.Add(id);return false;
            }
            foreach(var node in FactoryCatalog.Research)
                if(Visit(node.Id)) return true;
            return false;
        }
    }
}
#endif
