import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useTheme } from "./ThemeContext";
import { useMarkdown } from "./MarkdownContext";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import GraphViewer from "./pages/GraphViewer";

function EscListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (location.pathname === "/menu") navigate(-1);
        else navigate("/menu");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location, navigate]);

  return null;
}

function ContextMenu({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();
  const { filePath, loadFile, setPendingSavePath } = useMarkdown();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen);
  }, []);

  async function handleOpenFile() {
    const selected = await openDialog({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      multiple: false,
    });
    if (selected) {
      await loadFile(selected);
      navigate("/");
    }
  }

  async function handleSavePdf() {
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

  async function handleFullscreen() {
    const next = !isFullscreen;
    await getCurrentWindow().setFullscreen(next);
    setIsFullscreen(next);
  }

  const items: MenuProps["items"] = [
    { key: "open", label: "Open File" },
    { key: "save", label: "Save PDF", disabled: !filePath },
    { type: "divider" },
    { key: "theme", label: mode === "dark" ? "Light Mode" : "Dark Mode" },
    { key: "fullscreen", label: isFullscreen ? "Exit Fullscreen" : "Fullscreen" },
    { type: "divider" },
    { key: "menu", label: "Menu" },
    { key: "exit", label: "Exit", danger: true },
  ];

  const onClick: MenuProps["onClick"] = ({ key }) => {
    switch (key) {
      case "open": handleOpenFile(); break;
      case "save": handleSavePdf(); break;
      case "theme": toggle(); break;
      case "fullscreen": handleFullscreen(); break;
      case "menu": navigate("/menu"); break;
      case "exit": getCurrentWindow().close(); break;
    }
  };

  return (
    <Dropdown menu={{ items, onClick }} trigger={["contextMenu"]}>
      <div style={{ minHeight: "100vh" }}>{children}</div>
    </Dropdown>
  );
}

export default function App() {
  return (
    <>
      <EscListener />
      <ContextMenu>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/graph" element={<GraphViewer />} />
        </Routes>
      </ContextMenu>
    </>
  );
}
