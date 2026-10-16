import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import {
  CanvasTexture,
  CubicBezierCurve3,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from "three";
import { useReducedMotion } from "motion/react";

class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
function Fallback() {
  return (
    <div className="canvas-fallback">
      <span aria-hidden="true">✳</span>
      <strong>Your evidence stays connected.</strong>
      <p>
        The 3D scene is unavailable on this device. All records are still
        selectable below.
      </p>
    </div>
  );
}
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (n) => 1 - Math.pow(1 - clamp(n), 3);

function SceneLabel({ text, position, active = false }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = active ? "#d7fc70" : "#e0d6ff";
    ctx.fillRect(0, 0, 384, 96);
    ctx.strokeStyle = "#262131";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 380, 92);
    ctx.fillStyle = "#262131";
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 192, 49);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [text, active]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[1.48, 0.37, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}

function Parcel({ timing, position, label }) {
  const left = useRef(),
    right = useRef();
  useFrame(() => {
    const opening = ease((timing.current.elapsed - 0.2) / 0.8);
    if (left.current) left.current.rotation.z = opening * 1.85;
    if (right.current) right.current.rotation.z = -opening * 1.85;
  });
  return (
    <group position={position}>
      {/* A hollow carton, so the documents emerge from inside the actual opening. */}
      {[
        [
          [0, -0.35, 0.7],
          [1.62, 1.12, 0.09],
        ],
        [
          [0, -0.35, -0.7],
          [1.62, 1.12, 0.09],
        ],
        [
          [-0.78, -0.35, 0],
          [0.09, 1.12, 1.4],
        ],
        [
          [0.78, -0.35, 0],
          [0.09, 1.12, 1.4],
        ],
        [
          [0, -0.88, 0],
          [1.6, 0.08, 1.4],
        ],
      ].map(([pos, args], i) => (
        <RoundedBox
          key={i}
          args={args}
          radius={0.025}
          smoothness={2}
          position={pos}
        >
          <meshStandardMaterial
            color={i === 4 ? "#b86b32" : "#f0ac64"}
            roughness={0.68}
          />
        </RoundedBox>
      ))}
      <group ref={left} position={[-0.78, 0.22, 0]}>
        <mesh position={[0.39, 0, 0]}>
          <boxGeometry args={[0.78, 0.055, 1.42]} />
          <meshStandardMaterial color="#facb89" roughness={0.65} />
        </mesh>
      </group>
      <group ref={right} position={[0.78, 0.22, 0]}>
        <mesh position={[-0.39, 0, 0]}>
          <boxGeometry args={[0.78, 0.055, 1.42]} />
          <meshStandardMaterial color="#e9a35a" roughness={0.65} />
        </mesh>
      </group>
      <mesh position={[0, -0.35, 0.755]}>
        <boxGeometry args={[0.24, 1.1, 0.018]} />
        <meshStandardMaterial color="#f4ddaf" />
      </mesh>
      <RoundedBox
        position={[0.42, -0.38, 0.765]}
        args={[0.4, 0.43, 0.025]}
        radius={0.025}
        smoothness={2}
      >
        <meshStandardMaterial color="#eee2ff" />
      </RoundedBox>
      {[-0.12, -0.07, -0.03, 0.025, 0.1].map((x, i) => (
        <mesh key={x} position={[0.42 + x, -0.37, 0.785]}>
          <boxGeometry args={[i % 2 ? 0.025 : 0.013, 0.23, 0.01]} />
          <meshStandardMaterial color="#292332" />
        </mesh>
      ))}
      <SceneLabel text={label} position={[0, -1.22, 0.2]} />
    </group>
  );
}

function Document({
  row,
  index,
  destination,
  timing,
  active,
  onSelect,
  reduced,
}) {
  const group = useRef();
  const start = 0.85 + index * 0.7;
  const color = index % 2 ? "#d8c5ff" : "#d7fc70";
  useFrame(() => {
    if (!group.current) return;
    const t = timing.current.elapsed;
    const progress = ease((t - start) / 1.5);
    group.current.visible = t >= start;
    const rise = ease((t - start) / 0.72);
    const fan = ease((t - start - 0.45) / 1.05);
    group.current.position.set(
      destination[0] * fan,
      -0.35 + (destination[1] + 0.35) * rise,
      destination[2] * fan,
    );
    group.current.rotation.set(
      -0.22 * (1 - progress),
      (index % 2 ? -0.12 : 0.12) * progress,
      (index % 2 ? -0.09 : 0.09) * progress,
    );
    group.current.scale.setScalar(0.5 + progress * 0.5);
    if (progress === 1 && !reduced)
      group.current.position.y += Math.sin(t * 1.1 + index) * 0.025;
  });
  return (
    <group ref={group} visible={reduced}>
      <RoundedBox
        args={[1.04, 1.4, 0.075]}
        radius={0.065}
        smoothness={3}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(row.evidenceId);
        }}
      >
        <meshStandardMaterial
          color={active ? "#fff7df" : "#e9e0f4"}
          roughness={0.5}
        />
      </RoundedBox>
      <mesh position={[0, 0.44, 0.052]}>
        <boxGeometry args={[0.85, 0.24, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[0.16, -0.02, -0.2, -0.38].map((y, i) => (
        <mesh key={y} position={[i === 3 ? -0.15 : 0, y, 0.055]}>
          <boxGeometry args={[i === 3 ? 0.48 : 0.78, 0.038, 0.02]} />
          <meshStandardMaterial color="#51465e" />
        </mesh>
      ))}
      <mesh position={[0.34, -0.49, 0.055]}>
        <circleGeometry args={[0.095, 20]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <SceneLabel
        text={row.evidenceId}
        position={[0, 0.94, 0]}
        active={active}
      />
    </group>
  );
}

