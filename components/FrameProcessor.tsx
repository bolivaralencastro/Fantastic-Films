/// <reference lib="dom" />
import React, { useRef, useState, useEffect } from 'react';
import { Download, Camera, Loader2, Play, Pause, Heart, Check } from 'lucide-react';

interface FrameProcessorProps {
  videoUrl: string;
  fileName: string;
  onSaveToGallery: (src: string, type: 'inicio' | 'final' | 'manual') => void;
}

export const FrameProcessor: React.FC<FrameProcessorProps> = ({ videoUrl, fileName, onSaveToGallery }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [manualFrame, setManualFrame] = useState<string | null>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    setFirstFrame(null);
    setLastFrame(null);
    setManualFrame(null);
    setIsProcessing(true);
    setIsPlaying(false);
  }, [videoUrl]);

  const captureAtTime = (time: number): Promise<string> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve('');

      const onSeeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        video.removeEventListener('seeked', onSeeked);
        resolve(canvas.toDataURL('image/png'));
      };

      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    });
  };

  const processAutomaticFrames = async () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);

    try {
      const start = await captureAtTime(0);
      setFirstFrame(start);
      const end = await captureAtTime(Math.max(0, video.duration - 0.1));
      setLastFrame(end);
      video.currentTime = 0;
    } catch (e) {
      console.error("Erro ao processar frames automáticos", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setManualFrame(canvas.toDataURL('image/png'));
  };

  const download = (dataUrl: string, suffix: string) => {
    const link = document.createElement('a');
    const nameOnly = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    link.href = dataUrl;
    link.download = `${nameOnly}_${suffix}.png`;
    link.click();
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white truncate max-w-2xl">{fileName}</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl">
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 group">
          <video 
            ref={videoRef} 
            src={videoUrl} 
            className="w-full h-full object-contain"
            onLoadedMetadata={processAutomaticFrames}
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onEnded={() => setIsPlaying(false)}
            crossOrigin="anonymous"
          />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-300">Extraindo frames automáticos...</p>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 z-10">
            <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition transform hover:scale-110">
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
            </button>
            <input 
              type="range"
              min={0}
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onChange={(e) => {
                if(videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value);
              }}
              className="flex-grow h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
            />
            <span className="text-xs font-mono text-slate-300 min-w-[80px] text-right">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button 
            onClick={handleManualCapture}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 transform active:scale-95"
          >
            <Camera className="w-5 h-5" />
            Capturar Frame Atual
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
        <FrameCard 
          label="Frame Inicial" 
          image={firstFrame} 
          onDownload={() => firstFrame && download(firstFrame, 'inicio')} 
          onSave={() => firstFrame && onSaveToGallery(firstFrame, 'inicio')}
          color="indigo"
        />

        <FrameCard 
          label="Captura Manual" 
          image={manualFrame} 
          onDownload={() => manualFrame && download(manualFrame, 'manual')} 
          onSave={() => manualFrame && onSaveToGallery(manualFrame, 'manual')}
          color="purple"
          placeholder="Use a timeline para escolher"
        />

        <FrameCard 
          label="Frame Final" 
          image={lastFrame} 
          onDownload={() => lastFrame && download(lastFrame, 'final')} 
          onSave={() => lastFrame && onSaveToGallery(lastFrame, 'final')}
          color="emerald"
        />
      </div>
    </div>
  );
};

interface FrameCardProps {
  label: string;
  image: string | null;
  onDownload: () => void;
  onSave: () => void;
  color: 'indigo' | 'purple' | 'emerald';
  placeholder?: string;
}

const FrameCard: React.FC<FrameCardProps> = ({ label, image, onDownload, onSave, color, placeholder }) => {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const colors = {
    indigo: 'bg-indigo-600 hover:bg-indigo-500 text-indigo-400',
    purple: 'bg-purple-600 hover:bg-purple-500 text-purple-400',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-emerald-400',
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 flex flex-col gap-3 group hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <h3 className={`text-[10px] uppercase tracking-widest font-bold ${colors[color].split(' ')[2]}`}>{label}</h3>
        {image && (
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              className={`p-1.5 rounded-lg transition-all ${saved ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-pink-400 hover:bg-slate-700'}`}
              title="Salvar na Galeria"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
      
      <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center relative border border-slate-800/50">
        {image ? (
          <img src={image} className="w-full h-full object-contain animate-in fade-in zoom-in duration-300" />
        ) : (
          <div className="text-center p-4">
            <Loader2 className="w-6 h-6 text-slate-800 animate-spin mx-auto mb-2" />
            <p className="text-[10px] text-slate-600">{placeholder || 'Processando...'}</p>
          </div>
        )}
      </div>

      <button 
        disabled={!image}
        onClick={onDownload}
        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${image ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'}`}
      >
        <Download className="w-4 h-4" />
        Download
      </button>
    </div>
  );
};