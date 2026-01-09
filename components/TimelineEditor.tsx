/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, ChevronRight, ChevronLeft, Download, Film, Loader2, X, Upload, Heart, Check, Trash2, Plus, ZoomIn, ZoomOut, Move, Flame, Pencil, Crop, Maximize, Minimize } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoItem {
  id: string;
  file: File;
  url: string;
  name: string;
  crop?: {
    scale: number;
    x: number;
    y: number;
  };
}

type AspectRatio = '16:9' | '9:16' | '1:1';

interface TimelineEditorProps {
  videos: VideoItem[];
  setVideos: React.Dispatch<React.SetStateAction<VideoItem[]>>;
  onAddToGallery: (src: string, type: 'inicio' | 'final' | 'manual', videoName: string) => void;
  onAddFiles: (files: FileList | null) => void;
  initialAspectRatio: AspectRatio;
  onRenameVideo?: (id: string, newName: string) => void;
  onUpdateVideo?: (id: string, updates: Partial<VideoItem>) => void;
  onTotalDurationChange?: (duration: number) => void;
}

const RESOLUTIONS = {
  '16:9': { width: 1920, height: 1080, label: 'Paisagem (16:9)' },
  '9:16': { width: 1080, height: 1920, label: 'Vertical (9:16)' },
  '1:1': { width: 1080, height: 1080, label: 'Quadrado (1:1)' },
};

// --- Subcomponente: Thumbnail Frame Box ---
interface FrameThumbnailProps {
  label: string;
  image: string | null;
  onSave: () => void;
  onDownload: () => void;
  isLoading: boolean;
  highlight?: boolean; 
}

const FrameThumbnail: React.FC<FrameThumbnailProps> = ({ label, image, onSave, onDownload, isLoading, highlight = false }) => {
  const [saved, setSaved] = useState(false);
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload();
  };

  return (
    <div className="relative flex flex-col gap-1 w-full group">
       <div className={`w-full aspect-video rounded-lg overflow-hidden border bg-black relative transition-all duration-300 ${highlight ? 'border-orange-500/50 shadow-lg' : 'border-stone-800'}`}>
          {isLoading ? (
             <div className="w-full h-full flex items-center justify-center bg-stone-900">
               <Loader2 className="w-3 h-3 text-stone-600 animate-spin" />
             </div>
          ) : image ? (
             <>
               <img src={image} className="w-full h-full object-cover" alt={label} />
               <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={handleSave} className={`p-1.5 rounded-full transition-all hover:scale-110 ${saved ? 'bg-red-500 text-white' : 'bg-white text-black hover:bg-orange-500'}`}>
                     {saved ? <Check className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                  </button>
                  <button onClick={handleDownload} className="p-1.5 bg-white text-black hover:bg-orange-500 rounded-full transition-all hover:scale-110">
                     <Download className="w-3 h-3" />
                  </button>
               </div>
             </>
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-stone-900 text-[9px] text-stone-600">N/A</div>
          )}
       </div>
       <span className="text-[9px] font-bold uppercase tracking-wider text-center text-stone-600 group-hover:text-stone-300">{label}</span>
    </div>
  );
};

// --- Subcomponente: Crop Modal ---
interface CropModalProps {
  video: VideoItem;
  aspectRatio: AspectRatio;
  onClose: () => void;
  onSave: (crop: { scale: number, x: number, y: number }) => void;
}

