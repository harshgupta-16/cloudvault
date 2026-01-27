import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { openDB, getAllNotesLocal, saveNotesBulk } from "../utils/indexedDB";
import { saveSingleNote } from "../utils/indexedDB";
import { deleteLocalNote } from "../utils/indexedDB";



export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const editorRef = useRef(null);
  const contentRef = useRef(""); // Track content without causing re-renders
  const touchStartX = useRef(0); // For swipe gesture tracking

  const [userEmail, setUserEmail] = useState("");

  // NOTES STATE
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [titleError, setTitleError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Note ID to delete

  // Formatting state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  // Check current formatting state
  const checkFormatting = () => {
    setIsBold(document.queryCommandState("bold"));
    setIsItalic(document.queryCommandState("italic"));
  };

  // Set initial editor content when activeNote changes
  useEffect(() => {
    if (activeNote && editorRef.current) {
      editorRef.current.innerHTML = activeNote.content || "";
      contentRef.current = activeNote.content || "";
    }
  }, [activeNote?._id]); // Only run when switching notes, not on every content change

  // Update TopBar visibility based on editing state
  useEffect(() => {
    localStorage.setItem("isEditingNote", activeNote ? "true" : "false");
    window.dispatchEvent(new Event("editingStateChanged"));

    // Cleanup on unmount
    return () => {
      localStorage.setItem("isEditingNote", "false");
      window.dispatchEvent(new Event("editingStateChanged"));
    };
  }, [activeNote]);

  // Rich text formatting function
  const formatText = (type) => {
    if (type === "bold") {
      document.execCommand("bold", false, null);
    } else if (type === "italic") {
      document.execCommand("italic", false, null);
    } else if (type === "bullet") {
      document.execCommand("insertText", false, "• ");
    } else if (type === "indent") {
      document.execCommand("insertText", false, "     "); // 5 spaces
    } else if (type === "size-small") {
      document.execCommand("fontSize", false, "2");
      setShowSizeMenu(false);
    } else if (type === "size-medium") {
      document.execCommand("fontSize", false, "4");
      setShowSizeMenu(false);
    } else if (type === "size-large") {
      document.execCommand("fontSize", false, "6");
      setShowSizeMenu(false);
    } else if (type === "color-default") {
      // Use theme-aware default color
      const isDark = document.documentElement.classList.contains("dark");
      document.execCommand("foreColor", false, isDark ? "#ffffff" : "#1e293b");
      setShowColorMenu(false);
    } else if (type.startsWith("color-")) {
      const color = type.replace("color-", "");
      document.execCommand("foreColor", false, color);
      setShowColorMenu(false);
    } else if (type.startsWith("highlight-")) {
      const selection = window.getSelection();
      // Only apply highlight if there's actually selected text
      if (!selection || selection.isCollapsed) {
        setShowHighlightMenu(false);
        return;
      }

      const color = type.replace("highlight-", "");
      document.execCommand("hiliteColor", false, color);
      // Set text color to black for readability on colored background
      if (color !== "transparent") {
        document.execCommand("foreColor", false, "#1e293b");
      }
      // Collapse selection and insert a zero-width space with no formatting
      selection.collapseToEnd();
      // Insert zero-width space to break formatting chain
      document.execCommand("insertHTML", false, '<span style="background:transparent;color:inherit">&#8203;</span>');
      setShowHighlightMenu(false);
    } else if (type === "undo") {
      document.execCommand("undo", false, null);
    } else if (type === "redo") {
      document.execCommand("redo", false, null);
    }
    // Update content ref after formatting
    if (editorRef.current) {
      contentRef.current = editorRef.current.innerHTML;
      editorRef.current.focus();
    }
    checkFormatting();
  };

  // Handle content change - only update ref, not state
  const handleContentChange = () => {
    if (editorRef.current) {
      contentRef.current = editorRef.current.innerHTML;
    }
  };

  // Handle selection change to update formatting buttons
  const handleSelectionChange = () => {
    checkFormatting();
  };

  // Get current content for saving
  const getCurrentContent = () => {
    return editorRef.current ? editorRef.current.innerHTML : contentRef.current;
  };

  // Strip HTML tags for preview display (preserving line breaks)
  const stripHtml = (html) => {
    if (!html) return "";
    // Replace block elements and br with newlines before stripping
    let text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/p>/gi, "\n");
    const doc = new DOMParser().parseFromString(text, "text/html");
    return doc.body.textContent || "";
  };

  // FILES STATE
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(true);

  /* ================= AUTH ================= */

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const expiryTime = payload.exp ? payload.exp * 1000 : payload.iat * 1000 + 7 * 24 * 60 * 60 * 1000; // 7 days

      if (Date.now() >= expiryTime) {
        // Token expired, logout and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("avatar");
        localStorage.removeItem("isEditingNote");
        navigate("/login");
        return;
      }

      setUserEmail(payload.email);
    } catch {
      // Invalid token, logout
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    // Prevent browser back button from going to login page
    window.history.replaceState(null, "", "/dashboard");
    window.history.pushState(null, "", "/dashboard");

    const handlePopState = () => {
      // Keep user on dashboard when they press back
      window.history.pushState(null, "", "/dashboard");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  /* ================= NOTES ================= */

const loadNotes = async () => {
  setLoadingNotes(true);

  // Ensure DB exists and load from IndexedDB first
  try {
    await openDB();
  } catch (err) {
    console.error("Failed to open IndexedDB:", err);
  }
  // determine current user id from token to scope local notes
  let currentUserId = null;
  try {
    const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
    currentUserId = payload?.id || payload?._id || null;
  } catch (e) {
    currentUserId = null;
  }

  const localNotes = await getAllNotesLocal().catch(err => {
    console.error("Error reading local notes:", err);
    return [];
  });

  // Filter local notes to only show notes that belong to the current user
  const scopedLocal = (localNotes || []).filter(n => {
    if (!n) return false;
    // offline notes should include userId (added when created)
    if (currentUserId && (n.userId === currentUserId || String(n.userId) === String(currentUserId))) return true;
    return false;
  });

  if (scopedLocal && scopedLocal.length) {
    setNotes(scopedLocal);
  }

  // Try backend sync
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/notes`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    // Filter fetched notes by current user id as a safety check in case a cached response slipped through
    const scopedData = (data || []).filter(n => {
      if (!n) return false;
      if (currentUserId && (n.userId === currentUserId || String(n.userId) === String(currentUserId))) return true;
      return false;
    });
    setNotes(scopedData);
    await saveNotesBulk(data);
  } catch (err) {
    console.log("Offline: using local notes");
  }

  setLoadingNotes(false);
  // Attempt to sync any offline notes now that we've loaded local DB
  if (navigator.onLine) {
    try {
      await syncOfflineNotes();
    } catch (e) {
      console.error("Error syncing offline notes after load:", e);
    }
  }
};



  useEffect(() => {
    loadNotes();
  }, []);

  // Sync offline notes when back online
  const syncOfflineNotes = async () => {
    if (!navigator.onLine) return;

    let localNotes = [];
    try {
      localNotes = await getAllNotesLocal();
    } catch (e) {
      console.error("Failed to read local notes for sync:", e);
      return;
    }

    const offlineNotes = (localNotes || []).filter(n => n && n._offline);
    if (!offlineNotes.length) return;

    for (const n of offlineNotes) {
      try {
        // If the note has a real server id (not our local- prefix), treat as update
        if (n._id && !String(n._id).startsWith("local-")) {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/notes/${n._id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ title: n.title, content: n.content, isLocked: n.isLocked || false }),
          });

          if (!res.ok) throw new Error("Failed to sync updated note");
          const saved = await res.json();

          // Replace local copy with server copy
          await deleteLocalNote(n._id);
          await saveSingleNote(saved);
          setNotes(prev => prev.map(p => (p._id === n._id ? saved : p)));
          toast.success(`Synced note "${saved.title || 'Untitled'}"`);
        } else {
          // Local-created note: POST to server
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ title: n.title, content: n.content, isLocked: n.isLocked || false }),
          });

          if (!res.ok) throw new Error("Failed to sync new note");
          const saved = await res.json();

          // Remove local placeholder and save server note
          await deleteLocalNote(n._id);
          await saveSingleNote(saved);
          setNotes(prev => prev.map(p => (p._id === n._id ? saved : p)));
          toast.success(`Synced note "${saved.title || 'Untitled'}"`);
        }
      } catch (err) {
        console.error("Failed to sync offline note:", n, err);
      }
    }
  };

  useEffect(() => {
    const onOnline = () => {
      syncOfflineNotes().catch(e => console.error(e));
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const saveNote = async () => {
    if (!activeNote.title.trim()) {
      setTitleError("This field is required");
      return;
    }

    try {
        // If offline, save locally immediately and skip network
        if (!navigator.onLine) {
          // Preserve `_id` for existing server-backed notes so sync does an update (PUT).
          const isEditingExisting = !!activeNote._id && !String(activeNote._id).startsWith("local-");
          const offlineId = isEditingExisting ? activeNote._id : `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const offlineNote = {
            _id: offlineId,
            title: activeNote.title,
            content: getCurrentContent(),
            userId: (token ? JSON.parse(atob(token.split(".")[1]))?.id : null),
            isLocked: activeNote.isLocked || false,
            _offline: true,
            updatedAt: new Date().toISOString(),
          };

          await saveSingleNote(offlineNote);

          setNotes(prev => {
            const filtered = prev.filter(n => n._id !== offlineNote._id);
            return [offlineNote, ...filtered];
          });

          setTitleError("");
          setActiveNote(null);
          toast.success("Saved locally (offline)");
          return;
        }

        let res;

        if (activeNote._id) {
          // UPDATE
          res = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/notes/${activeNote._id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
              },
              body: JSON.stringify({
                title: activeNote.title,
                content: getCurrentContent(),
                isLocked: activeNote.isLocked || false,
              }),
            }
          );
        } else {
          // CREATE
          res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
              title: activeNote.title,
              content: getCurrentContent(),
              isLocked: activeNote.isLocked || false,
            }),
          });
        }

        const savedNote = await res.json();

        // Save locally
        await saveSingleNote(savedNote);

        // Update UI instantly
        setNotes(prev => {
          const filtered = prev.filter(n => n._id !== savedNote._id);
          return [savedNote, ...filtered];
        });

        setTitleError("");
        setActiveNote(null);
        toast.success("Note saved");

    } catch (err) {
      toast.error("Error saving note");
      console.error(err);
    }
  };

  // Delete a note - show confirmation modal
  const deleteNote = (noteId, e) => {
    e.stopPropagation(); // Prevent opening the note when clicking delete
    setDeleteConfirm(noteId);
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/notes/${deleteConfirm}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) throw new Error("Delete failed");

