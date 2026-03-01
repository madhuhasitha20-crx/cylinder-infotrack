
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Volume2, Plus, RefreshCcw, Box, Activity, Calendar, Eye, X, Info, AlertCircle, ScanLine } from 'lucide-react';
import { CylinderRecord, LANGUAGES } from '../types';
import { performOCR, generateVoiceSummary, analyzeUnregisteredCylinder, QuotaExhaustedError } from '../services/geminiService';
import { matchSerialFromOCR } from '../services/dataService';

interface ScannerProps {
  onCommit: (record: CylinderRecord) => void;
  onNewScan: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onCommit, onNewScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CylinderRecord | null>(null);
  const [matchConfidence, setMatchConfidence] = useState<'high' | 'low' | 'none'>('none');
  const [selectedLang, setSelectedLang] = useState(''); 
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'loading' | 'speaking'>('idle');
  const [voiceError, setVoiceError] = useState(false);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
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
      setVoiceError(false);
      setQuotaExhausted(false);
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
    setVoiceError(false);
    setQuotaExhausted(false);
    const base64 = dataUrl.split(',')[1];
    
    try {
      const ocrResult = await performOCR(base64);
      const match = matchSerialFromOCR(ocrResult);
      setMatchConfidence(match.confidence);

      if (match.record) {
        setResult(match.record);
      } else {
        const unregisteredRecord = await analyzeUnregisteredCylinder(base64, ocrResult || "Unknown Serial");
        setResult(unregisteredRecord);
      }
    } catch (error) {
      if (error instanceof QuotaExhaustedError) {
        setQuotaExhausted(true);
        setIsScanning(false); // Pause auto-scan
        stopCamera();
      } else {
        console.error("Processing error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: number;
    // Increased interval to 3000ms to avoid 429 errors
    if (isScanning && !result && !isLoading && !quotaExhausted) {
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
            setPreviewImage(dataUrl);
            stopCamera();
            setVoiceStatus('idle');
            await processImage(dataUrl);
          }
        } catch (error) {
          if (error instanceof QuotaExhaustedError) {
            setQuotaExhausted(true);
            setIsScanning(false);
            stopCamera();
          }
          console.error("Auto-scan error:", error);
        } finally {
          isProcessingRef.current = false;
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isScanning, result, isLoading, quotaExhausted]);

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
    if (!result || !selectedLang) return;

    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
    }

    setVoiceStatus('loading');
    setVoiceError(false);
    const langObj = LANGUAGES.find(l => l.code === selectedLang);
    
    const lines: string[] = [];
    const isValid = (val: any) => val !== undefined && val !== null && val !== 'Not Available' && val !== 'Unknown';

    if (isValid(result.serialNumber)) lines.push(`Serial number: ${result.serialNumber}`);
    if (isValid(result.cylinderId)) lines.push(`Cylinder ID: ${result.cylinderId}`);
    if (isValid(result.manufacturer)) lines.push(`Manufacturer: ${result.manufacturer}`);
    if (isValid(result.locationType)) lines.push(`Location: ${result.locationType}`);
    if (isValid(result.gasType)) lines.push(`Type: ${result.gasType}`);
    if (isValid(result.capacity)) lines.push(`Capacity: ${result.capacity}`);
    if (isValid(result.workingPressure)) lines.push(`Working Pressure: ${result.workingPressure}`);
    if (isValid(result.testPressure)) lines.push(`Test Pressure: ${result.testPressure}`);
    if (isValid(result.standardCode)) lines.push(`Standard Code: ${result.standardCode}`);
    if (isValid(result.testDate)) lines.push(`Test Date: ${result.testDate}`);
    if (isValid(result.expiryDate)) lines.push(`Expiry Date: ${result.expiryDate}`);
    if (isValid(result.inspectionDate)) lines.push(`Inspection Date: ${result.inspectionDate}`);
    if (isValid(result.hazardType)) lines.push(`Hazard Type: ${result.hazardType}`);
    if (isValid(result.rustLevel)) lines.push(`Rust Level: ${result.rustLevel}`);
    if (isValid(result.capPresent)) lines.push(`Cap Present: ${result.capPresent}`);
    if (isValid(result.labelCondition)) lines.push(`Label Condition: ${result.labelCondition}`);
    lines.push(`Registration status: ${result.isUnregistered ? 'Unregistered' : 'Registered'}`);

    const narrationText = lines.join(". ") + ".";

