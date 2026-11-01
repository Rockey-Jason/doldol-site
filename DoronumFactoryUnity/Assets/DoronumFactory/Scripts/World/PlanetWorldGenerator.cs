using System;
using System.Collections.Generic;
using UnityEngine;

namespace DoronumFactory
{
    public sealed class PlanetWorldGenerator : MonoBehaviour
    {
        public const float WorldSize=2048f;
        private readonly List<ResourceNode> resourceNodes=new List<ResourceNode>();
        private readonly List<DoriMeatTree> doriTrees=new List<DoriMeatTree>();
        public IReadOnlyList<ResourceNode> ResourceNodes=>resourceNodes;
        public IReadOnlyList<DoriMeatTree> DoriTrees=>doriTrees;
        public static readonly Vector2[] RelaySites =
        {
            new Vector2(-900f,900f),new Vector2(920f,-860f),new Vector2(930f,900f)
        };

        public void Generate(GameBootstrap game)
        {
            GenerateTerrain(game.State.WorldSeed);
            GenerateLighting();
            GenerateEnvironment();
            GenerateResourceDeposits(game);
            GenerateDoriForest(game);
            GenerateRelayMarkers();
        }

        private void GenerateTerrain(int seed)
        {
            var terrainData=new TerrainData { heightmapResolution=513, size=new Vector3(WorldSize,180f,WorldSize) };
            var heights=new float[513,513];
            float ox=(seed%997)*0.013f,oz=(seed%613)*0.017f;
            for (int z=0;z<513;z++)
            for (int x=0;x<513;x++)
            {
                float nx=x/512f,nz=z/512f;
                float broad=Mathf.PerlinNoise(ox+nx*3.1f,oz+nz*3.1f);
                float fine=Mathf.PerlinNoise(ox+nx*15f+80f,oz+nz*15f+110f);
                float ridge=1f-Mathf.Abs(Mathf.PerlinNoise(ox+nx*5f+40f,oz+nz*5f+30f)*2f-1f);
                float h=0.12f+broad*0.09f+fine*0.018f+ridge*0.012f;
                heights[z,x]=Mathf.Clamp01(h);
            }
            terrainData.SetHeights(0,0,heights);
            var terrainObject=Terrain.CreateTerrainGameObject(terrainData);
            terrainObject.name="ORBIT Planet Terrain · 2048m";
            terrainObject.transform.position=new Vector3(-WorldSize*0.5f,0f,-WorldSize*0.5f);
            var terrain=terrainObject.GetComponent<Terrain>();
            terrain.drawInstanced=true;
            terrain.heightmapPixelError=8f;
            terrain.basemapDistance=1500f;
            var collider=terrainObject.GetComponent<TerrainCollider>();
            collider.terrainData=terrainData;

            var sea=GameObject.CreatePrimitive(PrimitiveType.Plane);
            sea.name="Atmospheric Ocean";
            sea.transform.position=new Vector3(0f,-2.5f,0f);
            sea.transform.localScale=new Vector3(230f,1f,230f);
            var mat=new Material(Shader.Find("Universal Render Pipeline/Lit")??Shader.Find("Standard"));
            mat.color=new Color(0.055f,0.17f,0.22f,0.78f);
            mat.SetFloat("_Smoothness",0.82f);
            sea.GetComponent<Renderer>().sharedMaterial=mat;
            Destroy(sea.GetComponent<Collider>());
        }

        public float HeightAt(float x,float z)
        {
            float nx=Mathf.Clamp01((x+WorldSize*0.5f)/WorldSize);
            float nz=Mathf.Clamp01((z+WorldSize*0.5f)/WorldSize);
            float broad=Mathf.PerlinNoise(0.013f*827142f%997+nx*3.1f,0.017f*827142f%613+nz*3.1f);
            return Mathf.Max(0f,(0.12f+broad*0.09f+Mathf.PerlinNoise(nx*15f+80f,nz*15f+110f)*0.018f)*180f);
        }

        private void GenerateLighting()
        {
            RenderSettings.ambientMode=UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor=new Color(0.21f,0.31f,0.4f);
            RenderSettings.ambientEquatorColor=new Color(0.34f,0.37f,0.35f);
            RenderSettings.ambientGroundColor=new Color(0.08f,0.11f,0.12f);
            RenderSettings.fog=true;
            RenderSettings.fogColor=new Color(0.28f,0.36f,0.37f);
            RenderSettings.fogDensity=0.00065f;
            var sun=new GameObject("ORBIT Sun").AddComponent<Light>();
            sun.type=LightType.Directional;
            sun.intensity=1.25f;
            sun.color=new Color(1f,0.88f,0.73f);
            sun.transform.rotation=Quaternion.Euler(48f,-32f,0f);
            sun.shadows=LightShadows.Soft;
            sun.shadowStrength=0.82f;
        }

