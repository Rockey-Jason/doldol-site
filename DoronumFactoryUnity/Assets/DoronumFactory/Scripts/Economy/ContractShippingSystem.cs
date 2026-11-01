using System;
using System.Collections.Generic;
using System.Linq;

namespace DoronumFactory
{
    [Serializable]
    public sealed class ContractDefinition
    {
        public string Id;
        public string Name;
        public string Description;
        public string Category;
        public string[] RequiredResearch;
        public string[] RequiredStoryFlags;
        public List<ItemAmount> Inputs=new List<ItemAmount>();
        public List<ItemAmount> Rewards=new List<ItemAmount>();
        public float MinimumQuality;
        public float MinimumPurity;
        public float TransitSeconds;
        public string Packaging;
        public int ResearchPointReward;
        public int CurrencyDReward;
        public bool OneTime=true;

        public ContractDefinition(string id,string name,string category,string description,float q,float p,float transit,
            int rp,int currency,string packaging,string[] research=null,string[] story=null)
        {
            Id=id;Name=name;Category=category;Description=description;MinimumQuality=q;MinimumPurity=p;
            TransitSeconds=transit;ResearchPointReward=rp;CurrencyDReward=currency;Packaging=packaging;
            RequiredResearch=research??Array.Empty<string>();RequiredStoryFlags=story??Array.Empty<string>();
        }
        public ContractDefinition Input(string id,int amount){Inputs.Add(new ItemAmount(id,amount));return this;}
        public ContractDefinition Reward(string id,int amount){Rewards.Add(new ItemAmount(id,amount));return this;}
    }

    public static class ContractCatalog
    {
        public static readonly ContractDefinition[] All =
        {
            new ContractDefinition("CONTRACT_INDUSTRIAL_SUPPLY","Industrial Supply Order","Industrial",
                "폐허 복구 기지에 기초 산업 부품을 납품합니다.",70f,70f,20f,2000,20000,"BOX",
                new[]{"RESEARCH_MECHANICAL_PROCESSING"})
                .Input("ITEM_STEEL_PLATE",10).Input("ITEM_GEAR",10).Input("ITEM_COPPER_WIRE",20)
                .Reward("ITEM_BATTERY",4),
            new ContractDefinition("CONTRACT_ADVANCED_COMPONENTS","Advanced Control Components","Advanced",
                "ORBIT 복구 네트워크용 고급 제어 부품을 납품합니다.",80f,80f,35f,5000,50000,"SECURE_CONTAINER",
                new[]{"RESEARCH_ADVANCED_CIRCUITS"})
                .Input("ITEM_ADVANCED_CIRCUIT",10).Input("ITEM_CONTROL_MODULE",5).Input("ITEM_SENSOR",10)
                .Reward("ITEM_CONTROL_MODULE",5),
            new ContractDefinition("CONTRACT_DORONUM_QUALITY","Verified Doronium Sample Batch","Doronum",
                "비합성 도로늄의 품질·순도 검증 배치를 연구 기관으로 보냅니다.",90f,90f,45f,7500,100000,"DORONUM_ISOLATION",
                new[]{"RESEARCH_DORONUM_ENGINEERING"},new[]{"FIRST_DORONUM_OUTPUT"})
                .Input(GameIds.Normal,10).Reward(GameIds.Yellow,2).Reward(GameIds.Blue,2),
            new ContractDefinition("CONTRACT_SECURITY_ARCHIVE","First Factory Security Archive","First Factory",
                "복구한 First Factory 기록을 검증하고 보안 패턴을 인계합니다.",85f,85f,60f,10000,150000,"SECURE_CONTAINER",
                new[]{"RESEARCH_DORONUM_CRYSTAL"},new[]{"INFINITY_PROJECT_REVEALED"})
                .Input(GameIds.Yellow,5).Input("ITEM_ADVANCED_CIRCUIT",10).Reward("ITEM_ARCHIVE_PATTERN",100),
            new ContractDefinition("CONTRACT_LEGACY_BATCH_SEAL","Legacy Batch Authorization","Limited Edition",
                "FIRST FACTORY의 Legacy Batch Line에 사용할 봉인 승인서를 받습니다.",90f,90f,90f,15000,300000,"INFINITY_ISOLATION",
                new[]{"RESEARCH_DORONUM_FUSION"},new[]{"SPECIAL_EDITION_BATCH_RESEARCHED","LORE:FIRST_FACTORY_RESONANCE_CHAMBER"})
                .Input(GameIds.Ultra,5).Input(GameIds.Translucent,5).Input(GameIds.Black,5).Reward("ITEM_CONTRACT_SEAL",100)
        };
    }

