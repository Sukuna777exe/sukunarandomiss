
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedText = ({ text }: { text: string }) => {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    mesh.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });

  return (
    <Center>
      <mesh ref={mesh}>
        <Text3D 
          font="/fonts/Inter_Bold.json"
          size={0.75}
          height={0.1}
          curveSegments={12}
        >
          {text}
          <meshStandardMaterial color="#673ab7" />
        </Text3D>
      </mesh>
    </Center>
  );
};

const AnimatedText3D = ({ text }: { text: string }) => {
  return (
    <div className="h-24 my-6">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} />
        <AnimatedText text={text} />
      </Canvas>
    </div>
  );
};

export default AnimatedText3D;
