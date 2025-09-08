import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

async function signedUrl(path) {
  const { data, error } = await supabase
    .storage.from('videos')
    .createSignedUrl(path, 60 * 60); // 1 hour
  if (error) throw error;
  return data.signedUrl;
}

export default function VideoList({ session }) {
  const [videos, setVideos] = useState([]);
  const [likes, setLikes] = useState(new Map());
  const [userLikes, setUserLikes] = useState(new Set());
  const [comments, setComments] = useState(new Map());
  const userId = session.user.id;

  const loadVideos = async () => {
    const { data: vids, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const withUrls = await Promise.all(
      vids.map(async (v) => ({
        ...v,
        videoUrl: await signedUrl(v.video_path),
        thumbnailUrl: v.thumbnail_path ? await signedUrl(v.thumbnail_path) : null,
      }))
    );

    setVideos(withUrls);

    // Likes
    const { data: likeRows } = await supabase.from('likes').select('video_id, user_id');
    const likeCountsMap = new Map();
    const userLikedSet = new Set();

    likeRows?.forEach((l) => {
      likeCountsMap.set(l.video_id, (likeCountsMap.get(l.video_id) || 0) + 1);
      if (l.user_id === userId) userLikedSet.add(l.video_id);
    });

    setLikes(likeCountsMap);
    setUserLikes(userLikedSet);

    // Comments
    const { data: cmts } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: true });
    const cMap = new Map();
    cmts?.forEach((c) => {
      const arr = cMap.get(c.video_id) || [];
      arr.push(c);
      cMap.set(c.video_id, arr);
    });
    setComments(cMap);
  };

  useEffect(() => { loadVideos(); }, []);

  const toggleLike = async (videoId) => {
    if (userLikes.has(videoId)) {
      const { error } = await supabase.from('likes').delete().eq('video_id', videoId).eq('user_id', userId);
      if (!error) {
        const set = new Set(userLikes); set.delete(videoId); setUserLikes(set);
        setLikes(new Map(likes.set(videoId, Math.max((likes.get(videoId)||1)-1, 0))));
      }
    } else {
      const { error } = await supabase.from('likes').insert({ video_id: videoId, user_id: userId });
      if (!error) {
        const set = new Set(userLikes); set.add(videoId); setUserLikes(set);
        setLikes(new Map(likes.set(videoId, (likes.get(videoId)||0)+1)));
      }
    }
  };

  const addComment = async (videoId, content) => {
    const { data, error } = await supabase.from('comments').insert({ video_id: videoId, user_id: userId, content }).select().single();
    if (!error && data) {
      const cMap = new Map(comments);
      const arr = cMap.get(videoId) || [];
      arr.push(data); cMap.set(videoId, arr);
      setComments(cMap);
    }
  };

  const deleteComment = async (videoId, id) => {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) {
      const cMap = new Map(comments);
      cMap.set(videoId, (cMap.get(videoId) || []).filter(c => c.id !== id));
      setComments(cMap);
    }
  };

  const deleteVideo = async (vid) => {
    const { error } = await supabase.from('videos').delete().eq('id', vid.id);
    if (!error) {
      if (vid.video_path) await supabase.storage.from('videos').remove([vid.video_path]).catch(() => {});
      if (vid.thumbnail_path) await supabase.storage.from('videos').remove([vid.thumbnail_path]).catch(() => {});
      setVideos(videos.filter(v => v.id !== vid.id));
    }
  };

  return (
    <div>
      <h2 style={{ marginTop:0 }}>Recent shares</h2>
      <div className="video-grid">
        {videos.map(v => {
          const likeCount = likes.get(v.id) || 0;
          const userLiked = userLikes.has(v.id);
          return (
            <div className="video-card card" key={v.id}>
              {/* Show thumbnail if available, else video */}
              {v.thumbnailUrl ? (
                <img src={v.thumbnailUrl} alt={v.title} style={{ width: '100%', borderRadius: 4 }} />
              ) : (
                <video src={v.videoUrl} controls preload="metadata" />
              )}

              <h3 style={{ margin: '8px 0 6px 0' }}>{v.title}</h3>
              {v.description && <p className="small" style={{ marginTop:0 }}>{v.description}</p>}

              <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
                <button className="button secondary" onClick={()=>toggleLike(v.id)}>
                  {userLiked ? '♥ Unlike' : '♡ Like'} ({likeCount})
                </button>
                {v.user_id === userId && (
                  <button className="button" onClick={()=>deleteVideo(v)}>Delete</button>
                )}
                <span className="badge">{new Date(v.created_at).toLocaleString()}</span>
              </div>

              <hr className="sep" />
              <CommentsSection
                video={v}
                userId={userId}
                comments={comments.get(v.id) || []}
                onAdd={addComment}
                onDelete={deleteComment}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommentsSection({ video, userId, comments, onAdd, onDelete }) {
  const [text, setText] = useState('');
  return (
    <div>
      <h4 style={{ margin: '0 0 8px 0' }}>Comments</h4>
      <div style={{ display:'flex', gap:8 }}>
        <input className="input" placeholder="Leave a kind word…" value={text} onChange={e=>setText(e.target.value)} />
        <button className="button" onClick={()=>{ if(text.trim()){ onAdd(video.id, text.trim()); setText(''); }}}>Send</button>
      </div>
      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
        {comments.map(c => (
          <div key={c.id} className="card" style={{ padding:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="small">{new Date(c.created_at).toLocaleString()}</span>
              {c.user_id === userId && (
                <button className="button secondary" onClick={()=>onDelete(video.id, c.id)}>Delete</button>
              )}
            </div>
            <div style={{ marginTop:4 }}>{c.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
