
export enum GameMode {
  WIPEOUT = 'WIPEOUT',
  LIGHTNING = 'LIGHTNING',
  MILLIONAIRE = 'MILLIONAIRE',
  TEAM_BATTLE = 'TEAM_BATTLE',
  GAUNTLET = 'GAUNTLET',
  CATEGORY_KINGS = 'CATEGORY_KINGS'
}

export enum Difficulty {
  FOUNDATIONAL = 'Foundational',
  INTERMEDIATE = 'Intermediate',
  SCHOLASTIC = 'Scholastic',
  ADVANCED = 'Advanced',
  EXPERT = 'Expert'
}

export enum Screen {
  MENU = 'MENU',
  SETTINGS = 'SETTINGS',
  LOADING = 'LOADING',
  GAME = 'GAME',
  RESULT = 'RESULT',
  STATS = 'STATS'
}

export interface Question {
  id: string;
  subject: string;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface UserStats {
  apexScore: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  milestones: string[];
}

export interface Team {
  name: string;
  score: number;
  responseTimeTotal: number;
  questionsAnswered: number;
}

export interface Lifelines {
  fiftyFifty: boolean;
  audiencePoll: boolean;
  expertIntel: boolean;
}

export interface GameSettings {
  mode: GameMode;
  subject: string;
  difficulty: Difficulty;
  teamCount: number;
}
