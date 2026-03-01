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
  const [isPulseActive, setIsPulseActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    localStorage.setItem('nexus_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    audioEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const startGame = async () => {
    setScreen(Screen.LOADING);
    setLoadProgress(0);
    setStatusIdx(0);
    setIsPulseActive(true);
    audioEngine.playStart();
    
    setTimeout(() => setIsPulseActive(false), 2000);

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

  const handleGameOver = (finalScore: number, correct: number, total: number, success: boolean, teamResults?: Team[]) => {
    setGameResult({ score: finalScore, total, success, teamResults });
    setStats(prev => {
      const newTotal = prev.totalQuestions + total;
      const newCorrect = prev.correctAnswers + correct;
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
            className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 max-w-lg mx-auto w-full"
          >
            <div className="w-full space-y-12 text-center">
              <div className="space-y-4">
                <Badge className="mx-auto">Version 2.0</Badge>
                <h1 className="text-7xl md:text-8xl font-light tracking-tight text-white">
                  Nexus
                </h1>
                <p className="text-neutral-500 font-medium text-sm max-w-xs mx-auto leading-relaxed">
                  A minimalist intelligence protocol designed for the modern mind.
                </p>
              </div>

              <div className="space-y-4 w-full">
                <Button onClick={() => setScreen(Screen.SETTINGS)} className="w-full" variant="primary">
                  Begin
                </Button>
                <Button variant="ghost" onClick={() => setScreen(Screen.STATS)} className="w-full">
                  Archives
                </Button>
              </div>

              <div className="pt-8 flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-xl font-medium text-white">₦{stats.apexScore.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Apex</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-medium text-white">{stats.accuracy}%</div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Accuracy</div>
                </div>
              </div>

              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-neutral-600 hover:text-white transition-colors text-xs uppercase tracking-widest font-medium"
              >
                {soundEnabled ? 'Audio On' : 'Audio Off'}
              </button>
            </div>
          </motion.div>
        );

      case Screen.SETTINGS:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col p-8 md:p-12 max-w-lg mx-auto w-full overflow-y-auto no-scrollbar"
          >
            <div className="space-y-12 pb-12">
              <div className="space-y-2">
                <Badge>Configure</Badge>
                <h2 className="text-4xl font-light tracking-tight text-white">System Link</h2>
              </div>

              <div className="space-y-6">
                <SectionTitle>Mode</SectionTitle>
                <div className="grid grid-cols-1 gap-3">
                  {[GameMode.WIPEOUT, GameMode.MILLIONAIRE, GameMode.TEAM_BATTLE, GameMode.LIGHTNING, GameMode.GAUNTLET, GameMode.CATEGORY_KINGS].map(m => (
                    <button 
                      key={m}
                      onClick={() => setSettings(s => ({ ...s, mode: m }))}
                      className={`p-6 rounded-3xl border transition-all text-left flex justify-between items-center ${settings.mode === m ? 'border-white bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-white/5 bg-white/5 text-white hover:border-white/20'}`}
                    >
                      <span className="font-medium text-sm uppercase tracking-wider">{m.replace('_', ' ')}</span>
                      {settings.mode === m && <span className="text-xs">●</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <SectionTitle>Sector</SectionTitle>
                  <select 
                    value={settings.subject}
                    onChange={(e) => setSettings(s => ({ ...s, subject: e.target.value }))}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-white font-medium outline-none uppercase text-[10px] tracking-widest appearance-none cursor-pointer focus:border-white/20 transition-colors"
                  >
                    {SUBJECTS.map(sub => <option key={sub} value={sub} className="bg-neutral-900">{sub}</option>)}
                  </select>
                </div>
                <div className="space-y-4">
                  <SectionTitle>Neural Load</SectionTitle>
                  <select 
                    value={settings.difficulty}
                    onChange={(e) => setSettings(s => ({ ...s, difficulty: e.target.value as Difficulty }))}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-white font-medium outline-none uppercase text-[10px] tracking-widest appearance-none cursor-pointer focus:border-white/20 transition-colors"
                  >
                    {DIFFICULTIES.map(d => <option key={d} value={d} className="bg-neutral-900">{d}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="pt-6 space-y-3">
                <Button onClick={startGame} className="w-full" variant="primary">Establish Link</Button>
                <Button variant="ghost" onClick={() => setScreen(Screen.MENU)} className="w-full">Cancel</Button>
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
            <div className="w-12 h-12 border-2 border-white/5 border-t-cyan-500 rounded-full animate-spin mb-8"></div>
            <h2 className="text-xl font-light tracking-widest text-white uppercase">Syncing</h2>
            <div className="mt-4 text-[10px] text-neutral-500 uppercase tracking-[0.3em] font-medium animate-pulse">
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto w-full"
          >
            <div className="w-full space-y-12">
              <div className="space-y-4">
                <Badge>{gameResult?.success ? 'Protocol Success' : 'Protocol Breach'}</Badge>
                <h1 className="text-6xl font-light tracking-tight text-white">
                  {gameResult?.success ? 'Verified' : 'Failed'}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
                <div className="text-center">
                  <div className="text-3xl font-light text-white">₦{gameResult?.score.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-2">Secured</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-light text-white">
                    {gameResult ? Math.round((gameResult.total > 0 ? (gameResult.score / (gameResult.total * 100)) * 100 : 0)) : 0}%
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-2">Efficiency</div>
                </div>
              </div>

              <div className="space-y-3">
                <Button onClick={startGame} className="w-full" variant="primary">Restart</Button>
                <Button variant="ghost" onClick={() => setScreen(Screen.MENU)} className="w-full">Exit to Hub</Button>
              </div>
            </div>
          </motion.div>
        );

      case Screen.STATS:
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col p-8 md:p-12 max-w-lg mx-auto w-full overflow-y-auto no-scrollbar"
          >
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-light tracking-tight text-white">Archives</h2>
              <button onClick={() => setScreen(Screen.MENU)} className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-white">Close</button>
            </div>
            
            <div className="space-y-12 pb-12">
              <div className="space-y-8">
                <SectionTitle>Neural Metrics</SectionTitle>
                <div className="space-y-10">
                  {[
                    { label: 'Synced Nodes', val: stats.totalQuestions },
                    { label: 'Correct Syncs', val: stats.correctAnswers },
                    { label: 'Accuracy', val: `${stats.accuracy}%` },
                    { label: 'Peak Capacity', val: `₦${stats.apexScore.toLocaleString()}` }
                  ].map((s, i) => (
                    <div key={i} className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">{s.label}</span>
                      <span className="text-2xl font-light text-white">{s.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <SectionTitle>Landmarks</SectionTitle>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { name: 'Initial Uplink', unlock: stats.totalQuestions > 0 },
                    { name: 'Node Specialist', unlock: stats.totalQuestions >= 500 },
                    { name: 'Pure Precision', unlock: stats.accuracy >= 95 && stats.totalQuestions >= 30 },
                    { name: 'Elite Hub', unlock: stats.apexScore >= 10000 },
                  ].map((a, i) => (
                    <div key={i} className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${a.unlock ? 'border-white bg-white/5 text-white' : 'border-white/5 opacity-30'}`}>
                      <span className="text-xs font-medium uppercase tracking-wider text-white">{a.name}</span>
                      {a.unlock ? <span className="text-cyan-500">✓</span> : <span className="text-neutral-700">○</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="h-screen w-full flex flex-col relative bg-[#050505] overflow-hidden selection:bg-cyan-500/30">
      {/* Background Elements - Midnight Nexus */}
      <div className="grid-bg"></div>
      <div className="glow glow-1"></div>
      <div className="glow glow-2"></div>
      
      {/* Main Content */}
      <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
