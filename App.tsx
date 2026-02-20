import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, GameMode, Difficulty, GameSettings, UserStats, Question, Team } from './types';
import { INITIAL_USER_STATS, SUBJECTS, DIFFICULTIES } from './constants';
import { audioEngine } from './services/audio';
import { fetchQuestions } from './services/gemini';
import { Button, Card, Badge, SectionTitle } from './components/Shared';

// Sub-components
import GameEngine from './components/GameEngine';

const LOADING_TELEMETRY = [
  "Calibrating neural link...",
  "Encrypting sync protocol...",
  "Acquiring sector nodes...",
  "Optimizing stream path...",
  "Nexus IQ Handshake active..."
];

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>(Screen.MENU);
  const [settings, setSettings] = useState<GameSettings>({
    mode: GameMode.WIPEOUT,
    subject: SUBJECTS[0],
    difficulty: Difficulty.INTERMEDIATE,
    teamCount: 2
  });
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('nexus_stats');
    return saved ? JSON.parse(saved) : INITIAL_USER_STATS;
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameResult, setGameResult] = useState<{ score: number; total: number; success: boolean; teamResults?: Team[] } | null>(null);
  
  const [loadProgress, setLoadProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    localStorage.setItem('nexus_stats', JSON.stringify(stats));
  }, [stats]);

  const startGame = async () => {
    setScreen(Screen.LOADING);
    setLoadProgress(0);
    setStatusIdx(0);
    audioEngine.playStart();
    
    const progressInterval = setInterval(() => {
      setLoadProgress(p => Math.min(99, p + (Math.random() * 8)));
      setStatusIdx(i => (i + 1) % LOADING_TELEMETRY.length);
    }, 600);

    let count = 10;
    if (settings.mode === GameMode.MILLIONAIRE) count = 15;
    if (settings.mode === GameMode.LIGHTNING) count = 30;
    if (settings.mode === GameMode.GAUNTLET) count = 50;
    if (settings.mode === GameMode.TEAM_BATTLE) count = settings.teamCount * 5;
    if (settings.mode === GameMode.CATEGORY_KINGS) count = 18;

    try {
      const qs = await fetchQuestions(settings.mode, settings.subject, settings.difficulty, count);
      clearInterval(progressInterval);
      setLoadProgress(100);
      
      if (qs && qs.length > 0) {
        setTimeout(() => {
          setQuestions(qs);
          setScreen(Screen.GAME);
        }, 400);
      } else {
        alert("Nexus Breach: Archives unreachable.");
        setScreen(Screen.MENU);
      }
    } catch (e) {
      clearInterval(progressInterval);
      setScreen(Screen.MENU);
    }
  };

  const handleGameOver = (finalScore: number, total: number, success: boolean, teamResults?: Team[]) => {
    setGameResult({ score: finalScore, total, success, teamResults });
    setStats(prev => {
      const newTotal = prev.totalQuestions + total;
      const newCorrect = prev.correctAnswers + (settings.mode === GameMode.TEAM_BATTLE ? 0 : (success ? total : 0));
      return {
        ...prev,
        apexScore: Math.max(prev.apexScore, finalScore),
        totalQuestions: newTotal,
        correctAnswers: newCorrect,
        accuracy: Math.round((newCorrect / Math.max(1, newTotal)) * 100) || 0
      };
    });
    setScreen(Screen.RESULT);
  };

  const renderScreen = () => {
    switch (screen) {
      case Screen.MENU:
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 md:p-12"
          >
            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              {/* Hero Section */}
              <div className="md:col-span-8 flex flex-col justify-center p-8 md:p-16 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                <Badge color="cyan" className="w-fit mb-6">Neural Protocol Established</Badge>
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-6 text-slate-900">
                  NEXUS <span className="nexus-gradient-text">IQ</span>
                </h1>
                <p className="text-slate-500 font-medium text-sm md:text-lg max-w-md leading-relaxed">
                  The next generation of cyber-intelligence trivia. Sync your neural core and dominate the sectors.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Button onClick={() => setScreen(Screen.SETTINGS)} className="px-10 py-5 text-base" variant="primary">
                    Start Protocol
                  </Button>
                  <Button variant="ghost" onClick={() => setScreen(Screen.STATS)} className="px-10 py-5 text-base">
                    Archives
                  </Button>
                </div>
              </div>

              {/* Stats Bento Grid */}
              <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
                <Card className="flex flex-col justify-between bg-white border-slate-200 shadow-sm p-8">
                  <SectionTitle>Apex Node</SectionTitle>
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-cyan-600 tracking-tighter">₦{stats.apexScore.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Highest Yield</span>
                  </div>
                </Card>
                <Card className="flex flex-col justify-between bg-white border-slate-200 shadow-sm p-8">
                  <SectionTitle>Accuracy</SectionTitle>
                  <div className="flex flex-col">
                    <span className="text-4xl font-black text-pink-600 tracking-tighter">{stats.accuracy}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Neural Precision</span>
                  </div>
                </Card>
              </div>
            </div>
          </motion.div>
        );

      case Screen.SETTINGS:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto no-scrollbar"
          >
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Header Info */}
              <div className="md:col-span-12 mb-4">
                <Badge color="purple" className="mb-4">Configuration</Badge>
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 uppercase tracking-tighter leading-none">System Link</h2>
              </div>

              {/* Mode Selection - Bento */}
              <div className="md:col-span-8 space-y-4">
                <SectionTitle>Deployment Mode</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[GameMode.WIPEOUT, GameMode.MILLIONAIRE, GameMode.TEAM_BATTLE, GameMode.LIGHTNING, GameMode.GAUNTLET, GameMode.CATEGORY_KINGS].map(m => (
                    <button 
                      key={m}
                      onClick={() => setSettings(s => ({ ...s, mode: m }))}
                      className={`p-6 rounded-[2rem] border-2 transition-all text-left group ${settings.mode === m ? 'border-cyan-500 bg-cyan-50 shadow-md scale-[1.02]' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                      <div className={`font-black text-xs uppercase mb-2 ${settings.mode === m ? 'text-cyan-700' : 'text-slate-400'}`}>{m.replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-500 font-bold leading-tight uppercase">
                        {m === GameMode.WIPEOUT && "Survival Sequence"}
                        {m === GameMode.LIGHTNING && "Temporal Pulse"}
                        {m === GameMode.MILLIONAIRE && "Strategic Ladder"}
                        {m === GameMode.TEAM_BATTLE && "Squad Interlink"}
                        {m === GameMode.GAUNTLET && "Final Gauntlet"}
                        {m === GameMode.CATEGORY_KINGS && "Territory Control"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Config Sidebar */}
              <div className="md:col-span-4 space-y-6">
                <div className="space-y-4">
                  <SectionTitle>Knowledge Sector</SectionTitle>
                  <select 
                    value={settings.subject}
                    onChange={(e) => setSettings(s => ({ ...s, subject: e.target.value }))}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-5 text-slate-900 font-bold outline-none uppercase text-xs appearance-none cursor-pointer shadow-sm focus:border-cyan-400 transition-colors"
                  >
                    {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <SectionTitle>Neural Load</SectionTitle>
                  <select 
                    value={settings.difficulty}
                    onChange={(e) => setSettings(s => ({ ...s, difficulty: e.target.value as Difficulty }))}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-5 text-slate-900 font-bold outline-none uppercase text-xs appearance-none cursor-pointer shadow-sm focus:border-cyan-400 transition-colors"
                  >
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                
                <div className="pt-6 grid grid-cols-2 gap-3">
                  <Button variant="ghost" onClick={() => setScreen(Screen.MENU)} className="py-5">Back</Button>
                  <Button onClick={startGame} className="py-5" variant="primary">Establish</Button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case Screen.LOADING:
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative w-48 h-48 mb-12">
               <div className="absolute inset-0 border-[6px] border-slate-200 rounded-full"></div>
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 border-t-[6px] border-cyan-500 rounded-full"
               ></motion.div>
               <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] tracking-[0.4em] text-cyan-600 font-bold animate-pulse uppercase">UPLINKING</div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Neural Sync</h2>
            <div className="w-full max-w-xs h-1.5 bg-slate-200 rounded-full overflow-hidden mb-6">
               <motion.div 
                 className="h-full bg-cyan-500" 
                 animate={{ width: `${loadProgress}%` }}
               ></motion.div>
            </div>
            <div className="font-mono text-[10px] text-cyan-600 uppercase font-bold tracking-widest h-6">
               {LOADING_TELEMETRY[statusIdx]}
            </div>
          </motion.div>
        );

      case Screen.GAME:
        return (
          <GameEngine 
            settings={settings} 
            questions={questions} 
            onGameOver={handleGameOver} 
            onAbort={() => setScreen(Screen.MENU)} 
          />
        );

      case Screen.RESULT:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <Card className="w-full max-w-md p-8 bg-white border-slate-200 shadow-xl">
              <Badge color={gameResult?.success ? 'emerald' : 'rose'} className="mx-auto mb-6">Summary</Badge>
              <h1 className={`text-5xl font-black tracking-tighter uppercase mb-10 ${gameResult?.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                {gameResult?.success ? 'VERIFIED' : 'BREACH'}
              </h1>

              <div className="grid grid-cols-2 gap-3 mb-10">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <SectionTitle>Secured</SectionTitle>
                  <div className="text-2xl font-black text-slate-900">₦{gameResult?.score.toLocaleString()}</div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <SectionTitle>Efficiency</SectionTitle>
                  <div className={`text-2xl font-black ${gameResult?.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {gameResult ? Math.round((gameResult.total > 0 ? (gameResult.score / (gameResult.total * 100)) * 100 : 0)) : 0}%
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={startGame} className="w-full py-5" variant="primary">Re-Link</Button>
                <Button variant="ghost" onClick={() => setScreen(Screen.MENU)} className="w-full py-4">Main Hub</Button>
              </div>
            </Card>
          </motion.div>
        );

      case Screen.STATS:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Archive</h2>
              <Button variant="ghost" onClick={() => setScreen(Screen.MENU)} className="px-5 py-2 text-[10px]">Back</Button>
            </div>
            
            <div className="space-y-6 pb-12">
              <Card className="p-6 bg-white border-slate-200 shadow-sm">
                <SectionTitle>Neural Metrics</SectionTitle>
                <div className="space-y-6 mt-4">
                  {[
                    { label: 'Synced Nodes', val: stats.totalQuestions, color: 'bg-cyan-500', perc: 100 },
                    { label: 'Accuracy', val: `${stats.accuracy}%`, color: 'bg-emerald-500', perc: stats.accuracy },
                    { label: 'Peak Capacity', val: `₦${stats.apexScore.toLocaleString()}`, color: 'bg-amber-500', perc: Math.min(100, (stats.apexScore / 10000) * 100) }
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] mb-2 font-bold uppercase text-slate-500">
                        <span>{s.label}</span>
                        <span className="text-slate-900">{s.val}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${s.perc}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className={`h-full rounded-full ${s.color}`}
                        ></motion.div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-white border-slate-200 shadow-sm">
                <SectionTitle>Neural Landmarks</SectionTitle>
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {[
                    { name: 'Initial Uplink', desc: 'Secure first data node', unlock: stats.totalQuestions > 0 },
                    { name: 'Node Specialist', desc: 'Sync 500 nodes', unlock: stats.totalQuestions >= 500 },
                    { name: 'Pure Precision', desc: '> 95% Accuracy', unlock: stats.accuracy >= 95 && stats.totalQuestions >= 30 },
                    { name: 'Elite Hub', desc: 'Secure ₦10,000 node', unlock: stats.apexScore >= 10000 },
                  ].map((a, i) => (
                    <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${a.unlock ? 'border-cyan-200 bg-cyan-50' : 'border-slate-100 opacity-40 grayscale'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${a.unlock ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {a.unlock ? '◈' : '◇'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs uppercase tracking-tight">{a.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono uppercase mt-0.5">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative bg-[#f8f9fa] overflow-x-hidden selection:bg-cyan-100">
      {/* Background Elements */}
      <div className="grid-bg"></div>
      <div className="glow glow-1"></div>
      <div className="glow glow-2"></div>
      
      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>

      {/* Floating Brand Mark - Subtle */}
      <div className="fixed top-6 left-6 z-50 pointer-events-none opacity-20 hidden md:block">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center font-black text-sm text-white italic">N</div>
          <span className="font-black text-sm tracking-tighter text-slate-900 uppercase">NEXUS IQ</span>
        </div>
      </div>
    </div>
  );
};

export default App;
