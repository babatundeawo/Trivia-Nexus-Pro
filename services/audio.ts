
class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      this.filter.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val && this.ambientOsc) {
      this.stopAmbient();
    }
  }

  startAmbient() {
    if (!this.enabled) return;
    this.init();
    if (this.ambientOsc) return;

    const now = this.ctx!.currentTime;
    this.ambientOsc = this.ctx!.createOscillator();
    this.ambientGain = this.ctx!.createGain();
    
    this.ambientOsc.type = 'triangle';
    this.ambientOsc.frequency.setValueAtTime(55, now); // Low A
    
    this.ambientGain.gain.setValueAtTime(0, now);
    this.ambientGain.gain.linearRampToValueAtTime(0.05, now + 2);

    this.ambientOsc.connect(this.ambientGain);
    this.ambientGain.connect(this.filter!);
    this.ambientOsc.start();
  }

  setAmbientIntensity(intensity: number) { // 0 to 1
    if (!this.ctx || !this.filter || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.filter.frequency.exponentialRampToValueAtTime(200 + (intensity * 2000), now + 1);
    this.ambientGain.gain.linearRampToValueAtTime(0.05 + (intensity * 0.05), now + 1);
  }

  stopAmbient() {
    if (!this.ambientOsc) return;
    const now = this.ctx!.currentTime;
    this.ambientGain?.gain.linearRampToValueAtTime(0, now + 1);
    this.ambientOsc.stop(now + 1.1);
    this.ambientOsc = null;
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    osc.start();
    osc.stop(this.ctx!.currentTime + 0.1);
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx!.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.05, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.3);
    });
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(55, now + 0.4);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playStart() {
    if (!this.enabled) return;
    this.init();
    const now = this.ctx!.currentTime;
    const scale = [220, 440, 880, 1760];
    scale.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.05, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  }
}

export const audioEngine = new AudioEngine();
