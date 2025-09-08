import React from 'react';

const affirmations = [
  'Tonight, I choose tenderness—in code and in heart.',
  'I create with care, I share with courage.',
  'My voice is worthy; my story shimmers.',
  'I am patient with progress; I glow in small wins.',
  'Love guides my craft; beauty shapes my path.',
  'I let go of perfection; I embrace presence.',
  'Every commit is a love letter to tomorrow.',
  'kinda hard to write affirmations for your ex',
  'Dont justify; bs walk away'
];

function getDailyAffirmation() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return affirmations[day % affirmations.length];
}

export default function AffirmationTile() {
  return (
    <div>
      <div className="badge">Daily affirmation</div>
      <h2 style={{ margin: '8px 0 0 0' }}>{getDailyAffirmation()}</h2>
      <p className="small">Refreshed each day.</p>
    </div>
  );

}


