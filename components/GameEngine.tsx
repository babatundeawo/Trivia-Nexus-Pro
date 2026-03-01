import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameMode, Difficulty, GameSettings, Question, Team, Lifelines } from '../types';
import { MILLIONAIRE_LADDER, WIPEOUT_PRIZES, SAFETY_NETS } from '../constants';
import { Card, Button, Badge, SectionTitle } from './Shared';
import { audioEngine } from '../services/audio';

interface Props {
  settings: GameSettings;
  questions: Question[];
  onGameOver: (score: number, correct: number, total: number, success: boolean, teamResults?: Team[]) => void;
  onAbort: () => void;
}

const GameEngine: React.FC<Props> = ({ settings, questions, onGameOver, onAbort }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isTense, setIsTense] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastQuestionStartTime, setLastQuestionStartTime] = useState(Date.now());
  const [streak, setStreak] = useState(0);
  const [neuralLoad, setNeuralLoad] = useState(1); // 1 to 3, dynamic difficulty

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
  const [lifelineToConfirm, setLifelineToConfirm] = useState<keyof Lifelines | null>(null);

  // Category Kings Specific
  const [conqueredCategories, setConqueredCategories] = useState<string[]>([]);
  const [categoryStreak, setCategoryStreak] = useState(0);
  const [categoryHistory, setCategoryHistory] = useState<{[key: string]: boolean[]}>({});

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    audioEngine.startAmbient();
    return () => {
      audioEngine.stopAmbient();
    };
  }, []);

  useEffect(() => {
    const progress = (currentIndex + 1) / questions.length;
    audioEngine.setAmbientIntensity(progress);
  }, [currentIndex, questions.length]);

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
      onGameOver(score, correctCount, currentIndex + 1, false);
    } else {
      onGameOver(score, correctCount, currentIndex + 1, true, settings.mode === GameMode.TEAM_BATTLE ? teams : undefined);
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
        setCorrectCount(prev => prev + 1);
        setStreak(prev => {
          const next = prev + 1;
          if (next >= 3) setNeuralLoad(Math.min(3, neuralLoad + 1));
          return next;
        });
        processCorrectAnswer(responseTime);
      } else {
        audioEngine.playWrong();
        setStreak(0);
        setNeuralLoad(1);
        processWrongAnswer(responseTime);
      }
      setShowExplanation(true);
    }, 700);
  };

  const processCorrectAnswer = (responseTime: number) => {
    const multiplier = neuralLoad;
    switch (settings.mode) {
      case GameMode.WIPEOUT:
        const gain = (WIPEOUT_PRIZES[wipeoutStreak] || WIPEOUT_PRIZES[WIPEOUT_PRIZES.length - 1]) * multiplier;
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
        setScore(prev => prev + (100 * multiplier));
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
        setScore(prev => prev + (100 * multiplier));
    }
  };

  const processWrongAnswer = (responseTime: number) => {
    switch (settings.mode) {
      case GameMode.WIPEOUT:
      case GameMode.GAUNTLET:
        onGameOver(score, correctCount, currentIndex + 1, false);
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
      onGameOver(lastSafety, correctCount, currentIndex + 1, false);
      return;
    }

    if (settings.mode === GameMode.CATEGORY_KINGS && conqueredCategories.length === 6) {
      onGameOver(score, correctCount, currentIndex + 1, true);
      return;
    }

    if (settings.mode === GameMode.CATEGORY_KINGS && (currentIndex + 1) % 3 === 0) {
      setCategoryStreak(0);
    }

    const totalNeeded = settings.mode === GameMode.TEAM_BATTLE ? teams.length * 5 : questions.length;
    if (currentIndex >= totalNeeded - 1) {
      onGameOver(score, correctCount, currentIndex + 1, true, settings.mode === GameMode.TEAM_BATTLE ? teams : undefined);
      return;
    }

    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setDisabledOptions([]);
    setPollResults(null);
    setExpertRecommendation(null);
    setLastQuestionStartTime(Date.now());
    audioEngine.playTransition();
    if (settings.mode === GameMode.TEAM_BATTLE) setCurrentTeamIdx(prev => (prev + 1) % teams.length);
  };

  const useLifeline = (type: keyof Lifelines) => {
    if (!lifelines[type] || selectedAnswer !== null) return;
    
    if (type === 'fiftyFifty' || type === 'expertIntel') {
      setLifelineToConfirm(type);
      return;
    }
    
    executeLifeline(type);
  };

  const executeLifeline = (type: keyof Lifelines) => {
    setLifelines(prev => ({ ...prev, [type]: false }));
    setLifelineToConfirm(null);
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-transparent relative overflow-hidden h-[100dvh]"
    >
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-6 md:p-8 overflow-hidden">
        <div className="flex flex-col h-full">
          
          {/* Minimalist HUD */}
          <div className="flex justify-between items-center pt-2 pb-4 shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Node</span>
              <span className="text-xl font-light text-white">{currentIndex + 1} / {settings.mode === GameMode.TEAM_BATTLE ? teams.length * 5 : questions.length}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Yield</span>
              <span className="text-xl font-light text-white">₦{score.toLocaleString()}</span>
            </div>
          </div>

          {/* Neural Load Indicator - Minimal */}
          <div className="flex gap-1.5 shrink-0 mb-4">
            {[1, 2, 3].map(l => (
              <div key={l} className={`h-0.5 flex-1 transition-all duration-700 ${neuralLoad >= l ? 'bg-cyan-500 shadow-[0_0_10px_rgba(0,242,255,0.5)]' : 'bg-white/5'}`}></div>
            ))}
          </div>

          {/* Progress / Timer */}
          <div className="w-full h-px bg-white/5 relative overflow-hidden shrink-0 mb-4">
            <motion.div 
              className={`absolute top-0 left-0 h-full ${timeLeft < 10 && [GameMode.LIGHTNING, GameMode.GAUNTLET].includes(settings.mode) ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'}`}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            ></motion.div>
          </div>

          {/* Team Battle Scores - Minimal */}
          {settings.mode === GameMode.TEAM_BATTLE && (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 shrink-0">
              {teams.map((team, idx) => (
                <div 
                  key={idx} 
                  className={`flex-shrink-0 flex flex-col border-b-2 transition-all pb-1 ${currentTeamIdx === idx ? 'border-white opacity-100' : 'border-transparent opacity-30'}`}
                >
                  <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">{team.name}</span>
                  <span className="text-sm font-medium text-white">{team.score}</span>
                </div>
              ))}
            </div>
          )}

          {/* Question Area - Flexible but contained */}
          <div className="flex-1 flex flex-col justify-center py-4 min-h-0 overflow-hidden">
            <div className="space-y-4 md:space-y-6 overflow-y-auto no-scrollbar">
              <Badge className="mx-auto">{currentQuestion.subject}</Badge>
              <h2 className="text-2xl md:text-4xl font-light tracking-tight text-white text-center leading-tight px-2">
                {currentQuestion.text}
              </h2>
              <AnimatePresence>
                {expertRecommendation && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="mt-4 p-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] text-neutral-400 text-center uppercase tracking-widest font-medium"
                  >
                    {expertRecommendation}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Options Area - Compact */}
          <div className="space-y-2 md:space-y-3 pb-4 shrink-0">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQuestion.correctAnswerIndex;
              const isWrong = isSelected && !isCorrect;
              const showResult = selectedAnswer !== null;

              return (
                <button
                  key={idx}
                  disabled={selectedAnswer !== null || disabledOptions.includes(idx)}
                  onClick={() => handleAnswer(idx)}
                  className={`w-full p-4 md:p-6 rounded-2xl md:rounded-3xl border text-left transition-all duration-300 flex justify-between items-center group ${
                    disabledOptions.includes(idx) ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  } ${
                    showResult
                      ? isCorrect
                        ? 'bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                        : isWrong
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          : 'bg-transparent border-white/5 text-neutral-700'
                      : 'bg-white/5 border-white/5 text-white hover:border-white/20 active:scale-[0.98]'
                  }`}
                >
                  <span className="text-sm font-medium pr-4">{option}</span>
                  {showResult && isCorrect && <span className="text-xs">✓</span>}
                  {showResult && isWrong && <span className="text-xs">✕</span>}
                  <AnimatePresence>
                    {pollResults && !showResult && (
                      <motion.span 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[10px] font-bold text-neutral-500"
                      >
                        {pollResults[idx]}%
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>

          {/* Lifelines - Minimalist */}
          {settings.mode === GameMode.MILLIONAIRE && (
            <div className="grid grid-cols-3 gap-2 md:gap-3 pb-4 shrink-0">
              {(['fiftyFifty', 'audiencePoll', 'expertIntel'] as const).map(l => {
                const isUsed = !lifelines[l];
                const isAnswering = selectedAnswer !== null;
                return (
                  <motion.button
                    key={l}
                    whileHover={!isUsed && !isAnswering ? { scale: 1.02 } : {}}
                    whileTap={!isUsed && !isAnswering ? { scale: 0.98 } : {}}
                    disabled={isUsed || isAnswering}
                    onClick={() => useLifeline(l)}
                    className={`py-3 md:py-4 rounded-xl md:rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                      isUsed 
                        ? 'border-transparent bg-white/5 text-neutral-700 opacity-50' 
                        : isAnswering
                          ? 'border-white/5 bg-white/5 text-neutral-700'
                          : 'border-white/10 bg-transparent text-neutral-400 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {l === 'fiftyFifty' ? '50:50' : l === 'audiencePoll' ? 'Poll' : 'Intel'}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Explanation / Next Action */}
          <AnimatePresence>
            {showExplanation && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pb-6 shrink-0"
              >
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <SectionTitle>Insight</SectionTitle>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
                <Button onClick={nextQuestion} className="w-full" variant="primary">
                  Continue
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Abort Button - Subtle */}
      <button 
        onClick={onAbort}
        className="fixed top-6 right-6 text-neutral-600 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest z-50"
      >
        Abort
      </button>

      {/* Lifeline Confirmation Prompt */}
      <AnimatePresence>
        {lifelineToConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="max-w-xs w-full bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 text-center space-y-8 shadow-2xl"
            >
              <div className="space-y-2">
                <Badge>Confirmation</Badge>
                <h3 className="text-xl font-light tracking-tight text-white">
                  Activate {lifelineToConfirm === 'fiftyFifty' ? '50:50' : 'Intel'}?
                </h3>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
                  This protocol can only be executed once per session.
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={() => executeLifeline(lifelineToConfirm)} className="w-full" variant="primary">
                  Confirm
                </Button>
                <Button onClick={() => setLifelineToConfirm(null)} className="w-full" variant="ghost">
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GameEngine;
