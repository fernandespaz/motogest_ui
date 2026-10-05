import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { ARQUIVO_MODELO, type Carroceria } from './carroceria';
import type { Vetor3 } from './zonas';

/** Comprimento do carro no espaço normalizado (frente = +Z, esquerda do carro = +X, chão em y=0).
 * Toda posição de avaria é guardada nesse espaço, independente do modelo. */
export const COMPRIMENTO = 4;

// Alguns .glb vêm com o carro virado pra -Z; o giro em Y de 180° põe a frente em +Z.
const GIRAR_180: Record<Carroceria, boolean> = { SEDAN: false, SUV: false, PICAPE: true };

const RE_VIDRO = /glass|vidro|window|windshield/i;
const RE_PNEU = /tire|tyre|rubber|pneu/i;

/** Visual neutro e técnico: carroceria cinza-clara fosca, vidro translúcido, pneu escuro —
 * a cor real do carro não importa pra vistoria e o tom único mantém os pins legíveis. */
function aplicarEstiloTecnico(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const original = mesh.material as THREE.MeshStandardMaterial;
    const nome = original.name ?? '';
    const base = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide });
    if (RE_VIDRO.test(nome)) {
      base.color.set('#5b6b7a');
      base.transparent = true;
      base.opacity = 0.55;
      base.roughness = 0.1;
      base.depthWrite = false;
    } else if (RE_PNEU.test(nome)) {
      base.color.set('#2a2d33');
    } else {
      base.color.set('#d9dde3');
    }
    mesh.material = base;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

function normalizar(scene: THREE.Object3D, carroceria: Carroceria) {
  const clone = scene.clone(true);
  const caixa = new THREE.Box3().setFromObject(clone);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const centro = caixa.getCenter(new THREE.Vector3());
  const escala = COMPRIMENTO / tamanho.z;
  const grupo = new THREE.Group();
  clone.position.set(-centro.x, -caixa.min.y, -centro.z);
  const interno = new THREE.Group();
  interno.add(clone);
  interno.scale.setScalar(escala);
  grupo.add(interno);
  if (GIRAR_180[carroceria]) grupo.rotation.y = Math.PI;
  aplicarEstiloTecnico(clone);
  return grupo;
}

export interface ToqueNoModelo {
  ponto: Vetor3;
  normal: Vetor3;
}

interface VeiculoModeloProps {
  carroceria: Carroceria;
  /** Só dispara em toque "limpo": arrastar pra girar o modelo não conta como marcação. */
  onToque?: (toque: ToqueNoModelo) => void;
}

const LIMITE_ARRASTE_PX = 4;

export function VeiculoModelo({ carroceria, onToque }: VeiculoModeloProps) {
  const { scene } = useGLTF(ARQUIVO_MODELO[carroceria]);
  const grupo = useMemo(() => normalizar(scene, carroceria), [scene, carroceria]);

  function aoClicar(e: ThreeEvent<MouseEvent>) {
    if (!onToque || e.delta > LIMITE_ARRASTE_PX || !e.face) return;
    e.stopPropagation();
    // O grupo fica na raiz da cena, então o espaço do mundo já é o espaço normalizado do carro.
    const normal = e.face.normal.clone().transformDirection(e.object.matrixWorld);
    onToque({ ponto: e.point.clone(), normal });
  }

  return <primitive object={grupo} onClick={aoClicar} />;
}
