import React from 'react';

export default function FloatingButtons({ onChat, onLogout }) {
  return (
    <div className="floating">
      <button className="circle" title="Chat" onClick={onChat}>
        💬
      </button>
      <button className="circle" title="Logout" onClick={onLogout}>
        ⏻
      </button>
    </div>
  );
}