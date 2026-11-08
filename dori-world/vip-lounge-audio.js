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
  keyName:"C Major",scale:[0,2,4,5,7,9,11],
  bpm:84,timbre:"concertGrand",reverb:0.22,leadKind:"piano",compKind:"pianoComp",padKind:"strings",bassKind:"uprightBass",arpKind:"vibraphone",bassHits:[0,4],arpSlots:[1,5],compSlots:[2,6],swing:0.035,pan:0.10,sectionOrders:[[0,1,2,3,4,5,6,7],[0,3,1,4,2,5,7,6],[2,3,0,5,4,6,1,7],[0,1,3,2,4,5,6,7],[0,1,2,3,4,5,6,7]],
  chords:[
   [48,52,55,59,62,64],
   [45,48,52,55,59,62],
   [41,45,48,52,55,59],
   [43,47,50,53,57,60],
   [40,43,47,50,55,59],
   [45,48,52,55,59,62],
   [38,41,45,48,52,55],
   [43,47,50,53,57,60]
  ],
  melodies:[
   phrase([[0,76,3.55,0.78],[8,79,3.55,0.74],[16,81,3.6,0.76],[24,79,3.55,0.72],[32,76,3.6,0.76],[40,74,3.55,0.72],[48,72,3.7,0.74],[56,74,3.6,0.7]]),
   phrase([[0,72,3.6,0.72],[8,76,3.6,0.74],[16,79,3.6,0.76],[24,83,3.55,0.72],[32,81,3.6,0.74],[40,79,3.55,0.72],[48,76,3.65,0.7],[56,72,3.8,0.7]])
  ]
 },
 lounge_music_velvet_jazz: {
  keyName:"F Dorian",scale:[0,2,3,5,7,8,10],
  bpm:94,timbre:"rhodes",reverb:0.19,leadKind:"sax",compKind:"rhodes",padKind:"strings",bassKind:"uprightBass",arpKind:"vibraphone",rhythmKind:"brush",rhythmSlots:[2,6],rhythmLevel:0.22,bassHits:[0,3,6],arpSlots:[1,5],compSlots:[2,6],swing:0.085,pan:0.16,sectionOrders:[[0,1,2,3,4,5,6,7],[1,3,5,2,4,6,0,7],[4,5,2,3,0,1,6,7],[0,2,1,3,4,6,5,7],[0,1,2,3,4,5,6,7]],
  chords:[
   [41,44,48,51,55,58],
   [46,50,53,56,60,63],
   [39,43,46,50,53,56],
   [44,48,51,55,58,60],
   [38,41,44,48,51,55],
   [43,46,50,53,58,60],
   [36,41,43,46,50,53],
   [41,44,48,51,55,58]
  ],
  melodies:[
   phrase([[0,77,3.4,0.74],[8,80,3.35,0.78],[16,82,3.45,0.74],[24,84,3.35,0.78],[32,82,3.45,0.74],[40,80,3.35,0.76],[48,77,3.6,0.72],[56,74,3.8,0.7]]),
   phrase([[0,72,3.4,0.7],[8,75,3.5,0.74],[16,77,3.45,0.76],[24,80,3.4,0.74],[32,82,3.45,0.76],[40,80,3.5,0.72],[48,77,3.6,0.7],[56,75,3.8,0.68]])
  ]
 },
 lounge_music_rainy_library: {
  keyName:"D Major",scale:[1,2,4,6,7,9,11],
  bpm:76,timbre:"felt",reverb:0.29,leadKind:"flute",compKind:"rhodes",padKind:"strings",bassKind:"uprightBass",arpKind:"vibraphone",rhythmKind:"brush",rhythmSlots:[5],rhythmLevel:0.10,bassHits:[0,5],arpSlots:[4],compSlots:[2,6],swing:0.02,pan:0.06,sectionOrders:[[0,1,2,3,4,5,6,7],[0,2,1,3,4,6,5,7],[4,3,2,1,0,5,6,7],[0,1,2,3,4,6,5,7],[0,1,2,3,4,5,6,7]],
  chords:[
   [50,54,57,61,64,67],
   [47,50,54,57,61,64],
   [43,47,50,54,57,61],
   [45,49,52,55,59,62],
   [42,45,49,52,55,59],
   [40,43,47,50,54,57],
   [43,47,50,54,57,61],
   [45,49,52,55,59,62]
  ],
  melodies:[
   phrase([[0,74,3.65,0.72],[8,78,3.55,0.76],[16,81,3.65,0.74],[24,83,3.55,0.76],[32,81,3.65,0.74],[40,78,3.55,0.74],[48,76,3.65,0.72],[56,74,3.85,0.7]]),
   phrase([[0,71,3.65,0.7],[8,74,3.6,0.72],[16,78,3.65,0.74],[24,81,3.55,0.76],[32,85,3.6,0.74],[40,83,3.65,0.72],[48,81,3.65,0.7],[56,78,3.85,0.68]])
  ]
 },
 lounge_music_midnight_gold: {
  keyName:"Eb Dorian",scale:[0,1,3,5,6,8,10],
  bpm:82,timbre:"warmGrand",reverb:0.24,leadKind:"mutedTrumpet",compKind:"rhodes",padKind:"strings",bassKind:"uprightBass",arpKind:"vibraphone",rhythmKind:"brush",rhythmSlots:[3,7],rhythmLevel:0.14,bassHits:[0,4],arpSlots:[2,6],compSlots:[2,6],swing:0.035,pan:0.08,sectionOrders:[[0,1,2,3,4,5,6,7],[1,2,4,3,5,6,0,7],[4,3,2,5,0,1,6,7],[0,1,3,2,4,5,7,6],[0,1,2,3,4,5,6,7]],
  chords:[
   [51,54,58,61,65,68],
   [44,48,51,54,58,61],
   [49,53,56,60,63,66],
   [42,46,49,53,56,61],
   [48,51,54,58,61,65],
   [46,49,53,56,60,63],
   [44,48,51,54,58,61],
   [51,54,58,61,65,68]
  ],
  melodies:[
   phrase([[0,70,3.55,0.72],[8,73,3.45,0.76],[16,75,3.55,0.74],[24,78,3.45,0.78],[32,80,3.55,0.76],[40,78,3.45,0.74],[48,77,3.6,0.72],[56,75,3.85,0.7]]),
   phrase([[0,75,3.55,0.7],[8,77,3.5,0.74],[16,80,3.55,0.76],[24,82,3.45,0.78],[32,85,3.55,0.76],[40,82,3.5,0.74],[48,80,3.65,0.72],[56,78,3.85,0.68]])
  ]
 },
 lounge_music_crystal_atrium: {
  keyName:"F# Lydian",scale:[0,1,3,5,6,8,10],
  bpm:88,timbre:"mellowKeys",reverb:0.30,leadKind:"celeste",compKind:"strings",padKind:"strings",bassKind:"softBass",arpKind:"harp",bassHits:[0,4],arpSlots:[1,5],compSlots:[2,6],swing:0.025,pan:0.18,sectionOrders:[[0,1,2,3,4,5,6,7],[2,1,3,4,6,5,0,7],[4,5,3,2,0,1,6,7],[0,2,1,3,5,4,6,7],[0,1,2,3,4,5,6,7]],
  chords:[
   [54,58,61,65,68,72],
   [56,60,63,66,70,73],
   [58,61,65,68,72,75],
   [51,54,58,61,65,68],
   [49,53,56,60,63,66],
   [54,58,61,65,68,72],
   [56,60,63,66,70,73],
   [54,58,61,65,68,72]
  ],
  melodies:[
   phrase([[0,78,3.45,0.72],[8,80,3.4,0.74],[16,84,3.45,0.78],[24,85,3.4,0.76],[32,87,3.45,0.78],[40,85,3.4,0.76],[48,82,3.5,0.74],[56,78,3.85,0.7]]),
   phrase([[0,75,3.45,0.7],[8,78,3.4,0.72],[16,80,3.45,0.76],[24,82,3.4,0.78],[32,84,3.45,0.76],[40,82,3.4,0.74],[48,80,3.55,0.72],[56,78,3.85,0.68]])
  ]
 },
 lounge_music_garden_terrace: {
  keyName:"E Mixolydian",scale:[1,2,4,6,8,9,11],
  bpm:96,timbre:"softRhodes",reverb:0.20,leadKind:"flute",compKind:"nylonGuitar",padKind:"strings",bassKind:"uprightBass",arpKind:"vibraphone",rhythmKind:"shaker",rhythmSlots:[1,3,5,7],rhythmLevel:0.22,bassHits:[0,3,5],arpSlots:[1,4,6],compSlots:[2,5],swing:0.06,pan:0.12,sectionOrders:[[0,1,2,3,4,5,6,7],[0,2,4,1,3,5,6,7],[2,3,4,5,0,1,6,7],[0,1,3,2,4,5,7,6],[0,1,2,3,4,5,6,7]],
  chords:[
   [52,56,59,62,66,69],
   [45,49,52,56,59,62],
   [42,45,49,52,56,59],
   [47,50,54,57,61,64],
   [50,54,57,61,64,69],
   [52,56,59,62,66,69],
   [45,49,52,56,59,62],
   [47,50,54,57,61,64]
  ],
  melodies:[
   phrase([[0,76,3.45,0.72],[8,80,3.4,0.76],[16,83,3.45,0.78],[24,86,3.4,0.76],[32,85,3.45,0.78],[40,83,3.4,0.76],[48,81,3.5,0.74],[56,80,3.85,0.7]]),
   phrase([[0,78,3.45,0.7],[8,81,3.4,0.74],[16,85,3.45,0.78],[24,86,3.4,0.76],[32,85,3.45,0.76],[40,83,3.4,0.74],[48,81,3.55,0.72],[56,76,3.85,0.68]])
  ]
 },
 lounge_music_christmas_hotel: {
  keyName:"Bb Major",scale:[0,2,3,5,7,9,10],
  bpm:86,timbre:"mellowKeys",reverb:0.29,leadKind:"musicBox",compKind:"strings",padKind:"strings",bassKind:"softBass",arpKind:"sleighBell",bassHits:[0,4],arpSlots:[2,5],compSlots:[2,6],swing:0.025,pan:0.14,sectionOrders:[[0,1,2,3,4,5,6,7],[0,2,1,3,5,4,6,7],[4,3,2,1,0,5,6,7],[0,1,3,2,4,5,6,7],[0,1,2,3,4,5,6,7]],
  chords:[
   [46,50,53,57,60,65],
   [43,46,50,53,57,60],
   [48,51,55,58,62,65],
   [41,45,48,51,55,58],
   [39,43,46,50,53,57],
   [38,41,45,48,53,57],
   [41,45,48,51,55,58],
   [46,50,53,57,60,65]
  ],
  melodies:[
   phrase([[0,77,3.5,0.74],[8,81,3.45,0.78],[16,84,3.5,0.76],[24,86,3.45,0.78],[32,87,3.5,0.76],[40,86,3.45,0.76],[48,84,3.55,0.74],[56,81,3.85,0.7]]),
   phrase([[0,74,3.5,0.7],[8,77,3.45,0.74],[16,79,3.5,0.76],[24,82,3.45,0.78],[32,84,3.5,0.76],[40,86,3.45,0.74],[48,84,3.55,0.72],[56,81,3.85,0.68]])
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
 const scale=track.scale||[...new Set(track.chords.flatMap(chord=>chord).map(note=>((note%12)+12)%12))].sort((a,b)=>a-b);
 const out=Object.create(null);
 const entries=Object.entries(source);
 entries.forEach(([rawStep,event],index)=>{
  if(section===4&&index%2===1)return;
  const step=Number(rawStep);
  const degreeShift=section===2?1:section===3?-1:section===4?-2:0;
  const rhythmShift=section===2?(index%3===0?1:0):section===3?(index%4===0?-1:0):0;
  let nextStep=Math.max(0,Math.min(63,step+rhythmShift));
  while(out[nextStep]&&nextStep<63)nextStep++;
  if(out[nextStep])return;
  const note=moveInScale(event.note,degreeShift,scale);
  const level=event.level*(section===4?0.43:section===2?0.76:section===3?0.82:1);
  out[nextStep]={...event,note,gate:event.gate*(section===4?1.10:section===2?0.98:0.99),level};
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

const INSTRUMENTS={
 sax:{parts:[[1,.56,"sawtooth"],[1.004,.22,"sawtooth"],[2,.13,"triangle"],[3,.055,"sawtooth"]],attack:.12,release:.52,sustain:.72,peak:.034,cutoff:2450,q:.68,vibrato:4.8,depth:2.6,mode:"held"},
 mutedTrumpet:{parts:[[1,.64,"sawtooth"],[2,.21,"square"],[3,.085,"sawtooth"],[4,.025,"triangle"]],attack:.10,release:.48,sustain:.64,peak:.030,cutoff:1850,q:.82,vibrato:5.2,depth:1.8,mode:"held"},
 flute:{parts:[[1,.84,"sine"],[2,.12,"sine"],[3,.025,"sine"]],attack:.14,release:.58,sustain:.66,peak:.027,cutoff:4300,q:.22,mode:"held"},
 harp:{parts:[[1,.70,"sine"],[2,.21,"triangle"],[3,.065,"sine"],[4,.025,"sine"]],attack:.006,release:.62,sustain:.10,peak:.035,cutoff:5600,q:.2,mode:"pluck"},
 nylonGuitar:{parts:[[1,.72,"triangle"],[2,.18,"sine"],[3,.07,"triangle"],[4,.018,"sine"]],attack:.008,release:.48,sustain:.10,peak:.030,cutoff:3900,q:.22,mode:"pluck"},
 celeste:{parts:[[1,.72,"sine"],[2.76,.20,"sine"],[5.42,.07,"sine"],[8.9,.025,"sine"]],attack:.004,release:1.25,sustain:.035,peak:.025,cutoff:7200,q:.18,mode:"pluck"},
 musicBox:{parts:[[1,.64,"sine"],[2.71,.22,"sine"],[5.31,.095,"sine"],[8.7,.035,"sine"]],attack:.003,release:1.05,sustain:.025,peak:.026,cutoff:7600,q:.16,mode:"pluck"},
 sleighBell:{parts:[[1,.46,"sine"],[2.76,.30,"sine"],[5.6,.17,"sine"],[9.4,.07,"sine"]],attack:.002,release:.76,sustain:.015,peak:.014,cutoff:8500,q:.14,mode:"pluck"},
 vibraphone:{parts:[[1,.68,"sine"],[3,.22,"sine"],[4.18,.075,"sine"]],attack:.008,release:1.30,sustain:.08,peak:.020,cutoff:6500,q:.18,mode:"pluck"},
 rhodes:{parts:[[1,.66,"triangle"],[2,.24,"sine"],[3,.08,"triangle"],[4,.025,"sine"]],attack:.012,release:.48,sustain:.16,peak:.029,cutoff:3100,q:.25,mode:"pluck"},
 strings:{parts:[[1,.54,"sawtooth"],[1.006,.25,"sawtooth"],[2,.12,"triangle"],[3,.045,"sawtooth"]],attack:.48,release:1.05,sustain:.82,peak:.013,cutoff:2350,q:.22,mode:"held"},
 uprightBass:{parts:[[1,.76,"triangle"],[2,.18,"sine"],[3,.045,"triangle"]],attack:.018,release:.30,sustain:.20,peak:.035,cutoff:690,q:.2,mode:"pluck"},
 softBass:{parts:[[1,.82,"sine"],[2,.13,"sine"]],attack:.06,release:.44,sustain:.26,peak:.022,cutoff:440,q:.2,mode:"held"}
};
let noiseBuffer=null;
function percussionVoice(when,instrument,state,level=1,pan=0){
 const ctx=audioContext;
 if(!noiseBuffer){
  noiseBuffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.35),ctx.sampleRate);
  const data=noiseBuffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 }
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
 const panner=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();
 const shaker=instrument==="shaker";
 source.buffer=noiseBuffer;
 filter.type=shaker?"highpass":"bandpass";
 filter.frequency.setValueAtTime(shaker?5600:1250,when);
 filter.Q.value=shaker?.55:0.72;
 gain.gain.setValueAtTime(.0001,when);
 gain.gain.linearRampToValueAtTime((shaker?.0065:.0048)*level,when+.004);
 gain.gain.exponentialRampToValueAtTime(.0001,when+(shaker?.075:.145));
 if(panner.pan)panner.pan.setValueAtTime(clamp(pan,-.4,.4),when);
 source.connect(filter);filter.connect(gain);gain.connect(panner);
 panner.connect(state.bus);panner.connect(state.send);
 source.start(when);source.stop(when+.19);
}
function instrumentVoice(note,when,duration,kind,state,level=1,pan=0){
 const ctx=audioContext,preset=INSTRUMENTS[kind];
 if(!preset)return false;
 const base=midiHz(note),filter=ctx.createBiquadFilter();
 const panner=ctx.createStereoPanner?ctx.createStereoPanner():ctx.createGain();
 filter.type=preset.q>.5?"bandpass":"lowpass";
 filter.frequency.setValueAtTime(preset.cutoff,when);
 filter.Q.value=preset.q;
 if(panner.pan)panner.pan.setValueAtTime(clamp(pan,-.4,.4),when);
 filter.connect(panner);panner.connect(state.bus);panner.connect(state.send);
 const safeDuration=Math.max(.16,duration);
 preset.parts.forEach(([ratio,weight,wave],index)=>{
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(base*ratio,when);
  if(kind==="sax"&&index===1)osc.detune.setValueAtTime(-2.4,when);
  const peak=Math.max(.0001,preset.peak*level*weight);
  gain.gain.setValueAtTime(.0001,when);
  gain.gain.linearRampToValueAtTime(peak,when+preset.attack);
  if(preset.mode==="pluck"){
   gain.gain.exponentialRampToValueAtTime(.0001,when+Math.max(preset.attack+.035,safeDuration));
  }else{
   const releaseStart=Math.max(when+preset.attack+.04,when+safeDuration-preset.release);
   gain.gain.setTargetAtTime(Math.max(.00012,peak*preset.sustain),when+preset.attack,.075);
   gain.gain.setValueAtTime(Math.max(.00012,peak*preset.sustain),releaseStart);
   gain.gain.exponentialRampToValueAtTime(.0001,when+safeDuration);
  }
  osc.connect(gain);gain.connect(filter);osc.start(when);osc.stop(when+safeDuration+.05);
  if(preset.vibrato&&index===0){
   const lfo=ctx.createOscillator(),depth=ctx.createGain();
   lfo.frequency.value=preset.vibrato;depth.gain.setValueAtTime(0,when);depth.gain.linearRampToValueAtTime(preset.depth,when+0.42);
   lfo.connect(depth);depth.connect(osc.detune);
   lfo.start(when+0.08);lfo.stop(when+safeDuration+.03);
  }
 });
 return true;
}

function voice(note,when,duration,kind,state,level=1,pan=0){
 const ctx=audioContext,track=state.track;
 if(kind==="piano"||kind==="pianoComp"){pianoVoice(note,when,duration,kind==="pianoComp"?"comp":"key",state,level,pan);return;}
 if(kind==="brush"||kind==="shaker"){percussionVoice(when,kind,state,level,pan);return;}
 if(instrumentVoice(note,when,duration,kind,state,level,pan))return;
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
   chord.slice(1,4).forEach((note,index)=>voice(note+12,time,beat*3.7,track.padKind||"pad",state,(index===0?0.58:0.38)*phraseLevel,(index-1)*0.13));
  }
  if(track.bassHits.includes(slot)){
   const bassNote=chord[0]-12+(slot===0?0:12);
   voice(bassNote,time,beat*(slot===0?1.8:1.4),track.bassKind||"bass",state,(slot===0?0.66:0.42)*phraseLevel,0);
  }
  const event=melody[stepIndex];
  if(event){
   const kind=event.kind==="key"?track.leadKind:event.kind;
   voice(event.note,time,beat*event.gate,kind,state,event.level*phraseLevel,track.pan*((bar%2)===0?1:-1));
  }
  if(track.compSlots.includes(slot)){
   chord.slice(1,4).forEach((note,index)=>{
    voice(note+12,time+0.006,beat*0.82,track.compKind||"comp",state,(index===0?0.46:0.36)*phraseLevel,(index-1)*0.12);
   });
  }
  if(track.arpSlots.includes(slot)){
   const arpIndex=track.arpSlots.indexOf(slot);
   const chordTone=chord[1+((bar+arpIndex)%Math.min(4,chord.length-1))];
   voice(chordTone+12,time+0.008,beat*0.76,track.arpKind||"key",state,0.10*phraseLevel,-track.pan*0.7);
  }
  if(track.rhythmKind&&track.rhythmSlots&&track.rhythmSlots.includes(slot)){
   voice(76,time,beat*0.22,track.rhythmKind,state,(track.rhythmLevel||0.16)*phraseLevel,track.pan*.5);
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
 return track?{id:trackId,duration:track.duration,bpm:track.bpm,key:track.keyName,scale:track.scale.slice()}:null;
}
window.DoriLoungeAudio={
 play,pause,resume,stop,setVolume,getState,getTrackInfo,
 hasTrack:id=>Boolean(TRACKS[id]),trackIds:Object.keys(TRACKS)
};
})();