    public sealed class ContractShippingSystem
    {
        private readonly GameRuntimeState state;
        private readonly InventoryService inventory;
        public event Action ContractsChanged;
        public event Action<string,string> ShipmentChanged;
        public event Action<string> Toast;

        public ContractShippingSystem(GameRuntimeState gameState,InventoryService inventoryService)
        { state=gameState;inventory=inventoryService;EnsureContractRecords(); }

        private void EnsureContractRecords()
        {
            foreach(var def in ContractCatalog.All)
                if(!state.ContractProgress.Exists(x=>x.ContractId==def.Id))
                    state.ContractProgress.Add(new ContractProgressData { ContractId=def.Id,State="NOT_SHIPPED" });
        }

        private ContractProgressData Progress(string id)=>state.ContractProgress.Find(x=>x.ContractId==id);
        private ContractDefinition Definition(string id)=>ContractCatalog.All.FirstOrDefault(x=>x.Id==id);
        private ShipmentRuntimeData Shipment(string id)=>state.Shipments.Find(x=>x.ShipmentId==id);

        public string PrerequisiteReason(ContractDefinition def)
        {
            foreach(var research in def.RequiredResearch)
                if(!state.Research.Exists(x=>x.ResearchId==research && x.Completed)) return "연구 부족: "+research;
            foreach(var flag in def.RequiredStoryFlags)
                if(!state.HasFlag(flag)) return "스토리 기록 부족: "+flag;
            return null;
        }

        public bool Accept(string contractId)
        {
            var def=Definition(contractId);
            var progress=Progress(contractId);
            if(def==null||progress==null||progress.State!="NOT_SHIPPED") return false;
            string reason=PrerequisiteReason(def);
            if(!string.IsNullOrEmpty(reason)) { Toast?.Invoke(reason);return false; }
            progress.State="RESERVED";
            progress.AcceptedTick=state.SimulationTick;
            ContractsChanged?.Invoke();
            return true;
        }

        public bool PackAndShip(string contractId)
        {
            var def=Definition(contractId);
            var progress=Progress(contractId);
            if(def==null||progress==null||progress.State!="RESERVED") return false;
            foreach(var input in def.Inputs)
            {
                int eligible=inventory.EligibleQuantity(input.ItemId,def.MinimumQuality,def.MinimumPurity,false);
                if(eligible<input.Quantity)
                {
                    Toast?.Invoke("등급 조건 미달: "+input.ItemId+" "+eligible+"/"+input.Quantity);
                    return false;
                }
            }

            var snapshot=inventory.Snapshot();
            var manifest=new List<ItemStackData>();
            foreach(var input in def.Inputs)
            {
                if(!inventory.TryReserveEligible(input.ItemId,input.Quantity,def.MinimumQuality,def.MinimumPurity,false,out var selected))
                {
                    inventory.RestoreSnapshot(snapshot);
                    Toast?.Invoke("출하 예약 실패 · 재료를 전체 롤백했습니다.");
                    return false;
                }
                manifest.AddRange(selected);
            }
            int packingCost=def.Packaging=="BOX"?2:def.Packaging=="SECURE_CONTAINER"?5:
                def.Packaging=="DORONUM_ISOLATION"?8:12;
            if(!inventory.Remove("ITEM_WOOD",packingCost))
            {
                inventory.RestoreSnapshot(snapshot);
                Toast?.Invoke("포장 자재 부족 · Wood "+packingCost);
                return false;
            }

            int cycle=progress.Cycle+1;
            string shipmentId="SHIPMENT:"+def.Id+":"+cycle;
            if(state.Shipments.Exists(x=>x.ShipmentId==shipmentId))
            {
                inventory.RestoreSnapshot(snapshot);
                return false;
            }
            state.Shipments.Add(new ShipmentRuntimeData {
                ShipmentId=shipmentId,ContractId=def.Id,State="IN_TRANSIT",
                RemainingSeconds=def.TransitSeconds,Settled=false,Manifest=manifest
            });
            progress.State="IN_TRANSIT";
            progress.ShipmentId=shipmentId;
            progress.Cycle=cycle;
            state.TryClaim("CONTRACT_PACKED:"+shipmentId,"SHIPMENT_PACK",1);
            ShipmentChanged?.Invoke(def.Id,"IN_TRANSIT");
            ContractsChanged?.Invoke();
            return true;
        }

