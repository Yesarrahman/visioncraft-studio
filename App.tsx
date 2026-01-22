
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
  const [authError, setAuthError] = useState<boolean>(false);
  const [category, setCategory] = useState<ProductCategory>(ProductCategory.JEWELRY);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [creativeBrief, setCreativeBrief] = useState('');
  const galleryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let interval: number;
    if (appState === AppState.GENERATING) {
      const messages = ["Analyzing surface textures...", "Calculating light refraction...", "Synthesizing environment...", "Rendering 4K masters..."];
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
      console.error("Critical Engine Error:", err);
      if (err.message.includes("API_KEY_MISSING") || err.message.includes("API key")) {
        setAuthError(true);
      } else {
        alert("The rendering pipeline encountered an issue. Please try again.");
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
      setEditingImage(null); setEditPrompt(''); setAppState(AppState.VIEWING);
    } catch (e) { 
      console.error(e);
      setAppState(AppState.VIEWING); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-charchar text-softwhite relative overflow-hidden">
      <Header />
      
      {/* Configuration Error Overlay */}
      {authError && (
        <div className="fixed inset-0 z-[100] bg-charchar/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-up">
          <div className="max-w-xl w-full text-center space-y-8">
             <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20">
               <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div className="space-y-4">
               <h2 className="text-4xl font-serif font-bold text-glow">Configuration Required</h2>
               <p className="text-coolgray leading-relaxed">The rendering engine could not detect a valid API Key in this environment.</p>
             </div>
             <div className="bg-slateborder/30 p-8 rounded-[2rem] border border-slateborder text-left space-y-6 text-sm">
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  <p><span className="text-white font-bold">In Netlify settings</span>, ensure the variable name is exactly <code className="bg-white/10 px-2 py-0.5 rounded text-indigo-400">API_KEY</code>.</p>
                </div>
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  <p><span className="text-white font-bold">Trigger a new deploy</span> from the 'Deploys' tab and choose <span className="italic">"Clear cache and deploy site"</span> to inject the key into the build.</p>
                </div>
             </div>
             <button onClick={() => window.location.reload()} className="bg-indigo-500 hover:bg-indigo-600 px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all">Retry Authentication</button>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-20 relative z-10">
        {appState === AppState.GENERATING ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-12">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_20px_#5b6cff]"></div>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-serif font-bold italic text-glow">{loadingMessage}</h2>
              <p className="text-coolgray text-[10px] font-black uppercase tracking-[0.4em] opacity-40">High-Fidelity Neural Synthesis Active</p>
            </div>
          </div>
        ) : appState === AppState.EDITING ? (
          <div className="animate-fade-up">
            <button onClick={() => setAppState(AppState.VIEWING)} className="mb-12 text-coolgray hover:text-softwhite text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Back to Gallery
            </button>
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <div className="rounded-[3rem] overflow-hidden border border-slateborder bg-slateborder/10 p-2 shadow-3xl">
                <img src={editingImage?.url} className="w-full h-auto rounded-[2.8rem]" />
              </div>
              <div className="space-y-10">
                <h2 className="text-5xl font-serif font-bold text-glow">Refinement Studio</h2>
                <div className="flex flex-wrap gap-3">
                  {["Enhance Luster", "Matte Background", "Soft Focus", "Vogue Lighting"].map(tag => (
                    <button key={tag} onClick={() => setEditPrompt(p => p ? `${p}, ${tag}` : tag)} className="px-5 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">+{tag}</button>
                  ))}
                </div>
                <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Provide specific creative direction..." className="w-full bg-slateborder/10 border border-slateborder rounded-[2rem] p-8 min-h-[200px] outline-none focus:border-indigo-500/50 transition-colors text-softwhite text-sm" />
                <button onClick={submitEdit} className="w-full bg-indigo-500 py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:bg-indigo-600 transition-all">Execute Neural Refinement</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-40">
            <section className="text-center space-y-12 animate-fade-up">
              <div className="inline-block px-6 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-black tracking-widest uppercase">Proprietary Rendering Engine v3.2</div>
              <h2 className="text-7xl md:text-9xl font-serif font-bold tracking-tighter text-glow leading-[0.9]">
                Concept to <span className="text-indigo-500 italic">Visual.</span>
              </h2>
              <p className="text-xl text-coolgray max-w-2xl mx-auto font-light leading-relaxed">Industrial-grade AI visualization for luxury jewelry, premium fashion, and high-end editorial campaigns.</p>
              
              <div className="flex flex-wrap justify-center gap-4">
                {[ProductCategory.JEWELRY, ProductCategory.RESTAURANT, ProductCategory.FASHION].map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`px-10 py-4 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all border ${category === cat ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_30px_rgba(91,108,255,0.4)]' : 'border-slateborder text-coolgray hover:border-indigo-500/50 hover:text-white'}`}>{cat}</button>
                ))}
              </div>

              {!selectedImage ? (
                <div className="pt-16">
                  <label className="group relative bg-softwhite text-charchar px-16 py-8 rounded-[2rem] font-black cursor-pointer hover:bg-indigo-500 hover:text-white transition-all shadow-3xl uppercase tracking-[0.3em] text-[12px] overflow-hidden block max-w-sm mx-auto">
                    <span className="relative z-10">Upload Master Asset</span>
                    <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <p className="mt-8 text-[9px] text-coolgray uppercase tracking-widest font-black opacity-40">Accepting High-Res PNG, JPG, WEBP</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-16 pt-10">
                  <div className="p-6 bg-slateborder/10 border border-slateborder rounded-[4rem] relative shadow-3xl">
                    <img src={selectedImage} className="w-72 h-72 object-contain rounded-3xl" />
                    <button onClick={() => { setSelectedImage(null); setGeneratedImages([]); }} className="absolute -top-4 -right-4 bg-charchar border border-slateborder w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-red-500 hover:border-red-500 transition-all">×</button>
                  </div>
                  {generatedImages.length === 0 && (
                    <div className="w-full max-w-2xl space-y-10">
                      <div className="space-y-4">
                         <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black uppercase tracking-widest text-coolgray">Creative Brief</label>
                            <span className="text-[9px] text-indigo-500 font-bold uppercase">Optional Integration</span>
                         </div>
                         <textarea value={creativeBrief} onChange={e => setCreativeBrief(e.target.value)} placeholder="E.g., 'Sunset in a Mediterranean villa, soft warm tones, morning mist...'" className="w-full bg-slateborder/10 border border-slateborder rounded-[2.5rem] p-8 min-h-[140px] outline-none focus:border-indigo-500/50 transition-colors text-sm" />
                      </div>
                      <button onClick={generate} className="w-full bg-indigo-500 py-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[12px] shadow-3xl hover:bg-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all">Initialize Synthesis</button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {generatedImages.length > 0 && (
              <section ref={galleryRef} className="space-y-20 animate-fade-up">
                <div className="flex justify-between items-center border-b border-slateborder pb-10">
                  <h3 className="text-5xl font-serif font-bold text-glow">Generated Repository</h3>
                  <div className="text-[9px] font-black tracking-widest text-coolgray uppercase">3 Outputs synthesized</div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-16">
                  {generatedImages.map(img => (
                    <div key={img.id} className="group bg-slateborder/5 border border-slateborder rounded-[3.5rem] overflow-hidden hover:border-indigo-500/30 transition-all hover:shadow-3xl">
                      <div className="aspect-[3/4] relative overflow-hidden">
                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charchar via-transparent to-transparent opacity-90"></div>
                        
                        {img.backgroundUrl && (
                          <div className="absolute top-6 right-6 w-20 h-24 bg-charchar/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-500 delay-100">
                             <img src={img.backgroundUrl} className="w-full h-full object-cover" />
                             <a href={img.backgroundUrl} download={`bg-${img.id}.png`} className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-indigo-500/60 transition-opacity"><svg className="w-6 h-6" fill="white" viewBox="0 0 20 20"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg></a>
                          </div>
                        )}
                        
                        <div className="absolute bottom-8 left-8 right-8 space-y-2">
                           <p className="text-indigo-500 text-[8px] font-black tracking-[0.5em] uppercase">Engine Render 4K</p>
                           <p className="text-softwhite text-lg font-serif italic leading-tight line-clamp-2">"{img.scenario}"</p>
                        </div>
                      </div>
                      <div className="p-10 flex gap-4 bg-charchar/40 backdrop-blur-md">
                        <button onClick={() => startEdit(img)} className="flex-1 bg-white/5 border border-white/5 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-softwhite hover:text-charchar transition-all">Refine</button>
                        <a href={img.url} download={`visioncraft-${img.id}.png`} className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center hover:bg-softwhite hover:text-charchar transition-all shadow-xl group/btn"><svg className="w-6 h-6 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      
      <footer className="py-32 text-center border-t border-slateborder/50 mt-40">
        <div className="space-y-6 opacity-40">
           <div className="font-serif italic text-2xl text-softwhite">VisionCraft Studio</div>
           <p className="text-coolgray text-[9px] font-black tracking-[0.8em] uppercase">&copy; 2025 VisionCraft Studio &bull; Industrial Visualization Platform</p>
        </div>
      </footer>

      {/* Background Decorative Glows */}
      <div className="fixed -top-1/4 -right-1/4 w-[80vw] h-[80vw] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed -bottom-1/4 -left-1/4 w-[60vw] h-[60vw] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>
    </div>
  );
}
