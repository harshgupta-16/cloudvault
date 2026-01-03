import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [userEmail, setUserEmail] = useState("");

  // NOTES STATE
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [titleError, setTitleError] = useState("");

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
              content: activeNote.content,
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
            content: activeNote.content,
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
    <div className="min-h-screen w-full absolute bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* ========== NOTE EDITOR MODE ========== */}
      {activeNote ? (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl p-6">
          <button
            onClick={() => {
              setActiveNote(null);
              setTitleError("");
            }}
            className="mb-4 text-white"
          >
            ← Back
          </button>

          <input
            value={activeNote.title}
            onChange={(e) => {
              setActiveNote({ ...activeNote, title: e.target.value });
              if (e.target.value.trim()) setTitleError("");
            }}
            placeholder="Title"
            className={`w-full text-2xl font-semibold outline-none bg-transparent border-b-2 mb-1 ${
              titleError
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />

          {titleError && (
            <p className="text-red-500 text-sm mb-3">{titleError}</p>
          )}

          <textarea
            value={activeNote.content}
            onChange={(e) =>
              setActiveNote({ ...activeNote, content: e.target.value })
            }
            placeholder="Start writing..."
            className="w-full h-[70vh] resize-none outline-none border rounded-lg p-4 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
          />

          <div className="flex justify-end mt-4">
            <button
              onClick={saveNote}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        /* ========== GRID MODE ========== */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-4 my-6">
          {/* NOTES GRID */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">My Notes</h2>
              <button
                onClick={() => setActiveNote({ title: "", content: "" })}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg absolute bottom-6 right-6"
              >
                New Note
              </button>
            </div>

            {loadingNotes ? (
              <p className="text-gray-500">Loading notes...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {notes.map((note) => (
                  <div
                    key={note._id}
                    onClick={() => setActiveNote(note)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl cursor-pointer hover:shadow"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold truncate max-w-[70%]">
                        {note.title}
                      </h3>

                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDateTime(note.updatedAt)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap line-clamp-3">
                      {note.content || "No content"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FILES */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
            {loadingFiles && (
              <p className="text-sm text-gray-500">Loading files...</p>
            )}

            <h3 className="text-lg font-semibold mb-4">☁️ Files</h3>

            <div className="flex gap-2 mb-4">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="flex-1 text-sm"
              />
              <button
                onClick={handleFileUpload}
                className="bg-green-600 px-4 text-white rounded-lg"
              >
                Upload
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {files.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No files uploaded
                </p>
              )}

              {files.map((file) => (
                <div
                  key={file._id}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.key)}
                    <span className="text-sm truncate w-48">
                      {file.key.split("/").pop()}
                    </span>
                  </div>

                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={() => handleDownload(file._id)}
                      className="text-blue-600 hover:underline"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file._id)}
                      className="text-red-500 hover:underline"
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
    </div>
  );
}
