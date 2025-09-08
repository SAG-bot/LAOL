import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function VideoUpload({ session }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      alert('Please select a video and enter a title.');
      return;
    }

    setUploading(true);
    setProgress(0);

    // Dynamically import FFmpeg
    const ffmpegModule = await import('@ffmpeg/ffmpeg');
    const { createFFmpeg, fetchFile } = ffmpegModule;
    const ffmpeg = createFFmpeg({ log: true });

    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    let fileToUpload = file;
    // Compress if > 50MB
    if (file.size > 50 * 1024 * 1024) {
      ffmpeg.FS('writeFile', file.name, await fetchFile(file));
      const outputName = `compressed_${file.name}`;
      await ffmpeg.run(
        '-i',
        file.name,
        '-vcodec',
        'libx264',
        '-crf',
        '28',
        outputName
      );
      const data = ffmpeg.FS('readFile', outputName);
      fileToUpload = new Blob([data.buffer], { type: file.type });
    }

    // Generate unique file name
    const fileName = `${Date.now()}_${file.name}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.error(uploadError);
      alert('Upload failed.');
      setUploading(false);
      return;
    }

    // Save metadata in Supabase table
    const { error: dbError } = await supabase
      .from('videos')
      .insert({
        title: title.trim(),
        description: description.trim(),
        video_path: fileName,
        user_id: session.user.id,
      });

    if (dbError) {
      console.error(dbError);
      alert('Failed to save video info.');
    } else {
      alert('Upload complete!');
      setFile(null);
      setTitle('');
      setDescription('');
    }

    setUploading(false);
  };

  return (
    <div>
      <h3>Share Your Video</h3>
      <div className="row">
        <div className="col">
          <input
            className="input"
            type="text"
            placeholder="Video Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="col">
          <input
            className="input"
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <input
          className="file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="button" onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </div>
      {uploading && <p style={{ marginTop: 8 }}>Uploading… {progress}%</p>}
    </div>
  );
}
