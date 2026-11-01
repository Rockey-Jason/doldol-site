#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace DoronumFactory.Editor
{
    [InitializeOnLoad]
    public static class ProjectBootstrapper
    {
        private const string ScenePath="Assets/DoronumFactory/Scenes/Main.unity";
        static ProjectBootstrapper()
        {
            EditorApplication.delayCall+=EnsureMainScene;
        }

        [MenuItem("Doronum Factory/Open Main Scene")]
        public static void OpenMainScene()
        {
            EnsureMainScene();
            EditorSceneManager.OpenScene(ScenePath,OpenSceneMode.Single);
        }

        [MenuItem("Doronum Factory/Generate Main Scene")]
        public static void EnsureMainScene()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating) return;
            string folder=Path.GetDirectoryName(ScenePath);
            if(!AssetDatabase.IsValidFolder("Assets/DoronumFactory/Scenes"))
            {
                if(!AssetDatabase.IsValidFolder("Assets/DoronumFactory"))
                    AssetDatabase.CreateFolder("Assets","DoronumFactory");
                AssetDatabase.CreateFolder("Assets/DoronumFactory","Scenes");
            }
            if(File.Exists(ScenePath)) return;
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("DORONUM FACTORY — INFINITE INDUSTRY");
            root.AddComponent<GameBootstrap>();
            var camera=new GameObject("Runtime Camera Host");
            camera.tag="MainCamera";
            camera.AddComponent<Camera>();
            camera.SetActive(false);
            EditorSceneManager.SaveScene(scene,ScenePath);
            var buildScenes=new System.Collections.Generic.List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            buildScenes.RemoveAll(x=>x.path==ScenePath);
            buildScenes.Insert(0,new EditorBuildSettingsScene(ScenePath,true));
            EditorBuildSettings.scenes=buildScenes.ToArray();
            AssetDatabase.SaveAssets();
            Debug.Log("[DORONUM FACTORY] Native Unity 3D main scene generated: "+ScenePath);
        }
    }
}
#endif
