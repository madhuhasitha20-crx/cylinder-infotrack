
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Volume2, Plus, RefreshCcw, Box, Activity, Calendar, Eye, AlertCircle, Maximize2, X, Info } from 'lucide-react';
import { CylinderRecord, LANGUAGES } from '../types';
import { performOCR, generateVoiceSummary, analyzeUnregisteredCylinder } from '../services/geminiService';
import { matchSerialFromOCR } from '../services/dataService';

interface ScannerProps {
  onCommit: (record: CylinderRecord) => void;
  onNewScan: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onCommit, onNewScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CylinderRecord | null>(null);
  const [selectedLang, setSelectedLang] = useState(''); 
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'loading' | 'speaking' | 'quota_error' | 'error'>('idle');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [autoScanMessage, setAutoScanMessage] = useState('Align marking within frame');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isProcessingRef = useRef(false);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setResult(null);
      setPreviewImage(null);
      setVoiceStatus('idle'); 
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsScanning(false);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const processImage = async (dataUrl: string) => {
    setIsLoading(true);
    setVoiceStatus('idle'); 
    const base64 = dataUrl.split(',')[1];
    
    const ocrResult = await performOCR(base64);
    
    const matchedRecord = matchSerialFromOCR(ocrResult);
    if (matchedRecord) {
      setResult(matchedRecord);
      setIsLoading(false);
      return;
    }

    setAutoScanMessage('Not in registry... performing vision identification');
    const unregisteredRecord = await analyzeUnregisteredCylinder(base64, ocrResult || "Unknown Serial");
    setResult(unregisteredRecord);
    setIsLoading(false);
  };

  useEffect(() => {
    let interval: number;
    if (isScanning && !result && !isLoading) {
      interval = window.setInterval(async () => {
        if (isProcessingRef.current || !videoRef.current || !canvasRef.current) return;
        isProcessingRef.current = true;
        try {
          const context = canvasRef.current.getContext('2d');
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context?.drawImage(videoRef.current, 0, 0);
          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
          const base64 = dataUrl.split(',')[1];
          const ocrResult = await performOCR(base64);
          if (ocrResult && ocrResult.length >= 4) {
            const matchedRecord = matchSerialFromOCR(ocrResult);
            if (matchedRecord) {
              setPreviewImage(dataUrl);
              stopCamera();
              setResult(matchedRecord);
              setVoiceStatus('idle'); 
            }
          }
        } catch (error) {
          console.error("Auto-scan error:", error);
        } finally {
          isProcessingRef.current = false;
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScanning, result, isLoading]);

  const captureManual = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessingRef.current) return;
    isProcessingRef.current = true;
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setPreviewImage(dataUrl);
    stopCamera();
    await processImage(dataUrl);
    isProcessingRef.current = false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);
      await processImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceSummary = async () => {
    if (!result) return;
    
    if (!selectedLang) {
      alert("Please select a narration language.");
      return;
    }

    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
    }

    setVoiceStatus('loading');
    const langObj = LANGUAGES.find(l => l.code === selectedLang);
    
    // Construct simplified narration text with exact requested fields
    const textToRead = `Serial Number: ${result.serialNumber}. Manufacturer: ${result.manufacturer}. Location: ${result.locationType}. Capacity: ${result.capacity}.`;

    const response = await generateVoiceSummary(textToRead, langObj?.name || 'English', (buffer) => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (ctx.state === 'suspended') ctx.resume();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setVoiceStatus('idle');
      source.start(0); 
      audioSourceRef.current = source;
      setVoiceStatus('speaking');
    });

    if (!response.success) {
      // Per request: silently revert to idle state on error.
      setVoiceStatus('idle');
    }
  };

  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  if (isLoading || result) {
    return (
      <div className="h-full overflow-y-auto pb-20 custom-scrollbar">
        {isImageModalOpen && previewImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsImageModalOpen(false)}>
            <button className="absolute top-6 right-6 text-white/50 hover:text-white"><X size={32} /></button>
            <img src={previewImage} alt="Cylinder Full View" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
          </div>
        )}

