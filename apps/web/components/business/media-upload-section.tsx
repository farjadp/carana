"use client";

import { useState, useRef } from "react";
import { Mic, Video, Image as ImageIcon, X, Play, Square, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useVideoRecorder } from "@/hooks/use-video-recorder";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface MediaUploadSectionProps {
  userId: string;
  onMediaUploaded: (url: string, type: string) => void;
  onMediaRemoved: (url: string) => void;
  uploadedMedia: { url: string; type: string }[];
}

export function MediaUploadSection({ userId, onMediaUploaded, onMediaRemoved, uploadedMedia }: MediaUploadSectionProps) {
  const [activeTab, setActiveTab] = useState<"none" | "audio" | "video" | "image">("none");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording: isVoiceRecording,
    startRecording: startVoice,
    stopRecording: stopVoice,
    resetRecording: resetVoice,
    audioBlob,
    audioUrl,
    recordingTime: voiceTime,
  } = useVoiceRecorder(180);

  const {
    isRecording: isVideoRecording,
    startCamera,
    stopCamera,
    startRecording: startVideo,
    stopRecording: stopVideo,
    resetRecording: resetVideo,
    videoBlob,
    videoUrl,
    recordingTime: videoTime,
    previewVideoRef,
  } = useVideoRecorder(60);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const uploadToSupabase = async (blob: Blob, type: "audio" | "video" | "image", fileExtension: string) => {
    setIsUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      const { data, error } = await supabase.storage
        .from("user-media")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) throw error;
      
      // Store the full path including bucket
      onMediaUploaded(`user-media/${data.path}`, type);
      
      if (type === "audio") resetVoice();
      if (type === "video") resetVideo();
      setActiveTab("none");
    } catch (error) {
      console.error("Upload error:", error);
      alert("خطا در آپلود رسانه.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const currentImagesCount = uploadedMedia.filter(m => m.type === "image").length;
    const filesToUpload = Array.from(e.target.files).slice(0, 20 - currentImagesCount);
    
    if (filesToUpload.length === 0) {
      alert("شما حداکثر می‌توانید ۲۰ عکس آپلود کنید.");
      return;
    }

    setIsUploading(true);
    for (const file of filesToUpload) {
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        await uploadToSupabase(file, "image", ext);
      } catch (e) {
        console.error(e);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setActiveTab("none");
  };

  return (
    <div className="mt-4 border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <div className="text-sm font-bold text-gray-700 mb-3">پیوست رسانه (اختیاری)</div>
      
      {/* Media Type Selectors */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button 
          variant={activeTab === "audio" ? "solid" : "muted"}
          size="sm"
          className={activeTab === "audio" ? "bg-blue-600 text-white" : ""}
          onClick={() => {
            setActiveTab(activeTab === "audio" ? "none" : "audio");
            if (activeTab === "video") stopCamera();
          }}
        >
          <Mic size={16} className="ml-2" /> صدا (تا ۳ دقیقه)
        </Button>
        <Button 
          variant={activeTab === "video" ? "solid" : "muted"}
          size="sm"
          className={activeTab === "video" ? "bg-blue-600 text-white" : ""}
          onClick={() => {
            setActiveTab(activeTab === "video" ? "none" : "video");
            if (activeTab !== "video") startCamera();
            else stopCamera();
          }}
        >
          <Video size={16} className="ml-2" /> ویدئو (تا ۱ دقیقه)
        </Button>
        <Button 
          variant="muted"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={16} className="ml-2" /> عکس (تا ۲۰ عدد)
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          multiple 
          className="hidden" 
          onChange={handleImageSelect}
        />
      </div>

      {/* Audio Recorder UI */}
      {activeTab === "audio" && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center gap-4">
          {!audioUrl ? (
            <>
              <div className="text-2xl font-mono">{formatTime(voiceTime)}</div>
              {!isVoiceRecording ? (
                <Button onClick={startVoice} className="bg-red-500 hover:bg-red-600 text-white rounded-full h-12 w-12 p-0">
                  <Mic size={24} />
                </Button>
              ) : (
                <Button onClick={stopVoice} className="bg-gray-800 hover:bg-gray-900 text-white rounded-full h-12 w-12 p-0">
                  <Square size={20} />
                </Button>
              )}
            </>
          ) : (
            <div className="w-full flex flex-col gap-3">
              <audio src={audioUrl} controls className="w-full" />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={resetVoice}>حذف</Button>
                <Button size="sm" onClick={() => uploadToSupabase(audioBlob!, "audio", "webm")} disabled={isUploading}>
                  {isUploading ? <Loader2 size={16} className="animate-spin ml-2" /> : null}
                  افزودن به یادداشت
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Recorder UI */}
      {activeTab === "video" && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center gap-4">
          {!videoUrl ? (
            <>
              <div className="relative w-full max-w-sm rounded-lg overflow-hidden bg-black aspect-video">
                <video ref={previewVideoRef} className="w-full h-full object-cover" />
                {isVideoRecording && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-mono animate-pulse">
                    {formatTime(videoTime)}
                  </div>
                )}
              </div>
              {!isVideoRecording ? (
                <Button onClick={startVideo} className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6">
                  <Camera size={18} className="ml-2" /> شروع ضبط
                </Button>
              ) : (
                <Button onClick={stopVideo} className="bg-gray-800 hover:bg-gray-900 text-white rounded-full px-6">
                  <Square size={18} className="ml-2" /> توقف ضبط
                </Button>
              )}
            </>
          ) : (
            <div className="w-full flex flex-col gap-3 items-center">
              <video src={videoUrl} controls className="w-full max-w-sm rounded-lg" />
              <div className="flex gap-2 justify-end w-full">
                <Button variant="ghost" size="sm" onClick={() => {resetVideo(); startCamera();}}>حذف و ضبط مجدد</Button>
                <Button size="sm" onClick={() => uploadToSupabase(videoBlob!, "video", "webm")} disabled={isUploading}>
                  {isUploading ? <Loader2 size={16} className="animate-spin ml-2" /> : null}
                  افزودن به یادداشت
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Media Preview list */}
      {uploadedMedia.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold text-gray-500 mb-2">رسانه‌های پیوست شده:</div>
          <div className="flex flex-wrap gap-2">
            {uploadedMedia.map((media, index) => (
              <div key={index} className="relative group bg-gray-100 rounded-lg p-2 flex items-center gap-2 pr-8 border border-gray-200">
                {media.type === "audio" && <Mic size={14} className="text-blue-500" />}
                {media.type === "video" && <Video size={14} className="text-green-500" />}
                {media.type === "image" && <ImageIcon size={14} className="text-purple-500" />}
                <span className="text-xs text-gray-700" dir="ltr">
                  {media.type === "image" ? `تصویر ${index + 1}` : media.type === "audio" ? "ویس ضبط شده" : "ویدئو ضبط شده"}
                </span>
                
                <button 
                  onClick={() => onMediaRemoved(media.url)}
                  className="absolute right-2 text-gray-400 hover:text-red-500"
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
