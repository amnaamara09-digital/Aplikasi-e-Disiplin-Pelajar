
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PlusCircle, 
  Search, 
  FileText, 
  Mail, 
  History, 
  Calendar,
  LayoutDashboard,
  Menu,
  LogOut,
  Settings,
  AlertTriangle,
  Edit2,
  Trash2,
  BarChart3,
  Filter,
  Download,
  Bell,
  Upload,
  Database,
  CheckCircle2,
  X,
  ClipboardList,
  FileDown,
  TableProperties
} from 'lucide-react';
import { 
  Chart, 
  registerables 
} from 'chart.js';
import { 
  DisciplineRecord, 
  ViolationCategory 
} from './types';
import { 
  SCHOOL_INFO, 
  STUDENT_NAMES,
  VIOLATION_OPTIONS, 
  ACTION_OPTIONS,
  CLASS_OPTIONS,
  CATEGORY_OPTIONS,
  LOCATION_OPTIONS,
  INITIAL_RECORDS
} from './constants';
import { generateReport, generateLetter, generateSummary, generateAllSummaries, generateTableReport } from './services/pdfService';

Chart.register(...registerables);

type SortKey = 'studentName' | 'date';
type SortDirection = 'asc' | 'desc';

const LOGO_URL = "https://i.ibb.co/99m6byNT/MTIJ-Logo-3.png";

