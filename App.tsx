
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { GeneratedImage, AppState, ProductCategory } from './types';

const Header: React.FC = () => (
  <header className="py-6 px-10 border-b border-slateborder flex justify-between items-center bg-charchar/60 backdrop-blur-2xl sticky top-0 z-50">
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg shadow-[0_0_30px_rgba(91,108,255,0.4)] flex items-center justify-center font-serif font-bold text-xl text-white transition-all group-hover:scale-105 duration-500">VC</div>
      <div className="flex flex-col -space-y-1">
        <h1 className="text-lg font-bold tracking-tighter text-softwhite uppercase">
          VisionCraft <span className="text-indigo-500">Studio</span>
        </h1>
        <span className="text-[8px] font-black tracking-[0.6em] text-coolgray uppercase opacity-60">Intelligence & Visual Arts</span>
      </div>
    </div>
    <nav className="hidden md:flex gap-10 text-[9px] font-bold tracking-[0.4em] text-coolgray items-center uppercase">
      <span className="text-indigo-500 cursor-default">Rendering Pipeline</span>
      <span className="h-4 w-px bg-slateborder"></span>
      <span className="hover:text-softwhite transition-all cursor-default opacity-40">System Core v3.1</span>
    </nav>
  </header>
);

const Footer: React.FC = () => (
  <footer className="py-24 px-10 border-t border-slateborder text-center bg-charchar">
    <div className="max-w-7xl mx-auto flex flex-col items-center gap-10">
      <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-[9px] font-bold text-coolgray tracking-[0.5em] uppercase">
        <span className="hover:text-softwhite transition-colors cursor-pointer">Security Protocol</span>
        <span className="hover:text-softwhite transition-colors cursor-pointer">API Integration</span>
        <span className="hover:text-softwhite transition-colors cursor-pointer">Legal Compliance</span>
        <span className="hover:text-softwhite transition-colors cursor-pointer">Support Desk</span>
      </div>
      <div className="h-px w-16 bg-indigo-500/20"></div>
      <p className="text-coolgray/40 text-[9px] tracking-[0.6em] font-black uppercase">
        &copy; 2025 VisionCraft Intelligence Systems &bull; Proprietary Rendering Engine
      </p>
    </div>
  </footer>
);

