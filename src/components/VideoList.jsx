import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

async function signedUrl(path) {
  const { data, error } = await supabase.storage.from("videos").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export default function VideoList({ session }) {
  const [videos, setVideos] = useState([]);
  const [likes, setLikes] = useState(new Map());
  const [userLikes, setUserLikes] = useState(new Set());
  const [comments, setComments] = useState(new Map());
  const userId = session.user.id;

  const load = async () => {
    const { data: vids } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
  const withUrls = await Promise.all(
    vids.map(async (v) => ({ ...v, url: await signedUrl(v.video_path) }))
  );

  setVideos(withUrls);
};

    const { data: likeRows } = await supabase.from("likes").select("video_id, user_id");
    setUserLikes(new Set(likeRows.filter(r => r.user_id === userId).map(r => r.video_id)));
    const likeCountMap = new Map();
    likeRows.forEach(r => likeCountMap.set(r.video_id, (likeCountMap.get(r.video_id) || 0) + 1));
    setLikes(likeCountMap);

    const { data: cmts } = await supabase.from("comments").select("*").order("created_at", { ascending: true });
    const cMap = new Map();
    cmts.forEach(c => {
      const arr = cMap.get(c.video_id) || [];
      arr.push(c);
      cMap.set(c.video_id, arr);
    });
    setComments(cMap);
  };

  useEffect(() => { load(); }, []);

  const toggleLike = async (videoId) => {
    if (userLikes.has(videoId)) {
      await supabase.from("likes").delete().eq("video_id", videoId).eq("user_id", userId);
      const newLikes = new Set(userLikes); newLikes.delete(videoId); setUserLikes(newLikes);
      setLikes(new Map(likes.set(videoId, Math.max((likes.get(videoId)||1)-1,0))));
    } else {
      await supabase.from("likes").insert({ video_id: videoId, user_id: userId });
      const newLikes = new Set(userLikes); newLikes.add(videoId); setUserLikes(newLikes);
      setLikes(new Map(likes.set(videoId, (likes.get(videoId)||0)+1)));
    }
  };

  const addComment = async (videoId, content) => {
    const { data } = await supabase.from("comments").insert({ video_id: videoId, user_id: userId, content }).select().single();
    if (data) {
      const cMap = new Map(comments);
      const arr = cMap.get(videoId) || [];
      arr.push(data); cMap.set(videoId, arr);
      setComments(cMap);
    }
  };

  const deleteVideo = async (video) => {
    await supabase.from("videos").delete().eq("id", video.id);
    await supabase.storage.from("videos").remove([video.video_path]).catch(()=>{});
    setVideos(videos.filter(v => v.id !== video.id));
  };

  return (
    <div>
      <h2>Recent shares</h2>
      <div className="video-grid">
        {videos.map(v => (
          <div className="video-card card" key={v.id}>
            <video src={v.url} controls preload="metadata" />
            <h3>{v.title}</h3>
            {v.description && <p className="small">{v.description}</p>}
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
              <button className="button secondary" onClick={()=>toggleLike(v.id)}>
                {userLikes.has(v.id) ? "♥ Unlike" : "♡ Like"} ({likes.get(v.id)||0})
              </button>
              {v.user_id===userId && <button className="button" onClick={()=>deleteVideo(v)}>Delete</button>}
              <span className="badge">{new Date(v.created_at).toLocaleString()}</span>
            </div>
            <hr className="sep" />
            <CommentsSection video={v} userId={userId} comments={comments.get(v.id)||[]} onAdd={addComment} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsSection({ video, userId, comments, onAdd }) {
  const [text, setText] = useState("");
  const handleAdd = () => {
    if(text.trim()){ onAdd(video.id, text.trim()); setText(""); }
  };
  return (
    <div>
      <h4>Comments</h4>
      <div style={{ display:'flex', gap:8 }}>
        <input className="input" value={text} onChange={e=>setText(e.target.value)} placeholder="Leave a kind word…" />
        <button className="button" onClick={handleAdd}>Send</button>
      </div>
      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
        {comments.map(c => (
          <div className="card" key={c.id} style={{ padding:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span className="small">{new Date(c.created_at).toLocaleString()}</span>
            </div>
            <div style={{ marginTop:4 }}>{c.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