        public void Tick(float dt)
        {
            foreach(var shipment in state.Shipments.Where(x=>x.State=="IN_TRANSIT" && !x.Settled).ToList())
            {
                shipment.RemainingSeconds=Math.Max(0f,shipment.RemainingSeconds-dt);
                if(shipment.RemainingSeconds<=0f) Settle(shipment);
            }
        }

        private void Settle(ShipmentRuntimeData shipment)
        {
            if(shipment==null||shipment.Settled) return;
            var def=Definition(shipment.ContractId);
            var progress=Progress(shipment.ContractId);
            if(def==null||progress==null) { shipment.State="FAILED";shipment.Settled=true;return; }
            string claim="CONTRACT_SETTLEMENT:"+shipment.ShipmentId;
            if(!state.TryClaim(claim,"CONTRACT_SETTLEMENT",1))
            {
                shipment.State="DELIVERED";shipment.Settled=true;
                progress.State="DELIVERED";
                return;
            }
            foreach(var reward in def.Rewards)
                inventory.Add(reward.ItemId,reward.Quantity,95f,95f,false,"CONTRACT:"+def.Id);
            state.ResearchPoints+=def.ResearchPointReward;
            state.CurrencyD+=def.CurrencyDReward;
            if(def.Id=="CONTRACT_SECURITY_ARCHIVE")
            {
                state.SetFlag("SPECIAL_EDITION_BATCH_RESEARCHED");
                state.TryClaim("SPECIAL_EDITION_BATCH_AUTHORIZED","CONTRACT",1);
            }
            if(def.Id=="CONTRACT_LEGACY_BATCH_SEAL")
            {
                state.SetFlag("LIMITED_EDITION_CONTRACT_ACTIVE");
                state.TryClaim("LIMITED_EDITION_SUPPLY_AUTHORIZED","CONTRACT",1);
            }
            shipment.State="DELIVERED";
            shipment.Settled=true;
            progress.State="DELIVERED";
            progress.DeliveredTick=state.SimulationTick;
            ShipmentChanged?.Invoke(def.Id,"DELIVERED");
            ContractsChanged?.Invoke();
            Toast?.Invoke("배송 완료 · "+def.Name+" · +"+def.ResearchPointReward+" RP · +"+def.CurrencyDReward+" D");
        }

        public void CancelShipment(string contractId)
        {
            var progress=Progress(contractId);
            if(progress==null||progress.State!="IN_TRANSIT") return;
            var shipment=Shipment(progress.ShipmentId);
            if(shipment==null||shipment.Settled) return;
            inventory.Restore(shipment.Manifest);
            shipment.State="CANCELLED";
            shipment.Settled=true;
            progress.State="CANCELLED";
            ShipmentChanged?.Invoke(contractId,"CANCELLED");
            ContractsChanged?.Invoke();
        }
    }
}
