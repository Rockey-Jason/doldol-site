using UnityEngine;

namespace DoronumFactory
{
    public sealed class DoriMeatTree : MonoBehaviour
    {
        public const float CycleSeconds=60f;
        public const float WaterPerCycleLitres=2f;
        public const int HarvestPerCycle=1;
        public string TreeId;
        private DoriTreeState data;
        private GameBootstrap game;
        private GameObject fruitVisual;

        public void Initialize(GameBootstrap bootstrap,string id,DoriTreeState saved=null)
        {
            game=bootstrap; TreeId=id;
            data=saved??new DoriTreeState { TreeId=id,WaterLitres=0f,GrowthSeconds=0f,Cycle=0,Mature=false,Purity=90f };
            CreateVisual();
            var interaction=gameObject.AddComponent<CapsuleCollider>();
            interaction.center=new Vector3(0f,1.7f,0f);
            interaction.radius=1.1f;
            interaction.height=3.8f;
        }

        public bool Mature => data!=null && data.Mature;
        public float WaterLitres => data==null?0f:data.WaterLitres;
        public bool NeedsWater => data!=null && !data.Mature && data.WaterLitres<WaterPerCycleLitres;

        public void ProvideAutomatedWater(float litres)
        {
            if(data==null || litres<=0f || data.Mature)return;
            data.WaterLitres=Mathf.Min(WaterPerCycleLitres,data.WaterLitres+litres);
        }

        public bool HarvestForMachine(out ItemStackData output)
        {
            output=null;
            if(game==null || data==null || !data.Mature)return false;
            output=new ItemStackData {
                StackId=System.Guid.NewGuid().ToString("N"),ItemId="ITEM_DORI_MEAT",
                Quantity=HarvestPerCycle,Quality=92f,Purity=data.Purity,Synthetic=false,
                Provenance="DORI_TREE:"+TreeId
            };
            data.Mature=false;data.GrowthSeconds=0f;data.WaterLitres=0f;data.Cycle++;
            if(fruitVisual!=null)fruitVisual.SetActive(false);
            game.State.SetFlag("DORI_MEAT_DISCOVERED");
            game.State.TryClaim("FIRST_DORI_MEAT_HARVEST:"+TreeId+":"+data.Cycle,"TREE_HARVEST",1);
            game.Research.GrantSkillPointOnce("KEY_MILESTONE:DORI_TREE",1);
            return true;
        }

        public void Advance(float deltaSeconds)
        {
            if (data==null || data.Mature || data.WaterLitres<WaterPerCycleLitres) return;
            data.GrowthSeconds+=deltaSeconds;
            if (data.GrowthSeconds>=CycleSeconds)
            {
                data.GrowthSeconds=CycleSeconds;data.Mature=true;
                if (fruitVisual!=null) fruitVisual.SetActive(true);
            }
        }

        public bool WaterAndHarvest()
        {
            if (game==null || data==null) return false;
            if (data.Mature)
            {
                game.Inventory.Add("ITEM_DORI_MEAT",HarvestPerCycle,92f,data.Purity,false,"DORI_TREE:"+TreeId);
                data.Mature=false; data.GrowthSeconds=0f; data.WaterLitres=0f; data.Cycle++;
                if (fruitVisual!=null) fruitVisual.SetActive(false);
                game.State.SetFlag("DORI_MEAT_DISCOVERED");
                game.State.TryClaim("FIRST_DORI_MEAT_HARVEST:"+TreeId,"TREE_HARVEST",1);
                game.Research.GrantSkillPointOnce("KEY_MILESTONE:DORI_TREE",1);
                game.ShowWorldMessage("돌이 고기 +1 · 나무는 다시 자랍니다.");
                return true;
            }
            if (!game.Inventory.Remove("ITEM_WATER",2)) { game.ShowWorldMessage("물 2L가 필요합니다."); return false; }
            data.WaterLitres+=WaterPerCycleLitres;
            game.ShowWorldMessage("돌이 고기 나무에 물 2L 공급");
            return true;
        }

        private void CreateVisual()
        {
            var trunk=GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunk.name="DoriTree_Trunk";trunk.transform.SetParent(transform,false);
            trunk.transform.localPosition=new Vector3(0,1.3f,0);trunk.transform.localScale=new Vector3(0.42f,1.3f,0.42f);
            SetColor(trunk,new Color(0.28f,0.16f,0.09f));
            var crown=GameObject.CreatePrimitive(PrimitiveType.Sphere);
            crown.name="DoriTree_Crown";crown.transform.SetParent(transform,false);
            crown.transform.localPosition=new Vector3(0,3.2f,0);crown.transform.localScale=new Vector3(2.4f,2.1f,2.4f);
            SetColor(crown,new Color(0.13f,0.32f,0.18f));
            fruitVisual=GameObject.CreatePrimitive(PrimitiveType.Sphere);
            fruitVisual.name="DoriMeatFruit";fruitVisual.transform.SetParent(transform,false);
            fruitVisual.transform.localPosition=new Vector3(0.65f,3.25f,0.35f);
            fruitVisual.transform.localScale=Vector3.one*0.45f;
            SetColor(fruitVisual,new Color(0.75f,0.35f,0.18f));
            fruitVisual.SetActive(data!=null && data.Mature);
            Destroy(crown.GetComponent<Collider>());
            Destroy(trunk.GetComponent<Collider>());
            Destroy(fruitVisual.GetComponent<Collider>());
        }

        private static void SetColor(GameObject obj,Color color)
        {
            var renderer=obj.GetComponent<Renderer>();
            var material=new Material(Shader.Find("Universal Render Pipeline/Lit")??Shader.Find("Standard"));
            material.color=color;renderer.material=material;
        }

        public DoriTreeState Snapshot() => new DoriTreeState {
            TreeId=TreeId,GrowthSeconds=data.GrowthSeconds,WaterLitres=data.WaterLitres,
            Cycle=data.Cycle,Mature=data.Mature,Purity=data.Purity
        };
    }
}
