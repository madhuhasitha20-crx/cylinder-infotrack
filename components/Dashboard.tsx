
import React from 'react';
import { Scan, ShieldCheck, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { Page, AppState } from '../types';

interface DashboardProps {
  state: AppState;
  onStartScanner: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onStartScanner }) => {
  const stats = [
    { label: 'TOTAL SCANS', value: state.scannedCount, icon: Scan, color: 'text-white', bg: 'bg-[#3A5F7D]', shadow: 'shadow-[#3A5F7D]/20' },
    { label: 'FIT FOR USE', value: state.fitForUseCount, icon: ShieldCheck, color: 'text-white', bg: 'bg-[#3D7A5D]', shadow: 'shadow-[#3D7A5D]/20' },
    { label: 'HAZARD DETECTED', value: state.hazardDetectedCount, icon: AlertTriangle, color: 'text-white', bg: 'bg-[#8B3A3A]', shadow: 'shadow-[#8B3A3A]/20' },
    { label: 'REGISTRY ENTRIES', value: state.registryEntries.length, icon: FileText, color: 'text-white', bg: 'bg-[#4A5568]', shadow: 'shadow-[#4A5568]/20' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* App Main Name Branding */}
      <div className="text-center pt-2 pb-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#EAEAEA] tracking-tighter uppercase italic">
          CYLINDER INFOTRACK
        </h1>
      </div>

      <div className="space-y-6">
        {/* Main Heading for Acknowledgements Section */}
        <h1 className="text-3xl font-bold text-[#EAEAEA] border-l-4 border-[#2F8F9D] pl-4 uppercase tracking-tight">Project Acknowledgements</h1>

        {/* Credit Boxes - Side by Side, Equal Width/Height, Highlighted */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Box 1: Collaborators */}
          <div className="bg-[#1F2933] border-2 border-[#2F8F9D]/30 rounded-3xl p-6 flex flex-col shadow-xl hover:border-[#2F8F9D]/60 transition-colors">
            <h3 className="text-[11px] font-bold tracking-widest text-[#2F8F9D] uppercase mb-4">Collaborators</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#EAEAEA] text-xs">
              <div className="space-y-2">
                <p className="font-bold">K. Akarsha (CSE-AIML)</p>
                <p className="font-bold">T. Madhu Hasitha (CSE-AIML)</p>
                <p className="font-bold">Manu Pandey (Mechanical Engineering)</p>
                <p className="font-bold">E. Supraja (CSE-AIML)</p>
              </div>
              <div className="space-y-2">
                <p className="font-bold">Rohit Singh (Mechanical Engineering)</p>
                <p className="font-bold">M. Noel (CSE-CORE)</p>
                <p className="font-bold">R. Sahasra (CSE-AIML)</p>
              </div>
            </div>
          </div>

          {/* Box 2: Under Supervision */}
          <div className="bg-[#1F2933] border-2 border-[#6D5BD0]/30 rounded-3xl p-6 flex flex-col shadow-xl hover:border-[#6D5BD0]/60 transition-colors">
            <h3 className="text-[11px] font-bold tracking-widest text-[#6D5BD0] uppercase mb-4">Under Supervision</h3>
            <div className="space-y-2 mt-auto mb-auto">
              <p className="text-[#EAEAEA] font-bold text-base">Dr. Pankaj Biswas</p>
              <p className="text-[#B0B8C1] text-xs leading-relaxed">Professor, Mechanical Engineering Department</p>
              <p className="text-[#B0B8C1] text-xs leading-relaxed">Indian Institute of Technology (IIT) Guwahati</p>
            </div>
          </div>

          {/* Box 3: Faculty Advisor */}
          <div className="bg-[#1F2933] border-2 border-[#F2C6DE]/30 rounded-3xl p-6 flex flex-col shadow-xl hover:border-[#F2C6DE]/60 transition-colors">
            <h3 className="text-[11px] font-bold tracking-widest text-[#F2C6DE] uppercase mb-4">Faculty Advisor</h3>
            <div className="space-y-2 mt-auto mb-auto">
              <p className="text-[#EAEAEA] font-bold text-sm">Dr. Srikant Prasad</p>
              <p className="text-[#B0B8C1] text-[10px] leading-relaxed">Sandip University, Mechanical engineering department</p>
              <p className="text-[#B0B8C1] text-[10px] leading-relaxed font-semibold">Alumni – Doctorate, IIT Guwahati</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className={`${stat.bg} ${stat.shadow} border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-lg transition-transform hover:scale-[1.02]`}>
            <div className={`w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/70 tracking-widest">{stat.label}</p>
              <p className="text-3xl font-bold mt-1 text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Action Banner */}
      <div className="bg-[#1F2933] border border-slate-800 rounded-3xl p-10 flex flex-col items-center text-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Scan size={240} className="text-[#2F8F9D]" />
        </div>
        
        <h2 className="text-4xl font-bold mb-3 z-10 text-[#EAEAEA]">Start your inspection!</h2>
        <p className="text-[#B0B8C1] mb-8 max-w-md z-10">
          Are you ready to scan and get your details instantly?
        </p>
        
        <button
          onClick={onStartScanner}
          className="bg-[#2F8F9D] hover:bg-[#2F8F9D]/80 text-white px-8 py-4 rounded-full font-bold transition-all flex items-center gap-3 group z-10 shadow-lg shadow-[#2F8F9D]/30"
        >
          <span>Start Scanner</span>
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
