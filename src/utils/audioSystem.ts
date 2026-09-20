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

  private currentVolume: number = 0.6;

  /**
   * Inicializar el contexto de audio ante interacción del usuario
   */
  public init() {
    // Modo silencioso: AudioContext no requerido activamente
  }

  /**
   * Cargar y decodificar el buffer de la canción (Modo silencioso)
   */
  public async loadTrack(url?: string) {
    // En modo silencioso, no se intentan descargar ni decodificar archivos inexistentes
    this.currentUrl = null;
    return Promise.resolve();
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
   * Reproducir en bucle (Modo silencioso: inactivo)
   */
  public play() {
    this.isPlaying = false;
  }

  /**
   * Pausar el contexto de audio
   */
  public pause() {
    this.isPlaying = false;
  }

  /**
   * Reanudar el contexto de audio
   */
  public resume() {
    this.isPlaying = false;
  }

  /**
   * Detener la música de inmediato
   */
  public stop() {
    this.isPlaying = false;
  }

  /**
   * Extraer la intensidad del espectro de graves (Modo silencioso: retorna 0)
   */
  public update() {
    this.bassIntensity = 0;
  }

  /**
   * Ajustar volumen general en tiempo real (mantiene compatibilidad con UI)
   */
  public setVolume(value: number) {
    this.currentVolume = value;
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
      } catch (e) {}
    }
  }

  /**
   * Obtener el volumen actual
   */
  public getVolume(): number {
    return this.currentVolume;
  }
}

export const audioSystem = new GlobalAudioSystem();
