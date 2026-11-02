const { tag } = require('../../lib.cjs');

const SITE = {
  TrainingTrue: 'export const config = { training: true };',
  AllowTrainingTrue: 'export const options = { allowTraining: true };',
  TrainingEnabledTrue: 'export const options = { trainingEnabled: true };',
  TrainingFalse: 'export const config = { training: false };',
  ShowFeedbackTrue: 'export const ui = { showFeedback: true };',
  TrainingEnv:
    'export const options = { training: process.env.ENABLE_TRAINING };',
  FetchFineTune:
    "export const send = () => fetch('https://api.openai.com/v1/fine-tune', { method: 'POST' });",
  FetchFineTuningJobs:
    "export const send = () => fetch('https://api.openai.com/v1/fine_tuning/jobs', { method: 'POST' });",
  FetchTrainModel:
    "export const send = () => fetch('/api/train/model', { method: 'POST' });",
  FetchTrainers: "export const send = () => fetch('/api/trainers');",
  FetchTrainingSched:
    "export const send = () => fetch('/api/training-schedule');",
  FetchFeedback:
    "export const send = () => fetch('/api/feedback', { method: 'POST' });",
};

module.exports = {
  rule: 'no-training-data-exposure',
  domain: 24, // 2 importsAi x 12 sites
  traces: 400,
  key: (s) => `importsAi=${s.importsAi} site=${tag(s.site)}`,
  config: () => ({}),
  code: (s) =>
    [
      s.importsAi
        ? "import { generateText } from 'ai';"
        : "import { generateText } from './llm';",
      SITE[tag(s.site)],
      'export const ask = (p: string) => generateText({ model: m, prompt: p });',
      '',
    ].join('\n'),
};
