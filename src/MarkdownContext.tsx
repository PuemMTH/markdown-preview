import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export interface SaveProgress {
  percent: number;
  step: string;
}

interface MarkdownState {
  content: string | null;
  filePath: string | null;
  loading: boolean;
  dragging: boolean;
  pendingSavePath: string | null;
  saveProgress: SaveProgress | null;
  graphChart: string | null;
  loadFile: (path: string) => Promise<void>;
  setDragging: (v: boolean) => void;
  setPendingSavePath: (path: string | null) => void;
  setSaveProgress: (p: SaveProgress | null) => void;
  setGraphChart: (chart: string | null) => void;
}

const MarkdownContext = createContext<MarkdownState>({
  content: null, filePath: null, loading: true, dragging: false,
  pendingSavePath: null, saveProgress: null, graphChart: null,
  loadFile: async () => {}, setDragging: () => {},
  setPendingSavePath: () => {}, setSaveProgress: () => {}, setGraphChart: () => {},
});

export function useMarkdown() {
  return useContext(MarkdownContext);
}

export function MarkdownProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [pendingSavePath, setPendingSavePath] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);
  const [graphChart, setGraphChart] = useState<string | null>(null);

  const loadFile = useCallback(async (path: string) => {
    const md = await invoke<string>("read_file", { path });
    setFilePath(path);
    setContent(md);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const path = await invoke<string | null>("get_file_path");
        if (path) await loadFile(path);
      } catch (e) {
        console.error("Failed to load file from CLI:", e);
      }
      setLoading(false);
    })();
  }, [loadFile]);

  useEffect(() => {
    const webview = getCurrentWebviewWindow();
    const unlisten: (() => void)[] = [];

    webview.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setDragging(true);
      } else if (event.payload.type === "drop") {
        setDragging(false);
        const files = event.payload.paths;
        const mdFile = files.find((f) => f.endsWith(".md"));
        if (mdFile) loadFile(mdFile);
      } else {
        setDragging(false);
      }
    }).then((fn) => unlisten.push(fn));

    return () => unlisten.forEach((fn) => fn());
  }, [loadFile]);

  return (
    <MarkdownContext.Provider value={{
      content, filePath, loading, dragging,
      pendingSavePath, saveProgress, graphChart,
      loadFile, setDragging, setPendingSavePath, setSaveProgress, setGraphChart,
    }}>
      {children}
    </MarkdownContext.Provider>
  );
}
