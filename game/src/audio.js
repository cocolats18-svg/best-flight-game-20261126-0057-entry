// Synthesised sound only: a WebAudio engine hum whose pitch follows the throttle, a
// two-note chime when a ring is flown, a noise burst for a crash and a little arpeggio
// for a landing. No audio files, no network.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc.frequency.value = 55;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;
    this.osc.connect(filter);
    filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.osc.start();
  }

  /** Engine hum follows throttle and speed; silent on the title screen. */
  setEngine(throttle, speed, running) {
    if (!this.ctx || !this.osc) return;
    const target = this.muted || !running ? 0 : 0.045 + throttle * 0.05;
    this.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
    this.osc.frequency.setTargetAtTime(48 + throttle * 46 + speed * 0.25, this.ctx.currentTime, 0.1);
  }

  tone(freq, when, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime + when);
    gain.gain.linearRampToValueAtTime(vol || 0.16, this.ctx.currentTime + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + when + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime + when);
    osc.stop(this.ctx.currentTime + when + dur + 0.05);
  }

  chime() {
    this.tone(880, 0, 0.35);
    this.tone(1318, 0.09, 0.45);
  }

  land() {
    this.tone(523, 0, 0.25);
    this.tone(659, 0.12, 0.25);
    this.tone(784, 0.24, 0.4);
  }

  crash() {
    if (!this.ctx || this.muted) return;
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.35;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }
}
