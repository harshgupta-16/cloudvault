import { useRef } from "react";
import { clearAllNotes } from "../utils/indexedDB";
import { useNavigate } from "react-router-dom";

export default function ProfileModal({ isOpen, onClose, user, setAvatar, avatar }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleLogout = () => {
    // Clear local IndexedDB notes to avoid leaking other users' data on this device
    clearAllNotes().catch(() => {});
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

    // Update Topbar immediately
    setAvatar(imageUrl);

    // Persist for reload
    localStorage.setItem("avatar", imageUrl);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div className="modal-backdrop absolute inset-0" onClick={onClose} />

      {/* MODAL */}
      <div className="modal-glass relative w-[90%] max-w-sm p-6 animate-fadeIn">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* PROFILE IMAGE */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-3 ring-4 ring-indigo-500/20">
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
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
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4 font-medium"
          >
            Change photo
          </button>

          {/* USER INFO */}
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {user?.name || "User"}
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            {user?.email}
          </p>

          {/* Security Badge */}
          <div className="security-badge mt-2 mb-4">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>Account secured</span>
          </div>
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="dashboard-btn-danger w-full py-2.5 mt-2"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </span>
        </button>
      </div>
    </div>
  );
}
