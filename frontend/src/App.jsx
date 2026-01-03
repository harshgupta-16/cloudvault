import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import TopBar from "./components/Topbar";


export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: '#f1f5f9',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.2), 0 10px 40px rgba(0, 0, 0, 0.3)',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: '#0f172a',
            },
            style: {
              border: '1px solid rgba(52, 211, 153, 0.4)',
              boxShadow: '0 0 30px rgba(52, 211, 153, 0.2), 0 10px 40px rgba(0, 0, 0, 0.3)',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#0f172a',
            },
            style: {
              border: '1px solid rgba(248, 113, 113, 0.4)',
              boxShadow: '0 0 30px rgba(248, 113, 113, 0.2), 0 10px 40px rgba(0, 0, 0, 0.3)',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}
