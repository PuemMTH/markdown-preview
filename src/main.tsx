import "antd/dist/reset.css";
import "./App.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import { MarkdownProvider } from "./MarkdownContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MarkdownProvider>
          <App />
        </MarkdownProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
