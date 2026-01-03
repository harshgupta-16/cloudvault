import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import ProfileModal from "./ProfileModal";

export default function TopBar() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();

  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(null);

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
    } catch {}

    const savedAvatar = localStorage.getItem("avatar");
    if (savedAvatar) setAvatar(savedAvatar);
  }, [token]);

  // Hide on auth pages or if not logged in
  const hideOnRoutes = ["/login", "/signup"];
  if (!token || hideOnRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 right-4 flex items-center gap-3 z-40">

        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* PROFILE AVATAR */}
        <button
          onClick={() => setShowProfile(true)}
          className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700 flex items-center justify-center shadow"
        >
          {avatar ? (
            <img
              src={avatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span>👤</span>
          )}
        </button>
      </div>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
      />
    </>
  );
}
