
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import Registry from './components/Registry';
import { Page, AppState, CylinderRecord } from './types';
import { Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [state, setState] = useState<AppState>({
    scannedCount: 0,
    fitForUseCount: 0,
    hazardDetectedCount: 0,
    registryEntries: [],
    currentScan: null,
    history: []
  });

  const handleCommitRecord = (record: CylinderRecord) => {
    setState(prev => ({
      ...prev,
      registryEntries: [...prev.registryEntries, record],
      scannedCount: prev.scannedCount + 1,
      fitForUseCount: record.remarks.toLowerCase().includes('fit') ? prev.fitForUseCount + 1 : prev.fitForUseCount,
      hazardDetectedCount: record.hazardType.toLowerCase().includes('highly') ? prev.hazardDetectedCount + 1 : prev.hazardDetectedCount
    }));
    setActivePage(Page.InventoryRegistry);
  };

  const handleNewScan = () => {
    setActivePage(Page.VisionScanner);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen flex text-[#EAEAEA] overflow-x-hidden selection:bg-[#2F8F9D]/30">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          activePage={activePage} 
          setActivePage={(page) => {
            setActivePage(page);
            setIsSidebarOpen(false);
          }} 
        />
      </div>
      
      <main className={`flex-1 transition-all duration-300 lg:ml-64 min-h-screen w-full`}>
        <header className="h-16 border-b border-slate-800/50 flex items-center px-4 lg:px-8 justify-between sticky top-0 bg-[#121212]/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          {/* Header right side content removed as per request */}
        </header>

        <div className="relative pt-4 pb-12 w-full">
          {activePage === Page.Dashboard && (
            <Dashboard 
              state={state} 
              onStartScanner={() => setActivePage(Page.VisionScanner)} 
            />
          )}
          {activePage === Page.VisionScanner && (
            <Scanner 
              onCommit={handleCommitRecord}
              onNewScan={handleNewScan}
            />
          )}
          {activePage === Page.InventoryRegistry && (
            <Registry data={state.registryEntries} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
