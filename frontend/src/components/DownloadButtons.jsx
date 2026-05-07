import { useState } from "react";
import { downloadPdf } from "../api";

export default function DownloadButtons({ templateName, formData, disabled }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePdf = async () => {
    setError(null);
    setPdfLoading(true);
    try {
      await downloadPdf(templateName, formData);
    } catch (e) {
      // Extract the real error from the server response if available
      let msg = "PDF generation failed.";
      if (e?.response?.data) {
        try {
          const text = await e.response.data.text?.() ?? JSON.stringify(e.response.data);
          msg += " Server: " + text.slice(0, 200);
        } catch {
          msg += " Status: " + (e?.response?.status ?? "unknown");
        }
      } else {
        msg += " " + (e?.message ?? "Is the backend running?");
      }
      setError(msg);
    } finally {
      setPdfLoading(false);
    }
  };



  return (
    <div className="flex items-center gap-3 flex-wrap">
      {error && (
        <span className="text-xs text-primary-600 font-medium">{error}</span>
      )}

      <button
        id="download-pdf-btn"
        onClick={handlePdf}
        disabled={disabled || pdfLoading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pdfLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        )}
        {pdfLoading ? "Generating…" : "Download PDF"}
      </button>

    </div>
  );
}
