import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const ffmpeg = createFFmpeg({ log: true });

export default function VideoUpload({ session }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const compressVideo = async (videoFile) => {
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    ffmpeg.FS("writeFile", "input.mp4", await fetchFile(videoFile));
    await ffmpeg.run(
      "-i",
      "input.mp4",
      "-vcodec",
      "libx264",
      "-crf",
      "28",
      "output.mp4"
    );
    const data = ffmpeg.FS("readFile", "output.mp4");
    return new File([data.buffer], videoFile.name, { type: "video/mp4" });
  };

  const uploadVideo = async () => {
    if (!file) return setMessage("Select a video first.");
    if (!title.trim()) return setMessage("Please enter a title.");

    setUploading(true);
    setProgress(0);
    setMessage("");

    try {
      let uploadFile = file;

      // Compress if over 50MB
      if (file.size > 50 * 1024 * 1024) {
        setMessage("Compressing video...");
        uploadFile = await compressVideo(file);
      }

      const filePath = `${session.user.id}/${Date.now()}_${uploadFile.name}`;

      const { data, error } = await supabase.storage
        .from("videos")
        .upload(filePath, uploadFile, {
          cacheControl: "3600",
          upsert: false,
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          },
        });

      if (error) throw error;

      // Save video metadata in table
      const { error: tableError } = await supabase.from("videos").insert({
        user_id: session.user.id,
        title,
        description,
        video_path: filePath,
      });

      if (tableError) throw tableError;

      setMessage("Video uploaded successfully!");
      setFile(null);
      setTitle("");
      setDescription("");
      setProgress(0);
    } catch (err) {
      console.error(err);
      setMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h3>Upload a new video</h3>
      <div className="row">
        <div className="col">
          <input
            type="text"
            placeholder="Video title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div className="col">
          <textarea
            placeholder="Description (optional)"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <div className="col">
          <input type="file" accept="video/*" className="file" onChange={handleFileChange} />
        </div>
      </div>
      {uploading && <p>Uploading: {progress}%</p>}
      {message && <p>{message}</p>}
      <button className="button" onClick={uploadVideo} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
