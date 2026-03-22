import { createContext, useContext, useState } from "react";
import { ConfigProvider, theme } from "antd";

type ThemeMode = "light" | "dark";

const ThemeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
}>({ mode: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  return (
    <ThemeContext.Provider value={{ mode, toggle: () => setMode(m => m === "light" ? "dark" : "light") }}>
      <ConfigProvider theme={{ algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
        <ThemedRoot>{children}</ThemedRoot>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  return (
    <div style={{ minHeight: "100vh", background: token.colorBgBase, color: token.colorText }}>
      {children}
    </div>
  );
}
