import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import mermaid from "mermaid";
import { Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useMarkdown } from "../MarkdownContext";

mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

let mermaidId = 0;

async function svgToPngBytes(svgEl: SVGElement): Promise<number[]> {
  const scale = 2;
  const bbox = (svgEl as SVGGraphicsElement).getBBox?.();
  const rect = svgEl.getBoundingClientRect();

  const pad = 10;
  const naturalW = (bbox?.width || rect.width || 800) + pad * 2;
  const naturalH = (bbox?.height || rect.height || 600) + pad * 2;
  const width = Math.ceil(naturalW * scale);
  const height = Math.ceil(naturalH * scale);

  const clone = svgEl.cloneNode(true) as SVGElement;
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("viewBox", `${(bbox?.x ?? 0) - pad} ${(bbox?.y ?? 0) - pad} ${naturalW} ${naturalH}`);

  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  return Array.from({ length: binary.length }, (_, i) => binary.charCodeAt(i));
}

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { setGraphChart } = useMarkdown();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ref.current) return;
    const id = `mermaid-${mermaidId++}`;
    setReady(false);

    const temp = document.createElement("div");
    temp.style.visibility = "hidden";
    temp.style.position = "absolute";
    document.body.appendChild(temp);

    mermaid.render(id, chart, temp).then(({ svg }) => {
      if (ref.current) {
        ref.current.innerHTML = svg;
        setReady(true);
      }
    }).catch((e) => {
      if (ref.current) ref.current.innerHTML = `<pre style="color:red">Mermaid error: ${e}</pre>`;
    }).finally(() => {
      document.body.removeChild(temp);
    });
  }, [chart]);

  function openViewer() {
    setGraphChart(chart);
    navigate("/graph");
  }

  async function savePng() {
    const svgEl = ref.current?.querySelector("svg");
    if (!svgEl) return;

    const folder = await openDialog({ directory: true, title: "Save diagram as PNG" });
    if (!folder) return;

    try {
      const bytes = await svgToPngBytes(svgEl as SVGElement);
      const savePath = `${folder}/diagram-${Date.now()}.png`;
      await invoke("write_file", { path: savePath, bytes });
      message.success(`PNG saved to ${savePath}`);
    } catch {
      message.error("Failed to save PNG");
    }
  }

  const items: MenuProps["items"] = [
    { key: "view", label: "Open in Viewer" },
    { key: "save-png", label: "Save as PNG" },
  ];

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "save-png") savePng();
    if (key === "view") openViewer();
  };

  return (
    <Dropdown menu={{ items, onClick }} trigger={["contextMenu"]} disabled={!ready}>
      <div
        style={{ margin: "1rem 0", position: "relative", cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={openViewer}
      >
        <div ref={ref} />
        {hovered && ready && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8,
            transition: "all 0.2s",
          }}>
            <span style={{
              background: "rgba(0,0,0,0.6)", color: "#fff",
              padding: "6px 16px", borderRadius: 6, fontSize: 13,
            }}>
              Click to zoom
            </span>
          </div>
        )}
      </div>
    </Dropdown>
  );
}
