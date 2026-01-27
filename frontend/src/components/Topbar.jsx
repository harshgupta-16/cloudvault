import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import ProfileModal from "./ProfileModal";

export default function TopBar() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();

  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem("avatar");
  });

  const token = localStorage.getItem("token");

  // Load user + avatar
  useEffect(() => {
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({
        name: payload.name || "User",
        email: payload.email,
      });
    } catch { }
  }, [token]);

  // Listen for editing state changes
  useEffect(() => {
    const checkEditing = () => {
      setIsEditing(localStorage.getItem("isEditingNote") === "true");
    };

    checkEditing();
    window.addEventListener("storage", checkEditing);

    // Also listen for custom event for same-tab updates
    const handleEditingChange = () => checkEditing();
    window.addEventListener("editingStateChanged", handleEditingChange);

    return () => {
      window.removeEventListener("storage", checkEditing);
      window.removeEventListener("editingStateChanged", handleEditingChange);
    };
  }, []);

  // Hide on auth pages, if not logged in, or if editing a note
  const hideOnRoutes = ["/login", "/signup", "/"];
  if (!token || hideOnRoutes.includes(location.pathname) || isEditing) {
    return null;
  }

  return (
    <>
      <div className="absolute top-4 right-4 flex items-center gap-3 z-40">
        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className="topbar-btn"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* PROFILE AVATAR */}
        <button
          onClick={() => setShowProfile(true)}
          className="topbar-btn overflow-hidden p-0"
          title="Profile"
        >
          {avatar ? (
            <img
              src={avatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </button>
      </div>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        avatar={avatar}
        setAvatar={setAvatar}
      />
    </>
  );
}
