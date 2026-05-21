"use client";
import { useEffect, useState } from "react";
import CodeEditor from '@uiw/react-textarea-code-editor';

type Mode = "mission" | "marker";

export default function EditorPage() {
  const [mode, setMode] = useState<Mode>("mission");
  const [missionText, setMissionText] = useState("");
  const [markerText, setMarkerText] = useState("");

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const m = localStorage.getItem("editor-content-mission");
        const k = localStorage.getItem("editor-content-marker");
        if (m) setMissionText(m);
        if (k) setMarkerText(k);
      }
    } catch (e) {
      console.warn("Failed to load editor content", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("editor-content-mission", missionText);
    } catch (e) {
      /* ignore */
    }
  }, [missionText]);

  useEffect(() => {
    try {
      localStorage.setItem("editor-content-marker", markerText);
    } catch (e) {
      /* ignore */
    }
  }, [markerText]);

  const currentText = mode === "mission" ? missionText : markerText;
  const onChange = (v: string) => (mode === "mission" ? setMissionText(v) : setMarkerText(v));

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-lg font-semibold">{mode === "mission" ? "Mission editor" : "Marker editor"}</h1>
        <div className="ml-4 flex gap-2">
          <button
            className={`px-3 py-1 rounded ${mode === "mission" ? "bg-gray-200" : "bg-white border"}`}
            onClick={() => setMode("mission")}
          >
            Mission
          </button>
          <button
            className={`px-3 py-1 rounded ${mode === "marker" ? "bg-gray-200" : "bg-white border"}`}
            onClick={() => setMode("marker")}
          >
            Marker
          </button>
        </div>
      </div>

      <CodeEditor
        value={currentText}
        language="json"
        onChange={(e) => onChange(e.target.value)}
        placeholder={mode === "mission" ? "Write mission JSON here..." : "Write marker JSON here..."}
        className="flex-1 w-full border rounded p-3 min-h-[300px]"
        padding={15}
        style={{
          fontSize: 14,
          fontFamily: 'ui-monospace,SFMono-Regular,SF Pro Text,Menlo,Monaco,Consolas,monospace',         
        }}
      />
    </div>
  );
}
