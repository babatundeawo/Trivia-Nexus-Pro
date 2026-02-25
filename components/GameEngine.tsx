import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [settings.mode]);

  // Handle timeout side effect separately to avoid updating parent state during render/state-update
  useEffect(() => {
    const isTimedMode = [GameMode.LIGHTNING, GameMode.GAUNTLET].includes(settings.mode);
    if (isTimedMode && timeLeft === 0 && selectedAnswer === null && !showExplanation) {
      handleTimeout();
    }
  }, [timeLeft, settings.mode, selectedAnswer, showExplanation]);

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
    <div className="flex-1 h-full flex flex-col items-center justify-center p-3 md:p-12 relative overflow-hidden">
      <div className="max-w-6xl w-full flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 h-full overflow-hidden">
        
        {/* Left Column: HUD & Question */}
        <div className="md:col-span-8 flex flex-col gap-3 md:gap-6 overflow-hidden">
          {/* HUD Bento - Compact on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 shrink-0">
            <Card className="p-2 md:p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
              <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase mb-0.5">Node</span>
              <span className="text-sm md:text-xl font-black text-slate-900 leading-none">{currentIndex + 1} / {settings.mode === GameMode.TEAM_BATTLE ? teams.length * 5 : questions.length}</span>
            </Card>
            <Card className="p-2 md:p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
              <span className="text-[8px] md:text-[10px] font-bold text-emerald-400 uppercase mb-0.5">Score</span>
              <span className="text-sm md:text-xl font-black text-slate-900 leading-none">₦{score.toLocaleString()}</span>
            </Card>
            {(settings.mode === GameMode.LIGHTNING || settings.mode === GameMode.GAUNTLET) && (
              <Card className="p-2 md:p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
                <span className="text-[8px] md:text-[10px] font-bold text-pink-500 uppercase mb-0.5">Time</span>
                <span className={`text-sm md:text-xl font-black leading-none ${timeLeft < 10 ? 'text-rose-600 animate-pulse' : 'text-pink-600'}`}>{timeLeft}s</span>
              </Card>
            )}
            <Card className="p-2 md:p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
              <span className="text-[8px] md:text-[10px] font-bold text-cyan-500 uppercase mb-0.5">Sync</span>
              <div className="h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <motion.div 
                  className="h-full bg-cyan-500" 
                  animate={{ width: `${progress}%` }}
                ></motion.div>
              </div>
            </Card>
          </div>

          {/* Question Bento - Flexible but contained */}
          <Card className="flex-1 flex flex-col justify-center items-center text-center p-4 md:p-16 bg-white border-slate-100 shadow-sm relative overflow-hidden min-h-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
               <motion.div 
                 className="h-full bg-cyan-400" 
                 animate={{ width: `${progress}%` }}
               ></motion.div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full h-full flex flex-col justify-center overflow-y-auto no-scrollbar"
              >
                <Badge color="purple" className="mb-3 md:mb-6 mx-auto shrink-0">Sector: {currentQuestion.subject}</Badge>
                <h2 className="text-xl md:text-5xl font-black text-slate-900 leading-tight md:leading-[1.1] max-w-3xl mx-auto tracking-tight px-2">
                  {currentQuestion.text}
                </h2>
                {expertRecommendation && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 md:mt-8 bg-cyan-50 border border-cyan-100 rounded-xl md:rounded-2xl p-3 md:p-4 font-mono text-[10px] md:text-xs text-cyan-700 max-w-md mx-auto shrink-0"
                  >
                    {expertRecommendation}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>

        {/* Right Column: Options & Lifelines */}
        <div className="md:col-span-4 flex flex-col gap-3 md:gap-6 overflow-hidden min-h-0">
          {/* Options Bento - Scrollable if needed but compact */}
          <div className="flex-1 grid grid-cols-1 gap-2 md:gap-3 overflow-y-auto no-scrollbar py-1">
            {currentQuestion.options.map((opt, i) => {
              const isCorrect = i === currentQuestion.correctAnswerIndex;
              const isSelected = i === selectedAnswer;
              const isDisabled = disabledOptions.includes(i);
              
              let styles = "border-slate-100 bg-white text-slate-700 shadow-sm hover:border-slate-200";
              if (isSelected && isTense) styles = "border-amber-400 bg-amber-50 text-amber-700 ring-2 ring-amber-400/20";
              else if (selectedAnswer !== null) {
                if (isCorrect) styles = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-emerald-100 shadow-lg scale-[1.02] z-10";
                else if (isSelected) styles = "border-rose-500 bg-rose-50 text-rose-700 opacity-50";
                else styles = "opacity-20 grayscale border-transparent scale-[0.98]";
              }
              if (isDisabled) styles = "opacity-0 pointer-events-none";

              return (
                <motion.button 
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  disabled={selectedAnswer !== null || isDisabled}
                  onClick={() => handleAnswer(i)}
                  className={`relative p-3 md:p-6 rounded-xl md:rounded-[1.5rem] border-2 transition-all duration-300 flex items-center gap-3 md:gap-5 text-left group min-h-[56px] md:min-h-0 ${styles}`}
                >
                  <span className={`w-8 h-8 md:w-10 md:h-10 shrink-0 flex items-center justify-center rounded-lg md:rounded-xl font-black text-xs md:text-sm border-2 transition-colors ${isSelected ? 'border-current' : 'border-slate-100 text-cyan-600 group-hover:border-cyan-200'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 font-bold text-sm md:text-base leading-snug">{opt}</span>
                  {pollResults && <span className="text-[10px] md:text-xs font-mono font-black text-cyan-600">{pollResults[i]}%</span>}
                </motion.button>
              );
            })}
          </div>

          {/* Lifelines & Actions Bento */}
          <div className="grid grid-cols-1 gap-2 md:gap-4 shrink-0">
            {settings.mode === GameMode.MILLIONAIRE && !showExplanation && (
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {(['fiftyFifty', 'audiencePoll', 'expertIntel'] as const).map(l => (
                  <button
                    key={l}
                    disabled={!lifelines[l] || selectedAnswer !== null}
                    onClick={() => useLifeline(l)}
                    className={`py-2 md:py-4 rounded-xl md:rounded-2xl border-2 text-[8px] md:text-[10px] font-black uppercase transition-all ${
                      lifelines[l] ? 'border-cyan-400 text-cyan-700 bg-cyan-50 shadow-sm hover:scale-105' : 'border-slate-50 text-slate-200'
                    }`}
                  >
                    {l === 'fiftyFifty' ? '50:50' : l === 'audiencePoll' ? 'Poll' : 'Intel'}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 md:gap-3">
              <Button onClick={onAbort} variant="ghost" className="flex-1 py-3 md:py-5 text-[10px] md:text-xs">Abort</Button>
              {showExplanation && (
                <Button onClick={nextQuestion} className="flex-[2] py-3 md:py-5 text-sm md:text-base" variant="primary">
                  {currentIndex === questions.length - 1 ? "Finish" : "Next Node"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Overlay - Modern Slide Up */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-8 mx-auto max-w-4xl px-6 z-[60]"
          >
            <Card className="p-8 bg-white/90 backdrop-blur-xl border-slate-200 shadow-2xl flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <Badge color="purple" className="mb-3">Neural Insight</Badge>
                <p className="text-slate-600 font-medium leading-relaxed italic text-sm md:text-base">
                  "{currentQuestion.explanation}"
                </p>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                <Button onClick={nextQuestion} className="w-full md:px-12 py-5" variant="primary">
                  Continue Sync
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameEngine;
