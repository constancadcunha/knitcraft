/**
 * Handing a file to the browser.
 *
 * There is no server in this app, so a download is a Blob, an object URL and a
 * synthetic click. The object URL is REVOKED afterwards: every un-revoked one
 * pins its whole Blob in memory for the life of the document, and a maker
 * exporting a library of chart thumbnails a few times would be holding tens of
 * megabytes they can never get back.
 *
 * Revocation is deferred by a tick rather than done inline because Safari reads
 * the href after the click handler returns; revoking synchronously gives a
 * silently empty file there.
 */

export interface DownloadResult {
  ok: boolean;
  /** Why it could not happen — shown to the maker, not swallowed. */
  message?: string;
}

export function downloadText(
  filename: string,
  contents: string,
  mimeType = "text/plain;charset=utf-8",
): DownloadResult {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return { ok: false, message: "Downloads are only available in the browser." };
  }

  let url: string | null = null;
  try {
    const blob = new Blob([contents], { type: mimeType });
    url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch {
    if (url) URL.revokeObjectURL(url);
    return {
      ok: false,
      message: "The browser refused to save that file. Check that downloads are allowed here.",
    };
  }

  const created = url;
  setTimeout(() => URL.revokeObjectURL(created), 0);
  return { ok: true };
}

/** Read a picked file as text, with a size guard so a huge file cannot hang the tab. */
export async function readFileAsText(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) {
    throw new RangeError(
      `That file is ${Math.round(file.size / 1024 / 1024)} MB, which is too large to read here.`,
    );
  }
  return file.text();
}

/** Read a picked image as a data URL, for the chart-from-image path. */
export function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) {
    return Promise.reject(
      new RangeError(
        `That image is ${Math.round(file.size / 1024 / 1024)} MB, which is too large to read here.`,
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That image could not be read."));
    reader.readAsDataURL(file);
  });
}
