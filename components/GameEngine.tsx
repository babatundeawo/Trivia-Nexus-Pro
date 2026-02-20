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
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 relative overflow-hidden">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 h-full max-h-[900px]">
        
        {/* Left Column: HUD & Question */}
        <div className="md:col-span-8 flex flex-col gap-6">
          {/* HUD Bento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Node</span>
              <span className="text-xl font-black text-slate-900">{currentIndex + 1} / {settings.mode === GameMode.TEAM_BATTLE ? teams.length * 5 : questions.length}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Score</span>
              <span className="text-xl font-black text-slate-900">₦{score.toLocaleString()}</span>
            </Card>
            {(settings.mode === GameMode.LIGHTNING || settings.mode === GameMode.GAUNTLET) && (
              <Card className="p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-pink-500 uppercase mb-1">Time</span>
                <span className={`text-xl font-black ${timeLeft < 10 ? 'text-rose-600 animate-pulse' : 'text-pink-600'}`}>{timeLeft}s</span>
              </Card>
            )}
            <Card className="p-4 flex flex-col justify-center bg-white border-slate-100 shadow-sm">
              <span className="text-[10px] font-bold text-cyan-500 uppercase mb-1">Progress</span>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <motion.div 
                  className="h-full bg-cyan-500" 
                  animate={{ width: `${progress}%` }}
                ></motion.div>
              </div>
            </Card>
          </div>

          {/* Question Bento */}
          <Card className="flex-1 flex flex-col justify-center items-center text-center p-8 md:p-16 bg-white border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
               <motion.div 
                 className="h-full bg-cyan-400" 
                 animate={{ width: `${progress}%` }}
               ></motion.div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full"
              >
                <Badge color="purple" className="mb-6 mx-auto">Sector: {currentQuestion.subject}</Badge>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] max-w-3xl mx-auto tracking-tight">
                  {currentQuestion.text}
                </h2>
                {expertRecommendation && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 bg-cyan-50 border border-cyan-100 rounded-2xl p-4 font-mono text-xs text-cyan-700 max-w-md mx-auto"
                  >
                    {expertRecommendation}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>

        {/* Right Column: Options & Lifelines */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {/* Options Bento */}
          <div className="flex-1 grid grid-cols-1 gap-3">
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
                  className={`relative p-6 rounded-[1.5rem] border-2 transition-all duration-300 flex items-center gap-5 text-left group ${styles}`}
                >
                  <span className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm border-2 transition-colors ${isSelected ? 'border-current' : 'border-slate-100 text-cyan-600 group-hover:border-cyan-200'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 font-bold text-base leading-snug">{opt}</span>
                  {pollResults && <span className="text-xs font-mono font-black text-cyan-600">{pollResults[i]}%</span>}
                </motion.button>
              );
            })}
          </div>

          {/* Lifelines & Actions Bento */}
          <div className="grid grid-cols-1 gap-4">
            {settings.mode === GameMode.MILLIONAIRE && !showExplanation && (
              <div className="grid grid-cols-3 gap-3">
                {(['fiftyFifty', 'audiencePoll', 'expertIntel'] as const).map(l => (
                  <button
                    key={l}
                    disabled={!lifelines[l] || selectedAnswer !== null}
                    onClick={() => useLifeline(l)}
                    className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${
                      lifelines[l] ? 'border-cyan-400 text-cyan-700 bg-cyan-50 shadow-sm hover:scale-105' : 'border-slate-50 text-slate-200'
                    }`}
                  >
                    {l === 'fiftyFifty' ? '50:50' : l === 'audiencePoll' ? 'Poll' : 'Intel'}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-3">
              <Button onClick={onAbort} variant="ghost" className="flex-1 py-5 text-xs">Abort</Button>
              {showExplanation && (
                <Button onClick={nextQuestion} className="flex-[2] py-5 text-base" variant="primary">
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