const CropModal: React.FC<CropModalProps> = ({ video, aspectRatio, onClose, onSave }) => {
  const [scale, setScale] = useState(video.crop?.scale || 1);
  const [pos, setPos] = useState({ x: video.crop?.x || 0, y: video.crop?.y || 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const ratioDecimal = aspectRatio === '16:9' ? 16/9 : aspectRatio === '9:16' ? 9/16 : 1;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1917] border border-stone-800 rounded-2xl w-full max-w-4xl p-6 flex flex-col h-[85vh]">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-xl font-bold text-white flex items-center gap-2"><Crop className="w-5 h-5 text-orange-500" /> Ajustar Corte</h3>
           <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full transition-colors"><X className="w-5 h-5 text-stone-400" /></button>
        </div>
        <div className="flex-1 bg-[#0c0a09] rounded-xl border border-stone-800 relative overflow-hidden flex items-center justify-center">
            <div className="relative overflow-hidden border-2 border-orange-500/50" style={{ aspectRatio: `${ratioDecimal}`, height: '80%' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <video src={video.url} className="max-w-none max-h-none" style={{ height: '100%', transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transformOrigin: 'center center' }} />
               </div>
            </div>
        </div>
        <div className="mt-6 flex items-center gap-6">
            <input type="range" min={1} max={3} step={0.01} value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="flex-1 h-1.5 bg-stone-700 rounded-full accent-orange-500" />
            <button onClick={() => onSave({ scale, x: pos.x, y: pos.y })} className="px-6 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold shadow-lg">APLICAR</button>
        </div>
      </div>
    </div>
  );
};

// --- Subcomponente: Card de Vídeo ---
interface VideoCardProps {
    video: VideoItem;
    index: number;
    total: number;
    onMoveLeft: () => void;
    onMoveRight: () => void;
    onDelete: () => void;
    onAddToGallery: (src: string, type: 'inicio' | 'final' | 'manual', videoName: string) => void;
    onRename?: (id: string, newName: string) => void;
    onUpdateVideo?: (id: string, updates: Partial<VideoItem>) => void;
    onDurationLoad?: (duration: number) => void;
    aspectRatio: AspectRatio;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, index, total, onMoveLeft, onMoveRight, onDelete, onAddToGallery, onRename, onDurationLoad, onUpdateVideo, aspectRatio }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(video.name);
    const [showCropModal, setShowCropModal] = useState(false);
    const [startFrameImg, setStartFrameImg] = useState<string | null>(null);
    const [endFrameImg, setEndFrameImg] = useState<string | null>(null);
    const [currentFrameImg, setCurrentFrameImg] = useState<string | null>(null); 
    const [loadingThumbs, setLoadingThumbs] = useState(true);

    const updateCurrentFrame = useCallback(() => {
        const vid = videoRef.current;
        if (!vid) return;
        const canvas = document.createElement('canvas');
        canvas.width = vid.videoWidth;
        canvas.height = vid.videoHeight;
        canvas.getContext('2d')?.drawImage(vid, 0, 0, canvas.width, canvas.height);
        setCurrentFrameImg(canvas.toDataURL('image/png'));
    }, []);

    useEffect(() => {
        let isMounted = true;
        const generateThumbs = async () => {
            setLoadingThumbs(true);
            try {
                const tempVideo = document.createElement('video');
                tempVideo.src = video.url;
                tempVideo.crossOrigin = "anonymous";
                tempVideo.muted = true;
                await new Promise((resolve) => tempVideo.onloadedmetadata = () => resolve(true));
                if (!isMounted) return;
                const extract = async (time: number): Promise<string> => {
                    return new Promise((resolve) => {
                        tempVideo.currentTime = time;
                        tempVideo.onseeked = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = tempVideo.videoWidth; canvas.height = tempVideo.videoHeight;
                            canvas.getContext('2d')?.drawImage(tempVideo, 0, 0);
                            resolve(canvas.toDataURL('image/png'));
                        };
                    });
                };
                setStartFrameImg(await extract(0.1));
                setEndFrameImg(await extract(Math.max(0, tempVideo.duration - 0.1)));
            } finally { if (isMounted) setLoadingThumbs(false); }
        };
        generateThumbs();
        return () => { isMounted = false; };
    }, [video.url]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if(videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); updateCurrentFrame(); }
    };

    return (
        <div className="flex flex-col items-center gap-2 relative mx-2">
            <div className="flex items-center justify-between w-full h-8 px-1">
                <div className="flex items-center gap-1 bg-stone-900 p-1 rounded border border-stone-800">
                    <button onClick={onMoveLeft} disabled={index === 0} className="p-0.5 disabled:opacity-20"><ChevronLeft className="w-3 h-3"/></button>
                    <span className="text-[10px] font-bold text-stone-400">{index + 1}</span>
                    <button onClick={onMoveRight} disabled={index === total - 1} className="p-0.5 disabled:opacity-20"><ChevronRight className="w-3 h-3"/></button>
                </div>
                <div className="flex-1 text-center truncate px-2">
                    <span className="text-xs font-bold text-stone-300">{video.name}</span>
                </div>
                <button onClick={onDelete} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="w-72 aspect-video bg-black rounded-xl border border-stone-800 relative group overflow-hidden">
                <video ref={videoRef} src={video.url} className="w-full h-full object-contain" onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); onDurationLoad?.(e.currentTarget.duration); }} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} crossOrigin="anonymous" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <input type="range" min={0} max={duration || 100} step="0.1" value={currentTime} onChange={handleSeek} className="w-full h-1 accent-orange-500" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-72 mt-2">
                <FrameThumbnail label="Início" image={startFrameImg} isLoading={loadingThumbs} onSave={() => startFrameImg && onAddToGallery(startFrameImg, 'inicio', video.name)} onDownload={() => startFrameImg && window.open(startFrameImg)} />
                <FrameThumbnail label="Atual" image={currentFrameImg} isLoading={!currentFrameImg} highlight={true} onSave={() => currentFrameImg && onAddToGallery(currentFrameImg, 'manual', video.name)} onDownload={() => currentFrameImg && window.open(currentFrameImg)} />
                <FrameThumbnail label="Final" image={endFrameImg} isLoading={loadingThumbs} onSave={() => endFrameImg && onAddToGallery(endFrameImg, 'final', video.name)} onDownload={() => endFrameImg && window.open(endFrameImg)} />
            </div>
            {showCropModal && <CropModal video={video} aspectRatio={aspectRatio} onClose={() => setShowCropModal(false)} onSave={(crop) => { onUpdateVideo?.(video.id, { crop }); setShowCropModal(false); }} />}
        </div>
    );
};

