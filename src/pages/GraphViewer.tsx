import { useState, useRef, useEffect, useCallback } from "react";
import { Button, theme } from "antd";
import { useNavigate } from "react-router-dom";
import { useMarkdown } from "../MarkdownContext";
import mermaid from "mermaid";

let viewerId = 0;

export default function GraphViewer() {
  const { graphChart } = useMarkdown();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!graphChart || !svgRef.current) return;
    const id = `viewer-${viewerId++}`;

    const temp = document.createElement("div");
    temp.style.visibility = "hidden";
    temp.style.position = "absolute";
    document.body.appendChild(temp);

    mermaid.render(id, graphChart, temp).then(({ svg }) => {
      if (svgRef.current) svgRef.current.innerHTML = svg;
    }).finally(() => {
      document.body.removeChild(temp);
    });
  }, [graphChart]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.1, Math.min(5, s + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  }, [pos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  function resetView() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  if (!graphChart) {
    navigate("/");
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0,
        background: token.colorBgBase,
        overflow: "hidden",
        cursor: dragging ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{
        position: "absolute", top: 12, right: 12,
        display: "flex", gap: 8, zIndex: 10,
      }}>
        <Button onClick={() => setScale((s) => Math.min(5, s + 0.25))}>+</Button>
        <Button onClick={() => setScale((s) => Math.max(0.1, s - 0.25))}>&minus;</Button>
        <Button onClick={resetView}>Reset</Button>
        <Button onClick={() => navigate(-1)}>Close</Button>
      </div>

      <div style={{
        position: "absolute", bottom: 12, left: 12,
        color: token.colorTextSecondary, fontSize: 12, zIndex: 10,
      }}>
        {Math.round(scale * 100)}%
      </div>

      <div
        ref={svgRef}
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
          transformOrigin: "center center",
          transition: dragging ? "none" : "transform 0.1s ease",
        }}
      />
    </div>
  );
}
