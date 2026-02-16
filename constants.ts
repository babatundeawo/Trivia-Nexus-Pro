
import { Difficulty } from './types';

export const SUBJECTS = [
  'General Knowledge',
  'Mathematics',
  'English Studies',
  'Physics',
  'Chemistry',
  'Biology',
  'Basic & Applied Sciences',
  'Literature',
  'Economics',
  'History & Government',
  'Creative Arts'
];

export const DIFFICULTIES = Object.values(Difficulty);

export const MILLIONAIRE_LADDER = [
  100, 120, 150, 200, 300, // Safety Net 1 (Index 4)
  450, 600, 800, 1000, 1500, // Safety Net 2 (Index 9)
  2500, 3500, 5000, 7500, 10000 // Grand Prize
];

export const WIPEOUT_PRIZES = [
  50, 100, 200, 400, 800, 1200, 2000, 3500, 6000, 10000
];

export const SAFETY_NETS = [4, 9];

export const INITIAL_USER_STATS = {
  apexScore: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  accuracy: 0,
  milestones: []
};
