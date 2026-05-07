import axios from "axios";

const api = axios.create({
  // In production (Vercel), set VITE_API_URL=/api in the Vercel dashboard.
  // Locally, the backend runs separately at port 8000.
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  timeout: 30000,
});

export const getTemplates = () => api.get("/templates");
export const getTemplate = (name) => api.get(`/templates/${name}`);

export const previewTemplate = (name, data) =>
  api.post("/preview", { name, data });

export const downloadPdf = async (name, data) => {
  // Fetch the fully-rendered HTML from the backend (same as live preview)
  const res = await api.post("/preview", { name, data });
  const html = res.data.html;

  return new Promise((resolve, reject) => {
    // Render into a hidden iframe then trigger browser print-to-PDF
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:-9999px;top:0;width:210mm;height:297mm;border:none;visibility:hidden;";
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      resolve();
    };

    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Give the print dialog time to open before removing the iframe
        setTimeout(cleanup, 2000);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("Failed to load document"));
    };

    try {
      iframe.contentDocument.open();
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
    } catch (e) {
      cleanup();
      reject(e);
    }
  });
};
