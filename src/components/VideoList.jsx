import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // helper to generate signed URL
  const signedUrl = async (path) => {
    try {
      const { data, error } = await supabase.storage
        .from("videos") // your bucket name
        .createSignedUrl(path, 60 * 60); // 1 hour expiry

      if (error) {
        console.error("Error creating signed URL:", error.message);
        return null;
      }
      return data?.signedUrl || null;
    } catch (err) {
      console.error("Signed URL exception:", err);
      return null;
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const { data: vids, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // ✅ FIXED: async map with await inside
      const withUrls = await Promise.all(
        vids.map(async (v) => ({
          ...v,
          url: await signedUrl(v.video_path),
        }))
      );

      setVideos(withUrls);
    } catch (err) {
      console.error("Error loading videos:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Loading videos...</p>;

  return (
    <div className="video-list">
      {videos.length === 0 ? (
        <p>No videos found.</p>
      ) : (
        videos.map((video) => (
          <div key={video.id} className="video-card">
            <video
              src={video.url}
              controls
              width="400"
              style={{ borderRadius: "10px", marginBottom: "10px" }}
            />
            <p>{video.title || "Untitled video"}</p>
          </div>
        ))
      )}
    </div>
  );
}
