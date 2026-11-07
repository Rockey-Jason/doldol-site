(() => {
"use strict";
if (window.DoriLoungeAudio) return;

/*
 * Original Royal Lounge arrangements.
 * Every track has its own chord journey and melodic phrases, arranged for an elegant, welcoming hotel lobby.
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
  bpm:84,timbre:"concertGrand",reverb:0.22,leadKind:"key",bassHits:[0,4],arpSlots:[1,5],compSlots:[2,6],swing:0.035,pan:0.10,sectionOrders:[[0,1,2,3,4,5,6,7],[0,3,1,4,2,5,7,6],[2,3,0,5,4,6,1,7],[0,1,3,2,4,5,6,7],[0,1,2,3,4,5,6,7]],
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
  bpm:94,timbre:"concertGrand",reverb:0.19,leadKind:"key",bassHits:[0,3,6],arpSlots:[1,5],compSlots:[2,6],swing:0.085,pan:0.16,sectionOrders:[[0,1,2,3,4,5,6,7],[1,3,5,2,4,6,0,7],[4,5,2,3,0,1,6,7],[0,2,1,3,4,6,5,7],[0,1,2,3,4,5,6,7]],
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
  bpm:76,timbre:"concertGrand",reverb:0.27,leadKind:"key",bassHits:[0,5],arpSlots:[4],compSlots:[2,6],swing:0.02,pan:0.06,sectionOrders:[[0,1,2,3,4,5,6,7],[0,2,1,3,4,6,5,7],[4,3,2,1,0,5,6,7],[0,1,2,3,4,6,5,7],[0,1,2,3,4,5,6,7]],
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
  bpm:82,timbre:"concertGrand",reverb:0.24,leadKind:"key",bassHits:[0,4],arpSlots:[2,6],compSlots:[2,6],swing:0.035,pan:0.08,sectionOrders:[[0,1,2,3,4,5,6,7],[1,2,4,3,5,6,0,7],[4,3,2,5,0,1,6,7],[0,1,3,2,4,5,7,6],[0,1,2,3,4,5,6,7]],
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
  bpm:88,timbre:"concertGrand",reverb:0.24,leadKind:"key",bassHits:[0,4],arpSlots:[1,5],compSlots:[2,6],swing:0.025,pan:0.18,sectionOrders:[[0,1,2,3,4,5,6,7],[2,1,3,4,6,5,0,7],[4,5,3,2,0,1,6,7],[0,2,1,3,5,4,6,7],[0,1,2,3,4,5,6,7]],
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
  bpm:96,timbre:"concertGrand",reverb:0.21,leadKind:"key",bassHits:[0,3,5],arpSlots:[1,4,6],compSlots:[2,5],swing:0.06,pan:0.12,sectionOrders:[[0,1,2,3,4,5,6,7],[0,2,4,1,3,5,6,7],[2,3,4,5,0,1,6,7],[0,1,3,2,4,5,7,6],[0,1,2,3,4,5,6,7]],
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
  bpm:86,timbre:"concertGrand",reverb:0.26,leadKind:"key",bassHits:[0,4],arpSlots:[2,5],compSlots:[2,6],swing:0.025,pan:0.14,sectionOrders:[[0,1,2,3,4,5,6,7],[0,2,1,3,5,4,6,7],[4,3,2,1,0,5,6,7],[0,1,3,2,4,5,6,7],[0,1,2,3,4,5,6,7]],
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

// Each track has an individual harmonic route across five sections.
function moveInScale(note,steps,scale){
 const candidates=[];
 const baseOctave=Math.floor(note/12);
 for(let octave=baseOctave-2;octave<=baseOctave+2;octave++){
  for(const pitchClass of scale)candidates.push(octave*12+pitchClass);
 }
 candidates.sort((a,b)=>a-b);
 let nearest=0,distance=Infinity;
 candidates.forEach((candidate,index)=>{
  const nextDistance=Math.abs(candidate-note);
  if(nextDistance<distance){distance=nextDistance;nearest=index;}
 });
 return candidates[Math.max(0,Math.min(candidates.length-1,nearest+steps))];
}
function makeSectionMelody(track,section){
 const source=track.melodies[section===1||section===3?1:0];
 const scale=[...new Set(track.chords.flatMap(chord=>chord).map(note=>((note%12)+12)%12))].sort((a,b)=>a-b);
 const out=Object.create(null);
 const entries=Object.entries(source);
 entries.forEach(([rawStep,event],index)=>{
  if(section===4&&index%2===1)return;
  if(section===2&&index%7===5)return;
  const step=Number(rawStep);
  const degreeShift=section===2?1:section===3?-1:section===4?-2:0;
  const rhythmShift=section===2?(index%3===0?1:0):section===3?(index%4===0?-1:0):0;
  let nextStep=Math.max(0,Math.min(63,step+rhythmShift));
  while(out[nextStep]&&nextStep<63)nextStep++;
  if(out[nextStep])return;
  const note=moveInScale(event.note,degreeShift,scale);
  const level=event.level*(section===4?0.43:section===2?0.76:section===3?0.82:1);
  out[nextStep]={...event,note,gate:event.gate*(section===4?1.24:section===2?0.90:0.96),level};
  if(section===2&&index%4===1&&nextStep<61){
   const ornamentStep=nextStep+2;
   if(!out[ornamentStep])out[ornamentStep]={note:moveInScale(note,1,scale),gate:0.56,level:level*0.31,kind:event.kind};
  }
 });
 return out;
}
Object.values(TRACKS).forEach(track=>{
 track.sections=Array.from({length:5},(_,index)=>makeSectionMelody(track,index));
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
 compressor.threshold.value=-18;
 compressor.knee.value=20;
 compressor.ratio.value=3.2;
 compressor.attack.value=0.012;
 compressor.release.value=0.26;
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
 send.gain.value=0.19+track.reverb*0.12;
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
const WAVE_CACHE=new Map();
const SPECTRA={
 concertGrand:{
  key:[0,1,.24,.17,.10,.055,.025,.012,.005],
  bell:[0,1,.12,.10,.055,.025],
  pad:[0,1,.10,.04,.015],
  bass:[0,1,.045,.012]
 },
 felt:{
  key:[0,1,.30,.13,.055,.024,.010,.004],
  bell:[0,1,.18,.08,.035,.015],
  pad:[0,1,.10,.035,.012],
  bass:[0,1,.035,.008]
 },
 rhodes:{
  key:[0,1,.12,.30,.13,.19,.075,.035,.012],
  bell:[0,1,.24,.37,.16,.11,.05,.02],
  pad:[0,1,.08,.05,.02],
  bass:[0,1,.06,.012]
 },
 softRhodes:{
  key:[0,1,.20,.19,.095,.045,.018,.006],
  bell:[0,1,.12,.12,.055,.025],
  pad:[0,1,.085,.035,.012],
  bass:[0,1,.035,.008]
 },
 warmGrand:{
  key:[0,1,.27,.16,.075,.035,.014,.005],
  bell:[0,1,.15,.10,.045,.018],
  pad:[0,1,.095,.04,.014],
  bass:[0,1,.04,.009]
 },
 mellowKeys:{
  key:[0,1,.17,.22,.10,.045,.018,.006],
  bell:[0,1,.13,.13,.06,.025],
  pad:[0,1,.09,.04,.014],
  bass:[0,1,.035,.008]
 }
};
function getWave(ctx,timbre,kind,secondary){
 const key=timbre+":"+kind+":"+(secondary?"2":"1");
 if(WAVE_CACHE.has(key))return WAVE_CACHE.get(key);
 const base=SPECTRA[timbre]||SPECTRA.felt;
 const source=base[kind]||base.key;
 const harmonics=secondary?source.map((value,index)=>index<2?0:value*(index%2?0.36:0.22)):source;
 const real=new Float32Array(harmonics.length);
 const imag=Float32Array.from(harmonics);
 const wave=ctx.createPeriodicWave(real,imag,{disableNormalization:true});
 WAVE_CACHE.set(key,wave);
 return wave;
}
function pianoVoice(note,when,duration,kind,state,level=1,pan=0){
 const ctx=audioContext;
 const base=midiHz(note);
 const panner=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();
 const filter=ctx.createBiquadFilter();
 const partials=[
  {ratio:1,gain:0.74,decay:1.00},
  {ratio:2.002,gain:0.22,decay:0.42},
  {ratio:3.006,gain:0.085,decay:0.25},
  {ratio:4.012,gain:0.032,decay:0.16},
  {ratio:5.025,gain:0.012,decay:0.075}
 ];
 const peak=(kind==="comp"?0.058:0.068)*level;
 const length=Math.max(0.72,duration+0.72);
 filter.type="lowpass";
 filter.frequency.setValueAtTime(6800,when);
 filter.frequency.exponentialRampToValueAtTime(3300,when+Math.min(1.1,length));
 filter.Q.value=0.22;
 panner.pan.setValueAtTime(clamp(pan,-0.34,0.34),when);
 panner.connect(state.bus);
 panner.connect(state.send);
 partials.forEach((partial,index)=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type="sine";
  osc.frequency.setValueAtTime(base*partial.ratio,when);
  if(index===1)osc.detune.setValueAtTime(-1.8,when);
  gain.gain.setValueAtTime(0.0001,when);
  const attack=index===0?0.006:0.004;
  const initial=peak*partial.gain;
  gain.gain.linearRampToValueAtTime(initial,when+attack);
  const decayTime=index===0?0.22:0.055+index*0.018;
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001,initial*partial.decay),when+decayTime);
  gain.gain.exponentialRampToValueAtTime(0.0001,when+length);
  osc.connect(gain);gain.connect(filter);
  osc.start(when);osc.stop(when+length+0.04);
 });
 filter.connect(panner);
}
function voice(note,when,duration,kind,state,level=1,pan=0){
 const ctx=audioContext,track=state.track;
 if(track.timbre==="concertGrand"&&(kind==="key"||kind==="comp")){
  pianoVoice(note,when,duration,kind,state,level,pan);
  return;
 }
 const frequency=midiHz(note);
 const amp=ctx.createGain(),filter=ctx.createBiquadFilter();
 const a=ctx.createOscillator(),b=ctx.createOscillator();
 const mixA=ctx.createGain(),mixB=ctx.createGain();
 const panner=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();
 let peak=0.044,attack=0.026,release=0.55,cutoff=2050,detune=0.8,sustain=0.43;
 if(kind==="pad"){peak=0.009;attack=0.82;release=1.42;cutoff=1080;detune=1.2;sustain=0.74}
 if(kind==="bass"){peak=0.045;attack=0.045;release=0.40;cutoff=470;detune=0.25;sustain=0.32}
 if(kind==="bell"){peak=0.010;attack=0.018;release=0.80;cutoff=2600;detune=0.3;sustain=0.10}
 if(kind==="comp"){peak=0.018;attack=0.020;release=0.26;cutoff=1780;detune=0.35;sustain=0.22}
 if(track.timbre==="felt"){cutoff*=0.83;release*=1.12}
 if(track.timbre==="glass"){cutoff*=0.92;release*=1.08}
 if(track.timbre==="plucked"){cutoff*=0.90;if(kind==="key"){attack=0.012;release=0.42;sustain=0.22}}
 if(track.timbre==="celeste"){cutoff*=0.94;release*=1.10}
 filter.type="lowpass";
 filter.frequency.setValueAtTime(Math.max(420,cutoff*0.76),when);
 filter.frequency.exponentialRampToValueAtTime(cutoff,when+Math.max(0.025,attack*2.5));
 filter.Q.value=0.32;
 a.setPeriodicWave(getWave(ctx,track.timbre,kind,false));
 b.setPeriodicWave(getWave(ctx,track.timbre,kind,true));
 a.frequency.setValueAtTime(frequency,when);
 const overtone=kind==="bell"?2:1;
 b.frequency.setValueAtTime(frequency*overtone,when);
 b.detune.setValueAtTime(detune,when);
 mixA.gain.value=0.86;
 mixB.gain.value=kind==="pad"?0.13:kind==="bass"?0.09:0.16;
 a.connect(mixA);b.connect(mixB);mixA.connect(filter);mixB.connect(filter);
 filter.connect(amp);amp.connect(panner);
 if(panner.pan)panner.pan.setValueAtTime(clamp(pan,-0.38,0.38),when);
 panner.connect(state.bus);
 panner.connect(state.send);
 const safeDuration=Math.max(0.12,duration);
 const safeAttack=Math.min(attack,safeDuration*0.34);
 const safeRelease=Math.min(release,Math.max(0.10,safeDuration*0.62));
 const peakGain=Math.max(0.0002,peak*level);
 const noteOff=Math.max(when+safeAttack+0.025,when+safeDuration-safeRelease);
 amp.gain.setValueAtTime(0.0001,when);
 amp.gain.linearRampToValueAtTime(peakGain,when+safeAttack);
 amp.gain.setTargetAtTime(Math.max(0.00015,peakGain*sustain),when+safeAttack,Math.max(0.025,safeAttack*1.8));
 amp.gain.setValueAtTime(Math.max(0.00015,peakGain*sustain),noteOff);
 amp.gain.exponentialRampToValueAtTime(0.0001,when+safeDuration);
 const end=when+safeDuration+0.07;
 a.start(when);b.start(when);a.stop(end);b.stop(end);
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
  const time=state.nextTime+(slot%2?beat*(track.swing||0):0);
  const phraseIndex=Math.min(4,Math.floor(bar/track.chords.length));
  const chordOrder=track.sectionOrders[phraseIndex]||track.sectionOrders[0];
  const chord=track.chords[chordOrder[bar%track.chords.length]];
  const melody=track.sections[phraseIndex];
  const stepIndex=(bar%track.chords.length)*8+slot;
  const phraseLevel=phraseIndex===4?0.62:phraseIndex===0?0.70:phraseIndex===2?0.78:0.82;

  if(slot===0){
   chord.slice(1,4).forEach((note,index)=>voice(note+12,time,beat*3.7,"pad",state,(index===0?0.58:0.38)*phraseLevel,(index-1)*0.13));
  }
  if(track.bassHits.includes(slot)){
   const bassNote=chord[0]-12+(slot===0?0:12);
   voice(bassNote,time,beat*(slot===0?1.8:1.4),"bass",state,(slot===0?0.66:0.42)*phraseLevel,0);
  }
  const event=melody[stepIndex];
  if(event){
   const kind=event.kind==="key"?track.leadKind:event.kind;
   voice(event.note,time,beat*event.gate,kind,state,event.level*phraseLevel,track.pan*((bar%2)===0?1:-1));
  }
  if(track.compSlots.includes(slot)){
   chord.slice(1,4).forEach((note,index)=>{
    voice(note+12,time+0.006,beat*0.82,"comp",state,(index===0?0.46:0.36)*phraseLevel,(index-1)*0.12);
   });
  }
  if(track.arpSlots.includes(slot)){
   const arpIndex=track.arpSlots.indexOf(slot);
   const chordTone=chord[1+((bar+arpIndex)%Math.min(4,chord.length-1))];
   voice(chordTone+12,time+0.008,beat*0.76,"key",state,0.10*phraseLevel,-track.pan*0.7);
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
  ramp(current.bus.gain,0.76,0.75);
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
 ramp(master.gain,0.46*volume,0.9);
 ramp(current.bus.gain,0.76,1.35);
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
 ramp(current.bus.gain,0.66,0.75);
 ramp(current.wet.gain,0.42+current.track.reverb*0.22,0.7);
 startScheduler(current);emit();return getState();
}
function setVolume(value){
 volume=clamp(Number(value)||0,0,1);
 if(master&&audioContext){
  const now=audioContext.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(0.46*volume,now,0.12);
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