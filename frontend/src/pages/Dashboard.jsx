import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const editorRef = useRef(null);
  const contentRef = useRef(""); // Track content without causing re-renders

  const [userEmail, setUserEmail] = useState("");

  // NOTES STATE
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [titleError, setTitleError] = useState("");

  // Formatting state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

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

  // Rich text formatting function
  const formatText = (type) => {
    if (type === "bold") {
      document.execCommand("bold", false, null);
    } else if (type === "italic") {
      document.execCommand("italic", false, null);
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
    const payload = JSON.parse(atob(token.split(".")[1]));
    setUserEmail(payload.email);
  }, []);

  /* ================= NOTES ================= */

  const loadNotes = async () => {
    setLoadingNotes(true);
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/notes`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    setNotes(data);
    setLoadingNotes(false);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const saveNote = async () => {
    if (!activeNote.title.trim()) {
      setTitleError("This field is required");
      return;
    }

    try {
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
          }),
        });
      }

      if (!res.ok) throw new Error("Save failed");

      setTitleError("");
      await loadNotes();
      setActiveNote(null);
      toast.success("Note saved");
    } catch (err) {
      toast.error("Error saving note");
      console.error(err);
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
        <div className="relative z-10 p-6">
          <div className="glass-card p-6 max-w-4xl mx-auto">
            <button
              onClick={() => {
                setActiveNote(null);
                setTitleError("");
              }}
              className="dashboard-btn-secondary mb-4 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>

            <input
              value={activeNote.title}
              onChange={(e) => {
                setActiveNote({ ...activeNote, title: e.target.value });
                if (e.target.value.trim()) setTitleError("");
              }}
              placeholder="Title"
              className={`w-full text-2xl font-semibold bg-transparent border-b-2 mb-1 pb-2 outline-none transition-colors ${titleError
                ? "border-red-500"
                : "border-indigo-200 dark:border-indigo-500/30 focus:border-indigo-500"
                } text-slate-800 dark:text-white`}
            />

            {titleError && (
              <p className="text-red-500 text-sm mb-3">{titleError}</p>
            )}

            {/* Text Editor with Formatting Toolbar */}
            <div className="relative mt-4">
              {/* Formatting Toolbar - Top Right */}
              <div className="absolute top-2 right-2 z-10 flex gap-1">
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
              </div>

              <div
                ref={editorRef}
                contentEditable
                onInput={handleContentChange}
                onSelect={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                onMouseUp={handleSelectionChange}
                className="dashboard-input rich-editor w-full h-[60vh] overflow-y-auto pt-12"
                data-placeholder="Start writing..."
              />
            </div>

            <div className="flex justify-end mt-4">
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="note-card"
                  >
                    <div className="flex justify-between items-start gap-2">
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
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </div>
  );
}
