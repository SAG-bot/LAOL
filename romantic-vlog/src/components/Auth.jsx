import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
      }
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 style={{ marginTop:0 }}>Welcome back</h2>
      <p className="small">Login or create an account to share your starlit stories.</p>
      <div className="row">
        <div className="col">
          <label>Email</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} type="email" required/>
        </div>
        <div className="col">
          <label>Password</label>
          <input className="input" value={pass} onChange={e=>setPass(e.target.value)} type="password" required/>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button className="button" disabled={loading} type="submit">
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
        <button className="button secondary" type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>
      {err && <p style={{ color:'#ffa8d6' }}>{err}</p>}
    </form>
  );
}