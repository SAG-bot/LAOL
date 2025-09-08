import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { compressVideo } from 'browser-video-compressor';
import { v4 as uuidv4 } from 'uuid';

export default function VideoUpload({ session }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const inputRef = useRef();

  // Generate thumbnail from video
  const generateThumbnail = (videoFile) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      video.src = URL.createObjectURL(videoFile);
      video.currentTime = 1; // capture frame at 1 second
      video.addEventListener('loadeddata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(URL.createObjectURL(blob)), 'image/jpeg');
      });
    });
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setMessage('');
    let processedFile = selected;

    if (selected.size > 50 * 1024 * 1024) {
      setMessage('Compressing video...');
      try {
        processedFile = await compressVideo(selected, { quality: 0.7, maxHeight: 720 });
      } catch (err) {
        console.error('Compression failed:', err);
        setMessage('Compression failed, uploading original file.');
      }
    }

    setFile(processedFile);

    // Generate thumbnail
    const thumbUrl = await generateThumbnail(processedFile);
    setThumbnail(thumbUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      inputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
      e.dataTransfer.clearData();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('No file selected');
      return;
    }
    if (!title.trim()) {
      setMessage('Please enter a title');
      return;
    }

    setUploading(true);
    setProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = fileName;

    try {
      // Upload video
      const { data, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Upload thumbnail
      let thumbnailPath = null;
      if (thumbnail) {
        const thumbBlob = await (await fetch(thumbnail)).blob();
        const thumbName = `${uuidv4()}.jpg`;
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('videos')
          .upload(thumbName, thumbBlob, { cacheControl: '3600', upsert: false });
        if (thumbError) throw thumbError;
        thumbnailPath = thumbData.path;
      }

      // Insert metadata into DB
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: session.user.id,
          video_path: data.path,
          title: title.trim(),
          description: description.trim(),
          thumbnail_path: thumbnailPath
        });

      if (dbError) throw dbError;

      setMessage('Upload successful!');
      setFile(null);
      setTitle('');
      setDescription('');
      setThumbnail(null);
    } catch (err) {
      console.error('Upload error:', err);
      setMessage('Upload failed. See console.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => e.preventDefault()}
      style={{ padding: 16, border: '2px dashed #ccc', borderRadius: 8, marginBottom: 16 }}
    >
      <h3 style={{ marginTop: 0 }}>Share your video</h3>

      <input
        type="file"
        accept="video/*"
        ref={inputRef}
        onChange={handleFileChange}
        disabled={uploading}
      />

      {file && (
        <div className="small" style={{ marginTop: 8 }}>
          <p>Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
        </div>
      )}

      {thumbnail && (
        <div style={{ marginTop: 8 }}>
          <p className="small">Thumbnail preview:</p>
          <img src={thumbnail} alt="video thumbnail" style={{ maxWidth: '100%', borderRadius: 4 }} />
        </div>
      )}

      <input
        className="input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={uploading}
        style={{ marginTop: 8 }}
      />

      <textarea
        className="input"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={uploading}
        style={{ marginTop: 8 }}
      />

      {message && <p className="small" style={{ marginTop: 8 }}>{message}</p>}

      <button
        className="button"
        onClick={handleUpload}
        disabled={uploading || !file}
        style={{ marginTop: 8 }}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {uploading && <progress value={progress} max="100" style={{ width: '100%', marginTop: 8 }} />}
    </div>
  );
}
