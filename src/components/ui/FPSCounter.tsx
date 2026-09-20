import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';

/**
 * Componente FPSCounter
 * Responsabilidad única: Medir y renderizar reactivamente la tasa de fotogramas por segundo (FPS)
 * y la latencia en milisegundos de forma independiente en una tarjeta con glassmorphism,
 * activándose y desactivándose globalmente mediante el atajo Ctrl+F únicamente en modo de desarrollo (Dev Mode).
 */
export const FPSCounter: React.FC = () => {
  const devMode = useGameStore((state) => state.devMode);
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.6);
  
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(performance.now());
  const frameTimesRef = useRef<number[]>([]);

  // 1. Escuchar atajo Ctrl+F de forma global, únicamente si el modo Dev está activo
  useEffect(() => {
    if (!devMode) {
      setVisible(false); // Ocultar si el modo Dev se apaga
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [devMode]);

  // 2. Bucle de animación de alta precisión para medir diferencias de tiempo (delta)
  useEffect(() => {
    if (!visible || !devMode) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      return;
    }

    let lastUpdate = performance.now();

    const renderLoop = (time: number) => {
      const delta = time - previousTimeRef.current;
      previousTimeRef.current = time;

      if (delta > 0 && delta < 1000) {
        frameTimesRef.current.push(delta);
        // Usar una ventana deslizante de 30 muestras para suavizar fluctuaciones de FPS
        if (frameTimesRef.current.length > 30) {
          frameTimesRef.current.shift();
        }

        // Limitar las actualizaciones de estado en React a una vez cada 300ms para evitar stutters
        if (time - lastUpdate >= 300) {
          const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          setFrameTime(parseFloat(avgDelta.toFixed(1)));
          setFps(Math.round(1000 / avgDelta));
          lastUpdate = time;
        }
      }

      requestRef.current = requestAnimationFrame(renderLoop);
    };

    previousTimeRef.current = performance.now();
    lastUpdate = previousTimeRef.current;
    requestRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [visible, devMode]);

  if (!devMode || !visible) return null;

  // Determinar paleta de colores neón adaptativa según el estado de salud de los FPS
  let fpsColor = 'text-cyan-400';
  let dotColor = 'bg-cyan-400 shadow-[0_0_8px_#00ffff]';
  let borderColor = 'border-cyan-500/30';
  let shadowColor = 'shadow-[0_0_15px_rgba(0,255,255,0.1)]';

  if (fps < 30) {
    fpsColor = 'text-red-500 animate-pulse';
    dotColor = 'bg-red-500 shadow-[0_0_8px_#ff0000]';
    borderColor = 'border-red-500/40';
    shadowColor = 'shadow-[0_0_15px_rgba(255,0,0,0.15)]';
  } else if (fps < 50) {
    fpsColor = 'text-yellow-400';
    dotColor = 'bg-yellow-400 shadow-[0_0_8px_#ffff00]';
    borderColor = 'border-yellow-500/30';
    shadowColor = 'shadow-[0_0_15px_rgba(255,255,0,0.1)]';
  }

  return (
    <div className="fixed top-[76px] right-8 pointer-events-none z-[9999] font-mono flex flex-col items-end gap-1 animate-fadeIn">
      <div className={`pointer-events-auto bg-neutral-950/85 border ${borderColor} px-3 py-1.5 rounded ${fpsColor} backdrop-blur-md ${shadowColor} flex items-center gap-3 text-xs tracking-wider transition-all duration-300`}>
        {/* Nodo de pulso parpadeante */}
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${fps < 30 ? 'bg-red-400' : fps < 50 ? 'bg-yellow-400' : 'bg-cyan-400'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
        </span>
        
        {/* Métricas de rendimiento */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold border-r border-neutral-800 pr-2">SYS_MON</span>
          <span>FPS: <strong className="font-bold">{fps}</strong></span>
          <span className="text-neutral-500">|</span>
          <span>{frameTime}ms</span>
          <span className="text-neutral-500">|</span>
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">WEBGL</span>
        </div>
      </div>
      
      {/* Leyenda de control */}
      <span className="text-[8px] text-neutral-500 uppercase tracking-widest mt-0.5 select-none pr-1">Ctrl+F to close</span>
    </div>
  );
};

export default FPSCounter;