await deleteLocalNote(deleteConfirm);

setNotes(prev => prev.filter(n => n._id !== deleteConfirm));

toast.success("Note deleted");

    } catch (err) {
      toast.error("Error deleting note");
      console.error(err);
    }
    setDeleteConfirm(null);
  };

  // Auto-save and go back (for swipe gesture)
  const autoSaveAndGoBack = async () => {
    if (!activeNote) return;

    const currentContent = getCurrentContent();
    const hasTitle = activeNote.title && activeNote.title.trim();
    const hasContent = currentContent && currentContent.trim();

    // Only auto-save if there's content to save
    if (hasTitle || hasContent) {
      try {
        const titleToSave = activeNote.title?.trim() || "Untitled Note";

        if (activeNote._id) {
          // UPDATE existing note
          await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/notes/${activeNote._id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
              },
              body: JSON.stringify({
                title: titleToSave,
                content: currentContent,
                isLocked: activeNote.isLocked || false,
              }),
            }
          );
        } else if (hasContent) {
          // CREATE new note only if has content
          await fetch(`${import.meta.env.VITE_BACKEND_URL}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
              title: titleToSave,
              content: currentContent,
              isLocked: activeNote.isLocked || false,
            }),
          });
        }

        toast.success("Note auto-saved");
        await loadNotes();
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }

    setActiveNote(null);
    setTitleError("");
  };

  // Swipe gesture handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX.current;

    // If swiped right more than 100px, go back with auto-save
    if (swipeDistance > 100) {
      autoSaveAndGoBack();
    }
  };

  /* ================= FILES ================= */

  const loadFiles = async () => {
    setLoadingFiles(true);
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/files`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    setFiles(data);
    setLoadingFiles(false);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    });

    toast.success("File uploaded");
    setSelectedFile(null);
    loadFiles();
  };

  const handleDownload = async (id) => {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/download/${id}`,
      {
        headers: { Authorization: "Bearer " + token },
      }
    );
    const data = await res.json();
    window.open(data.url, "_blank");
  };

  const handleDeleteFile = async (id) => {
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/download/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    toast.success("File deleted");
    loadFiles();
  };

  const getFileIcon = (key) => {
    if (key.match(/\.(jpg|jpeg|png)$/i)) return "🖼️";
    if (key.match(/\.(pdf)$/i)) return "📕";
    if (key.match(/\.(zip)$/i)) return "🗜️";
    if (key.match(/\.(doc|docx)$/i)) return "📝";
    return "📄";
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "—";

    const date = new Date(isoString);
    if (isNaN(date)) return "—";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  /* ================= UI ================= */

  return (
    <div className="dashboard-container min-h-screen w-full">
      {/* Global CloudVault Logo - only show on dashboard, not during note editing */}
      {!activeNote && (
        <div className="absolute top-4 left-4  cloudvault-header">
          <h1 className="cloudvault-logo inline-flex items-center gap-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            CloudVault
          </h1>
        </div>
      )}
      {/* Animated Grid Background */}
      <div className="cyber-grid"></div>

      {/* Floating Particles - fewer for performance */}
      <div className="particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      {/* Glowing Orbs */}
      <div className="glow-orb glow-orb-1"></div>
      <div className="glow-orb glow-orb-2"></div>

      {/* ========== NOTE EDITOR MODE ========== */}
      {activeNote ? (
        <div
          className="relative z-10 p-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="max-w-4xl mx-auto">
            {/* Top bar with Back and Undo/Redo */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={autoSaveAndGoBack}
                className="dashboard-btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => formatText("undo")}
                  className="dashboard-btn-secondary flex items-center gap-1"
                  title="Undo"
                >
                  <span>↩</span> Undo
                </button>
                <button
                  type="button"
                  onClick={() => formatText("redo")}
                  className="dashboard-btn-secondary flex items-center gap-1"
                  title="Redo"
                >
                  <span>↪</span> Redo
                </button>
              </div>
            </div>

            <input
              value={activeNote.title}
              onChange={(e) => {
                if (activeNote?.isLocked) return;
                setActiveNote({ ...activeNote, title: e.target.value });
                if (e.target.value.trim()) setTitleError("");
              }}
              placeholder="Title"
              disabled={activeNote?.isLocked}
              className={`w-full text-2xl font-semibold bg-transparent border-b-2 mb-1 pb-2 outline-none transition-colors ${titleError
                ? "border-red-500"
                : "border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-500"
                } text-slate-800 dark:text-white ${activeNote?.isLocked ? "opacity-70 cursor-not-allowed" : ""}`}
            />

            {titleError && (
              <p className="text-red-500 text-sm mb-3">{titleError}</p>
            )}

            {/* Text Editor with Formatting Toolbar */}
            <div className="relative mt-4">
              {/* Formatting Toolbar - Top Right */}
              <div className="absolute top-[-45px] right-2 z-10 flex gap-1">
                <button
                  type="button"
                  onClick={() => formatText("bold")}
                  className={`format-btn ${isBold ? "format-btn-active" : ""}`}
                  title="Bold"
                >
                  <span className="font-bold">B</span>
                </button>
                <button
                  type="button"
                  onClick={() => formatText("italic")}
                  className={`format-btn ${isItalic ? "format-btn-active" : ""}`}
                  title="Italic"
                >
                  <span className="italic">I</span>
                </button>
                <button
                  type="button"
                  onClick={() => formatText("bullet")}
                  className="format-btn"
                  title="Bullet Point"
                >
                  <span className="text-2xl">•</span>
                </button>
                <button
                  type="button"
                  onClick={() => formatText("indent")}
                  className="format-btn"
                  title="Indent (5 spaces)"
                >
                  <span>⇥</span>
                </button>
                {/* Highlight Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowHighlightMenu(!showHighlightMenu)}
                    className="format-btn"
                    title="Highlight"
                  >
                    <span className="text-yellow-400">🖍</span>
                  </button>
                  {showHighlightMenu && (
                    <div className="color-dropdown">
                      <button type="button" onClick={() => formatText("highlight-#fef08a")} className="color-swatch" style={{ background: "#fef08a" }} title="Yellow" />
                      <button type="button" onClick={() => formatText("highlight-#bbf7d0")} className="color-swatch" style={{ background: "#bbf7d0" }} title="Green" />
                      <button type="button" onClick={() => formatText("highlight-#bfdbfe")} className="color-swatch" style={{ background: "#bfdbfe" }} title="Blue" />
                      <button type="button" onClick={() => formatText("highlight-#fbcfe8")} className="color-swatch" style={{ background: "#fbcfe8" }} title="Pink" />
                      <button type="button" onClick={() => formatText("highlight-#fed7aa")} className="color-swatch" style={{ background: "#fed7aa" }} title="Orange" />
                      <button type="button" onClick={() => formatText("highlight-transparent")} className="color-swatch color-swatch-default" title="Clear" />
                    </div>
                  )}
                </div>
                {/* Text Size Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSizeMenu(!showSizeMenu)}
                    className="format-btn"
                    title="Text Size"
                  >
                    <span className="text-xs">A</span>
                    <span className="text-sm font-bold">A</span>
                  </button>
                  {showSizeMenu && (
                    <div className="size-dropdown">
                      <button
                        type="button"
                        onClick={() => formatText("size-small")}
                        className="size-option text-xs"
                      >
                        Small
                      </button>
                      <button
                        type="button"
                        onClick={() => formatText("size-medium")}
                        className="size-option text-sm"
                      >
                        Medium
                      </button>
                      <button
                        type="button"
                        onClick={() => formatText("size-large")}
                        className="size-option text-lg"
                      >
                        Large
                      </button>
                    </div>
                  )}
                </div>
                {/* Color Picker Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorMenu(!showColorMenu)}
                    className="format-btn"
                    title="Text Color"
                  >
                    <span className="color-icon">A</span>
                  </button>
                  {showColorMenu && (
                    <div className="color-dropdown">
                      <button type="button" onClick={() => formatText("color-#ef4444")} className="color-swatch" style={{ background: "#ef4444" }} title="Red" />
                      <button type="button" onClick={() => formatText("color-#f97316")} className="color-swatch" style={{ background: "#f97316" }} title="Orange" />
                      <button type="button" onClick={() => formatText("color-#eab308")} className="color-swatch" style={{ background: "#eab308" }} title="Yellow" />
                      <button type="button" onClick={() => formatText("color-#22c55e")} className="color-swatch" style={{ background: "#22c55e" }} title="Green" />
                      <button type="button" onClick={() => formatText("color-#3b82f6")} className="color-swatch" style={{ background: "#3b82f6" }} title="Blue" />
                      <button type="button" onClick={() => formatText("color-#8b5cf6")} className="color-swatch" style={{ background: "#8b5cf6" }} title="Purple" />
                      <button type="button" onClick={() => formatText("color-#ec4899")} className="color-swatch" style={{ background: "#ec4899" }} title="Pink" />
                      <button type="button" onClick={() => formatText("color-default")} className="color-swatch color-swatch-default" title="Default" />
                    </div>
                  )}
                </div>
              </div>

              <div
                ref={editorRef}
                contentEditable={!activeNote?.isLocked}
                onInput={handleContentChange}
                onSelect={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                onMouseUp={handleSelectionChange}
                onClick={() => {
                  setShowSizeMenu(false);
                  setShowColorMenu(false);
                  setShowHighlightMenu(false);
                }}
                className={`dashboard-input rich-editor w-full h-[65vh] overflow-y-auto mt-12 pt-14 ${activeNote?.isLocked ? "opacity-70 cursor-not-allowed" : ""}`}
                data-placeholder="Start writing..."
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setActiveNote({ ...activeNote, isLocked: !activeNote?.isLocked })}
                className={`dashboard-btn-secondary flex items-center gap-2 ${activeNote?.isLocked ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : ""}`}
                title={activeNote?.isLocked ? "Unlock note" : "Lock note"}
              >
                {activeNote?.isLocked ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Locked
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Lock
                  </>
                )}
              </button>
              <button onClick={saveNote} className="dashboard-btn">
                Save Note
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========== GRID MODE ========== */
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 pt-20">
          {/* NOTES SECTION */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-title flex items-center gap-2">
                <svg className="w-5 h-5 dark:text-white " fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                My Notes
              </h2>
            </div>

            {loadingNotes ? (
              <div className="glass-card p-8 text-center">
                <div className="btn-spinner mx-auto mb-2"></div>
                <p className="text-slate-500 dark:text-slate-400">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-slate-500 dark:text-slate-400">No notes yet. Create your first note!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    onClick={() => setActiveNote(note)}
                    className="note-card relative group"
                  >
                    {/* Delete button - always visible */}
                    <button
                      onClick={(e) => deleteNote(note._id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                      title="Delete note"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <div className="flex justify-between items-start gap-2 pr-8">
                      <h3 className="font-semibold truncate max-w-[70%] text-slate-800 dark:text-white">
                        {note.title}
                      </h3>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDateTime(note.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap line-clamp-3">
                      {stripHtml(note.content) || "No content"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FILES SECTION */}
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Cloud Files
            </h3>

            {loadingFiles && (
              <div className="text-center py-4">
                <div className="btn-spinner mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading files...</p>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="flex-1 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 file:cursor-pointer file:transition hover:file:bg-indigo-200 dark:hover:file:bg-indigo-800/50"
              />
              <button
                onClick={handleFileUpload}
                className="dashboard-btn-success"
              >
                Upload
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {files.length === 0 && !loadingFiles && (
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">
                  No files uploaded yet
                </p>
              )}

              {files.map((file) => (
                <div key={file._id} className="file-item flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getFileIcon(file.key)}</span>
                    <span className="text-sm truncate max-w-[200px] text-slate-700 dark:text-slate-300">
                      {file.key.split("/").pop()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(file._id)}
                      className="dashboard-btn-secondary text-xs"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file._id)}
                      className="dashboard-btn-danger text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - New Note */}
      {!activeNote && (
        <button
          onClick={() => setActiveNote({ title: "", content: "" })}
          className="fab-btn"
          title="New Note"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="modal-glass relative z-10 p-6 max-w-sm w-full text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Delete Note?
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="dashboard-btn-secondary px-6"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
