
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { GeneratedImage, AppState, ProductCategory } from './types';

const Header: React.FC = () => (
  <header className="py-6 px-10 border-b border-slateborder flex justify-between items-center bg-charchar/60 backdrop-blur-2xl sticky top-0 z-50">
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg shadow-[0_0_30px_rgba(91,108,255,0.4)] flex items-center justify-center font-serif font-bold text-xl text-white transition-all group-hover:scale-105">VC</div>
      <div className="flex flex-col -space-y-1">
        <h1 className="text-lg font-bold tracking-tighter text-softwhite uppercase">VisionCraft <span className="text-indigo-500">Studio</span></h1>
        <span className="text-[8px] font-black tracking-[0.6em] text-coolgray uppercase opacity-60">Intelligence & Visual Arts</span>
      </div>
    </div>
    <div className="hidden md:flex gap-10 text-[9px] font-black tracking-[0.4em] text-coolgray items-center uppercase">
      <span className="text-indigo-500">Active Engine v3.2</span>
      <span className="opacity-40">Secured Rendering</span>
    </div>
  </header>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.JEWELRY);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [creativeBrief, setCreativeBrief] = useState('');
  const galleryRef = useRef<HTMLElement>(null);

  useEffect(() => { checkApiKey(); }, []);

  const checkApiKey = async () => {
    // @ts-ignore
    const selected = await window.aistudio.hasSelectedApiKey();
    setHasKey(selected);
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasKey(true);
  };

  useEffect(() => {
    let interval: number;
    if (appState === AppState.GENERATING) {
      const messages = ["Analyzing surface...", "Mapping light vectors...", "Synthesizing depth...", "Rendering 4K textures..."];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = window.setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setSelectedImage(reader.result as string); setAppState(AppState.VIEWING); };
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
      alert(err.message || "Rendering pipeline disrupted.");
      setAppState(AppState.VIEWING);
    }
  };

  // Fixed the missing startEdit function by defining it to set state for editing
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
      setEditingImage(null); setEditPrompt(''); setAppState(AppState.VIEWING);
    } catch { setAppState(AppState.VIEWING); }
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-charchar flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8"><svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
        <h2 className="text-3xl font-serif font-bold text-softwhite mb-4">Pipeline Authentication</h2>
        <p className="text-coolgray mb-8 max-w-sm">Please select a project key from your Studio dashboard to authorize the rendering engine.</p>
        <button onClick={handleSelectKey} className="bg-indigo-500 text-white px-10 py-5 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-600 shadow-2xl">Configure Key</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-charchar text-softwhite">
      <Header />
      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-20">
        {appState === AppState.GENERATING ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-12">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse"></div>
            </div>
            <h2 className="text-2xl font-serif font-bold italic text-glow">{loadingMessage}</h2>
          </div>
        ) : appState === AppState.EDITING ? (
          <div className="animate-in fade-in duration-700">
            <button onClick={() => setAppState(AppState.VIEWING)} className="mb-12 text-coolgray hover:text-softwhite text-[10px] font-black uppercase tracking-[0.4em]">← Back</button>
            <div className="grid md:grid-cols-2 gap-16">
              <div className="rounded-[2.5rem] overflow-hidden border border-slateborder bg-slateborder/10 p-2 shadow-2xl">
                <img src={editingImage?.url} className="w-full h-auto rounded-[2rem]" />
              </div>
              <div className="space-y-8">
                <h2 className="text-4xl font-serif font-bold text-glow">Refinement</h2>
                <div className="flex flex-wrap gap-3">
                  {["Sharpness", "Texture", "Sparkle"].map(tag => (
                    <button key={tag} onClick={() => setEditPrompt(p => p ? `${p}, ${tag}` : tag)} className="px-4 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-indigo-500 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+{tag}</button>
                  ))}
                </div>
                <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Specify refinements..." className="w-full bg-slateborder/10 border border-slateborder rounded-3xl p-6 min-h-[150px] outline-none" />
                <button onClick={submitEdit} className="w-full bg-indigo-500 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl">Execute Refinement</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-32">
            <section className="text-center space-y-10">
              <div className="inline-block px-5 py-2 rounded-full border border-slateborder bg-slateborder/20 text-indigo-500 text-[9px] font-black tracking-widest uppercase">Intelligence Visualization</div>
              <h2 className="text-6xl md:text-8xl font-serif font-bold tracking-tighter text-glow">Concept to <span className="text-indigo-500 italic">Visual.</span></h2>
              <p className="text-lg text-coolgray max-w-xl mx-auto opacity-80">High-fidelity neural rendering for luxury jewelry, fashion, and hospitality editorial.</p>
              
              <div className="flex flex-wrap justify-center gap-4">
                {[ProductCategory.JEWELRY, ProductCategory.RESTAURANT, ProductCategory.FASHION].map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border ${category === cat ? 'bg-indigo-500 border-indigo-500 shadow-xl' : 'border-slateborder text-coolgray hover:border-coolgray'}`}>{cat}</button>
                ))}
              </div>

              {!selectedImage ? (
                <div className="pt-10">
                  <label className="bg-softwhite text-charchar px-12 py-6 rounded-2xl font-black cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-2xl uppercase tracking-widest text-[11px]">
                    Upload Asset
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-12 pt-6">
                  <div className="p-4 bg-slateborder/10 border border-slateborder rounded-[3rem] relative shadow-3xl">
                    <img src={selectedImage} className="w-64 h-64 object-contain rounded-2xl" />
                    <button onClick={() => { setSelectedImage(null); setGeneratedImages([]); }} className="absolute -top-4 -right-4 bg-charchar border border-slateborder w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-indigo-500">×</button>
                  </div>
                  {generatedImages.length === 0 && (
                    <div className="w-full max-w-xl space-y-8">
                      <textarea value={creativeBrief} onChange={e => setCreativeBrief(e.target.value)} placeholder="Describe campaign parameters..." className="w-full bg-slateborder/10 border border-slateborder rounded-[2rem] p-6 min-h-[120px] outline-none" />
                      <button onClick={generate} className="w-full bg-indigo-500 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl">Initialize Synthesis</button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {generatedImages.length > 0 && (
              <section ref={galleryRef} className="space-y-16 animate-in slide-in-from-bottom-20 duration-1000">
                <div className="border-b border-slateborder pb-10"><h3 className="text-4xl font-serif font-bold text-glow">Output Repository</h3></div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                  {generatedImages.map(img => (
                    <div key={img.id} className="group bg-slateborder/5 border border-slateborder rounded-[3rem] overflow-hidden hover:border-indigo-500/40 transition-all">
                      <div className="aspect-[3/4] relative overflow-hidden">
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charchar to-transparent opacity-80"></div>
                        
                        {img.backgroundUrl && (
                          <div className="absolute top-4 right-4 w-16 h-20 bg-charchar/60 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                             <img src={img.backgroundUrl} className="w-full h-full object-cover" />
                             <a href={img.backgroundUrl} download={`bg-${img.id}.png`} className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/60 transition-opacity"><svg className="w-6 h-6" fill="white" viewBox="0 0 20 20"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg></a>
                          </div>
                        )}
                        
                        <div className="absolute bottom-6 left-6 right-6">
                           <p className="text-indigo-500 text-[8px] font-black tracking-widest uppercase mb-1">PRO-4K Render</p>
                           <p className="text-softwhite text-sm font-serif italic line-clamp-2">"{img.scenario}"</p>
                        </div>
                      </div>
                      <div className="p-8 flex gap-3 bg-charchar/40">
                        <button onClick={() => startEdit(img)} className="flex-1 bg-slateborder/20 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-softwhite hover:text-charchar transition-all">Refine</button>
                        <a href={img.url} download={`render-${img.id}.png`} className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center hover:bg-softwhite hover:text-charchar transition-all shadow-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <footer className="py-20 text-center border-t border-slateborder mt-20">
        <p className="text-coolgray text-[9px] font-black tracking-[0.6em] uppercase opacity-40">&copy; 2025 VisionCraft Studio &bull; Industrial Visualization</p>
      </footer>
    </div>
  );
}
