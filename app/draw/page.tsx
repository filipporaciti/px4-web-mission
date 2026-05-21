"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Setpoint = {
  x: number;
  y: number;
  z: number;
};

type Marker = {
  id: string;
  x: number;
  y: number;
  z: number;
  length: number;
};

export default function DrawPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [setpoints, setSetpoints] = useState<Setpoint[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    let currentSetpoints: Setpoint[] = setpoints;
    let currentMarkers: Marker[] = markers;

    try {
      const savedMission = typeof window !== "undefined" ? localStorage.getItem("editor-content-mission") : null;
      if (savedMission) {
        currentSetpoints = parseSetpoints(savedMission);
        setSetpoints(currentSetpoints);
      }

      const savedMarker = typeof window !== "undefined" ? localStorage.getItem("editor-content-marker") : null;
      if (savedMarker) {
        currentMarkers = parseMarkers(savedMarker);
        setMarkers(currentMarkers);
      }
    } catch (err) {
      console.warn("Failed to parse saved content:", err);
    }

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

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.up.set(0, 0, 1);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);

        const size = 10;
        const divisions = 20;
        const gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0xdddddd);
        gridHelper.rotation.x = Math.PI / 2;
        scene.add(gridHelper);

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
          point.position.set(setpoint.x, setpoint.y, setpoint.z);
          scene.add(point);
          const label = createNumberLabelSprite(String(index + 1));
          label.position.set(setpoint.x, setpoint.y, setpoint.z + 0.35);
          scene.add(label);
        });

        currentMarkers.forEach((marker) => {
          const markerMaterial = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.6,
          });
          const markerGeometry = new THREE.BoxGeometry(marker.length, 0.03, marker.length);
          markerGeometry.rotateX(Math.PI / 2);
          const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
          markerMesh.position.set(marker.x, marker.y, marker.z);
          scene.add(markerMesh);
          const label = createFloorLabel(marker.id);
          label.position.set(marker.x, marker.y, marker.z + 0.02);
          scene.add(label);
        });

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

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
          controls.dispose();
          pointGeometry.dispose();
          pointMaterial.dispose();
          floorLabelGeometries.forEach((geometry) => geometry.dispose());
          floorLabelMaterials.forEach((material) => material.dispose());
          labelTextures.forEach((texture) => texture.dispose());
          renderer.dispose();
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

  return (
    <div className="h-full flex flex-col">
      <h1 className="mb-2 text-lg font-semibold">Marker and setpoint floor</h1>
      <div ref={mountRef} className="w-full h-[600px] border rounded" />
    </div>
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

function parseMarkers(text: string): Marker[] {
  const data = JSON.parse(text);
  const length = Number(data.marker_length ?? data.length ?? 1);
  const positions = data.position ?? {};

  console.log("Parsed marker data:", { length, positions });

  return Object.entries(positions).map(([id, value]: [string, any]) => ({
    id,
    x: Number(value.x),
    y: Number(value.y),
    z: Number(value.z),
    length: Number(length),
  }));
}

function parseSetpoints(text: string): Setpoint[] {
  const data = JSON.parse(text);
  const targets = data.targets ?? [];
  const out = targets.map((item: any) => ({
    x: Number(item.north_m),
    y: Number(item.east_m),
    z: Number(item.down_m) * -1,
  }));
  return out;
}