const App: React.FC = () => {
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard'>('dashboard');
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
    key: 'date', 
    direction: 'desc' 
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [studentName, setStudentName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("08:00");
  const [studentClass, setStudentClass] = useState(CLASS_OPTIONS[0]);
  const [category, setCategory] = useState<ViolationCategory>('SALAH LAKU RINGAN');
  const [violationType, setViolationType] = useState(VIOLATION_OPTIONS[0]);
  const [location, setLocation] = useState(LOCATION_OPTIONS[0]);
  const [reportedBy, setReportedBy] = useState('');
  const [actionTaken, setActionTaken] = useState(ACTION_OPTIONS[0]);
  const [details, setDetails] = useState('');

  // Initial Data Loading
  useEffect(() => {
    const saved = localStorage.getItem('mtij_records_v3');
    if (saved) {
      const parsed: DisciplineRecord[] = JSON.parse(saved);
      const savedIds = new Set(parsed.map(r => r.id));
      const missingRecords = INITIAL_RECORDS.filter(r => !savedIds.has(r.id));
      if (missingRecords.length > 0) {
        saveRecords([...parsed, ...missingRecords]);
      } else {
        setRecords(parsed);
      }
    } else {
      saveRecords(INITIAL_RECORDS);
    }
  }, []);

  const saveRecords = (newRecords: DisciplineRecord[]) => {
    const sorted = [...newRecords].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setRecords(sorted);
    localStorage.setItem('mtij_records_v3', JSON.stringify(sorted));
  };

  const resetForm = () => {
    setStudentName('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime("08:00");
    setStudentClass(CLASS_OPTIONS[0]);
    setCategory('SALAH LAKU RINGAN');
    setViolationType(VIOLATION_OPTIONS[0]);
    setLocation(LOCATION_OPTIONS[0]);
    setReportedBy('');
    setActionTaken(ACTION_OPTIONS[0]);
    setDetails('');
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !reportedBy) {
      alert("Sila pastikan Nama Pelajar dan Nama Pelapor diisi.");
      return;
    }
    const dayNames = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
    const selectedDay = dayNames[new Date(date).getDay()];
    const demeritValue = category === 'SALAH LAKU BERAT' ? -20 : (category === 'SALAH LAKU SEDERHANA' ? -10 : -5);
    if (editingId) {
      const updatedRecords = records.map(rec => 
        rec.id === editingId ? {
          ...rec, studentName, date, day: selectedDay, time, studentClass, category, violationType,
          demerit: demeritValue, location, reportedBy, actionTaken, details
        } : rec
      );
      saveRecords(updatedRecords);
    } else {
      const newRecord: DisciplineRecord = {
        id: `MTIJ-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        studentName, date, day: selectedDay, time, studentClass, category, violationType,
        demerit: demeritValue, location, reportedBy, actionTaken, details, createdAt: Date.now()
      };
      saveRecords([newRecord, ...records]);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    resetForm();
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `MTIJ_Backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    setIsSidebarOpen(false);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedRecords: DisciplineRecord[] = JSON.parse(content);
        if (Array.isArray(importedRecords) && window.confirm(`Muat naik ${importedRecords.length} rekod?`)) {
          const existingIds = new Set(records.map(r => r.id));
          const newUniqueRecords = importedRecords.filter(r => !existingIds.has(r.id));
          saveRecords([...records, ...newUniqueRecords]);
          alert("Data berjaya dimuat naik!");
        }
      } catch (err) {
        alert("Fail tidak sah.");
      }
    };
    fileReader.readAsText(files[0]);
    setIsSidebarOpen(false);
  };

  const handleEdit = (record: DisciplineRecord) => {
    setEditingId(record.id);
    setStudentName(record.studentName);
    setDate(record.date);
    setTime(record.time);
    setStudentClass(record.studentClass);
    setCategory(record.category);
    setViolationType(record.violationType);
    setLocation(record.location);
    setReportedBy(record.reportedBy);
    setActionTaken(record.actionTaken);
    setDetails(record.details);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Padam rekod ini secara kekal?')) {
      saveRecords(records.filter(rec => rec.id !== id));
    }
  };

  const navigateTo = (tab: 'form' | 'dashboard') => {
    setActiveTab(tab);
    if (tab === 'form' && !editingId) resetForm();
    setIsSidebarOpen(false);
  };

  const sortedAndFilteredRecords = useMemo(() => {
    const now = new Date();
    const filtered = records.filter(record => {
      const recordDate = new Date(record.date);
      if (searchQuery && !record.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType === 'daily') return record.date === now.toISOString().split('T')[0];
      if (filterType === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return recordDate >= weekAgo;
      }
      if (filterType === 'monthly') return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      return true;
    });
    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, filterType, sortConfig, searchQuery]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      today: records.filter(r => r.date === todayStr).length,
      total: records.length,
      topViolation: records.length > 0 
        ? (Object.entries(records.reduce((acc, curr) => { acc[curr.violationType] = (acc[curr.violationType] || 0) + 1; return acc; }, {} as Record<string, number>)) as [string, number][])
            .sort((a,b) => b[1] - a[1])[0]?.[0]
        : 'Tiada'
    };
  }, [records]);

  useEffect(() => {
    if (activeTab === 'dashboard' && chartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      const demeritMap: Record<string, number> = {};
      sortedAndFilteredRecords.forEach(rec => { demeritMap[rec.studentName] = (demeritMap[rec.studentName] || 0) + Math.abs(rec.demerit); });
      const sorted = (Object.entries(demeritMap) as [string, number][]).sort((a,b) => b[1] - a[1]).slice(0, 8);
      chartInstance.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels: sorted.map(s => s[0]),
          datasets: [{ label: 'Demerit', data: sorted.map(s => s[1]), backgroundColor: '#3b82f6', borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { 
            y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } }, 
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 45, minRotation: 45 } } 
          }
        }
      });
    }
  }, [sortedAndFilteredRecords, activeTab]);

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 bg-[#020617] border-r border-slate-800 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex-1">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl w-12 h-12 flex items-center justify-center shrink-0">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white leading-none mb-1">MTIJ PAPAR</h2>
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">e-Disiplin</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <nav className="space-y-6">
            <div>
              <p className="px-4 mb-3 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Utama</p>
              <button onClick={() => navigateTo('dashboard')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600/10 text-blue-500 border border-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                <LayoutDashboard size={18} /> <span className="text-sm">Dashboard</span>
              </button>
              <button onClick={() => navigateTo('form')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold mt-1 transition-all ${activeTab === 'form' ? 'bg-blue-600/10 text-blue-500 border border-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}>
                <PlusCircle size={18} /> <span className="text-sm">Daftar Kes</span>
              </button>
            </div>
            <div>
              <p className="px-4 mb-3 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Sistem</p>
              <button onClick={exportData} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-all text-left">
                <Download size={18} /> <span className="text-sm">Backup Data (.json)</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-all text-left">
                <Upload size={18} /> <span className="text-sm">Restore Data</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
            </div>
          </nav>
        </div>
        <div className="p-6 border-t border-slate-800">
          <div className="bg-slate-900/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">A</div>
            <div>
              <p className="text-xs font-bold text-white truncate">Pentadbir MTIJ</p>
              <p className="text-[9px] text-slate-500 truncate">Sesi 2026</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 lg:ml-72">
        <header className="h-20 border-b border-slate-800 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-6 lg:px-10">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
            <Menu size={24} />
          </button>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black uppercase text-white">{activeTab === 'dashboard' ? 'Log Disiplin' : 'Pendaftaran Kes'}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input type="text" placeholder="Cari pelajar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 rounded-xl text-xs focus:border-blue-500 outline-none w-40 sm:w-60 transition-all" />
            </div>
            <button className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl"><Bell size={20} /></button>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-[1400px] mx-auto w-full">
          {activeTab === 'form' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase mb-2">{editingId ? 'Kemaskini Kes' : 'Daftar Kes Baharu'}</h2>
                  <p className="text-sm text-slate-400">Pastikan semua medan wajib diisi sebelum menekan butang simpan.</p>
                </div>
                <button onClick={() => navigateTo('dashboard')} className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 tracking-widest flex items-center gap-2">
                  <LayoutDashboard size={14} /> Kembali Ke Dashboard
                </button>
              </div>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nama Pelajar</label>
                  <select value={studentName} onChange={e => setStudentName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200 outline-none focus:border-blue-500" required>
                    <option value="">Pilih Pelajar</option>
                    {STUDENT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Kelas</label>
                  <select value={studentClass} onChange={e => setStudentClass(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200 outline-none focus:border-blue-500">
                    {CLASS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Tarikh & Masa</label>
                  <div className="flex gap-2">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200" required />
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-32 bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Kategori</label>
                  <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200 outline-none focus:border-blue-500">
                    {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Jenis Salah Laku</label>
                  <select value={violationType} onChange={e => setViolationType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200 outline-none focus:border-blue-500">
                    {VIOLATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Dilaporkan Oleh</label>
                  <input type="text" value={reportedBy} onChange={e => setReportedBy(e.target.value)} placeholder="Nama Guru/Warden" className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200" required />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Butiran</label>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl text-slate-200 h-32 resize-none" />
                </div>
                <div className="md:col-span-2 pt-4">
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Download size={20} /> {editingId ? 'Kemaskini Rekod' : 'Simpan Rekod'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Kes Hari Ini</p>
                  <p className="text-4xl font-black text-white">{stats.today}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Jumlah Kes</p>
                  <p className="text-4xl font-black text-white">{stats.total}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Kes Kerap</p>
                  <p className="text-sm font-bold text-white truncate">{stats.topViolation}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Status</p>
                  <p className="text-sm font-bold text-green-500 uppercase">Aktif</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <h2 className="text-lg font-black text-white uppercase">Log Disiplin ({sortedAndFilteredRecords.length})</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    {sortedAndFilteredRecords.length > 0 && (
                      <>
                        <button 
                          onClick={() => generateTableReport(sortedAndFilteredRecords, SCHOOL_INFO, filterType)} 
                          className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all border border-blue-500/20 flex items-center gap-2"
                        >
                          <TableProperties size={14} /> Muat Turun Ringkasan Laporan (Jadual)
                        </button>
                        <button 
                          onClick={() => generateAllSummaries(sortedAndFilteredRecords, SCHOOL_INFO)} 
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all border border-slate-700 flex items-center gap-2"
                        >
                          <FileDown size={14} /> Muat Turun Semua Ringkasan (Halaman)
                        </button>
                      </>
                    )}
                    <button onClick={() => navigateTo('form')} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                      <PlusCircle size={14} /> Daftar Kes Baru
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950/50 border-b border-slate-800">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">Pelajar</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">Kesalahan</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sortedAndFilteredRecords.map(record => (
                        <tr key={record.id} className="hover:bg-slate-800/30 transition-all">
                          <td className="px-8 py-6">
                            <p className="font-bold text-slate-200 text-sm">{record.studentName}</p>
                            <p className="text-[10px] font-black text-blue-500 uppercase">{record.studentClass}</p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs text-slate-400 line-clamp-1">{record.violationType}</p>
                            <span className="text-[9px] font-black text-slate-500">{record.date}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => generateSummary(record, SCHOOL_INFO)} className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500" title="Muat Turun Ringkasan"><ClipboardList size={16} /></button>
                              <button onClick={() => generateReport(record, SCHOOL_INFO)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400" title="Laporan Penuh"><FileText size={16} /></button>
                              <button onClick={() => generateLetter(record, SCHOOL_INFO)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400" title="Surat Rasmi"><Mail size={16} /></button>
                              <button onClick={() => handleEdit(record)} className="p-2 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400" title="Edit"><Edit2 size={16} /></button>
                              <button onClick={() => handleDelete(record.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-500" title="Padam"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      {showToast && (
        <div className="fixed bottom-10 right-10 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-10 z-[100]">
          <CheckCircle2 size={24} />
          <div>
            <p className="font-black uppercase text-xs tracking-widest">Berjaya!</p>
            <p className="text-[10px] font-bold opacity-80">Data telah dikemaskini.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
