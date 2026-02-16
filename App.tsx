import React, { useState, useEffect } from 'react';
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700 overflow-y-auto no-scrollbar">
            <Badge color="cyan" className="mb-6">Neural Protocol Established</Badge>
            <h1 className="text-7xl lg:text-[11rem] font-black tracking-tighter leading-none mb-4 lg:mb-8">
              <span className="nexus-gradient-text drop-shadow-[0_0_30px_rgba(0,242,255,0.2)]">NEXUS IQ</span>
            </h1>
            <p className="max-w-xl text-slate-500 font-bold text-xs lg:text-sm uppercase tracking-[0.5em] mb-12 lg:mb-20">
              Cyber-Intelligence // Sync Core Ver. 5.2
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 w-full max-w-5xl">
              {[
                { label: 'Apex Node Value', val: `₦${stats.apexScore.toLocaleString()}`, color: 'text-cyan-400' },
                { label: 'Total Synced', val: stats.totalQuestions, color: 'text-purple-400' },
                { label: 'Neural Accuracy', val: `${stats.accuracy}%`, color: 'text-pink-400' }
              ].map((stat, i) => (
                <Card key={i} className="flex flex-col items-center py-6 lg:py-10 bg-white/[0.02] border-white/5 hover:bg-white/[0.05] transition-all cursor-default">
                  <SectionTitle>{stat.label}</SectionTitle>
                  <span className={`text-2xl lg:text-4xl font-black ${stat.color} tracking-tighter`}>{stat.val}</span>
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm lg:max-w-none justify-center">
              <Button onClick={() => setScreen(Screen.SETTINGS)} className="text-base lg:px-24 py-6 lg:w-auto" glow>
                Start Protocol
              </Button>
              <Button variant="ghost" onClick={() => setScreen(Screen.STATS)} className="text-base lg:px-24 py-6 lg:w-auto">
                Neural History
              </Button>
            </div>
          </div>
        );

      case Screen.SETTINGS:
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-8">
            <div className="max-w-5xl w-full space-y-6 lg:space-y-10">
              <div className="text-center space-y-3">
                <Badge color="purple">Configuration Hub</Badge>
                <h2 className="text-3xl lg:text-6xl font-black text-white uppercase tracking-tighter">System Link</h2>
              </div>

              <Card className="space-y-10 lg:p-16 cyber-border bg-slate-900/40">
                <div className="space-y-4">
                  <SectionTitle>Deployment Mode</SectionTitle>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {[GameMode.WIPEOUT, GameMode.MILLIONAIRE, GameMode.TEAM_BATTLE, GameMode.LIGHTNING, GameMode.GAUNTLET, GameMode.CATEGORY_KINGS].map(m => (
                      <button 
                        key={m}
                        onClick={() => setSettings(s => ({ ...s, mode: m }))}
                        className={`p-4 lg:p-6 rounded-2xl border-2 text-left transition-all ${settings.mode === m ? 'border-cyan-400 bg-cyan-400/10 scale-[1.03] shadow-lg shadow-cyan-500/10' : 'border-white/5 bg-white/5'}`}
                      >
                        <div className="font-black text-white text-[10px] lg:text-sm uppercase mb-1">{m.replace('_', ' ')}</div>
                        <div className="text-[8px] text-slate-500 font-mono font-bold leading-tight uppercase opacity-50 hidden sm:block">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                  <div className="space-y-3">
                    <SectionTitle>Knowledge Sector</SectionTitle>
                    <select 
                      value={settings.subject}
                      onChange={(e) => setSettings(s => ({ ...s, subject: e.target.value }))}
                      className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl p-4 lg:p-6 text-white font-black focus:border-cyan-400 outline-none uppercase text-[10px] lg:text-xs appearance-none cursor-pointer"
                    >
                      {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <SectionTitle>Neural Load</SectionTitle>
                    <select 
                      value={settings.difficulty}
                      onChange={(e) => setSettings(s => ({ ...s, difficulty: e.target.value as Difficulty }))}
                      className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl p-4 lg:p-6 text-white font-black focus:border-cyan-400 outline-none uppercase text-[10px] lg:text-xs appearance-none cursor-pointer"
                    >
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
                  <Button variant="ghost" onClick={() => setScreen(Screen.MENU)} className="flex-1 py-4 lg:py-6 text-xs">Disconnect</Button>
                  <Button onClick={startGame} className="flex-[2] py-4 lg:py-6 text-lg" glow>Establish Uplink</Button>
                </div>
              </Card>
            </div>
          </div>
        );

      case Screen.LOADING:
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-40 h-40 lg:w-64 lg:h-64 mb-12">
               <div className="absolute inset-0 border-[4px] lg:border-[8px] border-cyan-400/5 rounded-full"></div>
               <div className="absolute inset-0 border-t-[4px] lg:border-t-[8px] border-cyan-400 rounded-full animate-spin"></div>
               <div className="absolute inset-4 lg:inset-8 border-[4px] lg:border-[8px] border-purple-400/5 rounded-full"></div>
               <div className="absolute inset-4 lg:inset-8 border-b-[4px] lg:border-b-[8px] border-purple-400 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.2s]"></div>
               <div className="absolute inset-0 flex items-center justify-center font-mono text-[8px] lg:text-[11px] tracking-[0.5em] text-cyan-400 font-black animate-pulse uppercase">UPLINKING</div>
            </div>
            <h2 className="text-3xl lg:text-6xl font-black text-white uppercase tracking-tighter mb-6">Neural Sync</h2>
            <div className="w-full max-w-[240px] lg:max-w-md h-2 bg-slate-900 rounded-full overflow-hidden mb-6 border border-white/5">
               <div className="h-full bg-cyan-400 shadow-[0_0_15px_#00f2ff]" style={{ width: `${loadProgress}%` }}></div>
            </div>
            <div className="font-mono text-[9px] lg:text-sm text-cyan-300 uppercase font-black tracking-[0.3em] h-6 italic">
               {LOADING_TELEMETRY[statusIdx]}
            </div>
          </div>
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
          <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 animate-in zoom-in duration-500 overflow-y-auto no-scrollbar">
            <Card className="max-w-4xl w-full p-8 lg:p-20 cyber-border bg-slate-900/60 text-center">
              <Badge color={gameResult?.success ? 'emerald' : 'rose'} className="mx-auto mb-8">Node Summary</Badge>
              <h1 className={`text-6xl lg:text-9xl font-black tracking-tighter uppercase mb-12 ${gameResult?.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {gameResult?.success ? 'VERIFIED' : 'BREACH'}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 mb-12">
                <div className="p-8 lg:p-12 rounded-[2rem] bg-white/[0.02] border border-white/5">
                  <SectionTitle>Nodes Secured</SectionTitle>
                  <div className="text-5xl lg:text-7xl font-black text-white">₦{gameResult?.score.toLocaleString() || '0'}</div>
                </div>
                <div className="p-8 lg:p-12 rounded-[2rem] bg-white/[0.02] border border-white/5">
                  <SectionTitle>Neural Efficiency</SectionTitle>
                  <div className={`text-5xl lg:text-7xl font-black ${gameResult?.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gameResult ? Math.round((gameResult.total > 0 ? (gameResult.score / (gameResult.total * 100)) * 100 : 0)) : 0}%
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={startGame} className="flex-1 py-6 text-xl" glow>Establish Re-Link</Button>
                <Button variant="ghost" onClick={() => setScreen(Screen.MENU)} className="flex-1 py-6 text-xl">Main Hub</Button>
              </div>
            </Card>
          </div>
        );

      case Screen.STATS:
        return (
          <div className="flex-1 flex flex-col p-4 lg:p-16 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-6">
             <div className="max-w-6xl w-auto mx-auto space-y-8 lg:space-y-12">
               <div className="flex justify-between items-center">
                 <h2 className="text-4xl lg:text-8xl font-black text-white uppercase tracking-tighter drop-shadow-lg">Archive</h2>
                 <Button variant="outline" onClick={() => setScreen(Screen.MENU)} className="px-8 py-3 text-[10px]">Return</Button>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                 <Card className="p-8 lg:p-12 bg-slate-900/60 cyber-border">
                   <SectionTitle>Neural Metrics</SectionTitle>
                   <div className="space-y-10 mt-8">
                     {[
                       { label: 'Synced Nodes', val: stats.totalQuestions, color: 'bg-cyan-400', perc: 100 },
                       { label: 'Success Velocity', val: `${stats.accuracy}%`, color: 'bg-emerald-400', perc: stats.accuracy },
                       { label: 'Peak Capacity', val: `₦${stats.apexScore.toLocaleString()}`, color: 'bg-amber-400', perc: Math.min(100, (stats.apexScore / 10000) * 100) }
                     ].map((s, i) => (
                       <div key={i}>
                         <div className="flex justify-between text-[10px] mb-3 font-black uppercase text-slate-500 tracking-widest">
                           <span>{s.label}</span>
                           <span className="text-white text-base">{s.val}</span>
                         </div>
                         <div className="h-3 bg-slate-950 rounded-full border border-white/5 p-[1px]">
                           <div className={`h-full rounded-full transition-all duration-1000 ${s.color}`} style={{ width: `${s.perc}%` }}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </Card>

                 <Card className="p-8 lg:p-12 bg-slate-900/60 cyber-border">
                   <SectionTitle>Neural Landmarks</SectionTitle>
                   <div className="grid grid-cols-1 gap-3 mt-8">
                      {[
                        { name: 'Initial Uplink', desc: 'Secure first data node', unlock: stats.totalQuestions > 0 },
                        { name: 'Node Specialist', desc: 'Sync 500 nodes', unlock: stats.totalQuestions >= 500 },
                        { name: 'Pure Precision', desc: '> 95% Node Accuracy', unlock: stats.accuracy >= 95 && stats.totalQuestions >= 30 },
                        { name: 'Elite Hub', desc: 'Secure ₦10,000 node', unlock: stats.apexScore >= 10000 },
                      ].map((a, i) => (
                        <div key={i} className={`p-5 rounded-2xl border-2 flex items-center gap-5 transition-all ${a.unlock ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/5 opacity-25 grayscale'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${a.unlock ? 'bg-cyan-400 text-black shadow-inner' : 'bg-slate-800 text-slate-600'}`}>
                            {a.unlock ? '◈' : '◇'}
                          </div>
                          <div>
                            <div className="font-black text-white text-xs lg:text-sm uppercase tracking-tight">{a.name}</div>
                            <div className="text-[9px] text-slate-500 font-mono font-bold uppercase mt-1">{a.desc}</div>
                          </div>
                        </div>
                      ))}
                   </div>
                 </Card>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#010409] overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-50"></div>
      
      <header className="px-5 py-6 lg:px-12 lg:py-8 flex justify-between items-center glass z-[60] shrink-0 border-b border-white/5 relative">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => { audioEngine.playClick(); setScreen(Screen.MENU); }}>
          <div className="w-10 h-10 lg:w-14 lg:h-14 bg-cyan-400 rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-xl lg:text-3xl text-black shadow-[0_0_25px_rgba(0,242,255,0.3)] transition-all group-active:scale-90 active-pulse italic shrink-0">N</div>
          <div className="flex flex-col truncate">
            <span className="font-black text-xl lg:text-3xl tracking-tighter text-white uppercase leading-none">NEXUS IQ</span>
            <span className="text-[8px] lg:text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-[0.3em] leading-none mt-1 lg:mt-2 opacity-60">Neural Core 5.2</span>
          </div>
        </div>
        <div className="hidden sm:flex gap-3">
          <Badge color="cyan">Link: Stable</Badge>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {renderScreen()}
      </main>

      <footer className="py-4 px-12 text-center glass shrink-0 border-t border-white/5 z-50">
        <span className="text-slate-700 font-mono text-[8px] uppercase font-black tracking-[0.6em] opacity-30">
          Uplink ID 0x7F43 // End Encrypted Hub Stream // Ver 5.2
        </span>
      </footer>
    </div>
  );
};

export default App;