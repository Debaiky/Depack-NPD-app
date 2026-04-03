import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import RequestWizard from "../components/RequestWizard";

export default function RequestEditor({ isNew = false }) {
  const { requestId } = useParams();
  const [data, setData] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const loadAll = async () => {
    if (isNew || !requestId) {
      setData({});
      setFiles([]);
      setError("");
      return;
    }

    try {
      const res = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
      const json = await res.json();

      if (json.success) {
        setData(json.payload);
      } else {
        setError(json.error || "Failed to load request");
        return;
      }

      const filesRes = await fetch(
        `/.netlify/functions/list-request-files?requestId=${requestId}`
      );
      const filesJson = await filesRes.json();

      if (filesJson.success) {
        setFiles(filesJson.files || []);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load request");
    }
  };

  useEffect(() => {
    loadAll();
  }, [requestId, isNew]);

  const handleDeleteFile = async (file) => {
    const ok = window.confirm(`Delete file "${file.fileName}"?`);
    if (!ok) return;

    try {
      const res = await fetch("/.netlify/functions/delete-request-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rowIndex: file.rowIndex,
          driveFileId: file.driveFileId,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to delete file");
        return;
      }

      await loadAll();
    } catch (error) {
      console.error(error);
      alert("Failed to delete file");
    }
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (data === null) return <div className="p-6">Loading...</div>;

  return (
    <RequestWizard
  key={isNew ? "new-request" : requestId}
  initialData={isNew ? null : data}
  existingFiles={isNew ? [] : files}
  onDeleteFile={isNew ? null : handleDeleteFile}
  isEditMode={!isNew}
/>
  );
}