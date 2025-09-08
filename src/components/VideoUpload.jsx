import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg/dist/esm/index.js";

const ffmpeg = createFFmpeg({ log: true });

export default function VideoUpload({ session }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const uploadVideo = async () => {
    if (!file) return alert("Select a video first!");

    setUploading(true);
    setStatus("Loading FFmpeg…");

    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    setStatus("Compressing video…");

    ffmpeg.FS("writeFile", file.name, await fetchFile(file));
    const outputName = "compressed.mp4";

    await ffmpeg.run(
      "-i",
      file.name,
      "-vcodec",
      "libx264",
      "-crf",
      "28",
      "-preset",
      "fast",
      outputName
    );

    const data = ffmpeg.FS("readFile", outputName);
    const compressedFile = new Blob([data.buffer], { type: "video/mp4" });

    setStatus("Uploading video…");

    const filePath = `${Date.now()}.mp4`;

    const { error: storageError } = await supabase.storage
      .from("videos")
      .upload(filePath, compressedFile, { cacheControl: "3600", upsert: false });

    if (storageError) {
      alert("Upload failed!");
      console.error(storageError);
      setUploading(false);
      setStatus("");
      return;
    }

    await supabase.from("videos").insert({
      title: file.name,
      video_path: filePath,
      user_id: session.user.id
    });

    setUploading(false);
    setStatus("Upload complete!");
    setFile(null);
  };

  return (
    <div className="card">
      <h3>Upload a new video</h3>
      <input type="file" accept="video/*" onChange={handleFileChange} className="file" />
      <button className="button" onClick={uploadVideo} disabled={uploading}>
        {uploading ? status || "Uploading…" : "Upload"}
      </button>
    </div>
  );
}

