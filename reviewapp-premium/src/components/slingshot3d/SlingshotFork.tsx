import { useDrag } from '@use-gesture/react';
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PouchProps {
  onFire: (velocity: [number, number, number]) => void;
}

function Band({ from, to }: { from: THREE.Vector3, to: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    const distance = from.distanceTo(to);
    meshRef.current.position.copy(from).add(to).multiplyScalar(0.5);
    meshRef.current.lookAt(to);
    meshRef.current.scale.set(1, 1, distance);
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
      <meshStandardMaterial color="#E74C3C" roughness={0.3} />
    </mesh>
  );
}

export default function SlingshotFork({ onFire }: PouchProps) {
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0]);
  
  const bind = useDrag(({ offset: [x, y], active }) => {
    if (active) {
      // Map screen drag to 3D space with high precision
      setPos([x / 100, -y / 150, y / 100]); 
    } else {
      // Fire logic with realistic velocity mapping
      const velocity: [number, number, number] = [
        -pos[0] * 12, 
        -pos[1] * 8 + 5, // Add a bit of upward lift
        -pos[2] * 15 - 5 // Strong forward punch
      ];
      onFire(velocity);
      setPos([0, 0, 0]);
    }
  });

  return (
    <group>
      {/* Handle and Fork structure */}
      <mesh position={[0, 0.5, 2]} receiveShadow castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.5]} />
        <meshStandardMaterial color="#C4943A" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Left Fork */}
      <mesh position={[-0.5, 1.5, 2]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 1.2]} />
        <meshStandardMaterial color="#C4943A" />
      </mesh>
      
      {/* Right Fork */}
      <mesh position={[0.5, 1.5, 2]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 1.2]} />
        <meshStandardMaterial color="#C4943A" />
      </mesh>

      {/* Pouch */}
      <mesh 
        position={[pos[0], pos[1] + 1.5, pos[2] + 2]} 
        {...(bind() as any)}
        castShadow
      >
        <boxGeometry args={[0.6, 0.4, 0.1]} />
        <meshStandardMaterial color="#4E342E" roughness={0.8} />
      </mesh>

      {/* Stretching Bands */}
      <Band from={new THREE.Vector3(-1, 2, 2)} to={new THREE.Vector3(pos[0] - 0.3, pos[1] + 1.5, pos[2] + 2)} />
      <Band from={new THREE.Vector3(1, 2, 2)} to={new THREE.Vector3(pos[0] + 0.3, pos[1] + 1.5, pos[2] + 2)} />
    </group>
  );
}
