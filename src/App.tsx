import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { GameScene } from './components/gameplay/GameScene';
import { GameUI } from './components/ui/GameUI';
import { warmUpShaders } from './utils/shaderWarmup';

const App: React.FC = () => {
  const [gameKey, setGameKey] = useState(0);

  const handleRestart = useCallback(() => {
    setGameKey(prev => prev + 1);
  }, []);

  return (
    <div className="relative w-full h-full bg-neutral-900">
      <Canvas
        camera={{ fov: 60, position: [0, 1.0, 0], rotation: [0, 0, 0], near: 0.1, far: 1000 }}
        key={gameKey}
        dpr={1} 
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          stencil: false,
          depth: true,
          alpha: false,
        }}
        onCreated={(state) => {
          warmUpShaders(state.gl, state.camera);
        }}
      >
        <color attach="background" args={['#080808']} />
        
        <GameScene 
            onRestart={handleRestart} 
        />

        {/* @ts-ignore */}
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom 
            luminanceThreshold={0.25} 
            mipmapBlur 
            intensity={1.0} 
            radius={0.5}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.4} />
        </EffectComposer>
      </Canvas>
      
      <GameUI 
        onRestart={handleRestart} 
      />
    </div>
  );
};

export default App;