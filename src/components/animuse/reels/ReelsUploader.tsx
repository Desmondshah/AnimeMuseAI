// src/components/animuse/reels/ReelsUploader.tsx
import React, { useMemo, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const ACCEPT = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm']
};

const ReelsUploader: React.FC = () => {
  const generateUploadUrl = useAction(api.reels.generateUploadUrl);
  const createReel = useMutation(api.reels.createReel);

  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isValid = useMemo(() => !!file && (ACCEPT[mediaType].includes(file!.type)), [file, mediaType]);

  const onPick = () => inputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      if (f.type.startsWith('image/')) setMediaType('image');
      if (f.type.startsWith('video/')) setMediaType('video');
    }
  };

  const upload = async () => {
    if (!file || !isValid) return;
    setIsUploading(true);
    try {
      const url = await generateUploadUrl({});
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const { storageId } = await res.json();

      // Try to derive aspectRatio/duration if video
      let aspectRatio: number | undefined = undefined;
      let durationMs: number | undefined = undefined;
      if (mediaType === 'video') {
        await new Promise<void>((resolve) => {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.onloadedmetadata = () => {
            if (v.videoWidth && v.videoHeight) {
              aspectRatio = v.videoWidth / v.videoHeight;
            }
            if (!isNaN(v.duration)) durationMs = Math.round(v.duration * 1000);
            resolve();
          };
          v.src = URL.createObjectURL(file);
        });
      }

      await createReel({ storageId, mediaType, caption: caption.trim() || undefined, aspectRatio, durationMs });
      setCaption("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      alert('Uploaded!');
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 border-4 border-black bg-white text-black">
      <h3 className="font-black text-lg mb-2">Upload Reel</h3>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onPick} className="border-2 border-black px-3 py-1 font-black bg-brand-accent-gold">Choose File</button>
        <input ref={inputRef} type="file" accept={Object.values(ACCEPT).flat().join(',')} onChange={onFileChange} className="hidden" />
        {file && <span className="text-xs">{file.name} ({Math.round((file.size/1024/1024)*10)/10} MB)</span>}
      </div>

      <label className="block text-xs font-black mb-1">Caption (optional)</label>
      <textarea value={caption} onChange={e => setCaption(e.target.value)} className="w-full border-2 border-black p-2 mb-3" rows={2} maxLength={2200} />

      <button disabled={!isValid || isUploading} onClick={upload} className={`border-2 border-black px-4 py-2 font-black ${isValid ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'} ${isUploading ? 'opacity-60' : ''}`}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default ReelsUploader;
