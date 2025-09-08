import { useState } from "react";
import { supabase } from "../supabaseClient";
import Compressor from "browser-video-compressor";

export default function VideoUpload({ session, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const compressIfNeeded = async (videoFile) => {
    if (videoFile.size <= 50 * 1024 * 1024) return videoFile;

    try {
      const compressedFile = await Compressor(videoFile, { quality: 0.6, maxWidth: 1920, maxHeight: 1080 });
      if (compressedFile.size > 50 * 1024 * 1024) {
        setMessage("Video still too large after compression. Try a shorter video.");
        return null;
      }
      return compressedFile;
    } catch (err) {
      console.error("Compression error:", err);
      setMessage("Compression failed.");
      return null;
    }
  };

  const handleUpload = async () => {
    if (!file) { setMessage("Please select a video first."); return; }
    setUploading(true);
    setMessage("Processing video...");

    const processedFile = await compressIfNeeded(file);
    if (!processedFile) { setUploading(false); return; }

    const fileName = `${Date.now()}-${processedFile.name}`;

    try {
      const { error: uploadError } = await supabase.storage.from("videos").upload(fileName, processedFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("videos").insert({
        user_id: session.user.id,
        video_path: fileName,
        title: processedFile.name,
        description: ""
      });
      if (dbError) throw dbError;

      setMessage("Upload successful!");
      setFile(null);
      if (onUploadComplete) onUploadComplete();

    } catch (err) {
      console.error(err);
      setMessage("Upload failed.");
    }

    setUploading(false);
  };

  return (
    <div className="p-4 border rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-2">Upload Video</h2>
      <input type="file" accept="video/*" onChange={handleFileChange} className="mb-2" />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
