import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "@fontsource/ibm-plex-sans/latin-300.css"
import "@fontsource/ibm-plex-sans/latin-400.css"
import "@fontsource/ibm-plex-sans/latin-500.css"
import "@fontsource/ibm-plex-sans/latin-600.css"
import "@fontsource/ibm-plex-sans/latin-700.css"
import "@fontsource/ibm-plex-sans/cyrillic-300.css"
import "@fontsource/ibm-plex-sans/cyrillic-400.css"
import "@fontsource/ibm-plex-sans/cyrillic-500.css"
import "@fontsource/ibm-plex-sans/cyrillic-600.css"
import "@fontsource/ibm-plex-sans/cyrillic-700.css"
import "@fontsource/jetbrains-mono/latin-400.css"
import "@fontsource/jetbrains-mono/latin-500.css"
import "@fontsource/jetbrains-mono/cyrillic-400.css"
import "@fontsource/jetbrains-mono/cyrillic-500.css"
import "./index.css"
import App from "./App"
import { LoginPage } from "./features/auth/LoginPage"
import { RootLayout } from "./layouts/root-layout"

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<App />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
