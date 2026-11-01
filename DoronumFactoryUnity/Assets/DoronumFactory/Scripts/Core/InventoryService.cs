using System;
using System.Collections.Generic;
using System.Linq;

namespace DoronumFactory
{
    public sealed class InventoryService
    {
        private readonly GameRuntimeState state;
        public InventoryService(GameRuntimeState gameState) { state=gameState ?? throw new ArgumentNullException(nameof(gameState)); }

        public int MaxStack(string itemId)
        {
            if (GameIds.InfinityInputs.Contains(itemId,StringComparer.Ordinal)) return 10;
            if (itemId==GameIds.Infinity || itemId=="ITEM_ARCHIVE_PATTERN" || itemId=="ITEM_CONTRACT_SEAL") return 1;
            if (itemId=="ITEM_DORI_MEAT") return 50;
            if (itemId.StartsWith("ITEM_DORONUM_",StringComparison.Ordinal)) return 10;
            if (new[]{"ITEM_BATTERY","ITEM_MOTOR","ITEM_ADVANCED_CIRCUIT","ITEM_CONTROL_MODULE","ITEM_SENSOR"}.Contains(itemId)) return 25;
            if (new[]{"Metal","Part","Electronics"}.Contains(FactoryCatalog.Items.TryGetValue(itemId,out var def)?def.Category:"")) return 50;
            return 100;
        }

        public int Count(string itemId) => state.Inventory.Where(s=>s.ItemId==itemId).Sum(s=>s.Quantity);

        public int EligibleQuantity(string itemId,float minQuality,float minPurity,bool allowSynthetic)
        {
            return state.Inventory.Where(s=>s.ItemId==itemId && s.Quality>=minQuality &&
                s.Purity>=minPurity && (allowSynthetic || !s.Synthetic)).Sum(s=>s.Quantity);
        }

        public bool Add(string itemId,int quantity,float quality=90f,float purity=90f,bool synthetic=false,string provenance="UNKNOWN")
        {
            if (quantity<=0 || !FactoryCatalog.Items.ContainsKey(itemId)) return false;
            quality=Clamp01Hundred(quality); purity=Clamp01Hundred(purity);
            int limit=MaxStack(itemId), remaining=quantity;
            foreach (var stack in state.Inventory)
            {
                if (remaining<=0) break;
                if (stack.ItemId!=itemId || stack.Synthetic!=synthetic || stack.Provenance!=provenance ||
                    Math.Abs(stack.Quality-quality)>0.00001f || Math.Abs(stack.Purity-purity)>0.00001f) continue;
                int take=Math.Min(remaining,limit-stack.Quantity);
                if (take<=0) continue;
                stack.Quantity+=take; remaining-=take;
            }
            while (remaining>0)
            {
                int take=Math.Min(remaining,limit);
                state.Inventory.Add(new ItemStackData {
                    StackId=Guid.NewGuid().ToString("N"), ItemId=itemId, Quantity=take,
                    Quality=quality, Purity=purity, Synthetic=synthetic, Provenance=provenance
                });
                remaining-=take;
            }
            return true;
        }

        public bool Remove(string itemId,int quantity)
        {
            if (quantity<=0 || Count(itemId)<quantity) return false;
            int remaining=quantity;
            foreach (var stack in state.Inventory.Where(s=>s.ItemId==itemId).OrderBy(s=>s.StackId,StringComparer.Ordinal).ToList())
            {
                int take=Math.Min(remaining,stack.Quantity);
                stack.Quantity-=take; remaining-=take;
                if (stack.Quantity<=0) state.Inventory.Remove(stack);
                if (remaining==0) break;
            }
            return remaining==0;
        }

        public bool TryReserveEligible(string itemId,int quantity,float minQuality,float minPurity,
            bool allowSynthetic,out List<ItemStackData> reserved)
        {
            reserved=new List<ItemStackData>();
            if (quantity<=0 || EligibleQuantity(itemId,minQuality,minPurity,allowSynthetic)<quantity) return false;
            int remaining=quantity;
            var candidates=state.Inventory.Where(s=>s.ItemId==itemId && s.Quality>=minQuality &&
                s.Purity>=minPurity && (allowSynthetic || !s.Synthetic))
                .OrderBy(s=>s.StackId,StringComparer.Ordinal).ToList();
            foreach (var stack in candidates)
            {
                if (remaining<=0) break;
                int take=Math.Min(remaining,stack.Quantity);
                var part=stack.Clone();
                part.StackId=Guid.NewGuid().ToString("N");
                part.Quantity=take;
                reserved.Add(part);
                stack.Quantity-=take;
                remaining-=take;
            }
            state.Inventory.RemoveAll(s=>s.Quantity<=0);
            if (remaining==0) return true;
            Restore(reserved);
            reserved.Clear();
            return false;
        }

        public void Restore(IEnumerable<ItemStackData> stacks)
        {
            foreach (var stack in stacks) Add(stack.ItemId,stack.Quantity,stack.Quality,stack.Purity,stack.Synthetic,stack.Provenance);
        }

        public static float Clamp01Hundred(float value) => Math.Max(0f,Math.Min(100f,value));
    }
}
