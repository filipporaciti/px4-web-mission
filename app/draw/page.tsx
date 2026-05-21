"use client";
import { get } from "http";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function DrawPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

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

        const [xAxis, yAxis, zAxis] = getAxisLines(size/2);
        scene.add(xAxis);
        scene.add(yAxis);
        scene.add(zAxis);

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
      <h1 className="mb-2 text-lg font-semibold">3D mission</h1>
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