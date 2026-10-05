import { Suspense, useEffect, useRef, useState, type ElementRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PosicaoAvaria, TipoAvaria, VistaAvaria } from '@/api/types';
import type { Carroceria } from './carroceria';
import { VeiculoModelo, type ToqueNoModelo } from './VeiculoModelo';
import { pinVisivel } from './pinVisivel';
import { COR_TIPO } from './zonas';

type ControlesImpl = ElementRef<typeof OrbitControls>;

export interface PinAvaria {
  /** Índice na lista do formulário — é o número mostrado no pin. */
  indice: number;
  tipo: TipoAvaria;
  posicao: PosicaoAvaria;
  /** Lado da superfície marcada — decide quando o selo numerado aparece (ver pinVisivel). */
  vista?: VistaAvaria;
}

/** Pedido de câmera: o nonce permite repetir a mesma vista (clicar "Frente" duas vezes depois de girar). */
export interface PedidoVista {
  vista: VistaAvaria;
  nonce: number;
}

interface VistoriaViewerProps {
  carroceria: Carroceria;
  pins: PinAvaria[];
  selecionada: number | null;
  pedidoVista?: PedidoVista;
  somenteLeitura?: boolean;
  onToque: (toque: ToqueNoModelo) => void;
  onSelecionar: (indice: number) => void;
}

const ALVO = new THREE.Vector3(0, 0.6, 0);
const DISTANCIA = 6.2;
const POSICAO_INICIAL: [number, number, number] = [4.3, 2.2, 4.7];

// +Z é a frente do carro e +X a esquerda (ver COMPRIMENTO em VeiculoModelo).
const POSICAO_DA_VISTA: Record<VistaAvaria, THREE.Vector3> = {
  FRENTE: new THREE.Vector3(0, 1.6, DISTANCIA),
  TRAS: new THREE.Vector3(0, 1.6, -DISTANCIA),
  ESQ: new THREE.Vector3(DISTANCIA, 1.6, 0),
  DIR: new THREE.Vector3(-DISTANCIA, 1.6, 0),
  // Mais longe que as outras: de cima o comprimento (4) é que limita o enquadramento vertical do quadro.
  TOPO: new THREE.Vector3(0, DISTANCIA * 1.55, 0.01),
};

/** Leva a câmera suavemente até a vista pedida; qualquer arraste do usuário cancela o movimento. */
function CameraRig({
  pedido,
  controles,
}: {
  pedido?: PedidoVista;
  controles: React.MutableRefObject<ControlesImpl | null>;
}) {
  const { camera, invalidate } = useThree();
  const destino = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!pedido) return;
    destino.current = POSICAO_DA_VISTA[pedido.vista].clone();
    invalidate();
  }, [pedido, invalidate]);

  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const cancelar = () => {
      destino.current = null;
    };
    c.addEventListener('start', cancelar);
    return () => c.removeEventListener('start', cancelar);
  }, [controles]);

  useFrame(() => {
    if (!destino.current) return;
    camera.position.lerp(destino.current, 0.18);
    controles.current?.update();
    if (camera.position.distanceTo(destino.current) < 0.02) {
      camera.position.copy(destino.current);
      controles.current?.update();
      destino.current = null;
    }
    invalidate();
  });

  return null;
}

function PinMarcador({
  pin,
  selecionado,
  onSelecionar,
}: {
  pin: PinAvaria;
  selecionado: boolean;
  onSelecionar: (indice: number) => void;
}) {
  const cor = COR_TIPO[pin.tipo];
  const [selo, setSelo] = useState(true);
  useFrame(({ camera }) => {
    const visivel = pinVisivel(camera.position, pin.vista);
    if (visivel !== selo) setSelo(visivel);
  });
  const raio = selecionado ? 0.075 : 0.055;
  return (
    <group position={[pin.posicao.x, pin.posicao.y, pin.posicao.z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelecionar(pin.indice);
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <sphereGeometry args={[raio, 20, 20]} />
        <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={selecionado ? 0.7 : 0.35} />
      </mesh>
      {selecionado && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[raio * 1.5, raio * 1.9, 32]} />
          <meshBasicMaterial color={cor} side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}
      {selo && (
      <Html center distanceFactor={6} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }} position={[0, raio + 0.12, 0]}>
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white shadow"
          style={{ background: cor }}
        >
          {pin.indice + 1}
        </span>
      </Html>
      )}
    </group>
  );
}

export default function VistoriaViewer({
  carroceria,
  pins,
  selecionada,
  pedidoVista,
  somenteLeitura,
  onToque,
  onSelecionar,
}: VistoriaViewerProps) {
  const controles = useRef<ControlesImpl | null>(null);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: POSICAO_INICIAL, fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      aria-label="Modelo 3D do veículo para marcar avarias"
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#ffffff', '#b8c0cc', 0.8]} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <Suspense
        fallback={
          <Html center>
            <span className="whitespace-nowrap text-sm text-ink-muted">Carregando modelo 3D…</span>
          </Html>
        }
      >
        <VeiculoModelo carroceria={carroceria} onToque={somenteLeitura ? undefined : onToque} />
        {pins.map((pin) => (
          <PinMarcador key={pin.indice} pin={pin} selecionado={pin.indice === selecionada} onSelecionar={onSelecionar} />
        ))}
      </Suspense>
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={10} blur={2.5} far={2} />
      <OrbitControls
        ref={controles}
        target={ALVO}
        enablePan={false}
        minDistance={3.5}
        maxDistance={11}
        maxPolarAngle={Math.PI * 0.495}
        dampingFactor={0.12}
      />
      <CameraRig pedido={pedidoVista} controles={controles} />
    </Canvas>
  );
}
