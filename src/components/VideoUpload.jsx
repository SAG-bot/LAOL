import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const ffmpeg = createFFmpeg({ log: true });

export default function VideoUpload({ session }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const uploadVideo = async () => {
    if (!file) return alert("Select a video first!");

    setUploading(true);
    setStatus("Loading FFmpeg…");

    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    setStatus("Compressing video…");

    // Write file to FFmpeg FS
    ffmpeg.FS("writeFile", file.name, await fetchFile(file));

    // Run FFmpeg to compress
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

    // Read compressed file
    const data = ffmpeg.FS("readFile", outputName);
    const compressedFile = new Blob([data.buffer], { type: "video/mp4" });

    setStatus("Uploading video…");

    const fileExt = "mp4";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: storageError } = await supabase.storage
      .from("videos")
      .upload(filePath, compressedFile, { cacheControl: "3600", upsert: false });

    if (storageError) {
      console.error(storageError);
      alert("Upload failed!");
      setUploading(false);
      setStatus("");
      return;
    }

    // Save metadata
    const { error: dbError } = await supabase.from("videos").insert({
      title: file.name,
      video_path: filePath,
      user_id: session.user.id
    });

    if (dbError) console.error(dbError);
    setUploading(false);
    setStatus("Upload complete!");
    setFile(null);
  };

  return (
    <div>
      <h3>Upload a new video</h3>
      <input type="file" accept="video/*" onChange={handleFileChange} className="file" />
      <button className="button" onClick={uploadVideo} disabled={uploading}>
        {uploading ? status || "Uploading…" : "Upload"}
      </button>
      {progress > 0 && <div>Progress: {progress}%</div>}
    </div>
  );
}
