"use client";
import { useEffect, useState } from "react";
import CodeEditor from '@uiw/react-textarea-code-editor';

type Mode = "mission" | "marker";

export default function EditorPage() {
  const [mode, setMode] = useState<Mode>("mission");
  const [missionText, setMissionText] = useState("");
  const [markerText, setMarkerText] = useState("");
  const [isDark, setIsDark] = useState(() => {
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
    const mq = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    setIsDark(mq.matches);

    mq.addEventListener("change", (evt) => setIsDark(evt.matches));
  }, []);

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
            className={`px-3 py-1 rounded ${
              mode === 'mission'
                ? isDark
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200'
                : isDark
                ? 'bg-gray-900 border border-gray-700 text-gray-300'
                : 'bg-white border'

            }`}
            onClick={() => setMode('mission')}
          >
            Mission
          </button>
          <button
            className={`px-3 py-1 rounded ${
              mode === 'marker'
                ? isDark
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200'
                : isDark
                ? 'bg-gray-900 border border-gray-700 text-gray-300'
                : 'bg-white border'
            }`}
            onClick={() => setMode('marker')}
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
