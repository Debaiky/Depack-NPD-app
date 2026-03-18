import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import RequestWizard from "../components/RequestWizard";

export default function RequestEditor() {
  const { requestId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/.netlify/functions/get-request?requestId=${requestId}`);
        const json = await res.json();

        if (json.success) {
          setData(json.payload);
        } else {
          setError(json.error || "Failed to load request");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load request");
      }
    };

    load();
  }, [requestId]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Loading...</div>;

  return <RequestWizard key={requestId} initialData={data} />;
}