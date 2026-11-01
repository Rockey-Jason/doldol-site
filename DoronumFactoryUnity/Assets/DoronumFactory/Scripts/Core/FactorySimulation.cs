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
            TickBelts();
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
            if(!MachineCatalog.All.TryGetValue(machine.MachineId,out var machineDef) ||
                !MachineCatalog.IsUnlocked(machineDef,state) || recipe.Tier>CurrentResearchTier()) return false;
            machine.RecipeId=recipeId;
            machine.State="IDLE";
            MachineChanged?.Invoke(machine);
            return true;
        }

        public bool CraftManual(string recipeId)
        {
            if(!FactoryCatalog.Recipes.TryGetValue(recipeId,out var recipe) ||
                !string.IsNullOrEmpty(recipe.MachineId) || recipe.Tier>CurrentResearchTier()) return false;
            var snapshot=inventory.Snapshot();
            var reserved=new List<ItemStackData>();
            foreach(var input in recipe.Inputs)
            {
                if(!inventory.TryReserveEligible(input.ItemId,input.Quantity,0f,0f,recipe.AllowSyntheticInput,out var selected))
                {
                    inventory.RestoreSnapshot(snapshot);
                    return false;
                }
                reserved.AddRange(selected);
            }
            float qSum=0f,qWeight=0f,pSum=0f,pWeight=0f;
            foreach(var stack in reserved)
            {
                var input=recipe.Inputs.FirstOrDefault(x=>x.ItemId==stack.ItemId);
                float mw=input==null?1f:input.MaterialWeight;
                float pw=input==null?1f:input.PurityWeight;
                qSum+=stack.Quality*stack.Quantity*mw;qWeight+=stack.Quantity*mw;
                pSum+=stack.Purity*stack.Quantity*pw;pWeight+=stack.Quantity*pw;
            }
            float materialQ=qWeight<=0f?90f:qSum/qWeight;
            float materialP=pWeight<=0f?90f:pSum/pWeight;
            float quality=Mathf.Clamp(materialQ*0.4f+60f+recipe.QualityModifier,0f,100f);
            float purity=Mathf.Clamp(materialP-recipe.PurityLoss+recipe.PurificationBonus,0f,100f);
            foreach(var output in recipe.Outputs)
                inventory.Add(output.ItemId,output.Quantity,quality,purity,reserved.Exists(x=>x.Synthetic),"MANUAL_RECIPE:"+recipe.Id);
            int rp=RecipeRp(recipe);
            if(state.TryClaim("FIRST_RECIPE_SUCCESS:"+recipe.Id,"FIRST_RECIPE_SUCCESS",rp))
                state.ResearchPoints+=rp;
            return true;
        }

        private int CurrentResearchTier()
        {
            return FactoryCatalog.Research.Where(r=>state.Research.Exists(p=>p.ResearchId==r.Id && p.Completed))
                .Select(r=>r.Tier).DefaultIfEmpty(0).Max();
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
            if (machine==null || quantity<=0) return false;
            if (!inventory.TryReserveEligible(itemId,quantity,0f,0f,true,out var selected)) return false;
            int buffered=machine.InputBuffer.Where(x=>x.ItemId==itemId).Sum(x=>x.Quantity);
            if (buffered+quantity>500)
            {
                inventory.Restore(selected);
                return false;
            }
            machine.InputBuffer.AddRange(selected);
            MachineChanged?.Invoke(machine);
            return true;
        }

        private void AllocatePower()
        {
            float daylight=Mathf.Clamp01(Mathf.Sin((elapsedGameSeconds/1800f)*Mathf.PI*2f)*0.5f+0.5f);
            float generated=0f,requested=0f;
            var requests=new List<(MachineRuntimeData machine,float required,int priority)>();
            var buffers=state.Machines.Where(m=>m.MachineId=="POWER_BUFFER").ToList();
            foreach (var m in state.Machines)
            {
                if (m.MachineId=="GENERATOR")
                {
                    if (m.FuelSeconds>0f) generated+=600f;
                    continue;
                }
                if (MachineCatalog.All.TryGetValue(m.MachineId,out var generationDef) && generationDef.GenerationKW>0f)
                {
                    generated+=generationDef.GenerationKW;
                    continue;
                }
                if (m.MachineId=="SOLAR_PANEL") { generated+=90f*daylight; continue; }
                if (m.MachineId=="WIND_TURBINE") { generated+=180f; continue; }
                if (m.MachineId=="BATTERY" || m.MachineId=="POWER_BUFFER") continue;
                if (!MachineCatalog.All.TryGetValue(m.MachineId,out var machineDef)) { m.PowerRatio=1f; continue; }

                float idle=machineDef.IdlePowerKW>0f?machineDef.IdlePowerKW:1f;
                float process=0f;
                bool active=m.ReservedInputs.Count>0 || (m.MachineId=="RESEARCH_LAB" && !string.IsNullOrEmpty(state.ActiveResearchId));
                if (m.MachineId=="INFINITY_FUSION_MACHINE" && state.Fusion.Running)
                {
                    int stage=Mathf.Clamp(state.Fusion.StageIndex,0,FactoryCatalog.FusionStages.Length-1);
                    process=FactoryCatalog.FusionStages[stage].MaxPowerMW*1000f;
                    active=true;
                }
                else if (m.MachineId=="RESEARCH_LAB" && !string.IsNullOrEmpty(state.ActiveResearchId))
                {
                    var research=FactoryCatalog.Research.FirstOrDefault(x=>x.Id==state.ActiveResearchId);
                    process=research==null?25f:(research.Tier<=2?25f:(research.Tier<=4?100f:250f));
                    active=true;
                }
                else if (m.MachineId=="AUTO_MINER" || m.MachineId=="DORI_HARVESTER" || m.MachineId=="WATER_PUMP")
                {
                    process=machineDef.ProcessPowerKW;
                    active=true;
                }
                else if (!string.IsNullOrEmpty(m.RecipeId) && FactoryCatalog.Recipes.TryGetValue(m.RecipeId,out var recipe))
                {
                    process=recipe.PowerKW;
                    active=true;
                }
                bool safetyContinuous=m.MachineId=="COOLING_TOWER" || m.MachineId=="SHIELDING" ||
                    m.MachineId=="EMERGENCY_CUTOFF" || m.MachineId=="STABILIZATION_RELAY" ||
                    m.MachineId=="POWER_BUFFER";
                bool coreActive=m.MachineId=="STABILIZATION_CORE" && state.CoreInstalled;
                if (safetyContinuous || coreActive) active=true;
                float required=idle+(active?process:0f);
                if (required<=0f) { m.PowerRatio=1f;continue; }
                int priority=(safetyContinuous||coreActive)?0:
                    (m.MachineId.Contains("DORONUM")||m.MachineId.Contains("FUSION")||m.MachineId.Contains("STABILIZATION")?1:
                    (m.MachineId.Contains("AUTO")||m.MachineId.Contains("FABRICATOR")?2:3));
                requests.Add((m,required,priority));
                requested+=required;
            }

            float deficit=Mathf.Max(0f,requested-generated);
            float discharge=0f;
            foreach(var buffer in buffers)
            {
                float available=Mathf.Min(5000f,buffer.EnergyKJ/TickSeconds);
                float take=Mathf.Min(available,deficit-discharge);
                if(take<=0f)continue;
                buffer.EnergyKJ=Mathf.Max(0f,buffer.EnergyKJ-take*TickSeconds);
                discharge+=take;
                if(discharge>=deficit)break;
            }
            float supply=generated+discharge;
            float remaining=supply,consumed=0f;
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
            float surplus=Mathf.Max(0f,generated-consumed);
            foreach(var buffer in buffers)
            {
                if(surplus<=0f)break;
                float roomKW=(1800000f-buffer.EnergyKJ)/TickSeconds;
                float charge=Mathf.Min(surplus,Mathf.Min(5000f,roomKW));
                if(charge>0f) { buffer.EnergyKJ=Mathf.Min(1800000f,buffer.EnergyKJ+charge*TickSeconds);surplus-=charge; }
            }
            state.LastPowerGenerationKW=supply;
            state.LastPowerConsumptionKW=consumed;
            state.LastPowerRatio=requested<=0f?1f:Mathf.Clamp01(supply/requested);
            foreach (var m in state.Machines)
                if (m.MachineId=="GENERATOR" && m.FuelSeconds>0f) m.FuelSeconds=Mathf.Max(0f,m.FuelSeconds-TickSeconds);
        }

        private void TickMachine(MachineRuntimeData machine)
        {
            if (machine.MachineId=="CONVEYOR") return;
            if (machine.CompletionBuffer.Count>0) { machine.State="PAUSED_OUTPUT"; MachineChanged?.Invoke(machine); return; }
            if (machine.Condition<=0f) { machine.State="BROKEN"; MachineChanged?.Invoke(machine); return; }
            if (string.IsNullOrEmpty(machine.RecipeId) || !FactoryCatalog.Recipes.TryGetValue(machine.RecipeId,out var recipe))
            { machine.State="IDLE"; return; }
            if (!string.IsNullOrEmpty(recipe.RequiredStoryFlag) && !state.HasFlag(recipe.RequiredStoryFlag))
            { machine.State="LOCKED_STORY"; return; }
            if (recipe.MaxTotal>0)
            {
                int produced=state.RecipeTotals.Where(x=>x.RecipeId==recipe.Id).Sum(x=>x.Quantity);
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

        private const float BeltStepSeconds=0.75f;
        private const float BeltGridMeters=2f;

        private void TickBelts()
        {
            var belts=state.Machines.Where(x=>x.MachineId=="CONVEYOR")
                .OrderBy(x=>x.InstanceId,StringComparer.Ordinal).ToList();
            foreach(var belt in belts)
            {
                if(belt.PowerRatio<0.8f)
                {
                    belt.State="PAUSED_POWER";
                    continue;
                }
                if(belt.BeltPayload==null)
                {
                    var producer=state.Machines.Where(x=>x.InstanceId!=belt.InstanceId &&
                        x.MachineId!="CONVEYOR" && x.CompletionBuffer.Count>0)
                        .Where(x=>Vector2.Distance(OutputPort(x),new Vector2(belt.X,belt.Z))<=1.45f)
                        .OrderBy(x=>x.InstanceId,StringComparer.Ordinal).FirstOrDefault();
                    if(producer!=null)
                    {
                        belt.BeltPayload=producer.CompletionBuffer[0].Clone();
                        producer.CompletionBuffer.RemoveAt(0);
                        producer.State=producer.CompletionBuffer.Count==0?"IDLE":"PAUSED_OUTPUT";
                        belt.BeltProgressSeconds=0f;
                    }
                }
                if(belt.BeltPayload==null) continue;
                belt.BeltProgressSeconds+=TickSeconds*belt.PowerRatio;
                belt.State="RUNNING";
                if(belt.BeltProgressSeconds<BeltStepSeconds) continue;

                Vector2 next=NextBeltPosition(belt);
                var receiver=state.Machines.Where(x=>x.InstanceId!=belt.InstanceId && x.MachineId!="CONVEYOR")
                    .Where(x=>Vector2.Distance(InputPort(x),next)<=1.45f)
                    .OrderBy(x=>x.InstanceId,StringComparer.Ordinal).FirstOrDefault();
                if(receiver!=null)
                {
                    if(receiver.MachineId=="WAREHOUSE")
                    {
                        int used=receiver.InputBuffer.Sum(x=>x.Quantity);
                        if(used+belt.BeltPayload.Quantity>1000)
                        {
                            belt.State="BLOCKED_OUTPUT";
                            continue;
                        }
                        receiver.InputBuffer.Add(belt.BeltPayload);
                        belt.BeltPayload=null;
                        belt.BeltProgressSeconds=0f;
                        receiver.State="STORING";
                        continue;
                    }
                    if(!string.IsNullOrEmpty(receiver.RecipeId) &&
                        FactoryCatalog.Recipes.TryGetValue(receiver.RecipeId,out var targetRecipe) &&
                        targetRecipe.Inputs.Any(x=>x.ItemId==belt.BeltPayload.ItemId))
                    {
                        receiver.InputBuffer.Add(belt.BeltPayload);
                        belt.BeltPayload=null;
                        belt.BeltProgressSeconds=0f;
                        receiver.State="WAITING_INPUT";
                        continue;
                    }
                }
                var nextBelt=belts.Where(x=>x.InstanceId!=belt.InstanceId && x.BeltPayload==null)
                    .Where(x=>Vector2.Distance(new Vector2(x.X,x.Z),next)<=0.2f)
                    .OrderBy(x=>x.InstanceId,StringComparer.Ordinal).FirstOrDefault();
                if(nextBelt!=null)
                {
                    nextBelt.BeltPayload=belt.BeltPayload;
                    nextBelt.BeltProgressSeconds=0f;
                    nextBelt.State="RUNNING";
                    belt.BeltPayload=null;
                    belt.BeltProgressSeconds=0f;
                }
                else
                {
                    belt.State="BLOCKED_ROUTE";
                    belt.BeltProgressSeconds=BeltStepSeconds;
                }
            }
        }

        private static Vector2 Forward(MachineRuntimeData machine)
        {
            switch(((machine.Rotation%4)+4)%4)
            {
                case 1:return Vector2.right;
                case 2:return Vector2.down;
                case 3:return Vector2.left;
                default:return Vector2.up;
            }
        }

        private static Vector2 OutputPort(MachineRuntimeData machine)
        {
            float offset=MachineCatalog.All.TryGetValue(machine.MachineId,out var def)?Mathf.Max(0.5f,def.Depth):1f;
            Vector2 p=new Vector2(machine.X,machine.Z);
            return p+Forward(machine)*offset;
        }

        private static Vector2 InputPort(MachineRuntimeData machine)
        {
            float offset=MachineCatalog.All.TryGetValue(machine.MachineId,out var def)?Mathf.Max(0.5f,def.Depth):1f;
            Vector2 p=new Vector2(machine.X,machine.Z);
            return p-Forward(machine)*offset;
        }

        private static Vector2 NextBeltPosition(MachineRuntimeData belt)
        {
            Vector2 p=new Vector2(belt.X,belt.Z);
            return p+Forward(belt)*BeltGridMeters;
        }

        private bool TryReserveRecipeInputs(MachineRuntimeData machine,RecipeDefinition recipe)
        {
            var inventorySnapshot=inventory.Snapshot();
            var bufferSnapshot=machine.InputBuffer.Select(x=>x.Clone()).ToList();
            var reserved=new List<ItemStackData>();
            foreach (var input in recipe.Inputs)
            {
                int remaining=input.Quantity;
                foreach (var buffered in machine.InputBuffer.Where(x=>x.ItemId==input.ItemId).ToList())
                {
                    if (remaining<=0) break;
                    if (!recipe.AllowSyntheticInput && buffered.Synthetic) continue;
                    int take=Math.Min(remaining,buffered.Quantity);
                    if (take<=0) continue;
                    var portion=buffered.Clone();
                    portion.StackId=Guid.NewGuid().ToString("N");
                    portion.SourceStackId=buffered.StackId;
                    portion.Quantity=take;
                    reserved.Add(portion);
                    buffered.Quantity-=take;
                    remaining-=take;
                }
                machine.InputBuffer.RemoveAll(x=>x.Quantity<=0);
                if (remaining>0)
                {
                    if (!inventory.TryReserveEligible(input.ItemId,remaining,0f,0f,recipe.AllowSyntheticInput,out var parts))
                    {
                        inventory.RestoreSnapshot(inventorySnapshot);
                        machine.InputBuffer.Clear();
                        machine.InputBuffer.AddRange(bufferSnapshot);
                        machine.State="WAITING_INPUT";
                        return false;
                    }
                    reserved.AddRange(parts);
                }
            }
            machine.ReservedInputs=reserved;
            machine.ProgressSeconds=0f;
            machine.PowerRatioSum=0f;
            machine.PowerRatioSquareSum=0f;
            machine.PowerSampleCount=0;
            machine.FailureExposureSeconds=0f;
            machine.FailureRngIndex=0;
            return true;
        }

        private void CommitProduction(MachineRuntimeData machine,RecipeDefinition recipe)
        {
            if (machine.CompletionBuffer.Count>0) { machine.State="PAUSED_OUTPUT"; return; }
            float qualitySum=0f,qualityWeight=0f,puritySum=0f,purityWeight=0f;
            foreach (var stack in machine.ReservedInputs)
            {
                var ingredient=recipe.Inputs.FirstOrDefault(x=>x.ItemId==stack.ItemId);
                float materialWeight=ingredient==null?1f:ingredient.MaterialWeight;
                float itemPurityWeight=ingredient==null?1f:ingredient.PurityWeight;
                qualitySum+=stack.Quality*stack.Quantity*materialWeight;
                qualityWeight+=stack.Quantity*materialWeight;
                puritySum+=stack.Purity*stack.Quantity*itemPurityWeight;
                purityWeight+=stack.Quantity*itemPurityWeight;
            }
            float materialQ=qualityWeight<=0f?90f:qualitySum/qualityWeight;
            float materialP=purityWeight<=0f?90f:puritySum/purityWeight;
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
            var quota=state.RecipeTotals.Find(x=>x.RecipeId==recipe.Id);
            if(quota==null) { quota=new RecipeTotalData { RecipeId=recipe.Id,Quantity=0 };state.RecipeTotals.Add(quota); }
            quota.Quantity+=recipe.Outputs.Sum(x=>x.Quantity);
            int rp=RecipeRp(recipe);
            if(state.TryClaim("FIRST_RECIPE_SUCCESS:"+recipe.Id,"FIRST_RECIPE_SUCCESS",rp)) state.ResearchPoints+=rp;
            ProductionCompleted?.Invoke(recipe.Id);
        }

        private void RecordPowerSample(MachineRuntimeData machine)
        {
            float ratio=Mathf.Clamp01(machine.PowerRatio);
            machine.PowerRatioSum+=ratio;
            machine.PowerRatioSquareSum+=ratio*ratio;
            machine.PowerSampleCount++;
            machine.FailureExposureSeconds+=TickSeconds*ratio;
        }

        public float GetPowerStability(MachineRuntimeData machine)
        {
            if(machine.PowerSampleCount<=0)return 100f;
            float mean=machine.PowerRatioSum/machine.PowerSampleCount;
            float meanSquare=machine.PowerRatioSquareSum/machine.PowerSampleCount;
            float variance=Mathf.Max(0f,meanSquare-mean*mean);
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
