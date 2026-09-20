import React from 'react';
export const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight 
        position={[10, 20, 10]} 
        intensity={1.5} 
      />
    </>
  );
};
export default Lighting;
