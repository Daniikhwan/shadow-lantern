// Shadow Lantern — every sound is synthesized with WebAudio, no files.
// One job: footsteps that tell you where a guard is, the rising sting when
// you are spotted, and the chime of a stolen relic. Silent until the first
// key or click, as browsers require.
export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.ambience = null;
    this.muted = false;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.context.destination);
      this.startAmbience();
    } catch {
      this.context = null;
    }
  }

  startAmbience() {
    const ctx = this.context;
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(droneGain.gain);
    drone.connect(droneGain);
    droneGain.connect(this.master);
    drone.start();
    lfo.start();
    this.ambience = { drone, lfo };
  }

  blip(frequency, duration, type, volume, slideTo) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  noiseBurst(duration, volume, filterFreq) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 900;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  footstep(running, guard) {
    if (guard) this.noiseBurst(0.05, 0.05, 500);
    else this.noiseBurst(running ? 0.09 : 0.05, running ? 0.09 : 0.045, running ? 1100 : 700);
  }

  pebbleThrow() {
    this.blip(1400, 0.08, 'sine', 0.08, 900);
  }

  pebbleLand() {
    this.noiseBurst(0.06, 0.14, 3200);
    this.blip(2400, 0.05, 'triangle', 0.06, 1800);
  }

  pickup() {
    this.blip(880, 0.12, 'triangle', 0.12);
    setTimeout(() => this.blip(1318, 0.18, 'triangle', 0.12), 70);
  }

  suspicious() {
    this.blip(320, 0.22, 'square', 0.05, 520);
  }

  alarm() {
    this.blip(196, 0.5, 'sawtooth', 0.12, 392);
    setTimeout(() => this.blip(196, 0.5, 'sawtooth', 0.12, 392), 160);
  }

  caught() {
    this.blip(220, 0.9, 'sawtooth', 0.14, 55);
  }

  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.12), i * 110));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.12), i * 130));
  }

  click() {
    this.blip(700, 0.05, 'sine', 0.06);
  }
}
