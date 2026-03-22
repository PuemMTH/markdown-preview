import { useEffect, useCallback } from "react";
import { Button, Spin, Typography, theme, message, Progress, Modal } from "antd";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Markdown from "react-markdown";
import Mermaid from "../components/Mermaid";
import { useMarkdown } from "../MarkdownContext";

async function svgToImg(svg: SVGElement): Promise<HTMLImageElement> {
  const xml = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

async function replaceSvgsWithImages(el: HTMLElement): Promise<() => void> {
  const svgs = Array.from(el.querySelectorAll("svg"));
  const restores: (() => void)[] = [];

  for (const svg of svgs) {
    const img = await svgToImg(svg as SVGElement);
    img.width = svg.clientWidth || parseInt(svg.getAttribute("width") || "800");
    img.height = svg.clientHeight || parseInt(svg.getAttribute("height") || "400");
    img.style.maxWidth = "100%";
    svg.parentElement?.insertBefore(img, svg);
    svg.style.display = "none";
    restores.push(() => {
      img.remove();
      svg.style.display = "";
    });
  }

  return () => restores.forEach((r) => r());
}

async function capturePdf(
  el: HTMLElement,
  savePath: string,
  onProgress: (percent: number, step: string) => void
) {
  onProgress(10, "Rendering page...");
  await new Promise((r) => setTimeout(r, 100));

  onProgress(25, "Converting diagrams...");
  const restoreSvgs = await replaceSvgsWithImages(el);

  onProgress(40, "Capturing screenshot...");
  const canvas = await html2canvas(el, { scale: 2 });
  restoreSvgs();

  onProgress(60, "Generating PDF...");

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const pdf = new jsPDF("p", "mm", "a4");

  // px height of one A4 page in canvas scale
  const pageHeightPx = Math.floor((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM);
  const totalPages = Math.ceil(canvas.height / pageHeightPx);

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();

    const srcY = i * pageHeightPx;
    const srcH = Math.min(pageHeightPx, canvas.height - srcY);

    // Slice canvas into A4 chunk
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPx;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

    const imgData = pageCanvas.toDataURL("image/png");
    const imgHeightMM = (srcH * A4_WIDTH_MM) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_MM, imgHeightMM);

    onProgress(60 + Math.round((i + 1) / totalPages * 20), `Page ${i + 1}/${totalPages}...`);
  }

  onProgress(80, "Writing file...");
  const arrayBuf = pdf.output("arraybuffer");
  const bytes = Array.from(new Uint8Array(arrayBuf));
  await invoke("write_file", { path: savePath, bytes });

  onProgress(100, "Done!");
}

export default function Home() {
  const {
    content, filePath, loading, dragging, loadFile,
    pendingSavePath, setPendingSavePath,
    saveProgress, setSaveProgress,
  } = useMarkdown();
  const { token } = theme.useToken();

  const runSave = useCallback(async (el: HTMLElement, savePath: string) => {
    setSaveProgress({ percent: 0, step: "Starting..." });
    try {
      await capturePdf(el, savePath, (percent, step) => {
        setSaveProgress({ percent, step });
      });
      message.success("PDF saved");
    } catch {
      message.error("Failed to save PDF");
    }
    setPendingSavePath(null);
    setTimeout(() => setSaveProgress(null), 800);
  }, [setSaveProgress, setPendingSavePath]);

  const mainRefCallback = useCallback((node: HTMLElement | null) => {
    if (!node || !pendingSavePath) return;
    setTimeout(() => runSave(node, pendingSavePath), 300);
  }, [pendingSavePath, runSave]);

  useEffect(() => {
    if (!pendingSavePath) return;
    const el = document.getElementById("md-content");
    if (!el) return;
    runSave(el, pendingSavePath);
  }, [pendingSavePath, runSave]);

  async function openFile() {
    const selected = await open({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      multiple: false,
    });
    if (selected) await loadFile(selected);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!filePath) {
    return (
      <main
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          minHeight: "100vh", padding: "2rem",
          color: token.colorTextSecondary,
        }}
      >
        <div
          style={{
            border: `2px dashed ${dragging ? token.colorPrimary : token.colorBorder}`,
            borderRadius: 12, padding: "3rem 2rem",
            textAlign: "center", width: "100%", maxWidth: 400,
            background: dragging ? token.colorPrimaryBg : "transparent",
            transition: "all 0.2s",
          }}
        >
          <Typography.Title level={4} style={{ color: token.colorText }}>
            Drop .md file here
          </Typography.Title>
          <Typography.Text>or</Typography.Text>
          <br /><br />
          <Button type="primary" size="large" onClick={openFile}>
            Open File
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <Modal
        open={!!saveProgress}
        footer={null}
        closable={false}
        centered
        width={320}
      >
        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <Typography.Text>{saveProgress?.step}</Typography.Text>
          <Progress
            percent={saveProgress?.percent ?? 0}
            status={saveProgress?.percent === 100 ? "success" : "active"}
            style={{ marginTop: "1rem" }}
          />
        </div>
      </Modal>

      <main
        id="md-content"
        ref={mainRefCallback}
        style={{ padding: "2rem", maxWidth: 800, margin: "0 auto", color: token.colorText }}
      >
        <Markdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-mermaid/.exec(className || "");
              if (match) {
                return <Mermaid chart={String(children).trim()} />;
              }
              return <code className={className} {...props}>{children}</code>;
            },
          }}
        >
          {content ?? ""}
        </Markdown>
      </main>
    </>
  );
}
