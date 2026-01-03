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

      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