        private void GenerateEnvironment()
        {
            var baseRoot=new GameObject("Rockey Recovery Landing Zone");
            baseRoot.transform.position=new Vector3(0f,HeightAt(0f,0f),0f);
            MakePylon(baseRoot.transform,new Vector3(-8f,2f,-8f),new Color(0.16f,0.29f,0.34f));
            MakePylon(baseRoot.transform,new Vector3(8f,2f,-8f),new Color(0.16f,0.29f,0.34f));
            MakePylon(baseRoot.transform,new Vector3(-8f,2f,8f),new Color(0.16f,0.29f,0.34f));
            MakePylon(baseRoot.transform,new Vector3(8f,2f,8f),new Color(0.16f,0.29f,0.34f));
            var pad=GameObject.CreatePrimitive(PrimitiveType.Cube);
            pad.name="Landing Pad";pad.transform.SetParent(baseRoot.transform,false);
            pad.transform.localPosition=new Vector3(0f,0.1f,0f);pad.transform.localScale=new Vector3(26f,0.25f,26f);
            SetMaterial(pad,new Color(0.16f,0.21f,0.23f),0.55f);
        }

        private void GenerateResourceDeposits(GameBootstrap game)
        {
            var rng=new System.Random(game.State.WorldSeed);
            SpawnCluster(game,rng,"IRON","ITEM_IRON_ORE",new Vector2(-260f,130f),20,95,10,90f,78f);
            SpawnCluster(game,rng,"COPPER","ITEM_COPPER_ORE",new Vector2(250f,160f),18,90,8,88f,80f);
            SpawnCluster(game,rng,"COAL","ITEM_COAL",new Vector2(-140f,-280f),20,110,5,86f,88f);
            SpawnCluster(game,rng,"QUARTZ","ITEM_QUARTZ",new Vector2(420f,-150f),16,70,20,92f,90f);
            SpawnCluster(game,rng,"GOLD","ITEM_GOLD_ORE",new Vector2(640f,400f),10,55,25,94f,92f);
            SpawnCluster(game,rng,"DIAMOND","ITEM_DIAMOND",new Vector2(-760f,-460f),7,25,50,98f,95f);
            SpawnCluster(game,rng,"NICKEL","ITEM_NICKEL_ORE",new Vector2(-610f,240f),12,95,15,86f,88f);
            SpawnCluster(game,rng,"MAGNETITE","ITEM_MAGNETITE",new Vector2(120f,470f),14,100,25,90f,90f);
            SpawnCluster(game,rng,"CHROME","ITEM_CHROME_ORE",new Vector2(790f,630f),10,70,50,94f,90f);
            SpawnCluster(game,rng,"ALUMINUM","ITEM_ALUMINUM_ORE",new Vector2(-820f,220f),10,85,25,91f,90f);
            SpawnCluster(game,rng,"LEAD","ITEM_LEAD_ORE",new Vector2(460f,700f),10,90,20,88f,90f);
            SpawnCluster(game,rng,"TITANIUM","ITEM_TITANIUM_ORE",new Vector2(-720f,720f),9,60,50,95f,91f);
            SpawnCluster(game,rng,"NEODYMIUM","ITEM_NEODYMIUM_ORE",new Vector2(850f,-520f),9,60,50,96f,92f);
            SpawnCluster(game,rng,"HEAT_CRYSTAL","ITEM_HEAT_CRYSTAL",new Vector2(720f,500f),6,18,50,96f,96f);
            SpawnCluster(game,rng,"COLD_CRYSTAL","ITEM_COLD_CRYSTAL",new Vector2(30f,-850f),6,18,50,96f,96f);
            SpawnCluster(game,rng,"WATER","ITEM_WATER",new Vector2(250f,70f),18,50,0,100f,100f);
            SpawnCluster(game,rng,"RUBBER_SAP","ITEM_RUBBER_SAP",new Vector2(-260f,270f),12,40,0,92f,92f);
            // No natural Doronum deposit exists. All 15 canonical variants are manufactured.
            foreach (var saved in game.State.ResourceStates)
            {
                var node=resourceNodes.Find(x=>x.NodeId==saved.NodeId);
                if (node!=null) node.Restore(saved.Remaining);
            }
        }

