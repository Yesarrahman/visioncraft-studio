
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { GeneratedImage, AppState, ProductCategory } from './types';

const Header: React.FC = () => (
  <header className="py-8 px-12 border-b border-slateborder flex justify-between items-center bg-charchar/80 backdrop-blur-xl sticky top-0 z-50">
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center font-serif font-bold text-2xl text-white shadow-[0_0_25px_rgba(91,108,255,0.4)]">V</div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-softwhite font-sans uppercase">VisionCraft <span className="text-indigo-500">Studio</span></h1>
        <p className="text-[9px] font-black tracking-[0.4em] text-coolgray uppercase opacity-50">Luxury AI Rendering Engine</p>
      </div>
    </div>
    <div className="hidden md:flex items-center gap-8 text-[10px] font-bold tracking-widest text-coolgray uppercase">
      <span>System Status: <span className="text-green-500">Online</span></span>
    </div>
  </header>
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
  const [hasAuthError, setHasAuthError] = useState(false);

  useEffect(() => {
    let interval: number;
    if (appState === AppState.GENERATING) {
      const messages = ["Analyzing jewelry geometry...", "Mapping specular reflections...", "Synthesizing environment...", "Perfecting lighting..."];
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
      if (err.message === "API_KEY_MISSING") {
        setHasAuthError(true);
      } else {
        alert("Generation failed. Please check your connection.");
      }
      setAppState(AppState.VIEWING);
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

  return (
    <div className="min-h-screen flex flex-col bg-charchar text-softwhite">
      <Header />

      {hasAuthError && (
        <div className="fixed inset-0 z-[100] bg-charchar/95 flex items-center justify-center p-8 text-center animate-luxury">
          <div className="max-w-md space-y-8">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
               <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-3xl font-serif font-bold text-glow">API Connection Error</h2>
            <p className="text-coolgray text-sm leading-relaxed">The system could not detect your Gemini API key. Ensure you have set the environment variable <strong>API_KEY</strong> in your hosting provider and <strong>re-deployed with cleared cache</strong>.</p>
            <button onClick={() => window.location.reload()} className="bg-indigo-500 px-10 py-4 rounded-xl font-bold uppercase tracking-widest text-[11px]">Retry Connection</button>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-7xl mx-auto w-full px-8 py-20">
        {appState === AppState.GENERATING ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-12">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-4 border-t-2 border-white/10 rounded-full animate-spin-slow"></div>
            </div>
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-serif font-bold italic text-glow">{loadingMessage}</h2>
              <p className="text-[10px] text-coolgray tracking-[0.5em] uppercase font-black opacity-40">Processing Ultra-HD Render</p>
            </div>
          </div>
        ) : appState === AppState.EDITING ? (
          <div className="animate-luxury max-w-5xl mx-auto">
            <button onClick={() => setAppState(AppState.VIEWING)} className="mb-12 text-coolgray hover:text-white text-[10px] font-bold uppercase tracking-[0.4em]">← Back to Gallery</button>
            <div className="grid md:grid-cols-2 gap-20">
              <div className="luxury-card p-2 rounded-[3rem] overflow-hidden shadow-2xl">
                <img src={editingImage?.url} className="w-full h-auto rounded-[2.8rem]" />
              </div>
              <div className="space-y-10 py-6">
                <h2 className="text-5xl font-serif font-bold text-glow">Refinement Studio</h2>
                <div className="flex flex-wrap gap-3">
                  {["Vogue Lighting", "High Gloss", "Deep Shadow", "Macro Sharpness"].map(tag => (
                    <button key={tag} onClick={() => setEditPrompt(p => p ? `${p}, ${tag}` : tag)} className="px-5 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+{tag}</button>
                  ))}
                </div>
                <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="E.g., 'Make the diamonds sparkle more under warm evening light...'" className="w-full bg-slateborder/20 border border-slateborder rounded-3xl p-8 min-h-[200px] outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed" />
                <button onClick={submitEdit} className="w-full bg-indigo-500 py-6 rounded-2xl font-bold uppercase tracking-[0.3em] text-[11px] shadow-2xl hover:bg-indigo-600 transition-all">Apply Neural Refinement</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-40">
            <section className="text-center space-y-12 animate-luxury">
              <div className="inline-block px-6 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-black tracking-widest uppercase">The Next Generation of Jewelry Marketing</div>
              <h2 className="text-7xl md:text-9xl font-serif font-bold tracking-tighter leading-[0.8] text-glow">
                Concept to <span className="text-indigo-500 italic">Visual.</span>
              </h2>
              <p className="text-xl text-coolgray max-w-2xl mx-auto font-light leading-relaxed">High-fidelity 4K neural rendering for luxury catalogs, editorial campaigns, and digital luxury showcases.</p>
              
              <div className="flex flex-wrap justify-center gap-4">
                {[ProductCategory.JEWELRY, ProductCategory.FASHION, ProductCategory.RESTAURANT].map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`px-10 py-4 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all border ${category === cat ? 'bg-indigo-500 border-indigo-500 shadow-xl' : 'border-slateborder text-coolgray hover:border-indigo-500/30'}`}>{cat}</button>
                ))}
              </div>

              {!selectedImage ? (
                <div className="pt-16">
                  <label className="bg-softwhite text-charchar px-16 py-8 rounded-3xl font-bold cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-2xl uppercase tracking-[0.3em] text-[12px]">
                    Upload Master Asset
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="mt-8 text-[10px] text-coolgray uppercase tracking-widest font-bold opacity-30">Studio Lighting Recommended</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-16 pt-10">
                  <div className="p-6 luxury-card rounded-[4rem] relative shadow-3xl">
                    <img src={selectedImage} className="w-80 h-80 object-contain rounded-3xl" />
                    <button onClick={() => { setSelectedImage(null); setGeneratedImages([]); }} className="absolute -top-4 -right-4 bg-charchar border border-slateborder w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-red-500 transition-all">×</button>
                  </div>
                  {generatedImages.length === 0 && (
                    <div className="w-full max-w-2xl space-y-10">
                      <textarea value={creativeBrief} onChange={e => setCreativeBrief(e.target.value)} placeholder="Add a creative brief (Optional). E.g., 'Sunset at a Parisian balcony' or 'Midnight in Tokyo street'..." className="w-full bg-slateborder/20 border border-slateborder rounded-[2.5rem] p-8 min-h-[150px] outline-none focus:border-indigo-500 transition-all text-sm leading-relaxed" />
                      <button onClick={generate} className="w-full bg-indigo-500 py-8 rounded-[2rem] font-bold uppercase tracking-[0.4em] text-[12px] shadow-3xl hover:bg-indigo-600 transition-all">Initialize Rendering Pipeline</button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {generatedImages.length > 0 && (
              <section className="space-y-20 animate-luxury">
                <div className="flex items-end justify-between border-b border-slateborder pb-12">
                  <h3 className="text-5xl font-serif font-bold text-glow">Output Gallery</h3>
                  <div className="text-[10px] text-coolgray font-black tracking-widest uppercase">4K High-Fidelity Synthetics</div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
                  {generatedImages.map(img => (
                    <div key={img.id} className="group luxury-card rounded-[3.5rem] overflow-hidden hover:shadow-3xl transition-all">
                      <div className="aspect-[3/4] relative overflow-hidden bg-slateborder/50">
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charchar to-transparent opacity-90"></div>
                        
                        {img.backgroundUrl && (
                          <div className="absolute top-8 right-8 w-24 h-32 bg-charchar/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-500">
                             <img src={img.backgroundUrl} className="w-full h-full object-cover" />
                             <a href={img.backgroundUrl} download={`background-${img.id}.png`} className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-indigo-500/60 transition-opacity"><svg className="w-8 h-8" fill="white" viewBox="0 0 20 20"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg></a>
                          </div>
                        )}
                        
                        <div className="absolute bottom-10 left-10 right-10">
                           <p className="text-indigo-500 text-[9px] font-black tracking-[0.5em] uppercase mb-2">Synthetic Render v3</p>
                           <p className="text-softwhite text-xl font-serif italic leading-tight line-clamp-2">"{img.scenario}"</p>
                        </div>
                      </div>
                      <div className="p-10 flex gap-4">
                        <button onClick={() => startEdit(img)} className="flex-1 bg-white/5 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-softwhite hover:text-charchar transition-all border border-white/5">Refine Scene</button>
                        <a href={img.url} download={`render-${img.id}.png`} className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center hover:bg-softwhite hover:text-charchar transition-all shadow-xl group/btn"><svg className="w-6 h-6 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <footer className="py-32 text-center border-t border-slateborder/30 mt-40">
        <div className="font-serif italic text-3xl opacity-20 mb-6">VisionCraft Studio</div>
        <p className="text-coolgray text-[10px] font-black tracking-[0.8em] uppercase opacity-30">&copy; 2025 VisionCraft Studio &bull; Precision Visualization Platform</p>
      </footer>
    </div>
  );
}