const CategoryToggle: React.FC<{ 
  cat: ProductCategory; 
  active: boolean; 
  onClick: () => void; 
  label: string;
}> = ({ cat, active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-[0.4em] uppercase transition-all duration-300 border ${
      active 
        ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_10px_25px_rgba(91,108,255,0.3)]' 
        : 'bg-transparent border-slateborder text-coolgray hover:border-coolgray/30 hover:text-softwhite'
    }`}
  >
    {label}
  </button>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.JEWELRY);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [creativeBrief, setCreativeBrief] = useState('');
  const galleryRef = useRef<HTMLElement>(null);

  const STATUS_MESSAGES = [
    "Analyzing environment...",
    "Optimizing scene light vectors...",
    "Scanning surface geometry...",
    "Reconstructing facet precision...",
    "Executing high-fidelity render...",
    "Finalizing neural textures...",
    "Calibrating chromatic output..."
  ];

  useEffect(() => {
    let interval: number;
    if (appState === AppState.GENERATING) {
      let i = 0;
      setLoadingMessage(STATUS_MESSAGES[0]);
      interval = window.setInterval(() => {
        i = (i + 1) % STATUS_MESSAGES.length;
        setLoadingMessage(STATUS_MESSAGES[i]);
      }, 2800);
    }
    return () => clearInterval(interval);
  }, [appState]);

  useEffect(() => {
    if (generatedImages.length > 0 && appState === AppState.VIEWING) {
      galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [generatedImages, appState]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setAppState(AppState.VIEWING);
    };
    reader.readAsDataURL(file);
  };

  const generateModels = async () => {
    if (!selectedImage) return;

    try {
      setAppState(AppState.GENERATING);
      const scenarios = await GeminiService.generateScenarios(selectedImage, creativeBrief, category);
      const results = await GeminiService.generateModelImages(selectedImage, scenarios, category);
      
      const mapped = results.map((r, i) => ({
        id: `gen-${i}-${Date.now()}`,
        url: r.url,
        scenario: r.scenario,
        base64: r.base64
      }));

      setGeneratedImages(mapped);
      setAppState(AppState.VIEWING);
    } catch (error: any) {
      console.error(error);
      alert("Operational error detected in the neural pipeline. Resetting state.");
      setAppState(AppState.VIEWING);
    }
  };

  const startEdit = (image: GeneratedImage) => {
    setEditingImage(image);
    setAppState(AppState.EDITING);
  };

  const submitEdit = async () => {
    if (!editingImage || !editPrompt) return;
    try {
      setAppState(AppState.GENERATING);
      const newUrl = await GeminiService.editImage(editingImage.url, editPrompt);
      const updated = generatedImages.map(img => 
        img.id === editingImage.id ? { ...img, url: newUrl } : img
      );
      setGeneratedImages(updated);
      setEditingImage(null);
      setEditPrompt('');
      setAppState(AppState.VIEWING);
    } catch (error) {
      alert("Refinement engine failed to compile the request.");
      setAppState(AppState.VIEWING);
    }
  };

  const addRefinementTag = (tag: string) => {
    setEditPrompt(prev => prev ? `${prev}, ${tag}` : tag);
  };

  return (
    <div className="min-h-screen flex flex-col bg-charchar text-softwhite selection:bg-indigo-500/30">
      <Header />

      <main className="flex-grow max-w-[1200px] mx-auto w-full px-8 py-20">
        {appState === AppState.GENERATING ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-16 animate-in fade-in duration-1000">
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] rounded-full"></div>
              <div className="relative w-48 h-48 border border-slateborder rounded-full flex items-center justify-center">
                <svg className="absolute inset-0 w-48 h-48 animate-[spin_3s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" className="text-slateborder" />
                  <path d="M50 2 A48 48 0 0 1 98 50" fill="none" stroke="#5B6CFF" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="w-16 h-1 bg-indigo-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-serif font-bold italic text-glow tracking-tight text-softwhite">{loadingMessage}</h2>
              <p className="text-coolgray text-[10px] font-black tracking-[0.5em] uppercase opacity-60">Neural Synthesis Active</p>
            </div>
          </div>
        ) : appState === AppState.EDITING ? (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <button 
              onClick={() => setAppState(AppState.VIEWING)}
              className="mb-16 flex items-center gap-4 text-coolgray hover:text-softwhite transition-all font-black text-[9px] uppercase tracking-[0.4em] group"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span> Return to Repository
            </button>
            <div className="grid lg:grid-cols-2 gap-20 items-start">
              <div className="relative group rounded-[2.5rem] overflow-hidden border border-slateborder shadow-2xl p-4 bg-slateborder/20 backdrop-blur-3xl transition-all duration-700 hover:border-indigo-500/20">
                <img 
                  src={editingImage?.url} 
                  alt="Asset Preview" 
                  className="w-full h-auto rounded-[1.8rem] transition-transform duration-[4s] group-hover:scale-105 filter contrast-[1.05] brightness-[1.02]" 
                  style={{ imageRendering: 'high-quality' }}
                />
              </div>
              <div className="space-y-10 pt-4">
                <div className="space-y-4">
                  <div className="text-indigo-500 text-[10px] font-black tracking-[0.5em] uppercase">Contextual Refinement</div>
                  <h2 className="text-5xl font-serif font-bold tracking-tighter leading-none text-softwhite text-glow">Granular Control</h2>
                  <p className="text-coolgray text-base leading-relaxed font-medium">
                    Adjust specific visual attributes. Use the quick tags below to target granular refinement areas.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => addRefinementTag("Extreme Sharpness")} className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+ Sharpness</button>
                  <button onClick={() => addRefinementTag("Surface Texture Detail")} className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+ Texture</button>
                  <button onClick={() => addRefinementTag("Brilliant Stone Sparkle")} className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+ Sparkle</button>
                  <button onClick={() => addRefinementTag("Warmer Lighting")} className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+ Warmth</button>
                </div>

                <div className="space-y-8">
                  <div className="relative">
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Specify adjustment parameters or use tags above..."
                      className="w-full bg-slateborder/10 border border-slateborder rounded-3xl p-8 text-softwhite focus:outline-none focus:ring-1 focus:ring-indigo-500/30 min-h-[160px] resize-none text-base transition-all shadow-inner placeholder:text-coolgray/30"
                    />
                  </div>
                  <button
                    onClick={submitEdit}
                    disabled={!editPrompt}
                    className="w-full bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-10 py-6 rounded-2xl font-black transition-all shadow-xl uppercase tracking-[0.3em] text-[11px] active:scale-[0.98]"
                  >
                    Compute Refinement
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-40">
            <section className="text-center space-y-12 max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-slateborder bg-slateborder/20 text-indigo-500 text-[9px] font-black tracking-[0.5em] uppercase">
                Enterprise AI Visualization Platform
              </div>
              <h2 className="text-7xl md:text-[9rem] font-serif font-bold leading-[0.85] tracking-tighter text-softwhite text-glow">
                Concept to <span className="text-indigo-500 italic">Visual.</span>
              </h2>
              <p className="text-xl md:text-2xl text-coolgray max-w-2xl mx-auto font-medium leading-relaxed opacity-80">
                A high-fidelity rendering pipeline for professionals in jewelry, hospitality, and luxury fashion editorial.
              </p>

              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <CategoryToggle 
                  cat={ProductCategory.JEWELRY} 
                  active={category === ProductCategory.JEWELRY} 
                  onClick={() => setCategory(ProductCategory.JEWELRY)} 
                  label="Jewelry" 
                />
                <CategoryToggle 
                  cat={ProductCategory.RESTAURANT} 
                  active={category === ProductCategory.RESTAURANT} 
                  onClick={() => setCategory(ProductCategory.RESTAURANT)} 
                  label="Restaurant" 
                />
                <CategoryToggle 
                  cat={ProductCategory.FASHION} 
                  active={category === ProductCategory.FASHION} 
                  onClick={() => setCategory(ProductCategory.FASHION)} 
                  label="Fashion" 
                />
              </div>
              
              {!selectedImage ? (
                <div className="pt-16">
                  <label className="group relative inline-flex items-center gap-6 bg-softwhite text-charchar px-16 py-8 rounded-2xl font-black cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95 uppercase tracking-[0.4em] text-[12px]">
                    <svg className="w-6 h-6 group-hover:translate-y-[-1px] transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Initialize Asset
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="mt-8 text-coolgray text-[9px] font-black tracking-[0.3em] uppercase opacity-40">Industrial Grade Processing &bull; Secure Upload</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-14 pt-6 animate-in fade-in zoom-in-95 duration-1000">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000"></div>
                    <div className="relative p-8 bg-slateborder/10 border border-slateborder rounded-[3.5rem] backdrop-blur-3xl shadow-3xl overflow-hidden hover:border-indigo-500/20 transition-all">
                      <img 
                        src={selectedImage} 
                        alt="Asset" 
                        className="w-72 h-72 object-contain rounded-2xl filter brightness-[1.05]" 
                      />
                      <button 
                        onClick={() => { setSelectedImage(null); setGeneratedImages([]); }}
                        className="absolute top-10 right-10 bg-charchar/60 hover:bg-indigo-500 text-softwhite w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border border-slateborder font-black text-xl hover:scale-110"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {generatedImages.length === 0 && (
                    <div className="w-full max-w-2xl space-y-12 animate-in slide-in-from-bottom-8 duration-1000">
                      <div className="space-y-4 text-left">
                        <label className="text-[10px] font-black uppercase tracking-[0.5em] text-coolgray px-4">
                          Project Specification
                        </label>
                        <textarea
                          value={creativeBrief}
                          onChange={(e) => setCreativeBrief(e.target.value)}
                          placeholder={`Specify creative parameters for ${category.toLowerCase()} rendering...`}
                          className="w-full bg-slateborder/10 border border-slateborder rounded-[2.5rem] p-8 text-softwhite focus:outline-none focus:ring-1 focus:ring-indigo-500/30 min-h-[140px] resize-none text-base transition-all placeholder:text-coolgray/20 shadow-inner"
                        />
                        <div className="flex items-center gap-4 px-4 text-coolgray/40">
                          <div className="w-2 h-2 rounded-full bg-indigo-500/30 animate-pulse"></div>
                          <p className="text-[9px] font-black uppercase tracking-[0.4em] italic">
                            Pipeline Optimized for 4K Macro Reconstruction
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={generateModels}
                        className="group w-full bg-indigo-500 hover:bg-indigo-600 text-white px-20 py-8 rounded-[2rem] font-black transition-all shadow-[0_30px_60px_rgba(91,108,255,0.2)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-6 uppercase tracking-[0.4em] text-[12px]"
                      >
                        <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        Initialize Synthesis
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {generatedImages.length > 0 && (
              <section ref={galleryRef} className="space-y-24 animate-in fade-in slide-in-from-bottom-20 duration-[1500ms]">
                <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end border-b border-slateborder pb-16 gap-10">
                  <div className="text-center lg:text-left space-y-4">
                    <div className="inline-block px-4 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-[0.5em] mb-2">Synthesis Complete</div>
                    <h3 className="text-6xl font-serif font-bold tracking-tighter text-softwhite">Output Repository</h3>
                    <p className="text-coolgray text-[10px] font-black uppercase tracking-[0.6em] opacity-40">Pro-Tier Assets &bull; 4K Sub-Millimeter Focus</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={() => { setGeneratedImages([]); setSelectedImage(null); setCreativeBrief(''); }}
                      className="text-coolgray hover:text-softwhite text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4 px-10 py-5 rounded-2xl border border-slateborder transition-all bg-slateborder/10 hover:bg-slateborder/30"
                    >
                      New Assets
                    </button>
                    <button 
                      onClick={() => { setGeneratedImages([]); generateModels(); }}
                      className="text-indigo-500 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4 px-10 py-5 rounded-2xl border border-indigo-500/20 transition-all bg-indigo-500/5 hover:bg-indigo-500/20"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
                
                <div className={`grid grid-cols-1 ${generatedImages.length > 1 ? 'lg:grid-cols-2 xl:grid-cols-3' : 'max-w-4xl mx-auto'} gap-16`}>
                  {generatedImages.map((img) => (
                    <div key={img.id} className="group relative bg-slateborder/5 rounded-[4rem] overflow-hidden border border-slateborder transition-all duration-700 hover:border-indigo-500/40 hover:shadow-[0_80px_140px_rgba(0,0,0,0.8)] hover:-translate-y-2">
                      <div className="aspect-[3/4] overflow-hidden bg-charchar/40 relative">
                        <img 
                          src={img.url} 
                          alt={img.scenario} 
                          className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110 filter brightness-[1.03] contrast-[1.08]" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-charchar via-transparent to-transparent opacity-90"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-12 transform translate-y-8 group-hover:translate-y-0 transition-all duration-1000">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="w-8 h-px bg-indigo-500/50"></div>
                             <p className="text-indigo-500 text-[9px] font-black uppercase tracking-[0.6em]">Pro-4K Render</p>
                           </div>
                           <p className="text-softwhite text-lg leading-snug font-serif italic opacity-90 line-clamp-3 group-hover:opacity-100">"{img.scenario}"</p>
                        </div>
                      </div>
                      <div className="p-12 space-y-8 relative z-10 bg-charchar/80 backdrop-blur-xl">
                        <div className="flex gap-6">
                          <button 
                            onClick={() => startEdit(img)}
                            className="flex-1 bg-slateborder/10 hover:bg-softwhite text-coolgray hover:text-charchar py-5 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase border border-slateborder transition-all flex items-center justify-center gap-4"
                          >
                            Refine
                          </button>
                          <a 
                            href={img.url} 
                            download={`visioncraft-${category.toLowerCase()}-${Date.now()}.png`}
                            className="w-20 bg-indigo-500 hover:bg-softwhite text-white hover:text-charchar rounded-2xl flex items-center justify-center transition-all shadow-2xl active:scale-90"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
