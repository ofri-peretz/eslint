// Model of eslint-plugin-vercel-ai-security/no-training-data-exposure (CWE-359).
// A training opt-in flag set to literal true, or a request to a URL with a
// whole path segment naming training (train, training, fine-tune, fine_tune…),
// is reported. Feedback endpoints, disabled flags, env-driven flags and
// segments that merely start with "train" are not.
module no_training_data_exposure {
  type Site =
    | TrainingTrue        // { training: true }
    | AllowTrainingTrue   // { allowTraining: true }
    | TrainingEnabledTrue // { trainingEnabled: true }
    | TrainingFalse       // { training: false }
    | ShowFeedbackTrue    // { showFeedback: true }
    | TrainingEnv         // { training: process.env.ENABLE_TRAINING }
    | FetchFineTune       // fetch('https://api.openai.com/v1/fine-tune')
    | FetchFineTuningJobs // fetch('https://api.openai.com/v1/fine_tuning/jobs')
    | FetchTrainModel     // fetch('/api/train/model')
    | FetchTrainers       // fetch('/api/trainers')
    | FetchTrainingSched  // fetch('/api/training-schedule')
    | FetchFeedback       // fetch('/api/feedback')

  pure def reports(importsAi: bool, s: Site): bool =
    importsAi and (s == TrainingTrue or s == AllowTrainingTrue or s == TrainingEnabledTrue
      or s == FetchFineTune or s == FetchFineTuningJobs or s == FetchTrainModel)

  var importsAi: bool
  var site: Site
  var verdict: bool

  action step = {
    nondet i = Set(true, false).oneOf()
    nondet s = Set(TrainingTrue, AllowTrainingTrue, TrainingEnabledTrue, TrainingFalse, ShowFeedbackTrue,
                   TrainingEnv, FetchFineTune, FetchFineTuningJobs, FetchTrainModel, FetchTrainers,
                   FetchTrainingSched, FetchFeedback).oneOf()
    all { importsAi' = i, site' = s, verdict' = reports(i, s) }
  }

  action init = step
}
