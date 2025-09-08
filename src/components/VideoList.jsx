import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from "../supabaseClient";

// wrap with forwardRef
const VideoList = forwardRef(({ session }, ref) => {
  const [videos, setVideos] = useState([]);
  const [likes, setLikes] = useState(new Map());
  const [userLikes, setUserLikes] = useState(new Set());
  const [comments, setComments] = useState(new Map());
  const userId = session.user.id;

  const load = async () => {
    const { data: vids, error } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (error) return console.error(error);

    const vidsWithUrls = await Promise.all(vids.map(async (v) => ({ ...v, url: (await supabase.storage.from("videos").createSignedUrl(v.video_path, 3600)).data.signedUrl })));
    setVideos(vidsWithUrls);

    const { data: likeRows } = await supabase.from("likes").select("video_id,user_id");
    const { data: likeCounts } = await supabase.from("likes").select("video_id, count(*)").group("video_id");
    setUserLikes(new Set(likeRows?.filter(r => r.user_id === userId).map(r => r.video_id) || []));
    const likeMap = new Map();
    likeCounts?.forEach(lc => likeMap.set(lc.video_id, lc.count));
    setLikes(likeMap);

    const { data: cmts } = await supabase.from("comments").select("*").order("created_at", { ascending: true });
    const cMap = new Map();
    cmts?.forEach(c => {
      const arr = cMap.get(c.video_id) || [];
      arr.push(c);
      cMap.set(c.video_id, arr);
    });
    setComments(cMap);
  };

  useImperativeHandle(ref, () => ({
    reload: load
  }));

  useEffect(() => { load(); }, []);

  // ... rest of VideoList JSX remains unchanged ...

});

export default VideoList;
