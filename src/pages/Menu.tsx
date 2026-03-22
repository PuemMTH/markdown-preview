import { useState, useEffect } from "react";
import { Button, theme } from "antd";
import { useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useTheme } from "../ThemeContext";
import { useMarkdown } from "../MarkdownContext";

export default function Menu() {
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();
  const { filePath, setPendingSavePath } = useMarkdown();
  const { token } = theme.useToken();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen);
  }, []);

  async function toggleFullscreen() {
    const next = !isFullscreen;
    await getCurrentWindow().setFullscreen(next);
    setIsFullscreen(next);
  }

  async function savePdf() {
    if (!filePath) return;

    const fileName = filePath.replace(/\.md$/, ".pdf").split("/").pop() || "output.pdf";
    const folder = await openDialog({
      directory: true,
      title: "Select folder to save PDF",
    });

    if (!folder) return;

    setPendingSavePath(`${folder}/${fileName}`);
    navigate("/");
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: token.colorBgElevated,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "1rem"
    }}>
      <Button block size="large" onClick={toggle} style={{ width: 200 }}>
        {mode === "dark" ? "Light Mode" : "Dark Mode"}
      </Button>
      <Button block size="large" onClick={toggleFullscreen} style={{ width: 200 }}>
        {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </Button>
      <Button block size="large" onClick={savePdf} disabled={!filePath} style={{ width: 200 }}>
        Save PDF
      </Button>
      <Button block danger size="large" onClick={() => getCurrentWindow().close()} style={{ width: 200 }}>Exit</Button>
      <Button block size="large" onClick={() => navigate(-1)} style={{ width: 200 }}>Cancel</Button>
    </div>
  );
}
