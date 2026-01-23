
import React, { useState, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { GeneratedImage, AppState, ProductCategory } from './types';

const Header: React.FC = () => (
  <header className="py-10 px-16 border-b border-slateborder flex justify-between items-center bg-charchar/95 backdrop-blur-3xl sticky top-0 z-50">
    <div className="flex items-center gap-8 group cursor-pointer">
      <div className="w-16 h-16 bg-indigo-500 rounded-3xl flex items-center justify-center font-serif font-bold text-4xl text-white shadow-[0_0_40px_rgba(91,108,255,0.4)] transition-all group-hover:scale-105 active:scale-95">V</div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-softwhite font-sans uppercase">VisionCraft <span className="text-indigo-500">Studio</span></h1>
        <p className="text-[11px] font-black tracking-[0.6em] text-coolgray uppercase opacity-40">Luxury Rendering Core v4.0</p>
      </div>
    </div>
    <div className="hidden xl:flex items-center gap-16 text-[11px] font-bold tracking-[0.5em] text-coolgray uppercase">
      <span className="flex items-center gap-4"><span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_15px_#22c55e]"></span> Neural Engine Active</span>
      <span className="px-6 py-2 rounded-full border border-white/10 bg-white/5">Studio Edition</span>
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
    const checkKeyStatus = async () => {
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio && await aistudio.hasSelectedApiKey()) {
          setAppState(AppState.IDLE);
        } else if (process.env.API_KEY && process.env.API_KEY.length > 5) {
          setAppState(AppState.IDLE);
        }
      } catch (e) {
        // Silent fail, wait for user interaction
      }
    };
    checkKeyStatus();
  }, []);

  useEffect(() => {
    let interval: number;
    if (appState === AppState.GENERATING) {
      const messages = [
        "Analyzing surface geometry...",
        "Tracing light paths...",
        "Synthesizing 4K environment...",
        "Calibrating material shaders...",
        "Finalizing neural rendering..."
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = window.setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const handleKeySelection = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Assume success as per race-condition instructions
      setAppState(AppState.IDLE);
    } else {
      // In non-supported environments, move to IDLE and rely on process.env
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
        throw new Error("The rendering engine failed to generate the collection. Please ensure your API key has high-fidelity permissions.");
      }

      setGeneratedImages(results.map((r, i) => ({ ...r, id: `${Date.now()}-${i}` })));
      setAppState(AppState.VIEWING);
    } catch (err: any) {
      console.error(err);
      if (err.message === "API_KEY_MISSING" || err.message.includes("403") || err.message.includes("API key")) {
        setAppState(AppState.KEY_SELECTION);
      } else {
        setErrorLog(err.message || "Synthesis failed. Please check your asset and try again.");
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
      setErrorLog(e.message || "Refinement cycle failed.");
      setAppState(AppState.VIEWING);
    }
  };

  if (appState === AppState.KEY_SELECTION) {
    return (
      <div className="min-h-screen bg-charchar flex items-center justify-center p-16 text-center animate-reveal">
        <div className="max-w-2xl w-full space-y-16 luxury-card p-24 rounded-[4rem] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
          <div className="w-28 h-28 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20 shadow-4xl">
            <svg className="w-14 h-14 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div className="space-y-8">
            <h2 className="text-6xl font-serif font-bold text-glow tracking-tight">Studio Authorization</h2>
            <p className="text-coolgray text-xl font-light leading-relaxed px-10">Accessing the 4K neural rendering pipeline requires a high-fidelity authorization token.</p>
          </div>
          <div className="space-y-6">
            <button onClick={handleKeySelection} className="w-full bg-indigo-500 hover:bg-indigo-600 py-8 rounded-3xl font-bold uppercase tracking-[0.5em] text-[14px] transition-all shadow-4xl hover:scale-[1.03] active:scale-[0.97]">Initialize Session</button>
            <p className="text-[10px] text-coolgray/30 uppercase tracking-[0.8em]">Encrypted Connection Required</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-charchar text-softwhite selection:bg-indigo-500/30">
      <Header />

      <main className="flex-grow max-w-[1400px] mx-auto w-full px-16 py-32 relative">
        {errorLog && (
          <div className="mb-20 bg-red-500/10 border border-red-500/20 p-10 rounded-[3rem] animate-reveal flex items-start gap-10">
            <div className="bg-red-500/20 p-5 rounded-2xl shadow-xl"><svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <div className="flex-grow">
              <h4 className="font-bold text-red-500 uppercase tracking-[0.4em] text-[12px] mb-3">Pipeline Disruption</h4>
              <p className="text-lg text-red-200/70 leading-relaxed font-serif italic">{errorLog}</p>
            </div>
            <button onClick={() => setErrorLog(null)} className="text-red-500/40 hover:text-red-500 uppercase text-[11px] font-black tracking-widest mt-2">Dismiss</button>
          </div>
        )}

        {appState === AppState.GENERATING ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-20 animate-reveal">
            <div className="relative w-56 h-56">
              <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-10 border-r-2 border-white/5 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-20 bg-indigo-500/10 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(91,108,255,0.2)]">
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_30px_#5b6cff]"></div>
              </div>
            </div>
            <div className="text-center space-y-8 max-w-lg">
              <h2 className="text-6xl font-serif font-bold italic text-glow tracking-tight leading-tight">{loadingMessage}</h2>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 animate-[loading_4s_ease-in-out_infinite]"></div>
              </div>
              <p className="text-[12px] text-coolgray tracking-[1em] uppercase font-black opacity-30">Neural Synthesis Pipeline v4.0</p>
            </div>
          </div>
        ) : appState === AppState.EDITING ? (
          <div className="animate-reveal max-w-7xl mx-auto">
            <button onClick={() => setAppState(AppState.VIEWING)} className="mb-20 text-coolgray hover:text-white text-[12px] font-bold uppercase tracking-[0.6em] flex items-center gap-6 group">
              <span className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/5 transition-all group-hover:scale-110">←</span>
              Repository View
            </button>
            <div className="grid lg:grid-cols-2 gap-32 items-center">
              <div className="gradient-border p-3 overflow-hidden shadow-5xl group relative">
                <img src={editingImage?.url} className="w-full h-auto rounded-[1.6rem] group-hover:scale-110 transition-transform duration-[5s] ease-out" />
                <div className="absolute top-10 left-10 px-6 py-2 bg-charchar/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] uppercase font-black tracking-widest text-indigo-400">Master Frame</div>
              </div>
              <div className="space-y-20">
                <div className="space-y-8">
                  <h2 className="text-8xl font-serif font-bold text-glow tracking-tighter leading-none">Studio <span className="text-indigo-500 italic">Refinement</span></h2>
                  <p className="text-coolgray text-2xl font-light leading-relaxed italic">Fine-tune the neural plate variables to achieve the perfect campaign aesthetic.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {["Studio Lighting", "High Polish", "Sunset Glow", "Editorial Sharp", "Natural Bokeh"].map(tag => (
                    <button key={tag} onClick={() => setEditPrompt(p => p ? `${p}, ${tag}` : tag)} className="px-8 py-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all hover:scale-105 active:scale-95">+{tag}</button>
                  ))}
                </div>
                <div className="space-y-6">
                  <label className="text-[11px] font-black uppercase tracking-[0.5em] text-coolgray/50 ml-10">Neural Direction Prompt</label>
                  <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="E.g., 'Enhance the metallic shimmer and add soft evening backlighting...'" className="w-full bg-slateborder/50 border border-slateborder rounded-[3rem] p-12 min-h-[280px] outline-none focus:border-indigo-500/50 transition-all text-lg leading-relaxed font-serif italic" />
                </div>
                <button onClick={submitEdit} className="w-full bg-indigo-500 py-10 rounded-[3rem] font-bold uppercase tracking-[0.6em] text-[15px] shadow-5xl hover:bg-indigo-600 transition-all hover:scale-[1.02] active:scale-[0.98]">Update Master Asset</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-72">
            <section className="text-center space-y-24 animate-reveal">
              <div className="inline-block px-10 py-4 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[11px] font-black tracking-[0.6em] uppercase">Enterprise Visualization Engine</div>
              <h2 className="text-9xl md:text-[13rem] font-serif font-bold tracking-tighter leading-[0.75] text-glow">
                Asset to <span className="text-indigo-500 italic">Plate.</span>
              </h2>
              <p className="text-3xl text-coolgray max-w-3xl mx-auto font-light leading-relaxed opacity-70">Industrial-grade 4K neural rendering pipeline for luxury goods, campaign editorial, and product storytelling.</p>
              
              <div className="flex flex-wrap justify-center gap-8">
                {[ProductCategory.JEWELRY, ProductCategory.FASHION, ProductCategory.RESTAURANT].map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`px-20 py-6 rounded-3xl text-[14px] font-bold tracking-[0.4em] uppercase transition-all border ${category === cat ? 'bg-indigo-500 border-indigo-500 shadow-4xl text-white' : 'border-slateborder text-coolgray hover:border-indigo-500/50 hover:text-white'}`}>{cat}</button>
                ))}
              </div>

              {!selectedImage ? (
                <div className="pt-32">
                  <label className="inline-block bg-softwhite text-charchar px-24 py-12 rounded-[3.5rem] font-bold cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-5xl uppercase tracking-[0.6em] text-[15px] hover:scale-105 active:scale-95">
                    Upload Master Asset
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="mt-16 text-[12px] text-coolgray uppercase tracking-[0.8em] font-bold opacity-20">Optimized for Ultra-High Resolution (4K)</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-32 pt-16">
                  <div className="p-12 glass-card rounded-[6rem] relative shadow-5xl group transition-all hover:border-indigo-500/20">
                    <img src={selectedImage} className="w-[500px] h-[500px] object-contain rounded-[3rem] transition-transform duration-[5s] group-hover:scale-105" />
                    <button onClick={() => { setSelectedImage(null); setGeneratedImages([]); }} className="absolute -top-8 -right-8 bg-charchar border border-slateborder w-20 h-20 rounded-full flex items-center justify-center text-5xl hover:bg-red-500 hover:border-red-500 transition-all shadow-4xl hover:rotate-90">×</button>
                  </div>
                  {generatedImages.length === 0 && (
                    <div className="w-full max-w-3xl space-y-20">
                      <div className="space-y-8 text-left">
                        <label className="text-[12px] font-black uppercase tracking-[0.6em] text-coolgray/40 ml-10">Campaign Briefing (Direction)</label>
                        <textarea value={creativeBrief} onChange={e => setCreativeBrief(e.target.value)} placeholder="E.g., 'Sunset in a high-rise Tokyo penthouse, moody indigo lighting, soft blur...'" className="w-full bg-slateborder/40 border border-slateborder rounded-[4rem] p-16 min-h-[220px] outline-none focus:border-indigo-500 transition-all text-xl leading-relaxed font-serif italic" />
                      </div>
                      <button onClick={generate} className="w-full bg-indigo-500 py-12 rounded-[4rem] font-bold uppercase tracking-[0.7em] text-[16px] shadow-5xl hover:bg-indigo-600 transition-all hover:scale-[1.01] active:scale-[0.99]">Initialize Pipeline</button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {generatedImages.length > 0 && (
              <section className="space-y-40 animate-reveal">
                <div className="flex items-end justify-between border-b border-slateborder pb-20">
                  <div className="space-y-5">
                    <p className="text-indigo-500 text-[12px] font-black tracking-[0.8em] uppercase">Render Output Collection</p>
                    <h3 className="text-8xl font-serif font-bold text-glow tracking-tighter italic">Studio Repository</h3>
                  </div>
                  <div className="text-[14px] text-coolgray font-bold tracking-[0.5em] uppercase opacity-30">4K Synthetics Generated</div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-24">
                  {generatedImages.map(img => (
                    <div key={img.id} className="group glass-card rounded-[5rem] overflow-hidden hover:shadow-6xl transition-all border border-white/5">
                      <div className="aspect-[3/4] relative overflow-hidden bg-slateborder/30">
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[4s] ease-out" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charchar/90 via-charchar/10 to-transparent"></div>
                        
                        <div className="absolute bottom-16 left-16 right-16 space-y-6">
                           <div className="w-12 h-1 bg-indigo-500 transition-all group-hover:w-24"></div>
                           <p className="text-indigo-500 text-[12px] font-black tracking-[0.8em] uppercase">Neural Plate</p>
                           <p className="text-softwhite text-3xl font-serif italic leading-snug line-clamp-2">"{img.scenario}"</p>
                        </div>
                      </div>
                      <div className="p-16 flex gap-8">
                        <button onClick={() => startEdit(img)} className="flex-1 bg-white/5 py-7 rounded-[2.5rem] text-[13px] font-bold uppercase tracking-[0.3em] hover:bg-softwhite hover:text-charchar transition-all border border-white/10 hover:scale-105">Refine Scene</button>
                        <a href={img.url} download={`render-${img.id}.png`} className="w-24 h-24 bg-indigo-500 rounded-[2.5rem] flex items-center justify-center hover:bg-softwhite hover:text-charchar transition-all shadow-2xl group/btn hover:scale-110"><svg className="w-10 h-10 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-64 text-center border-t border-slateborder/10 mt-80 bg-slateborder/5">
        <div className="space-y-16 opacity-40 group cursor-default">
           <div className="font-serif italic text-7xl text-softwhite group-hover:text-indigo-500 transition-all duration-700">VisionCraft Studio</div>
           <p className="text-coolgray text-[12px] font-black tracking-[1.5em] uppercase">&copy; 2025 VisionCraft Studio &bull; Precision Neural Synthesis</p>
        </div>
      </footer>

      {/* Atmospheric Studio Overlays */}
      <div className="fixed top-0 right-0 w-[150vw] h-[150vw] bg-indigo-500/5 rounded-full blur-[300px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <div className="fixed bottom-0 left-0 w-[120vw] h-[120vw] bg-indigo-500/5 rounded-full blur-[300px] pointer-events-none translate-y-1/2 -translate-x-1/3"></div>
    </div>
  );
}
