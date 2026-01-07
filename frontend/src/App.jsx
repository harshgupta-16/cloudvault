import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import TopBar from "./components/Topbar";
import { useEffect } from "react";
import { enablePersistence } from "./utils/persistentStorage";
import { usePWAUpdate } from "./hooks/usePWAUpdate";
import PWAUpdateBanner from "./components/PWAUpdateBanner";


export default function App() {

  const { updateAvailable, refreshApp } = usePWAUpdate();

  return (
    <ThemeProvider>
      <BrowserRouter>

        {updateAvailable && (
          <PWAUpdateBanner onRefresh={refreshApp} />
        )}

        <TopBar />

        <Routes>
          {/* Default page → Login */}
          <Route path="/" element={<Login />} />

          {/* Explicit auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top"
        toastOptions={{
          className: "futuristic-toast",
          duration: 4000,
          style: {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: 'var(--toast-icon-bg)',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: 'var(--toast-icon-bg)',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}
