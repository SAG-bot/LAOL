import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function VideoUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const MAX_SIZE_MB = 200; // reject anything above 200MB

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File too large! Max allowed is ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(selected);
  };

  const compressVideo = async (file) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        // Convert ArrayBuffer -> Base64
        const base64Data = btoa(
          new Uint8Array(reader.result)
            .reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        // Send to Netlify function
        const res = await fetch("/.netlify/functions/compress-video", {
          method: "POST",
          body: JSON.stringify({ fileName: file.name, fileData: base64Data }),
        });

        if (!res.ok) {
          reject(new Error("Compression failed"));
          return;
        }

        const result = await res.json();

        // Convert back to Blob/File
        const compressedBlob = new Blob([
          Uint8Array.from(atob(result.fileData), (c) => c.charCodeAt(0)),
        ]);

        resolve(
          new File([compressedBlob], result.fileName, { type: "video/mp4" })
        );
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);

    try {
      // Compress video first
      const compressedFile = await compressVideo(file);
      setProgress(60);

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from("videos")
        .upload(`public/${Date.now()}_${compressedFile.name}`, compressedFile);

      if (error) throw error;

      setProgress(100);
      alert("Video uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      <h2>Upload Video</h2>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? `Uploading... ${progress}%` : "Upload"}
      </button>
    </div>
  );
}
