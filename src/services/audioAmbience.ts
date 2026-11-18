// Web Audio API Procedural Ambience Generator for Manga Reading
// 100% Client-Side Synthesized: Zero external audio files, Zero network bandwidth

import { AudioAmbience } from '../types.ts';

class AmbienceSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSourceNodes: (AudioNode | number)[] = [];
  private currentMode: AudioAmbience = 'off';
  private currentVolume: number = 0.35;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(
        this.currentVolume,
        this.ctx.currentTime + 0.1
      );
    }
  }

  public getMode(): AudioAmbience {
    return this.currentMode;
  }

  public setMode(mode: AudioAmbience) {
    if (mode === this.currentMode) return;
    this.stopCurrent();
    this.currentMode = mode;

    if (mode === 'off') return;

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    switch (mode) {
      case 'rain':
        this.startRainSynth();
        break;
      case 'lofi':
        this.startLofiSynth();
        break;
      case 'void':
        this.startVoidSynth();
        break;
    }
  }

  // 1. Procedural Rain & Droplets Generator
  private startRainSynth() {
    if (!this.ctx || !this.masterGain) return;

    // Pink/Brown noise buffer for continuous rain texture
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Multi-stage low-pass and band-pass filtering to simulate rain against window
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(this.masterGain);

    whiteNoise.start();
    this.activeSourceNodes.push(whiteNoise);
  }

  // 2. Procedural Lo-Fi Warm Chords + Vinyl Crackle
  private startLofiSynth() {
    if (!this.ctx || !this.masterGain) return;

    // Warm chord notes (A minor 7: A2, C3, E3, G3)
    const chordFreqs = [110, 130.81, 164.81, 196.0];

    chordFreqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Gentle vibrato LFO
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.2 + idx * 0.05, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const oscFilter = this.ctx.createBiquadFilter();
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(420, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      osc.connect(oscFilter);
      oscFilter.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start();
      lfo.start();
      this.activeSourceNodes.push(osc, lfo);
    });
  }

  // 3. Procedural Deep Space Void Binaural Drone
  private startVoidSynth() {
    if (!this.ctx || !this.masterGain) return;

    // Binaural sub-bass frequencies (55Hz and 58Hz create a calming 3Hz delta wave)
    const freqs = [55, 58, 110];

    freqs.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      this.activeSourceNodes.push(osc);
    });
  }

  public stopCurrent() {
    this.activeSourceNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        if ('disconnect' in node && typeof (node as any).disconnect === 'function') {
          (node as any).disconnect();
        }
      } catch (e) {
        // Ignored
      }
    });
    this.activeSourceNodes = [];
    this.currentMode = 'off';
  }
}

export const ambienceSynthesizer = new AmbienceSynthesizer();
