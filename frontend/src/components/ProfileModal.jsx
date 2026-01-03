import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileModal({ isOpen, onClose, user, setAvatar, avatar }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    // 🔥 Update Topbar immediately
    setAvatar(imageUrl);

    // Persist for reload
    localStorage.setItem("avatar", imageUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* MODAL */}
      <div className="relative w-[90%] max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        {/* PROFILE IMAGE */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-700 flex items-center justify-center mb-3">
            {avatar ? (
  <img
    src={avatar}
    alt="Profile"
    className="w-full h-full object-cover"
  />
) : (
  <span className="text-4xl">👤</span>
)}

          </div>

          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current.click()}
            className="text-sm text-blue-600 dark:text-white hover:underline mb-4"
          >
            Change photo
          </button>

          {/* USER INFO */}
          <h2 className="text-lg text-black dark:text-white font-semibold">
            {user?.name || "User"}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.email}
          </p>
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
