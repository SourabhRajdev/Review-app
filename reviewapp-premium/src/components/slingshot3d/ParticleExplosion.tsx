import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleExplosionProps {
  position: [number, number, number];
  count?: number;
}

export default function ParticleExplosion({ position, count = 20 }: ParticleExplosionProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10
      );
      temp.push({ velocity, pos: new THREE.Vector3(...position) });
    }
    return temp;
  }, [position, count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    particles.forEach((p, i) => {
      p.velocity.y -= 9.81 * delta; // Gravity
      p.pos.add(p.velocity.clone().multiplyScalar(delta));
      
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(Math.max(0, 1 - state.clock.elapsedTime * 0.5));
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
    </instancedMesh>
  );
}
