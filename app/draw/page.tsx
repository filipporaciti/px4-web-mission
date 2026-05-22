"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MarkersData, jsonToMarkersData } from "../utils/marker";
import { jsonToSetpointsData, SetpointsData, Setpoint } from "../utils/setpoint";


export default function DrawPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const setpointMeshMapRef = useRef<Map<number, THREE.Object3D>>(new Map());
  const setpointLabelMapRef = useRef<Map<number, THREE.Object3D>>(new Map());
  const markerMeshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const markerLabelMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const [setpointsData, setSetpointsData] = useState<SetpointsData>({ targets: [] });
  const [markersData, setMarkersData] = useState<MarkersData>({ position: [], marker_length: 0 });
  const [selectedSetpointIndex, setSelectedSetpointIndex] = useState<number>(-1);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      /* ignore */
    }
    return false;
  });


  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    let currentSetpoints: Setpoint[] = setpointsData.targets;
    let currentMarkers: MarkersData = markersData;

    try {
      const savedMission = typeof window !== "undefined" ? localStorage.getItem("editor-content-mission") : null;
      if (savedMission) {
        const data = jsonToSetpointsData(savedMission);
        currentSetpoints = data.targets;
        setSetpointsData(data);
      }

      const savedMarker = typeof window !== "undefined" ? localStorage.getItem("editor-content-marker") : null;
      if (savedMarker) {
        currentMarkers = jsonToMarkersData(savedMarker);
        setMarkersData(currentMarkers);
      }
    } catch (err) {
      console.warn("Failed to parse saved content:", err);
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    try {
      setIsDark(mq.matches);
    } catch (e) {
      /* ignore */
    }
    mq.addEventListener("change", (evt) => setIsDark(evt.matches));

    async function init() {
      try {
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

        if (!mounted) return;

        const width = mountRef.current?.clientWidth || 800;
        const height = mountRef.current?.clientHeight || 600;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        mountRef.current!.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(isDark ? 0x0b1220 : 0xf8fafc);
        sceneRef.current = scene;

        const markerLength = currentMarkers.marker_length;
        const maxCoordinate = getMaxCoordinate(currentMarkers, currentSetpoints);

        const centerX = maxCoordinate / 2;
        const centerY = maxCoordinate / 2;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.up.set(0, 0, 1);
        camera.position.set(centerX, centerY - maxCoordinate * 1.2, maxCoordinate);
        camera.lookAt(centerX, centerY, 0);
        
        const size = maxCoordinate*2;
        const divisions = maxCoordinate*2;
        const gridHelper = new THREE.GridHelper(
          size,
          divisions,
          isDark ? 0x444444 : 0x888888,
          isDark ? 0x222222 : 0xdddddd
        );
        gridHelper.rotation.x = Math.PI / 2;
        scene.add(gridHelper);
        gridRef.current = gridHelper;

        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
        directionalLight.position.set(6, 5, 8);
        scene.add(directionalLight);

        const [xAxis, yAxis, zAxis] = getAxisLines(size/2);
        scene.add(xAxis);
        scene.add(yAxis);
        scene.add(zAxis);

        const pointGeometry = new THREE.SphereGeometry(0.07, 18, 18);
        const pointMaterial = new THREE.MeshStandardMaterial({
          color: 0xffff00
        });
        const labelTextures: THREE.CanvasTexture[] = [];
        const floorLabelGeometries: THREE.PlaneGeometry[] = [];
        const floorLabelMaterials: THREE.MeshBasicMaterial[] = [];
        const setpointPickables: THREE.Object3D[] = [];

        function createNumberLabelSprite(label: string) {
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;

          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to create canvas context for label");
          }

          context.clearRect(0, 0, canvas.width, canvas.height);
          context.beginPath();
          context.arc(32, 32, 22, 0, Math.PI * 2);
          context.fillStyle = "rgba(15, 23, 42, 0.9)";
          context.fill();

          context.font = "bold 27px sans-serif";
          context.fillStyle = "#ffffff";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(label, 32, 32);

          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          labelTextures.push(texture);

          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(0.5, 0.5, 0.5);
          return sprite;
        }

        function createFloorLabel(label: string) {
          const canvas = document.createElement("canvas");
          canvas.width = 128;
          canvas.height = 128;

          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to create canvas context for label");
          }

          context.font = "bold 36px sans-serif";
          context.fillStyle = "#ffffff";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(label, 64, 64);

          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          labelTextures.push(texture);

          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
          });
          floorLabelMaterials.push(material);

          const geometry = new THREE.PlaneGeometry(0.55, 0.55);
          floorLabelGeometries.push(geometry);

          return new THREE.Mesh(geometry, material);
        }

        currentSetpoints.forEach((setpoint, index) => {
          const point = new THREE.Mesh(pointGeometry, pointMaterial);
          point.position.set(setpoint.north_m, setpoint.east_m, -setpoint.down_m);
          point.userData = { kind: "setpoint", index, x: setpoint.north_m, y: setpoint.east_m, z: setpoint.down_m };
          scene.add(point);
          setpointPickables.push(point);
          setpointMeshMapRef.current.set(index, point);
          const label = createNumberLabelSprite(String(index + 1));
          label.position.set(setpoint.north_m, setpoint.east_m, -setpoint.down_m + 0.35);
          label.userData = { kind: "setpoint", index, x: setpoint.north_m, y: setpoint.east_m, z: setpoint.down_m };
          scene.add(label);
          setpointPickables.push(label);
          setpointLabelMapRef.current.set(index, label);
        });

        Object.entries(currentMarkers.position).forEach(([id, marker]) => {
          const markerMaterial = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.6,
          });
          const markerGeometry = new THREE.BoxGeometry(markerLength, 0.03, markerLength);
          markerGeometry.rotateX(Math.PI / 2);
          const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
          markerMesh.position.set(marker.x, marker.y, marker.z);
          scene.add(markerMesh);
          markerMeshMapRef.current.set(id, markerMesh);
          const label = createFloorLabel(id);
          label.position.set(marker.x, marker.y, marker.z + 0.02);
          scene.add(label);
          markerLabelMapRef.current.set(id, label);
        });

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        try {
          controls.target.set(centerX, centerY, 0);
          controls.update();
        } catch (e) {
        }

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();

        const onPointerDown = (event: MouseEvent) => {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(setpointPickables, true);
          const hit = hits.find((intersection) => intersection.object.userData?.kind === "setpoint");

          if (!hit) {
            // setSelectedSetpointIndex(-1);
            return;
          }

          const data = hit.object.userData;
          if (data?.kind === "setpoint") {
            setSelectedSetpointIndex(data.index);
          }
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);

        function onResize() {
          const w = mountRef.current?.clientWidth || 800;
          const h = mountRef.current?.clientHeight || 600;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }

        window.addEventListener("resize", onResize);

        const animate = () => {
          if (!mounted) return;
          controls.update();
          renderer.render(scene, camera);
          requestAnimationFrame(animate);
        };
        animate();

        cleanup = () => {
          mounted = false;
          window.removeEventListener("resize", onResize);
          renderer.domElement.removeEventListener("pointerdown", onPointerDown);
          controls.dispose();
          pointGeometry.dispose();
          pointMaterial.dispose();
          floorLabelGeometries.forEach((geometry) => geometry.dispose());
          floorLabelMaterials.forEach((material) => material.dispose());
          labelTextures.forEach((texture) => texture.dispose());
          renderer.dispose();
          try {
            if (sceneRef.current && gridRef.current) {
              try {
                sceneRef.current.remove(gridRef.current);
              } catch (e) {}
              try { gridRef.current.geometry.dispose(); } catch (e) {}
              try { /* @ts-ignore */ gridRef.current.material.dispose(); } catch (e) {}
              gridRef.current = null;
            }
          } catch (e) {}
          try { setpointMeshMapRef.current.clear(); } catch (e) {}
          try { setpointLabelMapRef.current.clear(); } catch (e) {}
          try { markerMeshMapRef.current.clear(); } catch (e) {}
          try { markerLabelMapRef.current.clear(); } catch (e) {}
          sceneRef.current = null;
          rendererRef.current = null;
          if (renderer.domElement && renderer.domElement.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement);
          }
        };
      } catch (e) {
        console.error(e);
      }
    }

    init();
    return () => cleanup();
  }, []);

  useEffect(() => {
    // update scene background and grid colors when system theme changes
    try {
      const scene = sceneRef.current;
      const oldGrid = gridRef.current;
      if (scene) {
        scene.background = new THREE.Color(isDark ? 0x0b1220 : 0xf8fafc);
      }
      if (scene && oldGrid) {
        try {
          scene.remove(oldGrid);
        } catch (e) {}
        try { oldGrid.geometry.dispose(); } catch (e) {}
        try { /* @ts-ignore */ oldGrid.material.dispose(); } catch (e) {}
        const size = (oldGrid as any)?.userData?.size ?? (Math.max(10, 10));
        const divisions = (oldGrid as any)?.geometry?.parameters?.divisions ?? 10;
        const newGrid = new THREE.GridHelper(
          size,
          divisions,
          isDark ? 0x444444 : 0x888888,
          isDark ? 0x222222 : 0xdddddd
        );
        newGrid.rotation.x = Math.PI / 2;
        scene.add(newGrid);
        gridRef.current = newGrid;
      }
    } catch (e) {
      // ignore
    }
  }, [isDark]);

  useEffect(() => {
    // update setpoint mesh positions when setpointsData changes
    try {
      const map = setpointMeshMapRef.current;
      const labelMap = setpointLabelMapRef.current;
      if (!map || map.size === 0) return;
      setpointsData.targets.forEach((sp, i) => {
        const m = map.get(i);
        if (m) m.position.set(sp.north_m, sp.east_m, -sp.down_m);
        const l = labelMap.get(i);
        if (l) l.position.set(sp.north_m, sp.east_m, -sp.down_m + 0.35);
      });
    } catch (e) {
      // ignore
    }
  }, [setpointsData]);


  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="mb-2 text-lg font-semibold">Marker and setpoint floor</h1>
      <div className="relative min-h-0 flex-1 rounded border overflow-hidden">
        <div ref={mountRef} className="w-full h-[600px] border rounded" />
        <InfoSidebar
          setPoint={selectedSetpointIndex >= 0 ? setpointsData.targets[selectedSetpointIndex] : null}
          index={selectedSetpointIndex}
          isDark={isDark}
          onChange={(updated, idx) => {
            setSetpointsData((prev) => {
              const targets = prev.targets.slice();
              if (idx >= 0 && idx < targets.length) targets[idx] = updated;
              return { targets };
            });
          }}
        />
      </div>
    </div>
  );
}
function InfoSidebar({ setPoint, index, isDark, onChange }: { setPoint: Setpoint | null; index: number; isDark: boolean; onChange: (s: Setpoint, i: number) => void }) {
  const [local, setLocal] = useState<Setpoint | null>(setPoint);
  const [inputs, setInputs] = useState<{ north_m: string; east_m: string; down_m: string }>({ north_m: '', east_m: '', down_m: '' });
  const [valid, setValid] = useState<{ north_m: boolean; east_m: boolean; down_m: boolean }>({ north_m: true, east_m: true, down_m: true });

  useEffect(() => {
    setLocal(setPoint);
    if (setPoint) {
      setInputs({ north_m: String(setPoint.north_m), east_m: String(setPoint.east_m), down_m: String(setPoint.down_m) });
      setValid({ north_m: true, east_m: true, down_m: true });
    } else {
      setInputs({ north_m: '', east_m: '', down_m: '' });
      setValid({ north_m: true, east_m: true, down_m: true });
    }
  }, [setPoint]);

  const updateInput = (field: keyof Setpoint, value: string) => {
    if (!local) return;
    setInputs((s) => ({ ...s, [field]: value }));
    const normalized = value.replace(/,/g, '.').trim();
    if (normalized === '') {
      setValid((v) => ({ ...v, [field]: false }));
      return;
    }
    const n = parseFloat(normalized);
    if (Number.isFinite(n) && !normalized.endsWith('.')) {
      setValid((v) => ({ ...v, [field]: true }));
      const next = { ...local, [field]: n } as Setpoint;
      setLocal(next);
      try { onChange(next, index); } catch (e) { /* ignore */ }
    } else {
      setValid((v) => ({ ...v, [field]: false }));
    }
  };

  return (
    <aside className={`absolute right-4 top-4 z-10 w-72 rounded border p-4 shadow-sm backdrop-blur-sm ${
      isDark ? 'bg-slate-900/90 text-gray-100 border-gray-700' : 'bg-white/95 text-gray-800'
    }`}>
      <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>Setpoint</h2>
      {local ? (
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Number:</span> {index + 1}
          </div>
          <div>
            <label className="text-xs text-gray-400 block">north_m</label>
            <input
              className={`w-full rounded p-1 text-sm border ${valid.north_m ? 'border-gray-200' : 'border-red-500'}`}
              value={inputs.north_m}
              onChange={(e) => updateInput('north_m', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block">east_m</label>
            <input
              className={`w-full rounded p-1 text-sm border ${valid.east_m ? 'border-gray-200' : 'border-red-500'}`}
              value={inputs.east_m}
              onChange={(e) => updateInput('east_m', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block">down_m</label>
            <input
              className={`w-full rounded p-1 text-sm border ${valid.down_m ? 'border-gray-200' : 'border-red-500'}`}
              value={inputs.down_m}
              onChange={(e) => updateInput('down_m', e.target.value)}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Click on a setpoint to see details</p>
      )}
    </aside>
  );
}

function getAxisLines(size: number) {
  const axisRadius = 0.03;

  const xAxis = new THREE.Mesh(
    new THREE.CylinderGeometry(axisRadius, axisRadius, size, 24),
    new THREE.MeshBasicMaterial({ color: 0xff4d4d }),
  );
  xAxis.rotation.z = Math.PI / 2;
  xAxis.position.x = size / 2;

  const yAxis = new THREE.Mesh(
    new THREE.CylinderGeometry(axisRadius, axisRadius, size, 24),
    new THREE.MeshBasicMaterial({ color: 0x4dff4d }),
  );
  yAxis.rotation.y = Math.PI / 2;
  yAxis.position.y = size / 2;

  const zAxis = new THREE.Mesh(
    new THREE.CylinderGeometry(axisRadius, axisRadius, size, 24),
    new THREE.MeshBasicMaterial({ color: 0x4d4dff }),
  );
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = size / 2;
  return [xAxis, yAxis, zAxis];
}

function getMaxCoordinate(markersData: MarkersData, currentSetpoints: Setpoint[]): number {
  const markerLength = markersData.marker_length;
  const markers = Object.values(markersData.position);
  const ris = Math.max(
    ...markers.flatMap((m) => Math.abs(m.x) + markerLength),
    ...markers.flatMap((m) => Math.abs(m.y) + markerLength),
    ...markers.flatMap((m) => Math.abs(m.z) + markerLength),

    ...currentSetpoints.flatMap((s) => Math.abs(s.north_m)),
    ...currentSetpoints.flatMap((s) => Math.abs(s.east_m)),
    ...currentSetpoints.flatMap((s) => Math.abs(s.down_m)),
    5
  );
  return ris;
}