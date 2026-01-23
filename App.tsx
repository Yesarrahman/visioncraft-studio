
import React, { useState, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { GeneratedImage, AppState, ProductCategory } from './types';

// The global declaration for window.aistudio is removed as it is already provided by the environment.
// We use type casting in the code to access it safely without conflicting with existing definitions.

const Header: React.FC = () => (
  <header className="py-8 px-12 border-b border-slateborder flex justify-between items-center bg-charchar/80 backdrop-blur-xl sticky top-0 z-50">
    <div className="flex items-center gap-5 group">
      <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center font-serif font-bold text-2xl text-white shadow-[0_0_25px_rgba(91,108,255,0.4)] transition-transform group-hover:scale-105">V</div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-softwhite font-sans uppercase">VisionCraft <span className="text-indigo-500">Studio</span></h1>
        <p className="text-[9px] font-black tracking-[0.4em] text-coolgray uppercase opacity-40">Industrial Rendering v3.2</p>
      </div>
    </div>
    <div className="hidden md:flex items-center gap-10 text-[10px] font-bold tracking-[0.3em] text-coolgray uppercase">
      <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Neural Engine Active</span>
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

  useEffect(() => {
    // Initial key check using environment-provided aistudio
    const checkKey = async () => {
      try {
        // First try the client-side integrator (secure key manager)
        const aistudio = (window as any).aistudio;
        if (aistudio && await aistudio.hasSelectedApiKey()) {
          setAppState(AppState.IDLE);
          return;
        }

        // If no client-side key, probe the server function to see if API key is configured
        const probe = await fetch('/.netlify/functions/genai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ping' })
        }).then(r => r.json()).catch(() => null);

        if (probe && probe.ok) {
          setAppState(AppState.IDLE);
          return;
        }

        // Otherwise remain in key selection so user can connect a client key
        setAppState(AppState.KEY_SELECTION);
      } catch (e) {
        setAppState(AppState.KEY_SELECTION);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    let interval: number;
    if (appState === AppState.GENERATING) {
      const messages = ["Analyzing surface geometry...", "Calculating specular maps...", "Synthesizing environment...", "Applying ray-traced lighting..."];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = window.setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const handleKeySelection = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        await aistudio.openSelectKey();
        // Proceeding to AppState.IDLE as instructed to mitigate race condition
        setAppState(AppState.IDLE);
      } else {
        setAppState(AppState.IDLE);
      }
    } catch (e) {
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
    try {
      setAppState(AppState.GENERATING);
      const scenarios = await GeminiService.generateScenarios(selectedImage, creativeBrief, category);
      const results = await GeminiService.generateModelImages(selectedImage, scenarios, category);
      setGeneratedImages(results.map((r, i) => ({ ...r, id: `${Date.now()}-${i}` })));
      setAppState(AppState.VIEWING);
    } catch (err: any) {
      console.error(err);
      // Reset key selection if specified error occurs as per guidelines
      if (err.message && (err.message.includes("entity was not found") || err.message.includes("API_KEY"))) {
        setAppState(AppState.KEY_SELECTION);
      } else {
        alert("Studio Pipeline Error. Please check your connection.");
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
    try {
      setAppState(AppState.GENERATING);
      const newUrl = await GeminiService.editImage(editingImage.url, editPrompt);
      setGeneratedImages(prev => prev.map(img => img.id === editingImage.id ? { ...img, url: newUrl } : img));
      setEditingImage(null);
      setEditPrompt('');
      setAppState(AppState.VIEWING);
    } catch (e) {
      setAppState(AppState.VIEWING);
    }
  };

  if (appState === AppState.KEY_SELECTION) {
    return (
      <div className="min-h-screen bg-charchar flex items-center justify-center p-8 text-center animate-reveal">
        <div className="max-w-2xl w-full space-y-12">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-2xl">
            <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-serif font-bold text-glow tracking-tight">Secure Studio Access</h2>
            <p className="text-coolgray text-lg max-w-lg mx-auto leading-relaxed">Please connect your authorized Gemini API Key to initialize the 4K neural rendering pipeline.</p>
          </div>
          <div className="pt-6 space-y-4">
            <button onClick={handleKeySelection} className="bg-indigo-500 hover:bg-indigo-600 px-12 py-5 rounded-2xl font-bold uppercase tracking-[0.3em] text-[11px] transition-all shadow-3xl hover:scale-105 active:scale-95">Connect Secure Key</button>
            <p className="text-[10px] text-coolgray/50 uppercase tracking-widest">Enterprise-grade encryption active</p>
          </div>
          <div className="pt-12 text-[10px] text-coolgray/30 uppercase tracking-[0.5em]">VisionCraft &bull; Neural Artistry &bull; Precision</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-charchar text-softwhite">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-8 py-20 relative">
        {appState === AppState.GENERATING ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-12 animate-reveal">
            <div className="relative w-36 h-36">
              <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-6 border-b-2 border-white/5 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-12 bg-indigo-500/10 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_#5b6cff]"></div>
              </div>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-serif font-bold italic text-glow tracking-tight">{loadingMessage}</h2>
              <p className="text-[10px] text-coolgray tracking-[0.6em] uppercase font-black opacity-30">Neural Core v3 Synthesis</p>
            </div>
          </div>
        ) : appState === AppState.EDITING ? (
          <div className="animate-reveal max-w-5xl mx-auto">
            <button onClick={() => setAppState(AppState.VIEWING)} className="mb-12 text-coolgray hover:text-white text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Return to Repository
            </button>
            <div className="grid md:grid-cols-2 gap-20">
              <div className="gradient-border p-2 overflow-hidden shadow-2xl">
                <img src={editingImage?.url} className="w-full h-auto rounded-[1.4rem]" />
              </div>
              <div className="space-y-12 py-6">
                <div className="space-y-4">
                  <h2 className="text-6xl font-serif font-bold text-glow tracking-tighter">Refinement Studio</h2>
                  <p className="text-coolgray text-sm leading-relaxed">Direct the neural engine to adjust lighting, textures, or atmospheric depth.</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {["Studio Glow", "Hyper-Sharp", "Dramatic Rim Lighting", "Macro Detail"].map(tag => (
                    <button key={tag} onClick={() => setEditPrompt(p => p ? `${p}, ${tag}` : tag)} className="px-5 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+{tag}</button>
                  ))}
                </div>
                <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="E.g., 'Enhance the metallic luster and add soft bokeh to the background...'" className="w-full bg-slateborder/40 border border-slateborder rounded-3xl p-8 min-h-[220px] outline-none focus:border-indigo-500/50 transition-all text-sm leading-relaxed" />
                <button onClick={submitEdit} className="w-full bg-indigo-500 py-6 rounded-2xl font-bold uppercase tracking-[0.4em] text-[12px] shadow-3xl hover:bg-indigo-600 transition-all hover:scale-[1.02] active:scale-[0.98]">Execute Synthesis</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-48">
            <section className="text-center space-y-16 animate-reveal">
              <div className="inline-block px-7 py-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-black tracking-widest uppercase">Proprietary Visualization Platform</div>
              <h2 className="text-8xl md:text-[10rem] font-serif font-bold tracking-tighter leading-[0.85] text-glow">
                Concept to <span className="text-indigo-500 italic">Visual.</span>
              </h2>
              <p className="text-2xl text-coolgray max-w-2xl mx-auto font-light leading-relaxed opacity-80">Industrial-grade 4K neural rendering for luxury products, editorial sets, and high-end marketing campaigns.</p>

              <div className="flex flex-wrap justify-center gap-5">
                {[ProductCategory.JEWELRY, ProductCategory.FASHION, ProductCategory.RESTAURANT].map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`px-12 py-4.5 rounded-2xl text-[11px] font-bold tracking-[0.2em] uppercase transition-all border ${category === cat ? 'bg-indigo-500 border-indigo-500 shadow-2xl text-white' : 'border-slateborder text-coolgray hover:border-indigo-500/30 hover:text-white'}`}>{cat}</button>
                ))}
              </div>

              {!selectedImage ? (
                <div className="pt-16">
                  <label className="inline-block bg-softwhite text-charchar px-16 py-8 rounded-[2rem] font-bold cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-3xl uppercase tracking-[0.4em] text-[12px] hover:scale-105 active:scale-95">
                    Upload Master Asset
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="mt-10 text-[10px] text-coolgray uppercase tracking-[0.5em] font-bold opacity-30">Raw Assets Optimized for 4K Rendering</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-20 pt-10">
                  <div className="p-8 glass-card rounded-[4.5rem] relative shadow-3xl">
                    <img src={selectedImage} className="w-80 h-80 object-contain rounded-3xl" />
                    <button onClick={() => { setSelectedImage(null); setGeneratedImages([]); }} className="absolute -top-5 -right-5 bg-charchar border border-slateborder w-14 h-14 rounded-full flex items-center justify-center text-3xl hover:bg-red-500 hover:border-red-500 transition-all shadow-xl">×</button>
                  </div>
                  {generatedImages.length === 0 && (
                    <div className="w-full max-w-2xl space-y-12">
                      <div className="space-y-4 text-left">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-coolgray ml-4">Creative Direction (Brief)</label>
                        <textarea value={creativeBrief} onChange={e => setCreativeBrief(e.target.value)} placeholder="E.g., 'Mediterranean terrace at sunset, golden hour light, blurred coastline...'" className="w-full bg-slateborder/30 border border-slateborder rounded-[2.5rem] p-10 min-h-[160px] outline-none focus:border-indigo-500/40 transition-all text-sm leading-relaxed" />
                      </div>
                      <button onClick={generate} className="w-full bg-indigo-500 py-9 rounded-[2.5rem] font-bold uppercase tracking-[0.5em] text-[13px] shadow-3xl hover:bg-indigo-600 transition-all hover:scale-[1.01] active:scale-[0.99]">Initialize Synthesis</button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {generatedImages.length > 0 && (
              <section className="space-y-24 animate-reveal">
                <div className="flex items-end justify-between border-b border-slateborder pb-14">
                  <div className="space-y-2">
                    <p className="text-indigo-500 text-[10px] font-black tracking-[0.5em] uppercase">Output Master</p>
                    <h3 className="text-6xl font-serif font-bold text-glow tracking-tighter">Studio Repository</h3>
                  </div>
                  <div className="text-[11px] text-coolgray font-bold tracking-widest uppercase opacity-40">4K Synthetics Generated</div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
                  {generatedImages.map(img => (
                    <div key={img.id} className="group glass-card rounded-[4rem] overflow-hidden hover:shadow-3xl transition-all border border-white/5">
                      <div className="aspect-[3/4] relative overflow-hidden bg-slateborder/20">
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms] ease-out" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charchar/90 via-charchar/20 to-transparent"></div>

                        {img.backgroundUrl && (
                          <div className="absolute top-10 right-10 w-24 h-32 glass-card rounded-2xl overflow-hidden shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-700 delay-100">
                            <img src={img.backgroundUrl} className="w-full h-full object-cover" />
                            <a href={img.backgroundUrl} download={`background-${img.id}.png`} className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-indigo-500/70 transition-opacity"><svg className="w-8 h-8" fill="white" viewBox="0 0 20 20"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg></a>
                          </div>
                        )}

                        <div className="absolute bottom-12 left-12 right-12">
                          <p className="text-indigo-500 text-[10px] font-black tracking-[0.6em] uppercase mb-4">Neural Plate v3</p>
                          <p className="text-softwhite text-2xl font-serif italic leading-tight line-clamp-2">"{img.scenario}"</p>
                        </div>
                      </div>
                      <div className="p-12 flex gap-5">
                        <button onClick={() => startEdit(img)} className="flex-1 bg-white/5 py-5 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-widest hover:bg-softwhite hover:text-charchar transition-all border border-white/10">Refine Frame</button>
                        <a href={img.url} download={`render-${img.id}.png`} className="w-16 h-16 bg-indigo-500 rounded-[1.5rem] flex items-center justify-center hover:bg-softwhite hover:text-charchar transition-all shadow-xl group/btn hover:scale-105 active:scale-95"><svg className="w-7 h-7 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="py-40 text-center border-t border-slateborder/20 mt-40">
        <div className="space-y-10 opacity-30 group cursor-default">
          <div className="font-serif italic text-4xl text-softwhite group-hover:text-indigo-500 transition-colors">VisionCraft Studio</div>
          <p className="text-coolgray text-[10px] font-black tracking-[1em] uppercase">&copy; 2025 VisionCraft Studio &bull; Precision Visualization Engine</p>
        </div>
      </footer>

      {/* Atmospheric Background Effects */}
      <div className="fixed top-0 right-0 w-[100vw] h-[100vw] bg-indigo-500/5 rounded-full blur-[200px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <div className="fixed bottom-0 left-0 w-[80vw] h-[80vw] bg-indigo-500/5 rounded-full blur-[200px] pointer-events-none translate-y-1/2 -translate-x-1/3"></div>
    </div>
  );
}
