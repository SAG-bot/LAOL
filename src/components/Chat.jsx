import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Chat({ session }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const userId = session.user.id;

  // Load messages
  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });
    if (!error) setMessages(data);
  };

  useEffect(() => {
    loadMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('room:messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (_payload) => loadMessages()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel); // Cleanup properly
    };
  }, []);

  // Send a new message
  const sendMessage = async () => {
    const content = text.trim();
    if (!content) return;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h expiry

    const { error } = await supabase
      .from('messages')
      .insert({ user_id: userId, content, expires_at: expiresAt });

    if (!error) setText('');
  };

  // Delete own message
  const deleteMessage = async (id) => {
    await supabase.from('messages').delete().eq('id', id);
  };

  return (
    <div>
      <h3 style={{ marginTop:0 }}>Midnight messages</h3>
      <p className="small">These vanish after 24 hours like shooting stars.</p>

      <div style={{ display:'flex', gap:8 }}>
        <input
          className="input"
          placeholder="Whisper into the night…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button className="button" onClick={sendMessage}>Send</button>
      </div>

      <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8, maxHeight:'50vh', overflowY:'auto' }}>
        {messages.map(m => (
          <div key={m.id} className="card" style={{ padding:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="badge">{new Date(m.created_at).toLocaleString()}</span>
              {m.user_id === userId && (
                <button className="button secondary" onClick={() => deleteMessage(m.id)}>Delete</button>
              )}
            </div>
            <div style={{ marginTop:6 }}>{m.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
