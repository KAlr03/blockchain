import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/auth-context.js";
import { LangProvider } from "./features/lang/lang-context.js";
import { ThemeProvider } from "./features/theme/theme-context.js";
import { router } from "./app/router.js";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </LangProvider>
  </StrictMode>
);