// --- Subcomponente: Gap de Transição ---
const TransitionGap: React.FC<{ onInsertVideo: (file: File) => void }> = ({ onInsertVideo }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col items-center justify-center mx-1 group cursor-pointer py-10" onClick={() => inputRef.current?.click()}>
            <div className="w-0.5 h-12 bg-stone-800 group-hover:bg-orange-500 transition-colors"></div>
            <div className="absolute w-5 h-5 bg-stone-900 border border-stone-700 rounded-full flex items-center justify-center group-hover:border-orange-500"><Plus className="w-3 h-3 text-stone-600 group-hover:text-orange-500" /></div>
            <input type="file" ref={inputRef} className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && onInsertVideo(e.target.files[0])} />
        </div>
    );
};

// --- Componente Principal: TimelineEditor ---
export const TimelineEditor: React.FC<TimelineEditorProps> = ({ videos, setVideos, onAddToGallery, onAddFiles, initialAspectRatio, onRenameVideo, onTotalDurationChange, onUpdateVideo }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const moveVideo = (index: number, direction: 'left' | 'right') => {
    const newVideos = [...videos];
    if (direction === 'left' && index > 0) {
      [newVideos[index - 1], newVideos[index]] = [newVideos[index], newVideos[index - 1]];
    } else if (direction === 'right' && index < videos.length - 1) {
      [newVideos[index + 1], newVideos[index]] = [newVideos[index], newVideos[index + 1]];
    }
    setVideos(newVideos);
  };

  return (
    <div className="h-full flex flex-col bg-[#0c0a09] relative overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <input type="file" multiple accept="video/*" ref={mainFileInputRef} className="hidden" onChange={(e) => onAddFiles(e.target.files)} />
      
      <div className="flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing">
        <div className="flex items-center transition-transform duration-75" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}>
          {videos.length === 0 ? (
            <div className="flex flex-col items-center">
              <Film className="w-24 h-24 text-stone-800 mb-4" />
              <button onClick={() => mainFileInputRef.current?.click()} className="px-8 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg">IMPORTAR VÍDEOS</button>
            </div>
          ) : (
            <>
              {videos.map((video, index) => (
                <div key={video.id} className="flex items-center" onMouseDown={(e) => e.stopPropagation()}>
                  <VideoCard video={video} index={index} total={videos.length} onMoveLeft={() => moveVideo(index, 'left')} onMoveRight={() => moveVideo(index, 'right')} onDelete={() => setVideos(v => v.filter(i => i.id !== video.id))} onAddToGallery={onAddToGallery} aspectRatio={initialAspectRatio} onUpdateVideo={onUpdateVideo} />
                  {index < videos.length - 1 && <TransitionGap onInsertVideo={(file) => onAddFiles([file] as any)} />}
                </div>
              ))}
              <button onClick={() => mainFileInputRef.current?.click()} className="mx-8 w-16 h-16 rounded-full border-2 border-dashed border-stone-800 flex items-center justify-center hover:border-orange-500"><Plus className="w-8 h-8 text-stone-700" /></button>
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-2">
        <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2 bg-stone-900 border border-stone-700 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} className="p-2 bg-stone-900 border border-stone-700 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
        <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="p-2 bg-stone-900 border border-stone-700 rounded-lg"><Move className="w-5 h-5" /></button>
      </div>
    </div>
  );
};