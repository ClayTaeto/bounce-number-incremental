class AudioSystem {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._musicGain = null;
    this._sfxGain = null;
    this._muted = false;
    this._musicStarted = false;
    this._musicVolume = 0.15;
    this._sfxVolume = 0.4;
  }

  _init() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._masterGain = this._ctx.createGain();
    this._masterGain.connect(this._ctx.destination);
    this._masterGain.gain.value = 1;
    this._musicGain = this._ctx.createGain();
    this._musicGain.connect(this._masterGain);
    this._musicGain.gain.value = this._musicVolume;
    this._sfxGain = this._ctx.createGain();
    this._sfxGain.connect(this._masterGain);
    this._sfxGain.gain.value = this._sfxVolume;
  }

  unlock() {
    this._init();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    if (!this._musicStarted) { this._startMusic(); this._musicStarted = true; }
  }

  setMuted(muted) {
    this._muted = muted;
    if (this._masterGain) this._masterGain.gain.value = muted ? 0 : 1;
  }

  setMusicVolume(v) {
    this._musicVolume = v;
    if (this._musicGain) this._musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    this._sfxVolume = v;
    if (this._sfxGain) this._sfxGain.gain.value = v;
  }

  playWallHit(tier) {
    if (!this._ctx) return;
    const freq = 220 * Math.pow(1.12, Math.min(tier, 20));
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain); gain.connect(this._sfxGain);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.1);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.1);
  }

  playMerge(tier) {
    if (!this._ctx) return;
    const freq = 330 * Math.pow(1.08, Math.min(tier, 20));
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain); gain.connect(this._sfxGain);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.7, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq, this._ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.4, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.2);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.2);
  }

  playLightspeed() {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const filter = this._ctx.createBiquadFilter();
    osc.connect(filter); filter.connect(gain); gain.connect(this._sfxGain);
    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, this._ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, this._ctx.currentTime + 0.4);
    osc.frequency.setValueAtTime(80, this._ctx.currentTime);
    gain.gain.setValueAtTime(0.5, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.5);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.5);
  }

  playCrit() {
    if (!this._ctx) return;
    [1047, 1319, 1568].forEach((freq, i) => {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain); gain.connect(this._sfxGain);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, this._ctx.currentTime + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + i * 0.05 + 0.3);
      osc.start(this._ctx.currentTime + i * 0.05);
      osc.stop(this._ctx.currentTime + i * 0.05 + 0.3);
    });
  }

  playPrestige() {
    if (!this._ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain); gain.connect(this._sfxGain);
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, this._ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + i * 0.12 + 0.4);
      osc.start(this._ctx.currentTime + i * 0.12);
      osc.stop(this._ctx.currentTime + i * 0.12 + 0.4);
    });
  }

  playClick() {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain); gain.connect(this._sfxGain);
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.15, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.06);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.06);
  }

  _startMusic() {
    if (!this._ctx) return;
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    let noteIndex = 0;
    const playNote = () => {
      if (!this._musicStarted) return;
      const freq = pentatonic[noteIndex % pentatonic.length];
      noteIndex++;
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain); gain.connect(this._musicGain);
      osc.type = 'sine';
      osc.frequency.value = freq * (Math.random() > 0.7 ? 2 : 1);
      gain.gain.setValueAtTime(0.0, this._ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, this._ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 1.2);
      osc.start(this._ctx.currentTime);
      osc.stop(this._ctx.currentTime + 1.2);
      const delay = 600 + Math.random() * 800;
      setTimeout(playNote, delay);
    };
    playNote();
  }
}

window.audio = new AudioSystem();
