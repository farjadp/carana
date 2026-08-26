import { useState, useRef, useCallback, useEffect } from "react";

export function useVideoRecorder(maxDurationSeconds = 60) {
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.muted = true; // prevent feedback loop
        previewVideoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access denied or error:", err);
      setError("لطفاً دسترسی به دوربین و میکروفون را مجاز کنید.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  }, []);

  // Declared before startRecording, which closes over it: the react
  // compiler refuses a callback that reads a binding declared later (TDZ),
  // and skips memoizing the whole hook when it does.
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError("دوربین هنوز فعال نشده است.");
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        chunksRef.current = [];
        stopCamera();
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDurationSeconds - 1) {
            stopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Failed to start recording:", err);
      setError("خطا در شروع ضبط ویدئو.");
    }
  }, [maxDurationSeconds, stopCamera]);


  const resetRecording = useCallback(() => {
    setVideoBlob(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setRecordingTime(0);
    setError(null);
  }, [videoUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [stopCamera, videoUrl]);

  return {
    isRecording,
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    resetRecording,
    videoBlob,
    videoUrl,
    recordingTime,
    error,
    previewVideoRef
  };
}