function GrowingConnection({ destination, origin, index, timing, active }) {
  const mesh = useRef(),
    tip = useRef();
  const curve = useMemo(
    () =>
      new CubicBezierCurve3(
        new Vector3(...origin),
        new Vector3(origin[0], 1, origin[2]),
        new Vector3(destination[0] * 0.8, destination[1] - 0.6, destination[2]),
        new Vector3(destination[0], destination[1] - 0.4, destination[2]),
      ),
    [origin, destination],
  );
  const geometry = useMemo(
    () => new TubeGeometry(curve, 80, 0.018, 6, false),
    [curve],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const p = ease((timing.current.elapsed - (2.4 + index * 0.7)) / 1);
    geometry.setDrawRange(0, Math.floor(p * 80) * 36);
    if (tip.current) {
      tip.current.visible = p > 0;
      curve.getPoint(p, tip.current.position);
    }
  });
  const color = active ? "#d7fc70" : "#b29afa";
  return (
    <group>
      <mesh ref={mesh} geometry={geometry}>
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={tip} visible={false}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function Story({ rows, selected, onSelect, playing, reduced, onPhase }) {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(0, 2.3, size.width / size.height < 1.3 ? 8.7 : 6.8);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  const timing = useRef({ elapsed: reduced ? 20 : 0, phase: -1 });
  const pickups = useMemo(
    () => [...new Set(rows.map((row) => row.pickupId))],
    [rows],
  );
  const positions = useMemo(
    () =>
      rows.map((_row, i) => [
        i % 2 ? 2.05 : -2.05,
        1.18 + Math.floor(i / 2) * 1.7,
        0,
      ]),
    [rows],
  );
  const origins = useMemo(
    () => pickups.map((_p, i) => [0, 0.15, -i * 2.3]),
    [pickups],
  );
  useFrame((_state, delta) => {
    if (reduced) timing.current.elapsed = 20;
    else if (playing && !document.hidden)
      timing.current.elapsed += Math.min(delta, 0.05);
    const t = timing.current.elapsed;
    const phase = t < 0.85 ? 0 : t < 2.4 ? 1 : t < 4.15 ? 2 : 3;
    if (timing.current.phase !== phase) {
      timing.current.phase = phase;
      onPhase(phase);
    }
  });
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 7, 6]} intensity={3} />
      <pointLight position={[-4, 3, 2]} color="#bfa0ff" intensity={15} />
      <mesh position={[0, -1.24, 0]}>
        <cylinderGeometry args={[3.1, 3.1, 0.16, 64]} />
        <meshStandardMaterial color="#453754" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.145, 0]}>
        <ringGeometry args={[2.7, 2.72, 80]} />
        <meshBasicMaterial color="#a690bd" transparent opacity={0.5} />
      </mesh>
      {pickups.map((pickup, i) => (
        <Parcel
          key={pickup}
          timing={timing}
          position={[0, 0, -i * 2.3]}
          label={pickup}
        />
      ))}
      {rows.map((row, i) => (
        <group key={`${row.evidenceId}-${i}`}>
          <GrowingConnection
            origin={origins[pickups.indexOf(row.pickupId)]}
            destination={positions[i]}
            index={i}
            timing={timing}
            active={selected === row.evidenceId}
          />
          <Document
            row={row}
            index={i}
            destination={positions[i]}
            timing={timing}
            active={selected === row.evidenceId}
            onSelect={onSelect}
            reduced={reduced}
          />
        </group>
      ))}
      <ContactShadows
        position={[0, -1.14, 0]}
        opacity={0.32}
        scale={8}
        blur={2.6}
        far={4}
        resolution={256}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.7}
        maxPolarAngle={1.5}
        minAzimuthAngle={-0.65}
        maxAzimuthAngle={0.65}
      />
    </>
  );
}

export default function ThreeScene({
  rows,
  selected,
  onSelect,
  playing = true,
  replay = 0,
  onPhase = () => {},
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <CanvasBoundary>
      <Suspense fallback={<Fallback />}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 2.3, 8.7], fov: 40 }}
          frameloop={reduced || !playing ? "demand" : "always"}
          fallback={<Fallback />}
        >
          <Story
            key={replay}
            rows={rows}
            selected={selected}
            onSelect={onSelect}
            playing={playing}
            reduced={reduced}
            onPhase={onPhase}
          />
        </Canvas>
      </Suspense>
    </CanvasBoundary>
  );
}
