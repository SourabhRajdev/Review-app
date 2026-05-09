import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, usePlane } from '@react-three/cannon';
import { Sky, ContactShadows, Environment, PerspectiveCamera, CameraShake } from '@react-three/drei';
import { Suspense, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import Jar from './Jar';
import Projectile from './Projectile';
import Pouch from './SlingshotFork';
import ParticleExplosion from './ParticleExplosion';

interface GameSceneProps {
  roundAnswers: string[];
  onHit: (idx: number) => void;
  onMiss: () => void;
  windForce: number;
}

function WindParticles({ force }: { force: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 40;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 10,
        (Math.random() - 0.5) * 20
      ),
      speed: 2 + Math.random() * 3
    }));
  }, []);

  useFrame((_, delta) => {
    particles.forEach((p, i) => {
      // Move in direction of wind force
      p.pos.x += force * p.speed * 20 * delta;
      if (p.pos.x > 10) p.pos.x = -10;
      if (p.pos.x < -10) p.pos.x = 10;
      
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(0.05);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#B09080" transparent opacity={0.3} />
    </instancedMesh>
  );
}

function Ground() {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -2, 0] }));
  return (
    <mesh ref={ref as any} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#FAF9F7" roughness={0.8} />
    </mesh>
  );
}

function Shelf() {
  return (
    <mesh position={[0, -0.5, -5]} receiveShadow castShadow>
      <boxGeometry args={[10, 0.2, 2]} />
      <meshStandardMaterial color="#8B6914" roughness={0.5} />
    </mesh>
  );
}

export default function GameScene({ roundAnswers, onHit, onMiss, windForce }: GameSceneProps) {
  const [projectileData, setProjectileData] = useState<{ pos: [number, number, number], vel: [number, number, number] } | null>(null);
  const [hitPos, setHitPos] = useState<[number, number, number] | null>(null);
  const [shake, setShake] = useState(false);

  const jarPositions: [number, number, number][] = [
    [-3, 0.5, -5],
    [-1, 0.5, -5],
    [1, 0.5, -5],
    [3, 0.5, -5],
  ];

  const handleFire = (velocity: [number, number, number]) => {
    const finalVel: [number, number, number] = [
      velocity[0] + windForce * 10,
      velocity[1],
      velocity[2]
    ];
    setProjectileData({ pos: [0, 1.5, 2], vel: finalVel });
  };

  const internalOnHit = (idx: number, pos: [number, number, number]) => {
    setHitPos(pos);
    setShake(true);
    setProjectileData(null);
    onHit(idx);
    setTimeout(() => {
      setHitPos(null);
      setShake(false);
    }, 1500);
  };

  return (
    <div className="w-full h-full bg-[#FAF9F7]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 3, 10]} fov={50} />
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} castShadow intensity={1} />
        <Environment preset="sunset" />
        
        {shake && <CameraShake 
          yawFrequency={2} 
          pitchFrequency={2} 
          rollFrequency={2} 
          intensity={1.5} 
        />}

        <Suspense fallback={null}>
          <Physics gravity={[0, -9.81, 0]}>
            <Ground />
            <Shelf />
            <WindParticles force={windForce} />
            
            {roundAnswers.map((answer, i) => (
              <Jar 
                key={i} 
                position={jarPositions[i]} 
                isHit={false} 
                answer={answer} 
              />
            ))}

            <Pouch onFire={handleFire} />

            {projectileData && (
              <Projectile 
                position={projectileData.pos} 
                velocity={projectileData.vel}
                onHit={(idx) => internalOnHit(idx, jarPositions[idx])}
                onMiss={onMiss}
              />
            )}
            
            {hitPos && <ParticleExplosion position={hitPos} />}
          </Physics>
        </Suspense>

        <ContactShadows position={[0, -1.99, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
      </Canvas>
    </div>
  );
}
