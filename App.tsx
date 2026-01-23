
import React, { useState, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { GeneratedImage, AppState, ProductCategory } from './types';

const Header: React.FC = () => (
  <header className="py-8 px-12 border-b border-slateborder flex justify-between items-center bg-charchar/90 backdrop-blur-2xl sticky top-0 z-50">
    <div className="flex items-center gap-6 group cursor-pointer">
      <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center font-serif font-bold text-3xl text-white shadow-[0_0_30px_rgba(91,108,255,0.4)] transition-all group-hover:rotate-6">V</div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-softwhite font-sans uppercase">VisionCraft <span className="text-indigo-500">Studio</span></h1>
        <p className="text-[10px] font-black tracking-[0.5em] text-coolgray uppercase opacity-50">High-Fidelity Rendering</p>
      </div>
    </div>
    <div className="hidden lg:flex items-center gap-12 text-[10px] font-bold tracking-[0.4em] text-coolgray uppercase">
      <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></span> Studio Online</span>
      <span className="opacity-30">v3.5.0-PRO</span>
    </div>
  </header>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.KEY_SELECTION);
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.JEWELRY);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [creativeBrief, setCreativeBrief] = useState('');
  const [errorLog, setErrorLog] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio && await aistudio.hasSelectedApiKey()) {
          setAppState(AppState.IDLE);
        } else if (process.env.API_KEY) {
          setAppState(AppState.IDLE);
        }
      } catch (e) {
        setAppState(AppState.IDLE);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    let interval: number;
    if (appState === AppState.GENERATING) {
      const messages = [
        "Analyzing asset geometry...",
        "Mapping environmental occlusion...",
        "Synthesizing 4K neural plate...",
        "Refining specular highlights...",
        "Finalizing high-fidelity render..."
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = window.setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const handleKeySelection = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setAppState(AppState.IDLE);
    } else {
      setAppState(AppState.IDLE);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setAppState(AppState.VIEWING);
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!selectedImage) return;
    setErrorLog(null);
    try {
      setAppState(AppState.GENERATING);
      const scenarios = await GeminiService.generateScenarios(selectedImage, creativeBrief, category);
      const results = await GeminiService.generateModelImages(selectedImage, scenarios, category);
      
      if (results.length === 0) {
        throw new Error("The neural engine returned no results. This might be due to content filters or temporary model unavailability.");
      }

      setGeneratedImages(results.map((r, i) => ({ ...r, id: `${Date.now()}-${i}` })));
      setAppState(AppState.VIEWING);
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || "An unexpected error occurred during synthesis.");
      if (err.message && (err.message.includes("403") || err.message.includes("API_KEY"))) {
        setAppState(AppState.KEY_SELECTION);
      } else {
        setAppState(AppState.VIEWING);
      }
    }
  };

  const startEdit = (img: GeneratedImage) => {
    setEditingImage(img);
    setAppState(AppState.EDITING);
  };

  const submitEdit = async () => {
    if (!editingImage || !editPrompt) return;
    setErrorLog(null);
    try {
      setAppState(AppState.GENERATING);
      const newUrl = await GeminiService.editImage(editingImage.url, editPrompt);
      setGeneratedImages(prev => prev.map(img => img.id === editingImage.id ? { ...img, url: newUrl } : img));
      setEditingImage(null);
      setEditPrompt('');
      setAppState(AppState.VIEWING);
    } catch (e: any) {
      setErrorLog(e.message || "Refinement failed.");
      setAppState(AppState.VIEWING);
    }
  };

  if (appState === AppState.KEY_SELECTION) {
    return (
      <div className="min-h-screen bg-charchar flex items-center justify-center p-12 text-center animate-reveal">
        <div className="max-w-xl w-full space-y-12 luxury-card p-16 rounded-[3rem]">
          <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
            <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div className="space-y-6">
            <h2 className="text-5xl font-serif font-bold text-glow">Studio Initialization</h2>
            <p className="text-coolgray text-lg font-light leading-relaxed">To access the high-fidelity 4K rendering engine, please authorize your Gemini Pro credentials.</p>
          </div>
          <button onClick={handleKeySelection} className="w-full bg-indigo-500 hover:bg-indigo-600 py-6 rounded-2xl font-bold uppercase tracking-[0.4em] text-[12px] transition-all shadow-3xl hover:scale-[1.02]">Connect Secure Key</button>
          <div className="text-[9px] text-coolgray/30 uppercase tracking-[0.6em]">VisionCraft Enterprise &bull; Secure Session</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-charchar text-softwhite">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-12 py-24 relative">
        {errorLog && (
          <div className="mb-12 bg-red-500/10 border border-red-500/20 p-8 rounded-3xl animate-reveal flex items-start gap-6">
            <div className="bg-red-500/20 p-3 rounded-xl"><svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <div>
              <h4 className="font-bold text-red-500 uppercase tracking-widest text-[11px] mb-1">System Diagnostic Error</h4>
              <p className="text-sm text-red-200/60 leading-relaxed font-mono">{errorLog}</p>
            </div>
            <button onClick={() => setErrorLog(null)} className="ml-auto text-red-500/40 hover:text-red-500 uppercase text-[10px] font-bold tracking-widest">Dismiss</button>
          </div>
        )}

        {appState === AppState.GENERATING ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-16 animate-reveal">
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-8 border-r-2 border-white/5 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-16 bg-indigo-500/5 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_20px_#5b6cff]"></div>
              </div>
            </div>
            <div className="text-center space-y-6">
              <h2 className="text-5xl font-serif font-bold italic text-glow tracking-tight">{loadingMessage}</h2>
              <p className="text-[11px] text-coolgray tracking-[0.8em] uppercase font-black opacity-30">Neural Synthesis Pipeline v3.5</p>
            </div>
          </div>
        ) : appState === AppState.EDITING ? (
          <div className="animate-reveal max-w-6xl mx-auto">
            <button onClick={() => setAppState(AppState.VIEWING)} className="mb-16 text-coolgray hover:text-white text-[11px] font-bold uppercase tracking-[0.5em] flex items-center gap-4 group">
              <span className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/5 transition-colors">←</span>
              Studio Repository
            </button>
            <div className="grid lg:grid-cols-2 gap-24 items-center">
              <div className="gradient-border p-2 overflow-hidden shadow-4xl group">
                <img src={editingImage?.url} className="w-full h-auto rounded-[1.4rem] group-hover:scale-105 transition-transform duration-[3s]" />
              </div>
              <div className="space-y-14">
                <div className="space-y-6">
                  <h2 className="text-7xl font-serif font-bold text-glow tracking-tighter">Refinement <span className="text-indigo-500 italic">Studio</span></h2>
                  <p className="text-coolgray text-lg font-light leading-relaxed">Fine-tune the neural weights to adjust lighting intensity, material gloss, or scene composition.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {["Vogue Lighting", "High Gloss", "Dramatic Mood", "Hyper-Focus", "Soft Bokeh"].map(tag => (
                    <button key={tag} onClick={() => setEditPrompt(p => p ? `${p}, ${tag}` : tag)} className="px-6 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+{tag}</button>
                  ))}
                </div>
                <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="E.g., 'Enhance the metallic shimmer and add soft evening backlighting...'" className="w-full bg-slateborder/40 border border-slateborder rounded-[2rem] p-10 min-h-[250px] outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed" />
                <button onClick={submitEdit} className="w-full bg-indigo-500 py-8 rounded-3xl font-bold uppercase tracking-[0.5em] text-[13px] shadow-3xl hover:bg-indigo-600 transition-all hover:scale-[1.02] active:scale-[0.98]">Update Neural Plate</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-56">
            <section className="text-center space-y-20 animate-reveal">
              <div className="inline-block px-8 py-3 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[10px] font-black tracking-[0.5em] uppercase">Enterprise Product Visualization</div>
              <h2 className="text-8xl md:text-[11rem] font-serif font-bold tracking-tighter leading-[0.8] text-glow">
                Concept to <span className="text-indigo-500 italic">Visual.</span>
              </h2>
              <p className="text-2xl text-coolgray max-w-2xl mx-auto font-light leading-relaxed opacity-80">Industrial-grade 4K neural rendering pipeline for luxury goods and high-end marketing collateral.</p>
              
              <div className="flex flex-wrap justify-center gap-6">
                {[ProductCategory.JEWELRY, ProductCategory.FASHION, ProductCategory.RESTAURANT].map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`px-14 py-5 rounded-2xl text-[12px] font-bold tracking-[0.3em] uppercase transition-all border ${category === cat ? 'bg-indigo-500 border-indigo-500 shadow-2xl text-white' : 'border-slateborder text-coolgray hover:border-indigo-500/40 hover:text-white'}`}>{cat}</button>
                ))}
              </div>

              {!selectedImage ? (
                <div className="pt-24">
                  <label className="inline-block bg-softwhite text-charchar px-20 py-10 rounded-[2.5rem] font-bold cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-4xl uppercase tracking-[0.5em] text-[13px] hover:scale-105 active:scale-95">
                    Upload High-Res Asset
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="mt-12 text-[11px] text-coolgray uppercase tracking-[0.6em] font-bold opacity-25">Optimized for Studio Integration</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-24 pt-12">
                  <div className="p-10 glass-card rounded-[5rem] relative shadow-4xl group">
                    <img src={selectedImage} className="w-96 h-96 object-contain rounded-3xl transition-transform duration-[4s] group-hover:scale-105" />
                    <button onClick={() => { setSelectedImage(null); setGeneratedImages([]); }} className="absolute -top-6 -right-6 bg-charchar border border-slateborder w-16 h-16 rounded-full flex items-center justify-center text-4xl hover:bg-red-500 hover:border-red-500 transition-all shadow-2xl">×</button>
                  </div>
                  {generatedImages.length === 0 && (
                    <div className="w-full max-w-2xl space-y-16">
                      <div className="space-y-6 text-left">
                        <label className="text-[11px] font-black uppercase tracking-[0.5em] text-coolgray ml-6">Creative Brief (Optional)</label>
                        <textarea value={creativeBrief} onChange={e => setCreativeBrief(e.target.value)} placeholder="E.g., 'Sunset in a high-rise Tokyo penthouse, moody indigo lighting, soft blur...'" className="w-full bg-slateborder/30 border border-slateborder rounded-[3rem] p-12 min-h-[180px] outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed" />
                      </div>
                      <button onClick={generate} className="w-full bg-indigo-500 py-10 rounded-[3rem] font-bold uppercase tracking-[0.6em] text-[14px] shadow-4xl hover:bg-indigo-600 transition-all hover:scale-[1.01] active:scale-[0.99]">Initialize Pipeline</button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {generatedImages.length > 0 && (
              <section className="space-y-32 animate-reveal">
                <div className="flex items-end justify-between border-b border-slateborder pb-16">
                  <div className="space-y-3">
                    <p className="text-indigo-500 text-[11px] font-black tracking-[0.6em] uppercase">Output Masters</p>
                    <h3 className="text-7xl font-serif font-bold text-glow tracking-tighter italic">The Collection</h3>
                  </div>
                  <div className="text-[12px] text-coolgray font-bold tracking-[0.4em] uppercase opacity-40">3 Parallel Synthetics Generated</div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-20">
                  {generatedImages.map(img => (
                    <div key={img.id} className="group glass-card rounded-[4.5rem] overflow-hidden hover:shadow-4xl transition-all border border-white/5">
                      <div className="aspect-[3/4] relative overflow-hidden bg-slateborder/20">
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s] ease-out" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charchar via-charchar/10 to-transparent"></div>
                        
                        <div className="absolute bottom-14 left-14 right-14 space-y-4">
                           <p className="text-indigo-500 text-[11px] font-black tracking-[0.6em] uppercase">Studio Plate</p>
                           <p className="text-softwhite text-2xl font-serif italic leading-snug line-clamp-2">"{img.scenario}"</p>
                        </div>
                      </div>
                      <div className="p-14 flex gap-6">
                        <button onClick={() => startEdit(img)} className="flex-1 bg-white/5 py-6 rounded-[2rem] text-[12px] font-bold uppercase tracking-widest hover:bg-softwhite hover:text-charchar transition-all border border-white/10">Refine Scene</button>
                        <a href={img.url} download={`render-${img.id}.png`} className="w-20 h-20 bg-indigo-500 rounded-[2rem] flex items-center justify-center hover:bg-softwhite hover:text-charchar transition-all shadow-xl group/btn hover:scale-105"><svg className="w-8 h-8 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-48 text-center border-t border-slateborder/20 mt-64 bg-slateborder/5">
        <div className="space-y-12 opacity-40 group cursor-default">
           <div className="font-serif italic text-5xl text-softwhite group-hover:text-indigo-500 transition-colors">VisionCraft Studio</div>
           <p className="text-coolgray text-[11px] font-black tracking-[1.2em] uppercase">&copy; 2025 VisionCraft Studio &bull; Neural Visualization Engine</p>
        </div>
      </footer>

      {/* Atmospheric Studio Glows */}
      <div className="fixed top-0 right-0 w-[120vw] h-[120vw] bg-indigo-500/5 rounded-full blur-[250px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <div className="fixed bottom-0 left-0 w-[100vw] h-[100vw] bg-indigo-500/5 rounded-full blur-[250px] pointer-events-none translate-y-1/2 -translate-x-1/3"></div>
    </div>
  );
}
