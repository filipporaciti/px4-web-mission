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
  const [inputs, setInputs] = useState<{ north_m: string; east_m: string; down_m: string; yaw_deg: string }>({ north_m: '', east_m: '', down_m: '', yaw_deg: '' });
  const [valid, setValid] = useState<{ north_m: boolean; east_m: boolean; down_m: boolean; yaw_deg: boolean }>({ north_m: true, east_m: true, down_m: true, yaw_deg: true });
  const [hasYaw, setHasYaw] = useState<boolean>(Boolean(setPoint?.yaw_deg));

  useEffect(() => {
    setLocal(setPoint);
    if (setPoint) {
      setInputs({ north_m: String(setPoint.north_m), east_m: String(setPoint.east_m), down_m: String(setPoint.down_m), yaw_deg: setPoint.yaw_deg !== undefined ? String(setPoint.yaw_deg) : '' });
      setValid({ north_m: true, east_m: true, down_m: true, yaw_deg: true });
      setHasYaw(setPoint.yaw_deg !== undefined);
    } else {
      setInputs({ north_m: '', east_m: '', down_m: '', yaw_deg: '' });
      setValid({ north_m: true, east_m: true, down_m: true, yaw_deg: true });
      setHasYaw(false);
    }
  }, [setPoint]);

  const updateInput = (field: keyof Setpoint, value: string, removeWhenEmpty = false) => {
    if (!local) return;
    setInputs((s) => ({ ...s, [field]: value }));
    const normalized = value.replace(/,/g, '.').trim();
    if (normalized === '') {
      if (field === 'yaw_deg' && removeWhenEmpty) {
        const next = { ...local } as Setpoint;
        delete next.yaw_deg;
        setHasYaw(false);
        setValid((v) => ({ ...v, [field]: true }));
        setLocal(next);
        try { onChange(next, index); } catch (e) { /* ignore */ }
        return;
      }

      setValid((v) => ({ ...v, [field]: false }));
      return;
    }
    const n = parseFloat(normalized);
    if (Number.isFinite(n) && !normalized.endsWith('.')) {
      if (field === 'yaw_deg') {
        setHasYaw(true);
      }
      setValid((v) => ({ ...v, [field]: true }));
      const next = { ...local, [field]: n } as Setpoint;
      setLocal(next);
      try { onChange(next, index); } catch (e) { /* ignore */ }
    } else {
      setValid((v) => ({ ...v, [field]: false }));
    }
  };

  const toggleYaw = () => {
    if (!local) return;

    if (hasYaw) {
      updateInput('yaw_deg', '', true);
      return;
    }

    updateInput('yaw_deg', String('0'));
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
          <InputValue 
            label="north_m" 
            value={inputs.north_m} 
            valid={valid.north_m} 
            onChange={(v) => updateInput('north_m', v)} 
          />
          <InputValue 
            label="east_m" 
            value={inputs.east_m} 
            valid={valid.east_m} 
            onChange={(v) => updateInput('east_m', v)} 
          />
          <InputValue 
            label="down_m" 
            value={inputs.down_m} 
            valid={valid.down_m} 
            onChange={(v) => updateInput('down_m', v)} 
          />
          <div className="pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={hasYaw}
                onChange={toggleYaw}
              />
              yaw_deg
            </label>
            {hasYaw ? (
              <input
                className={`mt-2 w-full rounded p-1 text-sm border ${valid.yaw_deg ? 'border-gray-200' : 'border-red-500'}`}
                value={inputs.yaw_deg}
                onChange={(e) => updateInput('yaw_deg', e.target.value)}
              />
            ) : null}
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

function InputValue({ label, value, valid, onChange }: { label: string; value: string; valid: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block">{label}</label>
      <input
        className={`w-full rounded p-1 text-sm border ${valid ? 'border-gray-200' : 'border-red-500'}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}