        <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom duration-500">
          {previewImage && (
            <div className="relative group" onClick={() => setIsImageModalOpen(true)}>
              <div className="w-full h-64 lg:h-96 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl bg-black/40 cursor-zoom-in transition-all hover:border-[#2F8F9D]/50">
                <img src={previewImage} alt="Scanned Cylinder" className="w-full h-full object-contain" />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 px-6 text-center animate-pulse bg-[#1F2933]/50 rounded-3xl border border-slate-800">
              <RefreshCcw className="w-12 h-12 text-[#2F8F9D] animate-spin" />
              <p className="text-xl font-medium text-[#EAEAEA]">Performing Detailed Analysis...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="space-y-1">
                  <h1 className="text-3xl lg:text-4xl font-bold break-all text-[#EAEAEA]">{result.serialNumber}</h1>
                  <div className="flex flex-wrap gap-2">
                    {result.isUnregistered ? (
                      <span className="bg-[#B45309]/20 text-[#fbbf24] text-[10px] font-bold px-3 py-1.5 rounded-md uppercase border border-[#B45309]/40 flex items-center gap-2 shadow-sm">
                        <Info size={14} /> UNREGISTERED CYLINDER – BASIC DETAILS IDENTIFIED
                      </span>
                    ) : (
                      <span className="bg-[#3D7A5D]/20 text-[#4ade80] text-[10px] font-bold px-3 py-1.5 rounded-md uppercase border border-[#3D7A5D]/40 shadow-sm">
                        MATCHED: {result.remarks.toUpperCase()}
                      </span>
                    )}
                    <span className="bg-[#3A5F7D]/20 text-[#60a5fa] text-[10px] font-bold px-3 py-1.5 rounded-md uppercase border border-[#3A5F7D]/40 shadow-sm">{result.gasType}</span>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                   <label className="text-[10px] text-[#B0B8C1] font-bold uppercase tracking-widest block mb-1">Narration Language</label>
                   <select value={selectedLang} onChange={(e) => { setSelectedLang(e.target.value); setVoiceStatus('idle'); }} className="w-full sm:w-auto bg-[#1F2933] border border-slate-700 text-[#EAEAEA] px-4 py-2 rounded-lg text-xs focus:outline-none focus:border-[#2F8F9D]">
                     <option value="">Select Language</option>
                     {LANGUAGES.map(l => (
                       <option key={l.code} value={l.code}>{l.name.toUpperCase()}</option>
                     ))}
                   </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {[
                  { title: 'Unit Identification', icon: Box, data: [['Cylinder ID', result.cylinderId], ['Manufacturer', result.manufacturer], ['Location', result.locationType], ['Type', result.gasType]] },
                  { title: 'Technical Specs', icon: Activity, data: [['Capacity', result.capacity], ['Working Pressure', result.workingPressure], ['Test Pressure', result.testPressure], ['Standard Code', result.standardCode]] },
                  { title: 'Maintenance Logs', icon: Calendar, data: [['Test Date', result.testDate], ['Expiry Date', result.expiryDate], ['Inspection Date', result.inspectionDate]] },
                  { title: 'Visual Inspection', icon: Eye, data: [['Hazard Type', result.hazardType], ['Rust Level', result.rustLevel], ['Cap Present', result.capPresent], ['Label Condition', result.labelCondition]] }
                ].map((panel, idx) => (
                  <div key={idx} className="bg-[#1F2933] rounded-2xl p-5 lg:p-6 border border-slate-800 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-2 mb-4 text-[#2F8F9D]">
                      <panel.icon size={18} />
                      <h3 className="text-[10px] lg:text-xs font-bold tracking-widest uppercase">{panel.title}</h3>
                    </div>
                    <div className="space-y-3 relative z-20">
                      {panel.data.map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
                          <span className="text-[#B0B8C1] text-xs font-medium">{k}</span>
                          <span className={`text-xs font-semibold text-right ml-2 ${v === 'Not Available' || v === 'Not Assessed' ? 'text-red-400/60' : 'text-[#EAEAEA]'}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-6 border-t border-slate-800">
                <button 
                  onClick={handleVoiceSummary} 
                  disabled={voiceStatus === 'loading'} 
                  className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all font-bold text-sm border 
                    ${voiceStatus === 'loading' ? 'bg-[#6D5BD0]/5 cursor-not-allowed opacity-50' : 'bg-[#6D5BD0]/10 text-[#6D5BD0] border-[#6D5BD0]/30 hover:bg-[#6D5BD0]/20'}`}
                >
                  {voiceStatus === 'loading' ? <RefreshCcw size={18} className="animate-spin" /> : 
                   <Volume2 size={18} className={voiceStatus === 'speaking' ? "animate-bounce" : ""} />}
                  
                  {voiceStatus === 'loading' ? "Synthesizing..." : 
                   voiceStatus === 'speaking' ? "Speaking..." : 
                   "Voice Narration"}
                </button>
                <button onClick={() => onCommit(result)} className="flex-1 bg-[#2F8F9D] hover:bg-[#2F8F9D]/90 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2F8F9D]/30">
                  <Plus size={20} /> Commit to Inventory Registry
                </button>
                <button onClick={() => { setResult(null); setPreviewImage(null); setVoiceStatus('idle'); onNewScan(); }} className="px-6 py-4 text-[#B0B8C1] hover:text-white transition-all font-bold text-sm uppercase tracking-widest">
                  NEW SCAN
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-3 text-[#EAEAEA]">
          <div className="w-8 h-8 rounded bg-[#2F8F9D]/10 flex items-center justify-center"><ScanLine className="text-[#2F8F9D] w-5 h-5" /></div>
          Cylinder Vision Scanner
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="bg-[#1F2933] border-2 border-dashed border-slate-700 rounded-[2rem] h-[45vh] min-h-[350px] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden group shadow-2xl transition-all">
          {isScanning ? (
            <div className="absolute inset-0 z-10 flex flex-col bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4/5 h-1/4 border-2 border-[#2F8F9D] rounded-lg shadow-[0_0_50px_rgba(47,143,157,0.5)]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#2F8F9D] animate-[scan_2s_ease-in-out_infinite] opacity-70"></div>
                </div>
              </div>
              <div className="absolute bottom-6 left-0 right-0 flex justify-center px-8 gap-4">
                <button onClick={captureManual} className="bg-[#2F8F9D] text-white flex-1 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl text-sm border border-white/10 active:scale-95">Manual Capture</button>
                <button onClick={stopCamera} className="bg-red-500/20 text-red-400 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest border border-red-500/30 active:scale-95">Close</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500 shadow-lg border border-slate-700">
                <Camera size={40} className="text-[#2F8F9D]" />
              </div>
              <button onClick={startCamera} className="text-[#EAEAEA] text-2xl lg:text-3xl font-bold mb-3 hover:text-[#2F8F9D] transition-colors">Open Live Scanner</button>
            </div>
          )}
        </div>

        <label className="bg-[#1F2933] border-2 border-dashed border-slate-700 rounded-[2rem] h-[45vh] min-h-[350px] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden group shadow-2xl cursor-pointer hover:border-[#2F8F9D]/40 transition-all">
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-500 shadow-lg border border-slate-700">
            <Upload size={40} className="text-[#2F8F9D]" />
          </div>
          <span className="text-[#EAEAEA] text-2xl lg:text-3xl font-bold mb-3 group-hover:text-[#2F8F9D] transition-colors">Upload Photo</span>
        </label>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(400%); }
          100% { transform: translateY(-100%); }
        }
      `}</style>
    </div>
  );
};

const ScanLine = ({ className, ...props }: any) => (
  <svg {...props} className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" />
  </svg>
);

export default Scanner;
