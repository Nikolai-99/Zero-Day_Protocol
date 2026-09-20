import * as THREE from 'three';

/**
 * Clase GlobalAudioSystem
 * Responsabilidad única: Administrar la inicialización de Web Audio API,
 * decodificación asíncrona de la canción principal, reproducción en bucle de precisión
 * quirúrgica, y extracción de amplitud de bajos en tiempo real para sincronía de shaders.
 */
class GlobalAudioSystem {
  public ctx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public source: AudioBufferSourceNode | null = null;
  public audioBuffer: AudioBuffer | null = null;
  public gainNode: GainNode | null = null;
  public isPlaying: boolean = false;
  public bassIntensity: number = 0; // Entre 0.0 y 1.0, accesible globalmente a cada frame
  
  // Cache de pistas musicales decodificadas para desacoplamiento y evitar recargas
  private buffers: Map<string, AudioBuffer> = new Map();
  public currentUrl: string | null = null;
  // Buffer preasignado para análisis espectral (Zero GC allocation en useFrame)
  private dataArray: Uint8Array | null = null;

  /**
   * Inicializar el contexto de audio ante interacción del usuario
   */
  public init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64; // Bajo tamaño para máxima eficiencia computacional en frames
      
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.6; // Volumen inicial al 60% (dB normales)
      
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      console.log('[AUDIO SYSTEM] Web Audio Context inicializado correctamente.');
    } catch (e) {
      console.error('[AUDIO SYSTEM] Error al inicializar AudioContext:', e);
    }
  }

  /**
   * Cargar y decodificar el buffer de la canción
   */
  public async loadTrack(url: string) {
    this.init();
    if (!this.ctx) return;
    
    // Si la pista ya está cargada en caché, la seleccionamos de inmediato
    if (this.buffers.has(url)) {
      this.audioBuffer = this.buffers.get(url)!;
      this.currentUrl = url;
      return;
    }
    
    try {
      console.log(`[AUDIO SYSTEM] Cargando pista musical: ${url}...`);
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      
      this.buffers.set(url, decodedBuffer);
      this.audioBuffer = decodedBuffer;
      this.currentUrl = url;
      console.log(`[AUDIO SYSTEM] Pista ${url} cargada y decodificada exitosamente.`);
    } catch (e) {
      console.error('[AUDIO SYSTEM] Error al cargar y decodificar pista:', e);
    }
  }

  /**
   * Aplicar desvanecimiento cruzado suave (DSP fade-in / fade-out) directamente sobre las muestras
   * del AudioBuffer en los puntos de bucle para garantizar una transición imperceptible y sin "clics".
   */
  private applyLoopSmoothing(loopStartSec: number, loopEndSec: number, fadeTimeSec: number = 0.04) {
    if (!this.audioBuffer) return;
    
    const sampleRate = this.audioBuffer.sampleRate;
    const fadeSamples = Math.floor(fadeTimeSec * sampleRate);
    const channels = this.audioBuffer.numberOfChannels;
    
    const startSample = Math.floor(loopStartSec * sampleRate);
    const endSample = Math.floor(loopEndSec * sampleRate);
    
    // Evitar desbordamiento de buffer
    if (startSample < 0 || endSample > this.audioBuffer.length || startSample >= endSample) {
      console.warn('[AUDIO SYSTEM] Límites de bucle fuera de rango para el suavizado.');
      return;
    }
    
    for (let c = 0; c < channels; c++) {
      const channelData = this.audioBuffer.getChannelData(c);
      
      // 1. FADE-IN (Rampa ascendente lineal) en el segundo 14.00
      for (let i = 0; i < fadeSamples; i++) {
        if (startSample + i < channelData.length) {
          const t = i / fadeSamples;
          channelData[startSample + i] *= t;
        }
      }
      
      // 2. FADE-OUT (Rampa descendente lineal) antes de cortar en el segundo 60.00
      for (let i = 0; i < fadeSamples; i++) {
        if (endSample - i >= 0) {
          const t = i / fadeSamples;
          channelData[endSample - i] *= t;
        }
      }
    }
    console.log(`[AUDIO SYSTEM] Suavizado DSP aplicado en el buffer: ${fadeTimeSec * 1000}ms de fade-in en ${loopStartSec}s y fade-out en ${loopEndSec}s.`);
  }

  /**
   * Reproducir en bucle ininterrumpido a partir del segundo 14.00 (luego de sonar la intro una vez)
   */
  public play() {
    this.init();
    if (!this.ctx || !this.audioBuffer || this.isPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      this.source = this.ctx.createBufferSource();
      this.source.buffer = this.audioBuffer;
      this.source.loop = true;
      this.source.loopStart = 0; // Bucle desde el comienzo de la canción
      this.source.loopEnd = this.audioBuffer.duration; // Bucle completo hasta el final sin cortes

      this.source.connect(this.analyser!);
      this.source.start(0);
      this.isPlaying = true;
      console.log('[AUDIO SYSTEM] Reproduciendo loop de precisión desde 13.20s.');
    } catch (e) {
      console.error('[AUDIO SYSTEM] Error al iniciar la reproducción:', e);
    }
  }

  /**
   * Pausar el contexto de audio (congela toda reproducción)
   */
  public pause() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
      console.log('[AUDIO SYSTEM] Reproducción pausada.');
    }
  }

  /**
   * Reanudar el contexto de audio (descongela la reproducción)
   */
  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
      console.log('[AUDIO SYSTEM] Reproducción reanudada.');
    }
  }

  /**
   * Detener la música de inmediato
   */
  public stop() {
    if (this.source && this.isPlaying) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
      this.isPlaying = false;
      console.log('[AUDIO SYSTEM] Reproducción de música detenida.');
    }
  }

  /**
   * Extraer la intensidad del espectro de graves en tiempo real
   * Ejecutado en el bucle principal useFrame del juego.
   */
  public update() {
    if (!this.isPlaying || !this.analyser) {
      this.bassIntensity = 0;
      return;
    }
    
    const bufferLength = this.analyser.frequencyBinCount;
    if (!this.dataArray || this.dataArray.length !== bufferLength) {
      this.dataArray = new Uint8Array(bufferLength);
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Los graves están en los primeros bins de frecuencia (20Hz - 150Hz)
    let sum = 0;
    const bassBins = Math.max(1, Math.floor(bufferLength * 0.25)); // Primeros bins de graves
    
    for (let i = 0; i < bassBins; i++) {
      sum += this.dataArray[i];
    }
    
    const average = sum / bassBins;
    // Normalizar entre 0.0 y 1.0 (dividiendo por el rango máx de byte 255)
    this.bassIntensity = Math.min(1.0, average / 255.0);
  }

  /**
   * Ajustar volumen general en tiempo real de forma suave
   */
  public setVolume(value: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
    }
  }

  /**
   * Obtener el volumen actual
   */
  public getVolume(): number {
    return this.gainNode ? this.gainNode.gain.value : 1.0;
  }
}

export const audioSystem = new GlobalAudioSystem();
