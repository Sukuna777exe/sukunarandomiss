
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedSphere = ({ position, color, speed, scale }: { position: [number, number, number], color: string, speed: number, scale: number }) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.x = mesh.current.rotation.y += speed;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={mesh} position={new THREE.Vector3(...position)} scale={scale}>
        <sphereGeometry args={[1, 32, 32]} />
        <MeshDistortMaterial color={color} speed={2} distort={0.4} />
      </mesh>
    </Float>
  );
};

const HeroBackground3D = () => {
  return (
    <div className="absolute inset-0 -z-10 opacity-70">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} color="#5e35b1" intensity={0.5} />
        
        <AnimatedSphere position={[-3, 2, -2]} color="#5e35b1" speed={0.01} scale={1.5} />
        <AnimatedSphere position={[3, -1, -2]} color="#4527a0" speed={0.02} scale={1} />
        <AnimatedSphere position={[-2, -2, 1]} color="#7c4dff" speed={0.01} scale={0.8} />
        <AnimatedSphere position={[2, 1, -1]} color="#3949ab" speed={0.015} scale={1.2} />
        <AnimatedSphere position={[0, 3, -3]} color="#673ab7" speed={0.01} scale={0.9} />
        
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  );
};

export default HeroBackground3D;
