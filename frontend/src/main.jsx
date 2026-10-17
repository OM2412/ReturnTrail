import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MotionConfig } from "motion/react";
import WorkspaceRoot from "./app/WorkspaceRoot";
import { AuthProvider } from "./app/AuthContext";
import "./styles/theme.css";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <WorkspaceRoot />
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
