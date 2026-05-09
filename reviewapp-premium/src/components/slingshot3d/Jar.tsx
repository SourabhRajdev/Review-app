import { useCylinder } from '@react-three/cannon';

interface JarProps {
  position: [number, number, number];
  isHit: boolean;
  answer: string;
}

export default function Jar({ position, isHit, answer }: JarProps) {
  // Physics body for the jar
  const [ref] = useCylinder(() => ({
    mass: 1,
    position,
    args: [0.6, 0.6, 1.8, 8], // radiusTop, radiusBottom, height, segments
    type: 'Static',
  }));

  const jarColor = isHit ? '#E8B896' : '#FFFFFF';

  return (
    <group ref={ref as any}>
      {/* Jar body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.8, 16]} />
        <meshStandardMaterial 
          color={jarColor} 
          roughness={0.3} 
          metalness={0.1}
          emissive={isHit ? '#C67C4E' : '#000000'}
          emissiveIntensity={isHit ? 0.5 : 0}
          opacity={isHit ? 0 : 1}
          transparent={isHit}
        />
      </mesh>

      {/* Jar neck */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
        <meshStandardMaterial color={jarColor} roughness={0.3} />
      </mesh>

      {/* Answer Label */}
      {answer && <group position={[0, -1.2, 0]} />}
    </group>
  );
}
