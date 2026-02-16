import React, { useState, useEffect, useRef } from 'react';
import { GameMode, Difficulty, GameSettings, Question, Team, Lifelines } from '../types';
import { MILLIONAIRE_LADDER, WIPEOUT_PRIZES, SAFETY_NETS } from '../constants';
import { Card, Button, Badge, SectionTitle } from './Shared';
import { audioEngine } from '../services/audio';

interface Props {
  settings: GameSettings;
  questions: Question[];
  onGameOver: (score: number, total: number, success: boolean, teamResults?: Team[]) => void;
  onAbort: () => void;
}

const GameEngine: React.FC<Props> = ({ settings, questions, onGameOver, onAbort }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isTense, setIsTense] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [lastQuestionStartTime, setLastQuestionStartTime] = useState(Date.now());

  // Game States
  const [activeBank, setActiveBank] = useState(0); 
  const [wipeoutStreak, setWipeoutStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(settings.mode === GameMode.GAUNTLET ? 15 : 60);
  const [teams, setTeams] = useState<Team[]>(
    Array.from({ length: settings.teamCount }, (_, i) => ({ 
      name: `SQUAD ${String.fromCharCode(65 + i)}`, 
      score: 0, 
      responseTimeTotal: 0,
      questionsAnswered: 0
    }))
  );
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [lifelines, setLifelines] = useState<Lifelines>({ fiftyFifty: true, audiencePoll: true, expertIntel: true });
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [pollResults, setPollResults] = useState<number[] | null>(null);
  const [expertRecommendation, setExpertRecommendation] = useState<string | null>(null);

  // Category Kings Specific
  const [conqueredCategories, setConqueredCategories] = useState<string[]>([]);
  const [categoryStreak, setCategoryStreak] = useState(0);
  const [categoryHistory, setCategoryHistory] = useState<{[key: string]: boolean[]}>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    const isTimedMode = [GameMode.LIGHTNING, GameMode.GAUNTLET].includes(settings.mode);
    if (isTimedMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [settings.mode]);

  const handleTimeout = () => {
    if (settings.mode === GameMode.GAUNTLET) {
      onGameOver(score, currentIndex, false);
    } else {
      onGameOver(score, currentIndex, true, settings.mode === GameMode.TEAM_BATTLE ? teams : undefined);
    }
  };

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null || isTense) return;
    setSelectedAnswer(idx);
    setIsTense(true); 

    const isCorrect = idx === currentQuestion.correctAnswerIndex;
    const responseTime = Date.now() - lastQuestionStartTime;

    setTimeout(() => {
      setIsTense(false);
      if (isCorrect) {
        audioEngine.playCorrect();
        processCorrectAnswer(responseTime);
      } else {
        audioEngine.playWrong();
        processWrongAnswer(responseTime);
      }
      setShowExplanation(true);
    }, 700);
  };

  const processCorrectAnswer = (responseTime: number) => {
    switch (settings.mode) {
      case GameMode.WIPEOUT:
        const gain = WIPEOUT_PRIZES[wipeoutStreak] || WIPEOUT_PRIZES[WIPEOUT_PRIZES.length - 1];
        setActiveBank(prev => prev + gain);
        setWipeoutStreak(prev => prev + 1);
        setScore(prev => prev + gain);
        break;
      case GameMode.MILLIONAIRE:
        setScore(MILLIONAIRE_LADDER[currentIndex]);
        break;
      case GameMode.TEAM_BATTLE:
        setTeams(prev => {
          const next = [...prev];
          next[currentTeamIdx].score += 1;
          next[currentTeamIdx].responseTimeTotal += responseTime;
          next[currentTeamIdx].questionsAnswered += 1;
          return next;
        });
        break;
      case GameMode.LIGHTNING:
      case GameMode.GAUNTLET:
        setScore(prev => prev + 100);
        if (settings.mode === GameMode.GAUNTLET && ((currentIndex + 1) % 3 === 0)) setTimeLeft(prev => Math.min(60, prev + 5));
        break;
      case GameMode.CATEGORY_KINGS:
        const cat = currentQuestion.subject;
        const newStreak = categoryStreak + 1;
        setCategoryStreak(newStreak);
        setCategoryHistory(prev => {
          const hist = prev[cat] ? [...prev[cat]] : [false, false, false];
          hist[categoryStreak] = true;
          return { ...prev, [cat]: hist };
        });
        if (newStreak === 3) {
          setScore(prev => prev + 1500);
          setConqueredCategories(prev => [...prev, cat]);
        }
        break;
      default:
        setScore(prev => prev + 100);
    }
  };

  const processWrongAnswer = (responseTime: number) => {
    switch (settings.mode) {
      case GameMode.WIPEOUT:
      case GameMode.GAUNTLET:
        onGameOver(score, currentIndex + 1, false);
        break;
      case GameMode.TEAM_BATTLE:
        setTeams(prev => {
          const next = [...prev];
          next[currentTeamIdx].questionsAnswered += 1;
          next[currentTeamIdx].responseTimeTotal += responseTime;
          return next;
        });
        break;
      case GameMode.CATEGORY_KINGS:
        setCategoryStreak(0);
        setCategoryHistory(prev => ({
          ...prev,
          [currentQuestion.subject]: [false, false, false]
        }));
        break;
    }
  };

  const nextQuestion = () => {
    if (settings.mode === GameMode.MILLIONAIRE && selectedAnswer !== currentQuestion.correctAnswerIndex) {
      const lastSafety = currentIndex > 9 ? MILLIONAIRE_LADDER[9] : (currentIndex > 4 ? MILLIONAIRE_LADDER[4] : 0);
      onGameOver(lastSafety, currentIndex + 1, false);
      return;
    }

    if (settings.mode === GameMode.CATEGORY_KINGS && conqueredCategories.length === 6) {
      onGameOver(score, currentIndex + 1, true);
      return;
    }

    if (settings.mode === GameMode.CATEGORY_KINGS && (currentIndex + 1) % 3 === 0) {
      setCategoryStreak(0);
    }

    const totalNeeded = settings.mode === GameMode.TEAM_BATTLE ? teams.length * 5 : questions.length;
    if (currentIndex >= totalNeeded - 1) {
      onGameOver(score, currentIndex + 1, true, settings.mode === GameMode.TEAM_BATTLE ? teams : undefined);
      return;
    }

    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setDisabledOptions([]);
    setPollResults(null);
    setExpertRecommendation(null);
    setLastQuestionStartTime(Date.now());
    if (settings.mode === GameMode.TEAM_BATTLE) setCurrentTeamIdx(prev => (prev + 1) % teams.length);
  };

  const useLifeline = (type: keyof Lifelines) => {
    if (!lifelines[type] || selectedAnswer !== null) return;
    setLifelines(prev => ({ ...prev, [type]: false }));
    audioEngine.playClick();

    if (type === 'fiftyFifty') {
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== currentQuestion.correctAnswerIndex);
      const toRemove = wrongIndices.sort(() => 0.5 - Math.random()).slice(0, 2);
      setDisabledOptions(toRemove);
    } else if (type === 'audiencePoll') {
      const results = [0, 0, 0, 0];
      const correctIdx = currentQuestion.correctAnswerIndex;
      results[correctIdx] = 60 + Math.floor(Math.random() * 15);
      let rem = 100 - results[correctIdx];
      [0, 1, 2, 3].filter(i => i !== correctIdx).forEach((i, idx, arr) => {
        const val = idx === arr.length - 1 ? rem : Math.floor(Math.random() * (rem / 1.5));
        results[i] = val;
        rem -= val;
      });
      setPollResults(results);
    } else if (type === 'expertIntel') {
      const rec = currentQuestion.options[currentQuestion.correctAnswerIndex];
      setExpertRecommendation(`NEXUS_CORE: Cross-referencing... High probability detected for: ${rec.toUpperCase()}`);
    }
  };

  const progress = ((currentIndex + 1) / (settings.mode === GameMode.TEAM_BATTLE ? teams.length * 5 : questions.length)) * 100;

  return (
    <div className="flex-1 flex flex-col p-3 lg:p-6 overflow-hidden relative">
      
      {/* Dynamic HUD Header */}
      <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 p-3 lg:p-4 rounded-2xl mb-4 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Badge color="cyan" className="hidden sm:flex">{settings.mode}</Badge>
          <div className="flex flex-col truncate">
            <span className="text-[9px] font-mono text-cyan-400 font-black uppercase tracking-widest">Active Node</span>
            <span className="text-sm font-black text-white truncate uppercase">{currentIndex + 1} / {settings.mode === GameMode.TEAM_BATTLE ? teams.length * 5 : questions.length}</span>
          </div>
        </div>

        <div className="flex-1 max-w-[120px] lg:max-w-[200px] h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
          {(settings.mode === GameMode.LIGHTNING || settings.mode === GameMode.GAUNTLET) && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono text-pink-500 font-black uppercase tracking-widest">Time</span>
              <span className={`text-xl lg:text-2xl font-black ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-pink-400'}`}>{timeLeft}s</span>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono text-emerald-400 font-black uppercase tracking-widest">Score</span>
            <span className="text-xl lg:text-2xl font-black text-white">₦{score.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* Question & Options Core - Primary column */}
        <div className="flex-[3] flex flex-col gap-4 overflow-hidden">
          <Card className={`relative flex flex-col items-center justify-center text-center px-4 py-8 lg:py-16 cyber-border bg-cyan-400/[0.02] flex-grow transition-all duration-300 ${isTense ? 'scale-[1.01] ring-1 ring-cyan-400/20' : ''}`}>
             <div className="absolute top-3 left-1/2 -translate-x-1/2">
                <Badge color="purple">{currentQuestion.subject}</Badge>
             </div>
             {expertRecommendation && (
                <div className="absolute top-10 inset-x-4 bg-cyan-400/10 border border-cyan-400/20 rounded-lg p-2 font-mono text-[9px] text-cyan-400 animate-pulse">
                  {expertRecommendation}
                </div>
             )}
             <h2 className="text-xl md:text-2xl lg:text-4xl font-extrabold text-white leading-tight max-w-4xl mx-auto">
               {currentQuestion.text}
             </h2>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-4 shrink-0">
            {currentQuestion.options.map((opt, i) => {
              const isCorrect = i === currentQuestion.correctAnswerIndex;
              const isSelected = i === selectedAnswer;
              const isDisabled = disabledOptions.includes(i);
              
              let styles = "border border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-white/[0.08]";
              if (isSelected && isTense) styles = "border-amber-400 bg-amber-400/10 text-amber-300 animate-pulse";
              else if (selectedAnswer !== null) {
                if (isCorrect) styles = "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                else if (isSelected) styles = "border-rose-500 bg-rose-500/20 text-rose-400";
                else styles = "opacity-20 grayscale scale-[0.98] border-transparent";
              }
              if (isDisabled) styles = "opacity-0 pointer-events-none";

              return (
                <button 
                  key={i}
                  disabled={selectedAnswer !== null || isDisabled}
                  onClick={() => handleAnswer(i)}
                  className={`relative p-4 lg:p-7 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 group overflow-hidden ${styles}`}
                >
                  <span className={`w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-lg font-black text-xs lg:text-sm border-2 ${isSelected ? 'border-current' : 'border-white/10 text-cyan-400'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 font-bold text-sm lg:text-lg leading-snug">{opt}</span>
                  {pollResults && <span className="text-[10px] font-mono font-black text-cyan-400">{pollResults[i]}%</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tactical Info / Actions - Secondary column/row */}
        <div className={`flex-1 flex flex-col gap-4 overflow-hidden lg:w-96 ${showExplanation ? 'h-full' : 'h-auto lg:h-full'}`}>
          <Card className="flex-1 flex flex-col p-4 lg:p-6 bg-slate-900/40 border-white/5 overflow-hidden">
            {showExplanation ? (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                <SectionTitle>Neural Intel</SectionTitle>
                <div className="flex-1 overflow-y-auto no-scrollbar mb-4 text-xs lg:text-base text-slate-300 leading-relaxed font-medium italic">
                  {currentQuestion.explanation}
                </div>
                <Button onClick={nextQuestion} className="w-full py-4 lg:py-6" glow>
                  {currentIndex === questions.length - 1 ? "End Protocol" : "Next Node"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 h-full overflow-y-auto no-scrollbar">
                {settings.mode === GameMode.MILLIONAIRE && (
                  <div className="space-y-4">
                    <SectionTitle>Hierarchy Tree</SectionTitle>
                    <div className="grid grid-cols-5 lg:grid-cols-1 gap-1 lg:gap-1.5">
                      {[...MILLIONAIRE_LADDER].reverse().map((val, revIdx) => {
                        const idx = MILLIONAIRE_LADDER.length - 1 - revIdx;
                        return (
                          <div key={idx} className={`py-1 rounded-lg border text-center font-mono text-[8px] lg:text-[10px] font-black transition-all ${
                            currentIndex === idx ? 'bg-cyan-400 text-black border-cyan-400' : 
                            idx < currentIndex ? 'text-emerald-500 border-emerald-500/20' : 
                            SAFETY_NETS.includes(idx) ? 'border-amber-500/20 text-amber-500/50' : 'border-white/5 text-slate-700'
                          }`}>
                            ₦{val.toLocaleString()}
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['fiftyFifty', 'audiencePoll', 'expertIntel'] as const).map(l => (
                        <button
                          key={l}
                          disabled={!lifelines[l] || selectedAnswer !== null}
                          onClick={() => useLifeline(l)}
                          className={`py-2 rounded-lg border text-[8px] font-black uppercase transition-all ${
                            lifelines[l] ? 'border-cyan-400 text-cyan-400' : 'border-slate-800 text-slate-800'
                          }`}
                        >
                          {l.replace(/([A-Z])/g, ' $1').trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {settings.mode === GameMode.TEAM_BATTLE && (
                  <div className="space-y-3">
                    <SectionTitle>Squad Intel</SectionTitle>
                    {teams.map((t, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border-2 flex justify-between items-center ${currentTeamIdx === idx ? 'border-cyan-400 bg-cyan-400/5 shadow-inner' : 'border-white/5 opacity-40'}`}>
                        <span className="text-[10px] font-black text-white">{t.name}</span>
                        <span className="text-xs font-black text-cyan-400">{t.score} PTS</span>
                      </div>
                    ))}
                  </div>
                )}

                {settings.mode === GameMode.CATEGORY_KINGS && (
                  <div className="space-y-4">
                    <SectionTitle>Sub-Sectors</SectionTitle>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                      {Array.from({ length: 6 }).map((_, idx) => {
                        const qIdx = idx * 3;
                        const catName = questions[qIdx]?.subject || "Sync...";
                        const isConquered = conqueredCategories.includes(catName);
                        return (
                          <div key={idx} className={`p-2 rounded-xl border flex items-center justify-between text-[9px] font-black uppercase ${isConquered ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                            <span className="truncate max-w-[80px] text-slate-400">{catName}</span>
                            {isConquered && <span className="text-emerald-400">OK</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status elements for Wipeout/Lightning */}
                {(settings.mode === GameMode.WIPEOUT || settings.mode === GameMode.LIGHTNING) && (
                   <div className="flex flex-col gap-3">
                     <div className="p-4 bg-cyan-400/5 rounded-2xl border border-cyan-400/20 text-center">
                        <SectionTitle mono={false}>Net Banked</SectionTitle>
                        <span className="text-3xl font-black text-white">₦{activeBank.toLocaleString()}</span>
                     </div>
                     {settings.mode === GameMode.WIPEOUT && (
                       <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Node Streak</span>
                          <span className="text-lg font-black text-emerald-400">{wipeoutStreak}</span>
                       </div>
                     )}
                   </div>
                )}
                
                <div className="pt-4 mt-auto">
                  <Button variant="outline" onClick={onAbort} className="w-full text-[10px] py-3 opacity-50 hover:opacity-100">Abort Session</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GameEngine;