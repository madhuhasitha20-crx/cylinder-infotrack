
import React from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { CylinderRecord } from '../types';

interface RegistryProps {
  data: CylinderRecord[];
}

const Registry: React.FC<RegistryProps> = ({ data }) => {
  const handleExport = () => {
    const headers = [
      'Cylinder ID', 'Serial Number', 'Gas Type', 'Gas Category', 'Manufacturer',
      'Capacity (kg)', 'Working Pressure', 'Test Pressure', 'Test Date',
      'Standard Code (IS Code)', 'Expiry Date', 'Inspection Date', 'Location Type',
      'Rust Level', 'Hazard Type', 'Cap Present', 'Label Condition', 'Remarks'
    ];
    
    const rows = data.map(r => [
      r.cylinderId, r.serialNumber, r.gasType, r.gasCategory, r.manufacturer,
      r.capacity, r.workingPressure, r.testPressure, r.testDate,
      r.standardCode, r.expiryDate, r.inspectionDate, r.locationType,
      r.rustLevel, r.hazardType, r.capPresent, r.labelCondition, r.remarks
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cylinder_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const headers = [
    'Cylinder ID', 'Serial Number', 'Gas Type', 'Gas Category', 'Manufacturer',
    'Capacity (kg)', 'Working Pressure', 'Test Pressure', 'Test Date',
    'Standard Code (IS Code)', 'Expiry Date', 'Inspection Date', 'Location Type',
    'Rust Level', 'Hazard Type', 'Cap Present', 'Label Condition', 'Remarks'
  ];

  return (
    <div className="p-4 lg:p-8 w-full mx-auto overflow-hidden space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3 text-[#EAEAEA]">
            <div className="w-10 h-10 rounded-xl bg-[#F2C6DE]/10 flex items-center justify-center">
              <FileSpreadsheet className="text-[#F2C6DE] w-6 h-6" />
            </div>
            Inventory Sheet
          </h1>
          <p className="text-[#B0B8C1] text-xs font-medium mt-1 uppercase tracking-widest">Global Asset Registry Management</p>
        </div>
        
        <button
          onClick={handleExport}
          style={{ backgroundColor: '#F2C6DE' }}
          className="hover:opacity-90 text-[#8B3A3A] px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#F2C6DE]/20 text-sm"
        >
          <Download size={18} />
          Export as XL sheet
        </button>
      </div>

      <div style={{ backgroundColor: '#FAEDCB' }} className="rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/10">
                {headers.map((h, i) => (
                  <th key={i} className="px-6 py-5 text-[10px] font-bold text-black/60 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, idx) => (
                  <tr key={idx} className="border-b border-black/5 last:border-0 hover:bg-black/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-black whitespace-nowrap">{row.cylinderId}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.serialNumber}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.gasType}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.gasCategory}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.manufacturer}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.capacity}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.workingPressure}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.testPressure}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.testDate}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.standardCode}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.expiryDate}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.inspectionDate}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.locationType}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.rustLevel}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.hazardType}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.capPresent}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-black/80 whitespace-nowrap">{row.labelCondition}</td>
                    <td className="px-6 py-4 text-xs font-bold text-[#3D7A5D] whitespace-nowrap uppercase">{row.remarks}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center text-black/20">
                        <FileSpreadsheet size={32} />
                      </div>
                      <div>
                        <p className="text-black font-bold text-lg">Registry is currently empty</p>
                        <p className="text-black/40 text-sm">Completed scans will appear here automatically.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Registry;
