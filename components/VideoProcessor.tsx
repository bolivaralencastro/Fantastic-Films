/// <reference lib="dom" />
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Download, AlertTriangle, CheckCircle2, Play, Pause, Image as ImageIcon, SkipBack, SkipForward } from 'lucide-react';

interface VideoProcessorProps {
  videoUrl: string;
  fileName: string;
  onFrameCaptured?: (base64Image: string) => void;
}

export const VideoProcessor: React.FC<VideoProcessorProps> = ({ videoUrl, fileName, onFrameCaptured }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize video and extract last frame automatically on load
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
      // Attempt to extract immediately after metadata load if desired, 
      // but usually we wait for user or seek to end.
      // Let's seek to the end automatically to show the user the last frame.
      seekToEnd(video);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleSeeked = () => {
        // Optional: auto-capture on seek could be annoying if user is scrubbing manually.
        // We will leave capture to the button or the initial auto-seek.
    };
    
    const handleEnded = () => {
        setIsPlaying(false);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoUrl]);

  const seekToEnd = (video: HTMLVideoElement) => {
    // Seek to slightly before the end to ensure we get a visible frame
    // Some browsers/encoders treat exactly 'duration' as after the stream
    const safeEndTime = Math.max(0, video.duration - 0.1);
    video.currentTime = safeEndTime;
  };

  const seekToStart = (video: HTMLVideoElement) => {
    video.currentTime = 0;
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Match canvas size to video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Contexto 2D não disponível");
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to image URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      setCapturedImage(dataUrl);
      
      // Notify parent
      if (onFrameCaptured) {
        onFrameCaptured(dataUrl);
      }
      
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Falha ao capturar o frame. O vídeo pode estar corrompido ou em formato incompatível.");
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!capturedImage) return;
    
    const link = document.createElement('a');
    link.href = capturedImage;
    // Create a smart filename: originalname-frame-timestamp.png
    const timestamp = Math.floor(currentTime);
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    link.download = `${nameWithoutExt}_frame_${timestamp}s.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const togglePlay = () => {
      if(!videoRef.current) return;
      if (isPlaying) {
          videoRef.current.pause();
      } else {
          videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Video Preview Column */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            Visualização
          </h2>
          <span className="text-slate-500 font-mono text-xs bg-slate-900/50 px-1.5 py-0.5 rounded">
            {formatTime(currentTime)} / {formatTime(videoDuration)}
          </span>
        </div>
        
        <div className="relative rounded-lg overflow-hidden bg-black border border-slate-800 shadow-xl aspect-video group">
          <video 
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            playsInline
            controls={false}
            crossOrigin="anonymous"
          />
          
          {/* Custom Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
            <button 
                onClick={togglePlay}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition"
            >
                {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
            </button>
            <input 
                type="range"
                min={0}
                max={videoDuration || 100}
                value={currentTime}
                onChange={(e) => {
                    if (videoRef.current) {
                        videoRef.current.currentTime = parseFloat(e.target.value);
                        setCurrentTime(parseFloat(e.target.value));
                    }
                }}
                className="flex-grow h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => videoRef.current && seekToStart(videoRef.current)}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
            title="Ir para o início"
          >
            <SkipBack className="w-3.5 h-3.5" />
            Início
          </button>
          
          <button
            onClick={() => videoRef.current && seekToEnd(videoRef.current)}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
            title="Ir para o final"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Final
          </button>

          <button
            onClick={captureFrame}
            disabled={isProcessing}
            className="flex-[2] py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5"
          >
            {isProcessing ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <Camera className="w-4 h-4" />
            )}
            Capturar
          </button>
        </div>
        
        {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
            </div>
        )}
      </div>

      {/* Result Column */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-emerald-400" />
          Resultado
        </h2>

        <div className={`
            relative rounded-lg overflow-hidden bg-slate-900 border border-dashed border-slate-800 aspect-video flex items-center justify-center
            ${capturedImage ? 'border-solid border-emerald-500/30' : ''}
        `}>
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured Frame" 
              className="w-full h-full object-contain animate-fade-in"
            />
          ) : (
            <div className="text-center p-4 text-slate-600">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">O frame aparecerá aqui</p>
            </div>
          )}
        </div>

        <button
          onClick={downloadImage}
          disabled={!capturedImage}
          className={`
            w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2
            ${capturedImage 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-500/10' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          <Download className="w-4 h-4" />
          Baixar Imagem
        </button>

        {capturedImage && (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-md text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Imagem pronta para download.</span>
            </div>
        )}
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};