export function uploadWithProgress<T>({
  url,
  token,
  body,
  signal,
  onProgress,
}: {
  url: string;
  token: string;
  body: ArrayBuffer;
  signal: AbortSignal;
  onProgress: (percentage: number) => void;
}) {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Upload cancelled."));
      return;
    }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener("abort", abort);

    xhr.open("PUT", url);
    xhr.timeout = 90_000;
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    };
    xhr.upload.onload = () => onProgress(100);
    xhr.onload = () => {
      cleanup();
      let result: (T & { error?: string }) | null;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("The server returned an unexpected upload response."));
        return;
      }
      if (!result || xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(result?.error ?? "Upload failed. Try again."));
        return;
      }
      resolve(result);
    };
    xhr.onerror = () => {
      cleanup();
      reject(
        new Error("Upload interrupted. Check your connection and try again."),
      );
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new Error("The upload timed out. Try again."));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new Error("Upload cancelled."));
    };
    signal.addEventListener("abort", abort, { once: true });
    xhr.send(body);
  });
}
