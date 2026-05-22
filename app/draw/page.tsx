"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MarkersData, jsonToMarkersData } from "../utils/marker";
import { jsonToSetpointsData, SetpointsData, Setpoint, setpointsDataToJson } from "../utils/setpoint";
import { createFloorLabel, createNumberLabelSprite, threeObjectCleanup, getAxisLines, InfoSidebar } from "./objects";

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
        const gridHelper = createGridHelper(size, divisions, isDark);
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
        const setpointPickables: THREE.Object3D[] = [];

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
          threeObjectCleanup();
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
        const size = (oldGrid as any)?.userData?.size ?? 10;
        const divisions = (oldGrid as any)?.userData?.divisions ?? 10;
        const newGrid = createGridHelper(size, divisions, isDark);
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
      const scene = sceneRef.current;
      const currentGrid = gridRef.current;
      const map = setpointMeshMapRef.current;
      const labelMap = setpointLabelMapRef.current;
      if (!map || map.size === 0) return;
      setpointsData.targets.forEach((sp, i) => {
        const m = map.get(i);
        if (m) m.position.set(sp.north_m, sp.east_m, -sp.down_m);
        const l = labelMap.get(i);
        if (l) l.position.set(sp.north_m, sp.east_m, -sp.down_m + 0.35);
      });

      if (scene && currentGrid) {
        const maxCoordinate = getMaxCoordinate(markersData, setpointsData.targets);
        const nextSize = maxCoordinate*2;
        const nextDivisions = maxCoordinate*2;
        const currentSize = (currentGrid as any)?.userData?.size;
        const currentDivisions = (currentGrid as any)?.userData?.divisions;

        if (currentSize !== nextSize || currentDivisions !== nextDivisions) {
          try {
            scene.remove(currentGrid);
          } catch (e) {}
          try { currentGrid.geometry.dispose(); } catch (e) {}
          try { /* @ts-ignore */ currentGrid.material.dispose(); } catch (e) {}

          const newGrid = createGridHelper(nextSize, nextDivisions, isDark);
          scene.add(newGrid);
          gridRef.current = newGrid;
        }
      }
    } catch (e) {
      // ignore
    }
  }, [setpointsData, markersData, isDark]);

  useEffect(() => {
    try {
      if (setpointsData.targets.length !== 0) {
        localStorage.setItem("editor-content-mission", setpointsDataToJson(setpointsData));
      }
    } catch (e) {
      console.error(e);
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

function createGridHelper(size: number, divisions: number, isDark: boolean): THREE.GridHelper {
  const gridHelper = new THREE.GridHelper(
    size,
    divisions,
    isDark ? 0x444444 : 0x888888,
    isDark ? 0x222222 : 0xdddddd
  );
  gridHelper.rotation.x = Math.PI / 2;
  gridHelper.userData = { ...gridHelper.userData, size, divisions };
  return gridHelper;
}

function getMaxCoordinate(markersData: MarkersData, currentSetpoints: Setpoint[]): number {
  const markerLength = markersData.marker_length;
  const markers = Object.values(markersData.position);
  const ris = Math.max(
    ...markers.flatMap((m) => Math.abs(m.x) + markerLength),
    ...markers.flatMap((m) => Math.abs(m.y) + markerLength),

    ...currentSetpoints.flatMap((s) => Math.abs(s.north_m)),
    ...currentSetpoints.flatMap((s) => Math.abs(s.east_m)),
    5
  );
  return ris;
}