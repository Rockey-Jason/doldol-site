using UnityEngine;

namespace DoronumFactory
{
    public sealed class ResourceNode : MonoBehaviour
    {
        public string NodeId;
        public string ItemId;
        public int Remaining;
        public int MiningPowerRequired;
        public float Quality=90f;
        public float Purity=90f;
        private Renderer cachedRenderer;
        public bool Depleted => Remaining<=0;

        public void Initialize(string nodeId,string itemId,int amount,int miningPower,float quality,float purity)
        {
            NodeId=nodeId;ItemId=itemId;Remaining=amount;MiningPowerRequired=miningPower;Quality=quality;Purity=purity;
            cachedRenderer=GetComponent<Renderer>();
            ApplyAppearance();
        }

        public bool TryHarvest(GameBootstrap game,int miningPower,int quantity=1)
        {
            if (game==null || Depleted || miningPower<MiningPowerRequired || quantity<=0) return false;
            int take=Mathf.Min(Remaining,quantity);
            Remaining-=take;
            game.Inventory.Add(ItemId,take,Quality,Purity,false,"VEIN:"+NodeId);
            game.Research.GrantFirstScan(ItemId);
            game.State.ResourceStates.RemoveAll(x=>x.NodeId==NodeId);
            game.State.ResourceStates.Add(new WorldResourceState { NodeId=NodeId,ItemId=ItemId,Remaining=Remaining,Depleted=Depleted });
            if (Depleted) game.ShowWorldMessage("광맥 고갈 · "+ItemId);
            return true;
        }

        public bool TryAutomatedMine(out ItemStackData output)
        {
            output=null;
            if(Depleted)return false;
            Remaining--;
            output=new ItemStackData {
                StackId=System.Guid.NewGuid().ToString("N"),ItemId=ItemId,Quantity=1,
                Quality=Quality,Purity=Purity,Synthetic=false,Provenance="AUTO_MINER:"+NodeId
            };
            if(Depleted && cachedRenderer!=null)cachedRenderer.enabled=false;
            return true;
        }

        private void ApplyAppearance()
        {
            if (cachedRenderer==null) cachedRenderer=GetComponent<Renderer>();
            if (cachedRenderer==null) return;
            var props=new MaterialPropertyBlock();
            cachedRenderer.GetPropertyBlock(props);
            Color color=ItemId.Contains("DORONUM")?new Color(0.1f,0.62f,0.88f):
                (ItemId.Contains("IRON")?new Color(0.48f,0.4f,0.34f):
                (ItemId.Contains("COPPER")?new Color(0.77f,0.34f,0.16f):new Color(0.3f,0.34f,0.38f)));
            props.SetColor("_BaseColor",color); props.SetColor("_Color",color);
            cachedRenderer.SetPropertyBlock(props);
        }

        public void Restore(int remaining)
        {
            Remaining=Mathf.Max(0,remaining);
            if (cachedRenderer!=null) cachedRenderer.enabled=!Depleted;
        }
    }
}
