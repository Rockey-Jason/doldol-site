using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace DoronumFactory
{
    [Serializable]
    internal sealed class SaveEnvelope
    {
        public int EnvelopeVersion = 1;
        public string Checksum;
        public string PayloadJson;
    }

    public sealed class SaveManager
    {
        private const string SaveName="doronium_factory_v450.json";
        private string SavePath => Path.Combine(Application.persistentDataPath,SaveName);
        private string BackupPath => SavePath+".bak";
        private string TempPath => SavePath+".tmp";

        public bool Save(GameRuntimeState state,out string error)
        {
            error=null;
            if (state==null) { error="Save state is null."; return false; }
            try
            {
                state.SaveRevision++;
                string payload=JsonUtility.ToJson(state,false);
                var envelope=new SaveEnvelope { PayloadJson=payload, Checksum=Sha256(payload) };
                string json=JsonUtility.ToJson(envelope,false);
                Directory.CreateDirectory(Application.persistentDataPath);
                using (var stream=new FileStream(TempPath,FileMode.Create,FileAccess.Write,FileShare.None))
                using (var writer=new StreamWriter(stream,new UTF8Encoding(false)))
                { writer.Write(json); writer.Flush(); stream.Flush(true); }

                ValidateEnvelope(File.ReadAllText(TempPath,Encoding.UTF8));
                if (File.Exists(SavePath))
                {
                    if (File.Exists(BackupPath)) File.Delete(BackupPath);
                    try { File.Replace(TempPath,SavePath,BackupPath,true); }
                    catch (PlatformNotSupportedException)
                    {
                        File.Copy(SavePath,BackupPath,true);
                        File.Delete(SavePath);
                        File.Move(TempPath,SavePath);
                    }
                }
                else File.Move(TempPath,SavePath);
                return true;
            }
            catch (Exception ex) { error=ex.Message; return false; }
        }

        public bool Load(out GameRuntimeState state,out string error)
        {
            state=null; error=null;
            foreach (string path in new[]{SavePath,BackupPath})
            {
                if (!File.Exists(path)) continue;
                try
                {
                    var envelope=ValidateEnvelope(File.ReadAllText(path,Encoding.UTF8));
                    var loaded=JsonUtility.FromJson<GameRuntimeState>(envelope.PayloadJson);
                    ValidateLoadedState(loaded);
                    state=loaded;
                    if (path==BackupPath) error="Primary save was invalid; restored the validated backup.";
                    return true;
                }
                catch (Exception ex) { error=path+": "+ex.Message; }
            }
            return false;
        }

        private static SaveEnvelope ValidateEnvelope(string json)
        {
            var envelope=JsonUtility.FromJson<SaveEnvelope>(json);
            if (envelope==null || string.IsNullOrEmpty(envelope.PayloadJson) ||
                string.IsNullOrEmpty(envelope.Checksum) ||
                !string.Equals(envelope.Checksum,Sha256(envelope.PayloadJson),StringComparison.OrdinalIgnoreCase))
                throw new InvalidDataException("Save checksum mismatch or invalid envelope.");
            if (envelope.EnvelopeVersion!=1) throw new InvalidDataException("Unsupported save envelope version.");
            return envelope;
        }

        private static void ValidateLoadedState(GameRuntimeState state)
        {
            if (state==null) throw new InvalidDataException("Save payload is empty.");
            if (state.SaveFormatVersion<1 || state.SaveFormatVersion>1) throw new InvalidDataException("Unsupported save version.");
            if (state.Inventory==null || state.Machines==null || state.StoryFlags==null || state.RewardLedger==null)
                throw new InvalidDataException("Required save collections are missing.");
            var ids=new System.Collections.Generic.HashSet<string>(StringComparer.Ordinal);
            foreach (var stack in state.Inventory)
            {
                if (stack==null || string.IsNullOrWhiteSpace(stack.StackId) || !ids.Add(stack.StackId))
                    throw new InvalidDataException("Duplicate or invalid StackID.");
                if (!FactoryCatalog.Items.ContainsKey(stack.ItemId) || stack.Quantity<=0 ||
                    float.IsNaN(stack.Quality) || float.IsInfinity(stack.Quality) ||
                    float.IsNaN(stack.Purity) || float.IsInfinity(stack.Purity))
                    throw new InvalidDataException("Invalid inventory stack: "+stack.StackId);
            }
        }

        private static string Sha256(string text)
        {
            using (var sha=SHA256.Create())
            {
                byte[] bytes=sha.ComputeHash(Encoding.UTF8.GetBytes(text));
                var sb=new StringBuilder(bytes.Length*2);
                foreach (byte b in bytes) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }
    }
}
