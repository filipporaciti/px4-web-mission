import { useEffect, useState } from "react";
import * as THREE from "three";
import { Setpoint } from "../utils/setpoint";

const labelTextures: THREE.CanvasTexture[] = [];
const floorLabelGeometries: THREE.PlaneGeometry[] = [];
const floorLabelMaterials: THREE.MeshBasicMaterial[] = [];

export function createNumberLabelSprite(label: string) {
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

export function createFloorLabel(label: string) {
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

export function threeObjectCleanup() {
    labelTextures.forEach((texture) => texture.dispose());
    floorLabelGeometries.forEach((geometry) => geometry.dispose());
    floorLabelMaterials.forEach((material) => material.dispose());
}

export function getAxisLines(size: number) {
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

export function InfoSidebar({ setPoint, index, isDark, onChange }: { setPoint: Setpoint | null; index: number; isDark: boolean; onChange: (s: Setpoint, i: number) => void }) {
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

export function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute h-10 right-4 bottom-4 z-10 rounded-full bg-blue-600 text-white p-3 shadow-lg hover:bg-blue-700 flex items-center justify-center"
    >
      Add setpoint
    </button>
  );
}