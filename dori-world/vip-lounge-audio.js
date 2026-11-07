(() => {
"use strict";
if(window.DoriLoungeAudio)return;

const TRACKS={
 lounge_music_royal_piano:{
  bpm:70,timbre:"felt",reverb:0.34,
  chords:[[48,55,59,62,64,67],[45,52,55,59,62,64],[41,48,52,55,57,60],[43,50,54,57,59,62]],
  melody:[null,76,null,null,79,null,76,null,null,74,null,72,74,null,null,null]
 },
 lounge_music_velvet_jazz:{
  bpm:78,timbre:"rhodes",reverb:0.26,
  chords:[[46,53,56,60,63,65],[51,58,61,65,68,70],[44,51,54,58,61,63],[49,56,59,63,66,68]],
  melody:[null,77,null,80,82,null,80,null,null,75,null,77,79,null,75,null]
 },
 lounge_music_rainy_library:{
  bpm:58,timbre:"felt",reverb:0.48,
  chords:[[40,47,50,54,57,59],[45,52,55,59,62,64],[38,45,48,52,55,57],[43,50,53,57,60,62]],
  melody:[null,null,76,null,null,79,null,null,null,null,74,null,null,71,null,null]
 },
 lounge_music_midnight_gold:{
  bpm:66,timbre:"rhodes",reverb:0.31,
  chords:[[43,50,54,57,59,62],[41,48,52,55,57,60],[36,43,47,50,52,55],[38,45,49,52,54,57]],
  melody:[null,74,null,77,null,null,79,null,null,72,null,74,76,null,null,null]
 },
 lounge_music_crystal_atrium:{
  bpm:72,timbre:"glass",reverb:0.43,
  chords:[[50,57,61,64,66,69],[45,52,56,59,61,64],[47,54,57,61,64,66],[43,50,54,57,59,62]],
  melody:[null,81,null,85,null,83,null,78,null,76,null,81,null,78,null,74]
 },
 lounge_music_garden_terrace:{
  bpm:74,timbre:"plucked",reverb:0.29,
  chords:[[45,52,55,59,62,64],[40,47,50,54,57,59],[43,50,53,57,60,62],[38,45,49,52,54,57]],
  melody:[null,79,null,76,null,74,76,null,null,72,null,76,79,null,76,null]
 }
};

let audioContext=null,master=null,compressor=null,current=null,volume=0.62;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const midiHz=n=>440*Math.pow(2,(n-69)/12);
function emit(){
 const detail={trackId:current?current.id:null,playing:Boolean(current&&current.playing),volume};
 window.dispatchEvent(new CustomEvent("dori-lounge-music-state",{detail}));
}
function makeImpulse(ctx,seconds=2.7,decay=2.65){
 const length=Math.floor(ctx.sampleRate*seconds);
 const buffer=ctx.createBuffer(2,length,ctx.sampleRate);
 for(let ch=0;ch<2;ch++){
  const data=buffer.getChannelData(ch);
  for(let i=0;i<length;i++){
   const fade=Math.pow(1-i/length,decay);
   data[i]=(Math.random()*2-1)*fade*(ch===0?1:0.92);
  }
 }
 return buffer;
}
function ensureContext(){
 if(audioContext)return audioContext;
 const Ctor=window.AudioContext||window.webkitAudioContext;
 if(!Ctor)throw new Error("이 브라우저는 Web Audio를 지원하지 않습니다.");
 audioContext=new Ctor({latencyHint:"playback"});
 master=audioContext.createGain();
 master.gain.value=0.0001;
 compressor=audioContext.createDynamicsCompressor();
 compressor.threshold.value=-22;
 compressor.knee.value=18;
 compressor.ratio.value=3;
 compressor.attack.value=0.018;
 compressor.release.value=0.28;
 master.connect(compressor);
 compressor.connect(audioContext.destination);
 return audioContext;
}
function createOutput(track){
 const ctx=ensureContext();
 const bus=ctx.createGain();
 const send=ctx.createGain();
 const convolver=ctx.createConvolver();
 const wet=ctx.createGain();
 convolver.buffer=makeImpulse(ctx);
 bus.gain.value=0.0001;
 send.gain.value=0.30+track.reverb*0.18;
 wet.gain.value=0.0001;
 bus.connect(master);
 send.connect(convolver);
 convolver.connect(wet);
 wet.connect(master);
 return {bus,send,wet,convolver};
}
function ramp(param,value,time=0.45){
 const ctx=ensureContext(),now=ctx.currentTime;
 param.cancelScheduledValues(now);
 param.setValueAtTime(Math.max(0.0001,param.value),now);
 param.linearRampToValueAtTime(Math.max(0.0001,value),now+time);
}
function voice(midi,when,duration,kind,trackState,level=1){
 const ctx=audioContext,track=trackState.track;
 const freq=midiHz(midi);
 const amp=ctx.createGain();
 const filter=ctx.createBiquadFilter();
 const a=ctx.createOscillator(),b=ctx.createOscillator();
 const mixA=ctx.createGain(),mixB=ctx.createGain();
 let peak=0.045,attack=0.018,release=0.72,cutoff=2600,detune=3;
 if(kind==="pad"){peak=0.010;attack=0.75;release=1.1;cutoff=1150;detune=5}
 if(kind==="bass"){peak=0.052;attack=0.035;release=0.42;cutoff=650;detune=1}
 if(kind==="bell"){peak=0.023;attack=0.008;release=1.05;cutoff=3900;detune=1}
 if(track.timbre==="felt"){cutoff*=0.83;release*=1.12}
 if(track.timbre==="glass"&&kind!=="bass"){cutoff*=1.16;release*=1.28}
 if(track.timbre==="plucked"&&kind==="key"){attack=0.009;release=0.48;cutoff=2100}
 filter.type="lowpass";
 filter.frequency.setValueAtTime(cutoff,when);
 filter.Q.value=0.42;
 a.type=kind==="bass"?"sine":"sine";
 b.type=kind==="pad"?"triangle":track.timbre==="rhodes"?"triangle":"sine";
 a.frequency.setValueAtTime(freq,when);
 b.frequency.setValueAtTime(freq*(kind==="bell"&&track.timbre==="glass"?2:1),when);
 b.detune.setValueAtTime(kind==="pad"?-detune:detune,when);
 mixA.gain.value=track.timbre==="glass"&&kind!=="bass"?0.76:0.88;
 mixB.gain.value=kind==="pad"?0.18:track.timbre==="rhodes"?0.27:track.timbre==="plucked"?0.10:0.15;
 a.connect(mixA);b.connect(mixB);mixA.connect(filter);mixB.connect(filter);
 filter.connect(amp);
 amp.gain.setValueAtTime(0.0001,when);
 amp.gain.linearRampToValueAtTime(peak*level,when+attack);
 const holdEnd=Math.max(when+attack+0.06,when+duration-release);
 amp.gain.setValueAtTime(peak*level,holdEnd);
 amp.gain.exponentialRampToValueAtTime(0.0001,Math.max(when+attack+0.08,when+duration));
 amp.connect(trackState.bus);
 amp.connect(trackState.send);
 a.start(when);b.start(when);
 const end=when+duration+0.06;
 a.stop(end);b.stop(end);
}
function startScheduler(state){
 const track=state.track,beat=60/track.bpm,stepLength=beat/2;
 state.nextTime=audioContext.currentTime+0.16;
 if(state.timer)clearInterval(state.timer);
 const scheduleStep=()=>{
  const slot=state.step,bar=state.bar,chord=track.chords[bar%track.chords.length];
  const t=state.nextTime;
  if(slot===0){
   chord.slice(1,6).forEach((note,index)=>voice(note+12,t,beat*3.85,"pad",state,index===0?0.72:0.58));
   voice(chord[0]-12,t,beat*1.8,"bass",state,0.74);
   voice(chord[0]-12,t+beat*2,beat*1.6,"bass",state,0.55);
  }
  const motif=track.melody[(bar*8+slot)%track.melody.length];
  if(motif!==null&&motif!==undefined)voice(motif,t,beat*0.9,track.timbre==="glass"?"bell":"key",state,0.72);
  if(slot===2||slot===6){
   const note=chord[(bar+slot/2)%Math.min(5,chord.length)];
   voice(note+12,t+0.008,beat*0.7,"key",state,0.35);
  }
  state.step++;
  if(state.step>=8){state.step=0;state.bar++}
  state.nextTime+=stepLength;
 };
 state.timer=setInterval(()=>{
  if(!current||current!==state||!state.playing||audioContext.state!=="running")return;
  const horizon=audioContext.currentTime+0.32;
  let guard=0;
  while(state.nextTime<horizon&&guard++<12)scheduleStep();
 },80);
}
function fadeOut(state){
 if(!state)return;
 if(state.timer){clearInterval(state.timer);state.timer=null}
 state.playing=false;
 if(audioContext){
  const now=audioContext.currentTime;
  for(const node of [state.bus,state.wet]){
   node.gain.cancelScheduledValues(now);
   node.gain.setValueAtTime(Math.max(0.0001,node.gain.value),now);
   node.gain.linearRampToValueAtTime(0.0001,now+0.9);
  }
  setTimeout(()=>{try{state.bus.disconnect();state.send.disconnect();state.wet.disconnect();state.convolver.disconnect()}catch(e){}},1200);
 }
}
async function play(trackId){
 const track=TRACKS[trackId];
 if(!track)throw new Error("선택한 음악을 찾을 수 없습니다.");
 const ctx=ensureContext();
 await ctx.resume();
 if(current&&current.id===trackId){
  if(current.playing)return getState();
  current.playing=true;
  ramp(current.bus.gain,0.88,0.5);
  ramp(current.wet.gain,0.42+track.reverb*0.22,0.6);
  startScheduler(current);
  emit();
  return getState();
 }
 if(current)fadeOut(current);
 current={id:trackId,track,playing:true,step:0,bar:0,nextTime:ctx.currentTime+0.16,timer:null,...createOutput(track)};
 ramp(master.gain,0.20*volume,0.8);
 ramp(current.bus.gain,0.88,1.1);
 ramp(current.wet.gain,0.42+track.reverb*0.22,1.25);
 startScheduler(current);
 emit();
 return getState();
}
function pause(){
 if(!current||!current.playing)return getState();
 current.playing=false;
 if(current.timer){clearInterval(current.timer);current.timer=null}
 ramp(current.bus.gain,0.0001,0.28);
 ramp(current.wet.gain,0.0001,0.45);
 emit();
 return getState();
}
async function resume(){
 if(!current)return null;
 const ctx=ensureContext();await ctx.resume();
 current.playing=true;
 ramp(current.bus.gain,0.88,0.55);
 ramp(current.wet.gain,0.42+current.track.reverb*0.22,0.7);
 startScheduler(current);emit();return getState();
}
function setVolume(value){
 volume=clamp(Number(value)||0,0,1);
 if(master&&audioContext){
  const now=audioContext.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(0.20*volume,now,0.08);
 }
 emit();
}
function getState(){return {trackId:current?current.id:null,playing:Boolean(current&&current.playing),volume}}
function stop(){
 if(current)fadeOut(current);
 current=null;emit();
}
window.DoriLoungeAudio={play,pause,resume,stop,setVolume,getState,hasTrack:id=>Boolean(TRACKS[id]),trackIds:Object.keys(TRACKS)};
})();