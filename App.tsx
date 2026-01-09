/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { Upload, Film, Trash2, Plus, LayoutGrid, Download, CheckSquare, Square, Archive, Loader2, Workflow, Menu, Video, Flame, FolderOpen, ArrowLeft, MoreVertical, Calendar, Clock, Monitor, Smartphone, Square as SquareIcon, X } from 'lucide-react';
import { TimelineEditor } from './components/TimelineEditor';
// JSZip será importado dinamicamente para performance

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

interface GalleryItem {
  id: string;
  src: string;
  type: 'inicio' | 'final' | 'manual';
  videoName: string;
  createdAt: number;
}

type AspectRatio = '16:9' | '9:16' | '1:1';

interface Project {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  createdAt: number;
  lastModified: number;
  videos: VideoItem[];
  galleryItems: GalleryItem[];
}

const App: React.FC = () => {
  // --- Estado Global de Projetos ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Estado para duração total do projeto ativo (calculado pelo TimelineEditor)
  const [activeProjectDuration, setActiveProjectDuration] = useState<number>(0);

  // Estados para Criação de Projeto (Modal)
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRatio, setNewProjectRatio] = useState<AspectRatio>('16:9');

  // View interna do Editor (Timeline vs Galeria)
  const [currentView, setCurrentView] = useState<'timeline' | 'gallery'>('timeline');
  
  // Estados para Seleção em Lote (Batch) na Galeria
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<Set<string>>(new Set());
  const [isZipping, setIsZipping] = useState(false);

  // Computa o projeto ativo
  const activeProject = projects.find(p => p.id === activeProjectId);

  // Limpeza de memória ao remover vídeos
  useEffect(() => {
    return () => {
      projects.forEach(p => {
          p.videos.forEach(v => URL.revokeObjectURL(v.url));
      });
    };
  }, []);

  // --- Gerenciamento de Projetos ---

  const handleCreateProjectClick = () => {
    setNewProjectName(`Projeto Sem Título ${projects.length + 1}`);
    setNewProjectRatio('16:9');
    setIsCreatingProject(true);
  };

  const confirmCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: newProjectName,
      aspectRatio: newProjectRatio,
      createdAt: Date.now(),
      lastModified: Date.now(),
      videos: [],
      galleryItems: []
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setCurrentView('timeline');
    setIsCreatingProject(false);
  };

  const deleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if(confirm("Tem certeza que deseja excluir este projeto e todos os seus vídeos?")) {
       const project = projects.find(p => p.id === projectId);
       // Limpa memória
       project?.videos.forEach(v => URL.revokeObjectURL(v.url));
       setProjects(prev => prev.filter(p => p.id !== projectId));
       if (activeProjectId === projectId) setActiveProjectId(null);
    }
  };

  const openProject = (projectId: string) => {
      setActiveProjectId(projectId);
      setCurrentView('timeline');
      setSelectedGalleryIds(new Set()); // Reseta seleção da galeria
      setActiveProjectDuration(0);
  };

  const exitProject = () => {
      setActiveProjectId(null);
      setActiveProjectDuration(0);
  };

  // --- Manipuladores de Dados do Projeto Ativo ---

  const updateActiveProjectVideos = (newVideosOrFn: VideoItem[] | ((prev: VideoItem[]) => VideoItem[])) => {
      if (!activeProjectId) return;

      setProjects(prevProjects => prevProjects.map(proj => {
          if (proj.id !== activeProjectId) return proj;
          
          const updatedVideos = typeof newVideosOrFn === 'function' 
              ? newVideosOrFn(proj.videos) 
              : newVideosOrFn;
          
          return {
              ...proj,
              videos: updatedVideos,
              lastModified: Date.now()
          };
      }));
  };

  const handleUpdateVideo = (videoId: string, updates: Partial<VideoItem>) => {
      updateActiveProjectVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, ...updates } : v
      ));
  };

  const handleRenameVideo = (videoId: string, newName: string) => {
      handleUpdateVideo(videoId, { name: newName });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !activeProjectId) return;

    const newVideos: VideoItem[] = Array.from(files)
      .filter(file => file.type.startsWith('video/'))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        name: file.name
      }));

    updateActiveProjectVideos((prev) => [...prev, ...newVideos]);
    setCurrentView('timeline');
  };

  // --- Funções da Galeria (Projeto Ativo) ---

  const addToGallery = (src: string, type: 'inicio' | 'final' | 'manual', videoName: string) => {
    if (!activeProjectId) return;

    const newItem: GalleryItem = {
      id: crypto.randomUUID(),
      src,
      type,
      videoName,
      createdAt: Date.now()
    };

    setProjects(prev => prev.map(proj => {
        if (proj.id !== activeProjectId) return proj;
        return {
            ...proj,
            galleryItems: [newItem, ...proj.galleryItems],
            lastModified: Date.now()
        };
    }));
  };

  const removeFromGallery = (id: string) => {
    if (!activeProjectId) return;

    setProjects(prev => prev.map(proj => {
        if (proj.id !== activeProjectId) return proj;
        return {
            ...proj,
            galleryItems: proj.galleryItems.filter(item => item.id !== id)
        };
    }));

    setSelectedGalleryIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const downloadGalleryItem = (item: GalleryItem) => {
    const link = document.createElement('a');
    const nameOnly = item.videoName.substring(0, item.videoName.lastIndexOf('.')) || item.videoName;
    link.href = item.src;
    link.download = `${nameOnly}_frame_${item.type}_${item.id.slice(0,4)}.png`;
    link.click();
  };

  // --- Funções de Lote (Batch) ---

  const toggleSelection = (id: string) => {
    setSelectedGalleryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!activeProject) return;
    if (selectedGalleryIds.size === activeProject.galleryItems.length) {
      setSelectedGalleryIds(new Set());
    } else {
      setSelectedGalleryIds(new Set(activeProject.galleryItems.map(i => i.id)));
    }
  };

  const deleteSelected = () => {
    if (!activeProject) return;
    if (confirm(`Tem certeza que deseja excluir ${selectedGalleryIds.size} itens?`)) {
        setProjects(prev => prev.map(proj => {
            if(proj.id !== activeProjectId) return proj;
            return {
                ...proj,
                galleryItems: proj.galleryItems.filter(item => !selectedGalleryIds.has(item.id))
            };
        }));
        setSelectedGalleryIds(new Set());
    }
  };

  const downloadBatchZip = async () => {
    if (selectedGalleryIds.size === 0 || !activeProject) return;
    setIsZipping(true);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const folderName = activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const folder = zip.folder(`${folderName}_frames`);

      selectedGalleryIds.forEach(id => {
        const item = activeProject.galleryItems.find(i => i.id === id);
        if (item) {
          const base64Data = item.src.split(',')[1];
          const nameOnly = item.videoName.substring(0, item.videoName.lastIndexOf('.')) || item.videoName;
          const fileName = `${nameOnly}_${item.type}_${item.id.slice(0,4)}.png`;
          folder?.file(fileName, base64Data, { base64: true });
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}_batch_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

    } catch (error) {
      console.error("Erro ao criar ZIP:", error);
      alert("Ocorreu um erro ao compactar os arquivos.");
    } finally {
      setIsZipping(false);
    }
  };

  // Helper para formatar tempo total
  const formatTotalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- RENDERIZADORES ---

  const isAllSelected = activeProject && activeProject.galleryItems.length > 0 && selectedGalleryIds.size === activeProject.galleryItems.length;

  return (
    <div className="flex h-screen bg-[#0c0a09] overflow-hidden font-sans text-stone-200 animate-fade-in">
      
      {/* SIDEBAR */}
      <aside className="flex-shrink-0 w-20 bg-[#1c1917] border-r border-[#292524] flex flex-col items-center z-50 transition-all duration-300 shadow-2xl">
        
        {/* Logo */}
        <div className="h-24 w-full flex items-center justify-center border-b border-[#292524] mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 to-transparent opacity-50"></div>
          <div className="relative group cursor-pointer" onClick={exitProject}>
            <div className="bg-gradient-to-br from-orange-500 via-red-600 to-stone-900 w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_15px_rgba(234,88,12,0.4)] border border-orange-500/30 group-hover:scale-105 transition-transform duration-300">
              <span className="drop-shadow-md">FF</span>
            </div>
          </div>
        </div>

        {/* Menu Principal */}
        <div className="flex-1 w-full flex flex-col items-center gap-6 px-3 pt-2">
          
          {/* Botão: Meus Projetos */}
          <button 
            onClick={exitProject}
            className={`
                group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                ${!activeProjectId 
                    ? 'bg-[#292524] text-white shadow-inner border border-stone-700' 
                    : 'text-stone-500 hover:bg-[#292524] hover:text-white'
                }
            `}
            title="Meus Projetos"
          >
            <FolderOpen className="w-6 h-6" />
            <span className="absolute left-14 bg-[#292524] text-stone-300 text-xs px-2 py-1 rounded border border-stone-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                Projetos
            </span>
          </button>

          <div className="w-8 h-px bg-[#292524]"></div>

          {/* Botões do Projeto (Visíveis sempre, mas desativados se !activeProject) */}
          <button 
            onClick={() => activeProjectId && setCurrentView('timeline')}
            disabled={!activeProjectId}
            className={`
                group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                ${activeProjectId && currentView === 'timeline' 
                    ? 'bg-gradient-to-br from-orange-600 to-red-700 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)] border border-orange-500/20' 
                    : 'text-stone-500 hover:bg-[#292524] hover:text-orange-400'
                }
                ${!activeProjectId ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-stone-500' : ''}
            `}
            title="Timeline"
          >
            <Workflow className={`w-6 h-6 ${activeProjectId && currentView === 'timeline' ? 'animate-pulse' : ''}`} />
            <span className="absolute left-14 bg-[#292524] text-orange-100 text-xs px-2 py-1 rounded border border-orange-900/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                Studio
            </span>
          </button>

          <button 
            onClick={() => activeProjectId && setCurrentView('gallery')}
            disabled={!activeProjectId}
            className={`
                group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300
                ${activeProjectId && currentView === 'gallery' 
                    ? 'bg-gradient-to-br from-orange-600 to-red-700 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)] border border-orange-500/20' 
                    : 'text-stone-500 hover:bg-[#292524] hover:text-orange-400'
                }
                ${!activeProjectId ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-stone-500' : ''}
            `}
            title="Galeria"
          >
            <LayoutGrid className="w-6 h-6" />
            {activeProject && activeProject.galleryItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-[#1c1917] shadow-sm">
                    {activeProject.galleryItems.length}
                </span>
            )}
            <span className="absolute left-14 bg-[#292524] text-orange-100 text-xs px-2 py-1 rounded border border-orange-900/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50">
                Galeria
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden bg-[#0c0a09]">
        
        {/* --- CENÁRIO 1: DASHBOARD DE PROJETOS --- */}
        {!activeProjectId && (
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col">
                 <div className="max-w-6xl mx-auto w-full animate-fade-in flex-1 flex flex-col">
                      
                      {/* Empty State ou Grid */}
                      {projects.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
                            <div className="relative group cursor-pointer mb-8" onClick={handleCreateProjectClick}>
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                                <div className="relative w-32 h-32 bg-[#1c1917] rounded-3xl border-2 border-dashed border-[#292524] flex items-center justify-center group-hover:border-orange-500/50 group-hover:scale-105 transition-all">
                                    <Plus className="w-12 h-12 text-stone-600 group-hover:text-orange-500 transition-colors" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-white mb-2 text-center">Seu estúdio está vazio</h2>
                            <p className="text-stone-500 text-center max-w-md mb-8">
                                Nenhum projeto foi criado ainda. Inicie sua jornada de produção criando seu primeiro projeto vulcânico.
                            </p>
                            <button 
                                onClick={handleCreateProjectClick}
                                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl shadow-[0_0_25px_rgba(234,88,12,0.3)] hover:shadow-[0_0_40px_rgba(234,88,12,0.5)] transition-all flex items-center gap-3 transform hover:-translate-y-1"
                            >
                                <Flame className="w-5 h-5 fill-current" />
                                INICIAR NOVA PRODUÇÃO
                            </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-10">
                          
                          {/* Card Criar Novo (Sempre o primeiro) */}
                          <button 
                            onClick={handleCreateProjectClick}
                            className="group flex flex-col items-center justify-center aspect-[4/3] rounded-2xl border-2 border-dashed border-[#292524] hover:border-orange-500/50 bg-[#1c1917]/30 hover:bg-[#1c1917] transition-all cursor-pointer"
                          >
                              <div className="w-16 h-16 rounded-full bg-[#292524] group-hover:bg-orange-900/20 flex items-center justify-center mb-4 transition-colors">
                                  <Plus className="w-8 h-8 text-stone-600 group-hover:text-orange-500" />
                              </div>
                              <span className="font-bold text-stone-500 group-hover:text-stone-300">Criar Novo Projeto</span>
                          </button>

                          {/* Lista de Projetos Existentes */}
                          {projects.map(project => (
                              <div 
                                key={project.id}
                                onClick={() => openProject(project.id)}
                                className="group relative flex flex-col aspect-[4/3] bg-[#1c1917] rounded-2xl border border-[#292524] hover:border-orange-500/30 overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1"
                              >
                                  {/* Thumbnail */}
                                  <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center border-b border-[#292524]">
                                      {project.videos.length > 0 ? (
                                          <div className="relative w-full h-full">
                                              <video 
                                                src={project.videos[0].url + "#t=0.5"} 
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity grayscale group-hover:grayscale-0"
                                                muted
                                                preload="metadata"
                                              />
                                              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-transparent to-transparent"></div>
                                          </div>
                                      ) : (
                                          <Film className="w-12 h-12 text-[#292524] group-hover:text-orange-900/50 transition-colors" />
                                      )}
                                      
                                      {/* Tags */}
                                      <div className="absolute top-3 left-3">
                                          <span className="px-2 py-0.5 bg-black/60 backdrop-blur text-[9px] font-bold text-stone-400 rounded border border-stone-800 uppercase">
                                              {project.aspectRatio}
                                          </span>
                                      </div>

                                      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                                          {project.videos.length > 0 && (
                                              <span className="px-2 py-1 bg-black/60 backdrop-blur text-[10px] font-bold text-stone-300 rounded flex items-center gap-1 border border-stone-800">
                                                  <Video className="w-3 h-3 text-orange-500" /> {project.videos.length}
                                              </span>
                                          )}
                                      </div>
                                  </div>

                                  <div className="p-4 relative">
                                      <h3 className="font-bold text-stone-200 group-hover:text-white truncate pr-8 mb-1">{project.name}</h3>
                                      <div className="flex items-center gap-3 text-[10px] text-stone-600 font-mono uppercase tracking-wide">
                                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(project.lastModified).toLocaleDateString()}</span>
                                      </div>

                                      <button 
                                        onClick={(e) => deleteProject(e, project.id)}
                                        className="absolute bottom-4 right-4 p-2 text-stone-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Excluir Projeto"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                        </div>
                      )}
                 </div>
             </div>
        )}

        {/* --- CENÁRIO 2: EDITOR DO PROJETO --- */}
        {activeProjectId && activeProject && (
            <>
                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/80 to-transparent z-30 pointer-events-none flex justify-center pt-3">
                    <div className="px-4 py-1.5 bg-[#1c1917]/90 backdrop-blur rounded-full border border-stone-800 flex items-center gap-2 pointer-events-auto shadow-lg">
                        <FolderOpen className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-[11px] font-bold text-stone-300 uppercase tracking-widest">{activeProject.name}</span>
                        <span className="w-px h-3 bg-stone-700 mx-1"></span>
                        <span className="text-[9px] text-stone-500 font-mono">{activeProject.aspectRatio}</span>
                        {activeProjectDuration > 0 && (
                            <>
                                <span className="w-px h-3 bg-stone-700 mx-1"></span>
                                <span className="text-[9px] text-orange-400 font-mono flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatTotalTime(activeProjectDuration)}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {currentView === 'timeline' && (
                    <TimelineEditor 
                        videos={activeProject.videos} 
                        initialAspectRatio={activeProject.aspectRatio}
                        setVideos={(val) => updateActiveProjectVideos(val)} 
                        onAddToGallery={(src, type, name) => addToGallery(src, type, name)}
                        onAddFiles={handleFiles}
                        onRenameVideo={handleRenameVideo}
                        onUpdateVideo={handleUpdateVideo}
                        onTotalDurationChange={setActiveProjectDuration}
                    />
                )}

                {currentView === 'gallery' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1c1917] to-[#0c0a09]">
                         <div className="max-w-6xl mx-auto animate-fade-in pt-6">
                           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-[#292524] pb-6">
                             <div>
                                <h2 className="text-3xl font-black text-white flex items-center gap-2 tracking-tight">
                                    <span className="text-orange-500"><LayoutGrid className="w-8 h-8" /></span>
                                    Galeria
                                </h2>
                                <p className="text-stone-500 text-sm mt-1">Gerencie e exporte as capturas deste projeto.</p>
                             </div>
                             
                             {activeProject.galleryItems.length > 0 && (
                               <div className="flex items-center gap-3 bg-[#1c1917] p-2 rounded-xl border border-[#292524] shadow-lg">
                                 <button 
                                   onClick={toggleSelectAll}
                                   className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-400 hover:text-white hover:bg-[#292524] rounded-lg transition-colors"
                                 >
                                   {isAllSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4" />}
                                   {isAllSelected ? 'Desmarcar' : 'Selecionar Tudo'}
                                 </button>
                                 
                                 <div className="w-px h-6 bg-stone-700 mx-1"></div>

                                 <button
                                    onClick={downloadBatchZip}
                                    disabled={selectedGalleryIds.size === 0 || isZipping}
                                    className={`
                                      flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all
                                      ${selectedGalleryIds.size > 0 
                                        ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)]' 
                                        : 'bg-[#292524] text-stone-600 cursor-not-allowed'}
                                    `}
                                 >
                                   {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                   BAIXAR ZIP ({selectedGalleryIds.size})
                                 </button>

                                 <button
                                    onClick={deleteSelected}
                                    disabled={selectedGalleryIds.size === 0}
                                    className={`
                                      p-2 rounded-lg transition-all
                                      ${selectedGalleryIds.size > 0 
                                        ? 'bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-900/30' 
                                        : 'bg-transparent text-stone-700 cursor-not-allowed'}
                                    `}
                                    title="Excluir selecionados"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             )}
                           </div>
                           
                           {activeProject.galleryItems.length === 0 ? (
                             <div className="flex flex-col items-center justify-center h-96 text-stone-600 border border-dashed border-[#292524] rounded-3xl bg-[#1c1917]/30">
                               <div className="p-6 bg-[#0c0a09] rounded-full mb-4 shadow-inner">
                                    <Flame className="w-12 h-12 text-stone-700" />
                               </div>
                               <p className="font-medium">Sua galeria está fria.</p>
                               <p className="text-xs text-stone-700 mt-1">Capture frames na timeline para aquecer as coisas.</p>
                               <button onClick={() => setCurrentView('timeline')} className="mt-6 px-6 py-2 bg-stone-800 hover:bg-orange-600 hover:text-white text-stone-400 rounded-full text-sm transition-all">
                                 Ir para Timeline
                               </button>
                             </div>
                           ) : (
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                               {activeProject.galleryItems.map((item) => {
                                 const isSelected = selectedGalleryIds.has(item.id);
                                 return (
                                   <div 
                                    key={item.id} 
                                    onClick={() => toggleSelection(item.id)}
                                    className={`
                                      group relative aspect-video bg-black rounded-xl overflow-hidden cursor-pointer transition-all duration-300
                                      ${isSelected 
                                        ? 'ring-2 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-[1.02] z-10' 
                                        : 'border border-[#292524] hover:border-orange-500/50 hover:shadow-lg'
                                      }
                                    `}
                                   >
                                     <img src={item.src} className="w-full h-full object-contain" />
                                     <div className={`
                                        absolute inset-0 transition-colors flex flex-col justify-between p-3
                                        ${isSelected ? 'bg-orange-900/20' : 'bg-black/0 group-hover:bg-black/60'}
                                     `}>
                                       <div className="flex justify-between items-start">
                                         <div className={`
                                            w-5 h-5 rounded flex items-center justify-center transition-all shadow-sm
                                            ${isSelected ? 'bg-orange-500 text-white' : 'bg-black/50 border border-white/20 text-transparent hover:border-orange-400'}
                                         `}>
                                           <CheckSquare className="w-3.5 h-3.5" />
                                         </div>
                                         {!isSelected && (
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); removeFromGallery(item.id); }} 
                                              className="p-1.5 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                         )}
                                       </div>
                                       <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                                          <p className="text-[10px] text-white/90 truncate font-mono mb-1 drop-shadow-md border-l-2 border-orange-500 pl-2">{item.videoName}</p>
                                          {!isSelected && (
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); downloadGalleryItem(item); }}
                                              className="w-full py-1.5 bg-stone-100 text-stone-900 text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-colors"
                                            >
                                              <Download className="w-3 h-3" /> Baixar
                                            </button>
                                          )}
                                       </div>
                                     </div>
                                     <div className="absolute top-3 left-10 pointer-events-none">
                                        <span className={`px-2 py-0.5 text-[9px] text-white rounded-sm uppercase font-bold tracking-wider shadow-lg
                                            ${item.type === 'inicio' ? 'bg-blue-600/80' : 
                                              item.type === 'final' ? 'bg-red-600/80' : 'bg-orange-600/80'}
                                        `}>
                                          {item.type}
                                        </span>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           )}
                        </div>
                    </div>
                )}
            </>
        )}
      </main>

      {/* MODAL DE CRIAÇÃO DE PROJETO */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-[60] bg-[#0c0a09]/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-[#1c1917] w-full max-w-md rounded-3xl border border-[#292524] shadow-2xl overflow-hidden relative">
              {/* Fechar */}
              <button 
                onClick={() => setIsCreatingProject(false)}
                className="absolute top-4 right-4 p-2 text-stone-500 hover:text-white hover:bg-stone-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                 <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-600/20">
                    <Plus className="w-8 h-8 text-white" />
                 </div>
                 
                 <h2 className="text-2xl font-black text-white mb-2">Novo Projeto</h2>
                 <p className="text-stone-500 text-sm mb-8">Defina os detalhes da sua nova produção.</p>
                 
                 {/* Nome do Projeto */}
                 <div className="mb-6 space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Nome do Projeto</label>
                    <input 
                      type="text" 
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Ex: Comercial Verão 2024"
                      className="w-full bg-[#0c0a09] border border-[#292524] rounded-xl px-4 py-3 text-white placeholder:text-stone-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                      autoFocus
                    />
                 </div>

                 {/* Aspect Ratio */}
                 <div className="mb-8 space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Formato do Vídeo</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button 
                           onClick={() => setNewProjectRatio('16:9')}
                           className={`
                             flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                             ${newProjectRatio === '16:9' 
                               ? 'bg-orange-600/10 border-orange-500 text-orange-500' 
                               : 'bg-[#0c0a09] border-[#292524] text-stone-500 hover:border-stone-600 hover:text-stone-300'
                             }
                           `}
                        >
                            <Monitor className="w-6 h-6 mb-2" />
                            <span className="text-[10px] font-bold">16:9</span>
                        </button>

                        <button 
                           onClick={() => setNewProjectRatio('9:16')}
                           className={`
                             flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                             ${newProjectRatio === '9:16' 
                               ? 'bg-orange-600/10 border-orange-500 text-orange-500' 
                               : 'bg-[#0c0a09] border-[#292524] text-stone-500 hover:border-stone-600 hover:text-stone-300'
                             }
                           `}
                        >
                            <Smartphone className="w-6 h-6 mb-2" />
                            <span className="text-[10px] font-bold">9:16</span>
                        </button>

                        <button 
                           onClick={() => setNewProjectRatio('1:1')}
                           className={`
                             flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all
                             ${newProjectRatio === '1:1' 
                               ? 'bg-orange-600/10 border-orange-500 text-orange-500' 
                               : 'bg-[#0c0a09] border-[#292524] text-stone-500 hover:border-stone-600 hover:text-stone-300'
                             }
                           `}
                        >
                            <SquareIcon className="w-6 h-6 mb-2" />
                            <span className="text-[10px] font-bold">1:1</span>
                        </button>
                    </div>
                 </div>

                 <button 
                    onClick={confirmCreateProject}
                    disabled={!newProjectName.trim()}
                    className={`
                      w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg
                      ${newProjectName.trim() 
                        ? 'bg-white text-black hover:bg-orange-500 hover:text-white shadow-orange-500/20' 
                        : 'bg-[#292524] text-stone-600 cursor-not-allowed'}
                    `}
                 >
                    CRIAR PROJETO
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;