    try {
      await generateVoiceSummary(narrationText, langObj?.name || 'English', (buffer) => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        if (ctx.state === 'suspended') ctx.resume();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setVoiceStatus('idle');
        source.start(0); 
        audioSourceRef.current = source;
        setVoiceStatus('speaking');
        setVoiceError(false);
      });
    } catch (err) {
      setVoiceStatus('idle');
      setVoiceError(true);
    }
  };

  if (isLoading || result || quotaExhausted) {
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
              <p className="text-xl font-medium text-[#EAEAEA]">Performing Detailed Identification...</p>
            </div>
          ) : quotaExhausted ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 px-6 text-center bg-[#8B3A3A]/10 rounded-3xl border border-[#8B3A3A]/30 animate-in fade-in">
              <AlertCircle className="w-12 h-12 text-[#FF6B6B]" />
              <h2 className="text-xl font-bold text-[#FF6B6B]">Quota Exhausted</h2>
              <p className="text-[#B0B8C1] max-w-md">The system has reached the Gemini API limit. Please wait a moment for the quota to reset or upgrade your plan.</p>
              <button 
                onClick={() => { setQuotaExhausted(false); onNewScan(); }} 
                className="mt-4 px-6 py-2 bg-[#FF6B6B] text-white rounded-xl font-bold hover:bg-[#FF6B6B]/80 transition-all"
              >
                Reset Scanner
              </button>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="space-y-1">
                  <h1 className="text-3xl lg:text-4xl font-bold break-all text-[#EAEAEA]">{result.serialNumber}</h1>
                  <div className="flex flex-wrap gap-2">
                    {result.isUnregistered ? (
                      <span className="bg-[#8B3A3A]/20 text-[#FF6B6B] text-[10px] font-bold px-3 py-1.5 rounded-md uppercase border border-[#8B3A3A]/40 flex items-center gap-2 shadow-sm">
                        <AlertCircle size={14} /> No matching cylinder record found in the uploaded database.
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <span className="bg-[#3D7A5D]/20 text-[#4ade80] text-[10px] font-bold px-3 py-1.5 rounded-md uppercase border border-[#3D7A5D]/40 shadow-sm">
                          MATCHED: {result.remarks.toUpperCase()}
                        </span>
                        {matchConfidence === 'low' && (
                          <span className="bg-[#B45309]/20 text-[#fbbf24] text-[10px] font-bold px-3 py-1.5 rounded-md uppercase border border-[#B45309]/40 flex items-center gap-2 shadow-sm">
                            <Info size={14} /> Low confidence match – serial number partially unclear.
                          </span>
                        )}
                      </div>
                    )}
                    <span className="bg-[#3A5F7D]/20 text-[#60a5fa] text-[10px] font-bold px-3 py-1.5 rounded-md uppercase border border-[#3A5F7D]/40 shadow-sm">{result.gasType}</span>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                   <label className="text-[10px] text-[#B0B8C1] font-bold uppercase tracking-widest block mb-1">Narration Language</label>
                   <select 
                     value={selectedLang} 
                     onChange={(e) => { setSelectedLang(e.target.value); setVoiceStatus('idle'); setVoiceError(false); }} 
                     className="w-full sm:w-auto bg-[#1F2933] border border-slate-700 text-[#EAEAEA] px-4 py-2 rounded-lg text-xs focus:outline-none focus:border-[#2F8F9D]"
                   >
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
                <div className="flex flex-col gap-2">
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
                     "Voice Summary"}
                  </button>
                  {voiceError && (
                    <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wider animate-in fade-in">
                      <AlertCircle size={12} />
                      Voice Error
                    </div>
                  )}
                </div>
                <button onClick={() => onCommit(result)} className="flex-1 bg-[#2F8F9D] hover:bg-[#2F8F9D]/90 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#2F8F9D]/30">
                  <Plus size={20} /> Commit to Inventory Registry
                </button>
                <button onClick={() => { setResult(null); setPreviewImage(null); setVoiceStatus('idle'); setVoiceError(false); onNewScan(); }} className="px-6 py-4 text-[#B0B8C1] hover:text-white transition-all font-bold text-sm uppercase tracking-widest">
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
          <div className="w-8 h-8 rounded bg-[#2F8F9D]/10 flex items-center justify-center">
            <ScanLine className="text-[#2F8F9D] w-5 h-5" />
          </div>
          Cylinder Vision Scanner
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="bg-[#1F2933] border-2 border-dashed border-slate-700 rounded-[2rem] h-[45vh] min-h-[350px] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden group shadow-2xl transition-all">
          {isScanning ? (
            <div className="absolute inset-0 z-10 flex flex-col bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
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
    </div>
  );
};

export default Scanner;
