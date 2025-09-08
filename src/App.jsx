import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth";
import AffirmationTile from "./components/AffirmationTile";
import VideoUpload from "./components/VideoUpload";
import VideoList from "./components/VideoList";
import Chat from "./components/Chat";
import FloatingButtons from "./components/FloatingButtons";

export default function App() {
  const [session, setSession] = useState(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo"></div>
          <h1>Starry Vlog</h1>
        </div>
        {session && (
          <span className="badge">Signed in as {session.user.email}</span>
        )}
      </header>

      <div style={{ marginTop: 16 }} className="card">
        <AffirmationTile />
      </div>

      {!session ? (
        <div style={{ marginTop: 16 }} className="card">
          <Auth />
        </div>
      ) : (
        <>
          {/* Video Upload */}
          <div style={{ marginTop: 16 }} className="card">
            <VideoUpload />
          </div>

          {/* Video List */}
          <div style={{ marginTop: 16 }} className="card">
            <VideoList session={session} />
          </div>
        </>
      )}

      <footer>
        Made with a sky full of stars — blue, pink, and purple.
      </footer>

      {session && (
        <>
          <FloatingButtons
            onChat={() => setShowChat((v) => !v)}
            onLogout={async () => {
              await supabase.auth.signOut();
            }}
          />
          {showChat && (
            <div
              style={{
                position: "fixed",
                right: 84,
                bottom: 16,
                width: 360,
                maxWidth: "90vw",
                zIndex: 30,
              }}
            >
              <div className="card">
                <Chat session={session} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
