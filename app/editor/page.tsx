"use client";
import { useEffect, useState } from "react";
import CodeEditor from '@uiw/react-textarea-code-editor';

type Mode = "mission" | "marker";

export default function EditorPage() {
  const [mode, setMode] = useState<Mode>("mission");
  const [missionText, setMissionText] = useState("");
  const [markerText, setMarkerText] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1500);
    } catch (e) {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 1500);
    }
  };

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

      <div className="relative flex-1 min-h-[300px]">
        <CopyButton 
          status={copyStatus} 
          onClick={handleCopy} 
          isDark={isDark} 
        />

        <CodeEditor
          value={currentText}
          language="json"
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === "mission" ? "Write mission JSON here..." : "Write marker JSON here..."}
          className="h-full w-full border rounded p-3 min-h-[300px]"
          padding={15}
          style={{
            fontSize: 14,
            fontFamily: 'ui-monospace,SFMono-Regular,SF Pro Text,Menlo,Monaco,Consolas,monospace',         
          }}
        />
      </div>
    </div>
  );
}


function CopyButton({ status, onClick, isDark }: { status: "idle" | "copied" | "error"; onClick: () => void; isDark: boolean }) {
  return (
    <button
      className={`absolute right-3 top-3 z-10 rounded border px-3 py-2 shadow-sm transition-colors ${
        isDark
          ? 'bg-gray-900/95 border-gray-700 text-gray-200 hover:bg-gray-800'
          : 'bg-white/95 border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
      onClick={onClick}
      title="Copy content"
      aria-label="Copy content"
    >
      <span className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span className="text-xs font-medium">
          {status === "copied" ? "Copied" : status === "error" ? "Failed" : "Copy"}
        </span>
      </span>
    </button>
  );
}