        private void SpawnCluster(GameBootstrap game,System.Random rng,string prefix,string itemId,Vector2 center,
            int count,int amount,int miningPower,float quality,float purity)
        {
            for (int i=0;i<count;i++)
            {
                float angle=(float)rng.NextDouble()*Mathf.PI*2f;
                float radius=Mathf.Sqrt((float)rng.NextDouble())*42f;
                float x=center.x+Mathf.Cos(angle)*radius;
                float z=center.y+Mathf.Sin(angle)*radius;
                Vector3 position=new Vector3(x,HeightAt(x,z)+0.75f,z);
                var node=GameObject.CreatePrimitive(PrimitiveType.Sphere);
                node.name=prefix+"_VEIN_"+i.ToString("00");
                node.transform.position=position;
                node.transform.localScale=new Vector3(1.25f,0.85f,1.25f);
                var material=new Material(Shader.Find("Universal Render Pipeline/Lit")??Shader.Find("Standard"));
                material.color=ResourceColor(itemId);
                material.SetFloat("_Metallic",0.28f);
                material.SetFloat("_Smoothness",0.48f);
                node.GetComponent<Renderer>().sharedMaterial=material;
                var resource=node.AddComponent<ResourceNode>();
                resource.Initialize(node.name,itemId,amount,miningPower,quality,purity);
                resourceNodes.Add(resource);
            }
        }

        private void GenerateDoriForest(GameBootstrap game)
        {
            var saved=game.State.DoriTrees;
            for (int i=0;i<14;i++)
            {
                float angle=i*2.399963f;
                float radius=75f+(i%4)*13f;
                float x=120f+Mathf.Cos(angle)*radius;
                float z=90f+Mathf.Sin(angle)*radius;
                var go=new GameObject("DoriMeatTree_"+i.ToString("00"));
                go.transform.position=new Vector3(x,HeightAt(x,z),z);
                var tree=go.AddComponent<DoriMeatTree>();
                var state=saved.Find(t=>t.TreeId==go.name);
                tree.Initialize(game,go.name,state);
                doriTrees.Add(tree);
            }
        }

        private void GenerateRelayMarkers()
        {
            for (int i=0;i<RelaySites.Length;i++)
            {
                var site=RelaySites[i];
                var root=new GameObject("PLANETARY_RELAY_SITE_"+(i+1));
                root.transform.position=new Vector3(site.x,HeightAt(site.x,site.y),site.y);
                var ring=GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                ring.name="Relay Placement Ring";ring.transform.SetParent(root.transform,false);
                ring.transform.localPosition=new Vector3(0f,0.12f,0f);ring.transform.localScale=new Vector3(18f,0.12f,18f);
                SetMaterial(ring,new Color(0.12f,0.52f,0.62f),0.7f);
                Destroy(ring.GetComponent<Collider>());
                var pillar=GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                pillar.transform.SetParent(root.transform,false);
                pillar.transform.localPosition=new Vector3(0f,4f,0f);pillar.transform.localScale=new Vector3(1.5f,4f,1.5f);
                SetMaterial(pillar,new Color(0.2f,0.38f,0.42f),0.65f);
            }
        }

        private static void MakePylon(Transform parent,Vector3 local,Color color)
        {
            var p=GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            p.transform.SetParent(parent,false);p.transform.localPosition=local;p.transform.localScale=new Vector3(0.7f,2f,0.7f);
            SetMaterial(p,color,0.55f);Destroy(p.GetComponent<Collider>());
        }

        private static Color ResourceColor(string id)
        {
            if (id.Contains("IRON")) return new Color(0.48f,0.4f,0.34f);
            if (id.Contains("COPPER")) return new Color(0.78f,0.36f,0.18f);
            if (id.Contains("COAL")) return new Color(0.08f,0.1f,0.12f);
            if (id.Contains("QUARTZ")) return new Color(0.42f,0.76f,0.82f);
            if (id.Contains("GOLD")) return new Color(0.86f,0.66f,0.22f);
            if (id.Contains("DIAMOND")) return new Color(0.36f,0.83f,0.92f);
            if (id.Contains("CRYSTAL")) return new Color(0.22f,0.72f,0.88f);
            if (id.Contains("WATER")) return new Color(0.08f,0.43f,0.76f);
            return new Color(0.44f,0.48f,0.42f);
        }

        private static void SetMaterial(GameObject obj,Color color,float metallic)
        {
            var renderer=obj.GetComponent<Renderer>();
            var material=new Material(Shader.Find("Universal Render Pipeline/Lit")??Shader.Find("Standard"));
            material.color=color;material.SetFloat("_Metallic",metallic);material.SetFloat("_Smoothness",0.5f);
            renderer.sharedMaterial=material;
        }
    }
}
