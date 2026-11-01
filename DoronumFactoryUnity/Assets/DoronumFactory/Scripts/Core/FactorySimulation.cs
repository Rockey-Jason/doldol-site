using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace DoronumFactory
{
    public sealed class FactorySimulation
    {
        public const float TickSeconds=0.10f;
        private readonly GameRuntimeState state;
        private readonly InventoryService inventory;
        private float elapsedGameSeconds;
        private readonly Dictionary<string,List<float>> powerSamples=new Dictionary<string,List<float>>(StringComparer.Ordinal);
        public event Action<MachineRuntimeData> MachineChanged;
        public event Action<string> ProductionCompleted;
        public event Action<string,string> MachineFailed;

        public FactorySimulation(GameRuntimeState gameState,InventoryService inventoryService)
        { state=gameState??throw new ArgumentNullException(nameof(gameState)); inventory=inventoryService??throw new ArgumentNullException(nameof(inventoryService)); }

        public void Tick()
        {
            state.SimulationTick++;
            elapsedGameSeconds+=TickSeconds;
            AllocatePower();
            foreach (var machine in state.Machines.ToList()) TickMachine(machine);
        }

        public MachineRuntimeData PlaceMachine(string machineId,Vector3 position,int rotation=0)
        {
            var record=new MachineRuntimeData {
                InstanceId=Guid.NewGuid().ToString("N"),MachineId=machineId,
                X=position.x,Y=position.y,Z=position.z,Rotation=((rotation%4)+4)%4,
                State="IDLE",Condition=100f,PowerRatio=1f
            };
            state.Machines.Add(record);
            return record;
        }

        public bool AssignRecipe(string instanceId,string recipeId)
        {
            var machine=state.Machines.Find(x=>x.InstanceId==instanceId);
            if (machine==null || !FactoryCatalog.Recipes.TryGetValue(recipeId,out var recipe) ||
                recipe.MachineId!=machine.MachineId || machine.CompletionBuffer.Count>0) return false;
            machine.RecipeId=recipeId;
            machine.State="IDLE";
            MachineChanged?.Invoke(machine);
            return true;
        }

        public bool CollectOutput(string instanceId)
        {
            var machine=state.Machines.Find(x=>x.InstanceId==instanceId);
            if (machine==null || machine.CompletionBuffer.Count==0) return false;
            foreach (var stack in machine.CompletionBuffer)
                inventory.Add(stack.ItemId,stack.Quantity,stack.Quality,stack.Purity,stack.Synthetic,stack.Provenance);
            machine.CompletionBuffer.Clear();
            machine.State="IDLE";
            MachineChanged?.Invoke(machine);
            return true;
        }

        public bool SupplyMachine(string instanceId,string itemId,int quantity)
        {
            var machine=state.Machines.Find(x=>x.InstanceId==instanceId);
            if (machine==null || quantity<=0 || inventory.Count(itemId)<quantity) return false;
            var copy=state.Inventory.Select(x=>x.Clone()).ToList();
            var total=inventory.EligibleQuantity(itemId,0f,0f,true);
            if (total<quantity || !inventory.Remove(itemId,quantity)) return false;
            float q=90f,p=90f;
            var used=copy.Where(x=>x.ItemId==itemId).ToList();
            if (used.Count>0) { q=used.Average(x=>x.Quality); p=used.Average(x=>x.Purity); }
            machine.InputBuffer.Add(new ItemStackData {
                StackId=Guid.NewGuid().ToString("N"),ItemId=itemId,Quantity=quantity,
                Quality=q,Purity=p,Synthetic=used.Any(x=>x.Synthetic),Provenance="PLAYER_SUPPLY"
            });
            MachineChanged?.Invoke(machine);
            return true;
        }

        private void AllocatePower()
        {
            float daylight=Mathf.Clamp01(Mathf.Sin((elapsedGameSeconds/1800f)*Mathf.PI*2f)*0.5f+0.5f);
            float generated=0f,requested=0f;
            var requests=new List<(MachineRuntimeData machine,float required,int priority)>();
            foreach (var m in state.Machines)
            {
                if (m.MachineId=="GENERATOR")
                {
                    if (m.FuelSeconds>0f) generated+=600f;
                    continue;
                }
                if (m.MachineId=="SOLAR_PANEL") { generated+=90f*daylight; continue; }
                if (m.MachineId=="WIND_TURBINE") { generated+=180f; continue; }
                if (m.MachineId=="BATTERY") continue;
                float process=0f;
                if (!string.IsNullOrEmpty(m.RecipeId) && FactoryCatalog.Recipes.TryGetValue(m.RecipeId,out var recipe) &&
                    (m.ReservedInputs.Count>0 || m.CompletionBuffer.Count==0)) process=recipe.PowerKW;
                float idle=1f;
                float required=idle+process;
                if (required<=0f) { m.PowerRatio=1f; continue; }
                int priority=0;
                if (m.MachineId.Contains("DORONUM") || m.MachineId.Contains("FUSION") || m.MachineId.Contains("STABILIZATION")) priority=1;
                else if (m.MachineId.Contains("AUTO") || m.MachineId.Contains("FABRICATOR")) priority=2;
                else priority=3;
                requests.Add((m,required,priority));
                requested+=required;
            }
            float remaining=generated,consumed=0f;
            foreach (int priority in new[]{0,1,2,3})
            {
                var group=requests.Where(r=>r.priority==priority).ToList();
                float groupNeed=group.Sum(x=>x.required);
                float ratio=groupNeed<=0f?1f:Mathf.Min(1f,remaining/groupNeed);
                foreach (var request in group)
                {
                    request.machine.PowerRatio=ratio;
                    float allocation=request.required*ratio;
                    remaining-=allocation;
                    consumed+=allocation;
                }
            }
            state.LastPowerGenerationKW=generated;
            state.LastPowerConsumptionKW=consumed;
            state.LastPowerRatio=requested<=0f?1f:Mathf.Clamp01(generated/requested);
            foreach (var m in state.Machines)
                if (m.MachineId=="GENERATOR" && m.FuelSeconds>0f) m.FuelSeconds=Mathf.Max(0f,m.FuelSeconds-TickSeconds);
        }

        private void TickMachine(MachineRuntimeData machine)
        {
            if (machine.CompletionBuffer.Count>0) { machine.State="PAUSED_OUTPUT"; MachineChanged?.Invoke(machine); return; }
            if (machine.Condition<=0f) { machine.State="BROKEN"; MachineChanged?.Invoke(machine); return; }
            if (string.IsNullOrEmpty(machine.RecipeId) || !FactoryCatalog.Recipes.TryGetValue(machine.RecipeId,out var recipe))
            { machine.State="IDLE"; return; }
            if (!string.IsNullOrEmpty(recipe.RequiredStoryFlag) && !state.HasFlag(recipe.RequiredStoryFlag))
            { machine.State="LOCKED_STORY"; return; }
            if (recipe.MaxTotal>0)
            {
                int produced=state.Machines.Where(m=>m.MachineId==machine.MachineId).SelectMany(m=>m.CompletionBuffer)
                    .Where(s=>recipe.Outputs.Any(o=>o.ItemId==s.ItemId)).Sum(s=>s.Quantity);
                int pending=state.Machines.Count(m=>m.RecipeId==recipe.Id && m.ReservedInputs.Count>0);
                if (produced+pending>=recipe.MaxTotal && machine.ReservedInputs.Count==0) { machine.State="SUPPLY_LIMIT"; return; }
            }
            if (machine.ReservedInputs.Count==0 && !TryReserveRecipeInputs(machine,recipe))
            { machine.State="WAITING_INPUT"; MachineChanged?.Invoke(machine); return; }
            if (machine.PowerRatio<0.8f) { machine.State="PAUSED_POWER"; MachineChanged?.Invoke(machine); return; }

            float progressDelta=TickSeconds*machine.PowerRatio*(machine.Condition<=10f?0.8f:1f);
            float targetTemp=recipe.UsesTemperature?recipe.TemperatureC:20f;
            float targetPressure=recipe.UsesPressure?recipe.PressureMPa:0f;
            machine.CurrentTemperatureC=Mathf.MoveTowards(machine.CurrentTemperatureC,targetTemp,Mathf.Max(20f,targetTemp*0.8f)*progressDelta);
            machine.CurrentPressureMPa=Mathf.MoveTowards(machine.CurrentPressureMPa,targetPressure,Mathf.Max(10f,targetPressure*0.8f)*progressDelta);
            float tempBand=recipe.UsesTemperature?Mathf.Max(10f,targetTemp*0.1f):float.MaxValue;
            float pressureBand=recipe.UsesPressure?Mathf.Max(5f,targetPressure*0.1f):float.MaxValue;
            bool inBand=Mathf.Abs(machine.CurrentTemperatureC-targetTemp)<=tempBand &&
                        Mathf.Abs(machine.CurrentPressureMPa-targetPressure)<=pressureBand;
            if (!inBand) { machine.State="CALIBRATING"; MachineChanged?.Invoke(machine); return; }
            machine.State=machine.PowerRatio<0.999f?"BROWNOUT_RUNNING":"RUNNING";
            machine.ProgressSeconds+=progressDelta;
            machine.Condition=Mathf.Max(0f,machine.Condition-0.002f*progressDelta);
            RecordPowerSample(machine);
            if (machine.ProgressSeconds>=recipe.DurationSeconds) CommitProduction(machine,recipe);
            MachineChanged?.Invoke(machine);
        }

        private bool TryReserveRecipeInputs(MachineRuntimeData machine,RecipeDefinition recipe)
        {
            var before=state.Inventory.Select(x=>x.Clone()).ToList();
            var reserved=new List<ItemStackData>();
            foreach (var input in recipe.Inputs)
            {
                if (!inventory.TryReserveEligible(input.ItemId,input.Quantity,0f,0f,recipe.AllowSyntheticInput,out var parts))
                {
                    state.Inventory.Clear(); state.Inventory.AddRange(before);
                    machine.State="WAITING_INPUT"; return false;
                }
                reserved.AddRange(parts);
            }
            machine.ReservedInputs=reserved;
            machine.ProgressSeconds=0f;
            return true;
        }

        private void CommitProduction(MachineRuntimeData machine,RecipeDefinition recipe)
        {
            if (machine.CompletionBuffer.Count>0) { machine.State="PAUSED_OUTPUT"; return; }
            float totalQ=0f,totalP=0f,total=0f;
            foreach (var stack in machine.ReservedInputs)
            {
                totalQ+=stack.Quality*stack.Quantity;
                totalP+=stack.Purity*stack.Quantity;
                total+=stack.Quantity;
            }
            float materialQ=total<=0f?90f:totalQ/total;
            float materialP=total<=0f?90f:totalP/total;
            float tempScore=recipe.UsesTemperature?ProcessScore(machine.CurrentTemperatureC,recipe.TemperatureC):100f;
            float pressureScore=recipe.UsesPressure?ProcessScore(machine.CurrentPressureMPa,recipe.PressureMPa):100f;
            float stability=GetPowerStability(machine);
            float outputQ=Mathf.Clamp(materialQ*0.4f+tempScore*0.2f+pressureScore*0.2f+machine.Condition*0.1f+stability*0.1f+recipe.QualityModifier,0f,100f);
            float outputP=Mathf.Clamp(materialP-recipe.PurityLoss+recipe.PurificationBonus,0f,100f);
            foreach (var output in recipe.Outputs)
                machine.CompletionBuffer.Add(new ItemStackData {
                    StackId=Guid.NewGuid().ToString("N"),ItemId=output.ItemId,Quantity=output.Quantity,
                    Quality=outputQ,Purity=outputP,Synthetic=machine.ReservedInputs.Exists(s=>s.Synthetic),
                    Provenance="RECIPE:"+recipe.Id
                });
            machine.ReservedInputs.Clear();
            machine.ProgressSeconds=0f;
            machine.State="PAUSED_OUTPUT";
            state.TryClaim("FIRST_RECIPE:"+recipe.Id,"FIRST_RECIPE",RecipeRp(recipe));
            state.TryClaim("FIRST_PRODUCTION:"+recipe.Id,"FIRST_PRODUCTION",RecipeRp(recipe));
            ProductionCompleted?.Invoke(recipe.Id);
        }

        private void RecordPowerSample(MachineRuntimeData machine)
        {
            if (!powerSamples.TryGetValue(machine.InstanceId,out var samples))
            { samples=new List<float>(); powerSamples[machine.InstanceId]=samples; }
            samples.Add(machine.PowerRatio);
            if (samples.Count>2600) samples.RemoveAt(0);
        }

        public float GetPowerStability(MachineRuntimeData machine)
        {
            if (!powerSamples.TryGetValue(machine.InstanceId,out var samples) || samples.Count==0) return 100f;
            float mean=samples.Average(),variance=samples.Average(x=>(x-mean)*(x-mean));
            return Mathf.Clamp(100f*mean-50f*Mathf.Sqrt(variance),0f,100f);
        }

        public static float ProcessScore(float actual,float target)
        {
            if (Mathf.Approximately(target,0f)) return 100f;
            float deviation=Mathf.Abs(actual-target)/Mathf.Abs(target)*100f;
            if (deviation<=1f) return 100f;
            if (deviation<=3f) return 95f;
            if (deviation<=5f) return 85f;
            if (deviation<=10f) return 70f;
            return 50f;
        }

        public static int RecipeRp(RecipeDefinition recipe)
        {
            if (recipe.Tier<=0) return 50;
            if (recipe.Tier==1) return 100;
            if (recipe.Tier==2) return 250;
            if (recipe.Tier==3) return 500;
            if (recipe.Tier==4) return 1000;
            if (recipe.Tier==5) return 1500;
            return 2500;
        }
    }
}
