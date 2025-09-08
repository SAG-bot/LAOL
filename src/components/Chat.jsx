import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Chat({ session }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const userId = session.user.id;

  const load = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("room:messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    await supabase.from("messages").insert({
      user_id: userId,
      content,
      expires_at: new Date(Date.now() + 24*60*60*1000) // 24h expiry
    });
    setText("");
  };

  const del = async (id) => await supabase.from("messages").delete().eq("id", id);

  return (
    <div className="card">
      <h3>Midnight messages</h3>
      <p className="small">These vanish after 24 hours like shooting stars.</p>
      <div style={{ display:"flex", gap:8 }}>
        <input className="input" placeholder="Whisper…" value={text} onChange={e=>setText(e.target.value)} />
        <button className="button" onClick={send}>Send</button>
      </div>
      <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8, maxHeight:'50vh', overflow:'auto' }}>
        {messages.map(m => (
          <div className="card" key={m.id} style={{ padding:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span className="badge">{new Date(m.created_at).toLocaleString()}</span>
              {m.user_id===userId && <button className="button secondary" onClick={()=>del(m.id)}>Delete</button>}
            </div>
            <div style={{ marginTop:6 }}>{m.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
