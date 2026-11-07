(() => {
"use strict";
if (window.DoriLoungeAudio) return;

/*
 * Original Royal Lounge arrangements.
 * Every track has its own chord journey, melodic phrases, tempo and lead timbre.
 * The music is synthesized locally with Web Audio; no external recordings are used.
 */
const phrase = entries => {
 const events = Object.create(null);
 for (const [step, note, gate = 0.9, level = 0.7, kind = "key"] of entries) {
  events[step] = { note, gate, level, kind };
 }
 return events;
};

const TRACKS = {
 lounge_music_royal_piano: {
  bpm:70,timbre:"felt",reverb:0.35,leadKind:"key",bassHits:[0,4],
  chords:[
   [48,55,59,62,64,67],[45,52,55,59,62,64],[41,48,52,55,57,60],[43,50,54,57,59,62],
   [40,47,50,54,57,59],[45,52,55,59,62,64],[41,48,52,55,57,60],[43,50,54,57,59,62]
  ],
  melodies:[
   phrase([[1,76],[4,79],[7,81],[11,79],[14,76],[18,74],[21,76],[25,79],[28,83],[31,81],[34,79],[38,76],[42,74],[45,72],[49,74],[53,76],[56,79],[60,76],[62,74]]),
   phrase([[0,72],[3,76],[6,79],[10,83],[13,81],[17,79],[20,76],[24,74],[27,76],[30,79],[35,81],[39,79],[43,76],[46,74],[50,72],[54,74],[58,76],[61,72]])
  ]
 },
 lounge_music_velvet_jazz: {
  bpm:76,timbre:"rhodes",reverb:0.28,leadKind:"key",bassHits:[0,3,6],
  chords:[
   [41,48,52,55,57,60],[46,53,56,60,62,65],[39,46,50,53,55,58],[44,51,55,58,60,63],
   [37,44,48,51,53,56],[42,49,53,56,58,61],[39,46,50,53,55,58],[44,51,55,58,60,63]
  ],
  melodies:[
   phrase([[0,77],[2,80],[5,82],[9,84],[12,82],[15,79],[18,77],[20,74],[23,77],[27,80],[29,84],[32,82],[35,79],[37,77],[41,74],[44,76],[47,80],[50,82],[54,80],[57,77],[60,74],[63,72]]),
   phrase([[1,72],[4,76],[7,79],[10,82],[13,84],[16,82],[19,80],[22,77],[25,76],[28,79],[31,82],[34,86],[37,84],[40,80],[43,77],[46,74],[49,76],[52,79],[55,82],[58,80],[61,77]])
  ]
 },
 lounge_music_rainy_library: {
  bpm:58,timbre:"felt",reverb:0.52,leadKind:"key",bassHits:[0,5],
  chords:[
   [38,45,48,52,55,57],[43,50,53,57,60,62],[36,43,46,50,53,55],[41,48,52,55,57,60],
   [34,41,45,48,50,53],[39,46,50,53,55,58],[36,43,46,50,53,55],[41,48,52,55,57,60]
  ],
  melodies:[
   phrase([[3,74,1.5,.52],[10,77,1.4,.55],[17,76,1.2,.56],[23,72,1.5,.5],[29,69,1.4,.58],[35,72,1.3,.52],[42,74,1.5,.55],[49,72,1.5,.48],[57,69,1.7,.5],[62,67,1.5,.42]]),
   phrase([[1,69,1.5,.48],[8,72,1.4,.52],[15,74,1.4,.55],[22,77,1.5,.52],[28,76,1.6,.5],[34,72,1.4,.54],[41,69,1.6,.5],[48,67,1.5,.46],[55,69,1.7,.48],[61,65,1.8,.4]])
  ]
 },
 lounge_music_midnight_gold: {
  bpm:66,timbre:"rhodes",reverb:0.37,leadKind:"key",bassHits:[0,4],
  chords:[
   [43,50,53,57,60,62],[41,48,52,55,57,60],[38,45,48,52,55,57],[36,43,47,50,52,55],
   [34,41,45,48,50,53],[39,46,50,53,55,58],[41,48,52,55,57,60],[38,45,48,52,55,57]
  ],
  melodies:[
   phrase([[0,71],[5,74],[8,77],[12,76],[16,74],[21,69],[24,71],[29,74],[32,77],[36,81],[40,79],[44,76],[48,74],[52,71],[56,69],[60,71]]),
   phrase([[2,67],[6,71],[9,74],[13,77],[17,76],[20,74],[25,72],[28,69],[33,71],[37,76],[41,79],[45,77],[49,74],[53,72],[57,69],[61,67]])
  ]
 },
 lounge_music_crystal_atrium: {
  bpm:72,timbre:"glass",reverb:0.47,leadKind:"bell",bassHits:[0,4],
  chords:[
   [47,54,58,61,64,66],[52,59,63,66,68,71],[45,52,56,59,61,64],[50,57,61,64,66,69],
   [42,49,53,56,59,61],[47,54,58,61,64,66],[45,52,56,59,61,64],[50,57,61,64,66,69]
  ],
  melodies:[
   phrase([[1,83],[3,86],[7,90],[10,88],[14,86],[18,83],[21,81],[25,86],[28,90],[31,93],[34,90],[38,88],[42,86],[45,83],[49,81],[53,83],[57,86],[61,90]]),
   phrase([[0,78],[4,83],[8,86],[12,90],[16,88],[20,86],[24,83],[27,81],[30,83],[34,86],[38,91],[42,90],[46,86],[50,83],[54,81],[58,78],[62,83]])
  ]
 },
 lounge_music_garden_terrace: {
  bpm:74,timbre:"plucked",reverb:0.31,leadKind:"key",bassHits:[0,3,5],
  chords:[
   [43,50,54,57,59,62],[38,45,49,52,54,57],[40,47,50,54,57,59],[45,52,55,59,62,64],
   [43,50,54,57,59,62],[47,54,57,61,64,66],[45,52,55,59,62,64],[40,47,50,54,57,59]
  ],
  melodies:[
   phrase([[0,79],[3,83],[6,81],[9,78],[12,76],[15,79],[19,83],[22,86],[25,83],[28,81],[31,79],[34,76],[37,74],[40,76],[44,79],[47,83],[50,81],[54,78],[57,76],[60,74],[63,71]]),
   phrase([[1,74],[4,78],[7,81],[11,83],[14,81],[17,79],[20,76],[23,74],[26,78],[29,81],[32,86],[35,83],[38,81],[42,79],[45,76],[48,74],[51,78],[55,81],[58,79],[61,76]])
  ]
 },
 lounge_music_christmas_hotel: {
  bpm:68,timbre:"celeste",reverb:0.43,leadKind:"bell",bassHits:[0,4],
  chords:[
   [45,52,56,59,61,64],[40,47,50,54,57,59],[41,48,52,55,57,60],[36,43,47,50,52,55],
   [38,45,49,52,54,57],[43,50,54,57,59,62],[40,47,50,54,57,59],[45,52,56,59,61,64]
  ],
  melodies:[
   phrase([[0,76],[3,79],[7,84],[10,83],[14,79],[17,76],[21,72],[24,74],[27,79],[31,83],[34,81],[38,79],[41,76],[45,72],[48,74],[52,76],[55,79],[59,84],[62,81]]),
   phrase([[1,72],[4,76],[8,79],[11,84],[15,86],[18,84],[22,81],[25,79],[29,76],[32,79],[36,83],[39,86],[43,84],[46,81],[50,79],[53,76],[57,72],[60,76],[63,79]])
  ]
 }
};

// Five eight-bar phrases form a complete, finite hotel-lounge arrangement.
Object.values(TRACKS).forEach(track=>{
 track.duration=track.chords.length*5*4*60/track.bpm;
});

let audioContext=null,master=null,compressor=null,current=null,volume=0.62;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const midiHz=note=>440*Math.pow(2,(note-69)/12);

function getElapsed(state){
 if(!state)return 0;
 if(state.playing&&audioContext)return clamp(audioContext.currentTime-state.startedAt,0,state.track.duration);
 return clamp(state.elapsedOffset||0,0,state.track.duration);
}
function getState(){
 if(!current)return {trackId:null,playing:false,volume,elapsed:0,duration:0,remaining:0,progress:0,finished:false};
 const duration=current.track.duration;
 const elapsed=getElapsed(current);
 return {
  trackId:current.id,playing:Boolean(current.playing),volume,elapsed,duration,
  remaining:Math.max(0,duration-elapsed),
  progress:duration?elapsed/duration:0,
  finished:elapsed>=duration
 };
}
function emit(progressTick=false){
 const state=getState();
 window.dispatchEvent(new CustomEvent("dori-lounge-music-state",{detail:{...state,progressTick}}));
}
function makeImpulse(ctx,seconds=2.8,decay=2.65){
 const length=Math.floor(ctx.sampleRate*seconds);
 const buffer=ctx.createBuffer(2,length,ctx.sampleRate);
 for(let channel=0;channel<2;channel++){
  const data=buffer.getChannelData(channel);
  for(let i=0;i<length;i++){
   const fade=Math.pow(1-i/length,decay);
   data[i]=(Math.random()*2-1)*fade*(channel===0?1:0.92);
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
function voice(note,when,duration,kind,state,level=1){
 const ctx=audioContext,track=state.track;
 const frequency=midiHz(note);
 const amp=ctx.createGain(),filter=ctx.createBiquadFilter();
 const a=ctx.createOscillator(),b=ctx.createOscillator();
 const mixA=ctx.createGain(),mixB=ctx.createGain();
 let peak=0.043,attack=0.02,release=0.72,cutoff=2500,detune=3;
 if(kind==="pad"){peak=0.009;attack=0.8;release=1.2;cutoff=1050;detune=5}
 if(kind==="bass"){peak=0.046;attack=0.04;release=0.52;cutoff=590;detune=1}
 if(kind==="bell"){peak=0.020;attack=0.008;release=1.25;cutoff=4100;detune=1}
 if(track.timbre==="felt"){cutoff*=0.79;release*=1.13}
 if(track.timbre==="glass"){cutoff*=1.18;release*=1.25}
 if(track.timbre==="plucked"){cutoff*=0.91;if(kind==="key"){attack=0.008;release=0.52}}
 if(track.timbre==="celeste"){cutoff*=1.12;release*=1.16}
 filter.type="lowpass";
 filter.frequency.setValueAtTime(cutoff,when);
 filter.Q.value=0.42;
 const primaryWave=kind==="bass"?"sine":track.timbre==="rhodes"||track.timbre==="plucked"?"triangle":"sine";
 a.type=primaryWave;
 b.type=kind==="pad"?"triangle":track.timbre==="rhodes"?"sine":track.timbre==="plucked"?"sine":"triangle";
 a.frequency.setValueAtTime(frequency,when);
 const overtone=kind==="bell"&&(track.timbre==="glass"||track.timbre==="celeste")?2:1;
 b.frequency.setValueAtTime(frequency*overtone,when);
 b.detune.setValueAtTime(kind==="pad"?-detune:detune,when);
 mixA.gain.value=track.timbre==="glass"||track.timbre==="celeste"?0.78:0.87;
 mixB.gain.value=kind==="pad"?0.18:track.timbre==="rhodes"?0.3:track.timbre==="plucked"?0.12:0.18;
 a.connect(mixA);b.connect(mixB);mixA.connect(filter);mixB.connect(filter);
 filter.connect(amp);
 amp.gain.setValueAtTime(0.0001,when);
 amp.gain.linearRampToValueAtTime(peak*level,when+attack);
 const holdEnd=Math.max(when+attack+0.06,when+duration-release);
 amp.gain.setValueAtTime(peak*level,holdEnd);
 amp.gain.exponentialRampToValueAtTime(0.0001,Math.max(when+attack+0.08,when+duration));
 amp.connect(state.bus);
 amp.connect(state.send);
 a.start(when);b.start(when);
 const end=when+duration+0.06;
 a.stop(end);b.stop(end);
}
function finishTrack(state){
 if(!state||current!==state)return;
 if(state.timer){clearInterval(state.timer);state.timer=null}
 state.playing=false;
 state.elapsedOffset=state.track.duration;
 if(audioContext){
  const now=audioContext.currentTime;
  for(const node of [state.bus,state.wet]){
   node.gain.cancelScheduledValues(now);
   node.gain.setValueAtTime(Math.max(0.0001,node.gain.value),now);
   node.gain.linearRampToValueAtTime(0.0001,now+1.45);
  }
 }
 emit();
}
function startScheduler(state){
 const track=state.track,beat=60/track.bpm,stepLength=beat/2;
 state.nextTime=audioContext.currentTime+0.16;
 state.startedAt=audioContext.currentTime-(state.elapsedOffset||0);
 if(state.step===undefined)state.step=0;
 if(state.bar===undefined)state.bar=0;
 if(state.timer)clearInterval(state.timer);
 let lastUiUpdate=0;

 const scheduleStep=()=>{
  const slot=state.step,bar=state.bar;
  const chord=track.chords[bar%track.chords.length];
  const time=state.nextTime;
  const phraseIndex=Math.floor(bar/track.chords.length);
  const melody=track.melodies[phraseIndex%track.melodies.length];
  const stepIndex=(bar%track.chords.length)*8+slot;
  const phraseLevel=phraseIndex===4?0.68:phraseIndex===0?0.74:0.84;

  if(slot===0){
   chord.slice(1,6).forEach((note,index)=>voice(note+12,time,beat*3.8,"pad",state,(index===0?0.72:0.54)*phraseLevel));
  }
  if(track.bassHits.includes(slot)){
   const bassNote=chord[0]-12+(slot===0?0:12);
   voice(bassNote,time,beat*(slot===0?1.8:1.4),"bass",state,(slot===0?0.72:0.50)*phraseLevel);
  }
  const event=melody[stepIndex];
  if(event){
   const kind=event.kind==="key"?track.leadKind:event.kind;
   voice(event.note,time,beat*event.gate,kind,state,event.level*phraseLevel);
  }
  if(slot===2||slot===6){
   const note=chord[(bar+slot/2)%Math.min(5,chord.length)];
   voice(note+12,time+0.012,beat*0.66,"key",state,0.25*phraseLevel);
  }
  state.step++;
  if(state.step>=8){state.step=0;state.bar++}
  state.nextTime+=stepLength;
 };

 state.timer=setInterval(()=>{
  if(!current||current!==state||!state.playing||audioContext.state!=="running")return;
  if(getElapsed(state)>=track.duration){finishTrack(state);return}
  const horizon=audioContext.currentTime+0.32;
  let guard=0;
  while(state.nextTime<horizon&&guard++<12)scheduleStep();
  const now=performance.now();
  if(now-lastUiUpdate>=240){lastUiUpdate=now;emit(true)}
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
  if(current.elapsedOffset>=track.duration){
   current.elapsedOffset=0;current.step=0;current.bar=0;
  }
  current.playing=true;
  ramp(current.bus.gain,0.88,0.55);
  ramp(current.wet.gain,0.42+track.reverb*0.22,0.7);
  startScheduler(current);
  emit();
  return getState();
 }

 if(current)fadeOut(current);
 current={
  id:trackId,track,playing:true,step:0,bar:0,elapsedOffset:0,
  nextTime:ctx.currentTime+0.16,timer:null,...createOutput(track)
 };
 ramp(master.gain,0.20*volume,0.8);
 ramp(current.bus.gain,0.88,1.1);
 ramp(current.wet.gain,0.42+track.reverb*0.22,1.25);
 startScheduler(current);
 emit();
 return getState();
}
function pause(){
 if(!current||!current.playing)return getState();
 current.elapsedOffset=getElapsed(current);
 current.playing=false;
 if(current.timer){clearInterval(current.timer);current.timer=null}
 ramp(current.bus.gain,0.0001,0.28);
 ramp(current.wet.gain,0.0001,0.45);
 emit();
 return getState();
}
async function resume(){
 if(!current)return null;
 if(current.elapsedOffset>=current.track.duration){current.elapsedOffset=0;current.step=0;current.bar=0}
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
function stop(){
 if(current)fadeOut(current);
 current=null;
 emit();
}
function getTrackInfo(trackId){
 const track=TRACKS[trackId];
 return track?{id:trackId,duration:track.duration,bpm:track.bpm}:null;
}
window.DoriLoungeAudio={
 play,pause,resume,stop,setVolume,getState,getTrackInfo,
 hasTrack:id=>Boolean(TRACKS[id]),trackIds:Object.keys(TRACKS)
};
})();