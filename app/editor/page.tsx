"use client";
import { useEffect, useState } from "react";

export default function EditorPage() {
  const [text, setText] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("editor-content") : null;
    if (saved) setText(saved);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("editor-content", text);
    } catch (e) {
      // ignore
    }
  }, [text]);

  return (
    <div className="h-full flex flex-col">
      <h1 className="mb-2 text-lg font-semibold">Mission editor</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write here..."
        className="flex-1 w-full border rounded p-3 min-h-[300px]"
      />
    </div>
  );
}
