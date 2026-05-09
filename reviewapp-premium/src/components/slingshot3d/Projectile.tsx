import { useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';

interface ProjectileProps {
  position: [number, number, number];
  velocity: [number, number, number];
  onHit: (jarIdx: number) => void;
  onMiss: () => void;
}

export default function Projectile({ position, velocity, onMiss }: ProjectileProps) {
  const [ref] = useSphere(() => ({
    mass: 0.5,
    position,
    velocity,
    args: [0.3],
    onCollide: () => {
      // Collision detection logic would go here if needed
    }
  }));

  useFrame(() => {
    // Basic miss detection: if it falls off the scene
    if (ref.current && ref.current.position.y < -5) {
      onMiss();
    }
  });

  return (
    <mesh ref={ref as any} castShadow>
      <sphereGeometry args={[0.3, 24, 24]} />
      <meshStandardMaterial 
        color="#C67C4E" 
        roughness={0.6} 
        metalness={0.2}
      />
    </mesh>
  );
}
