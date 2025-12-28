import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedAnswers: [{
    type: Number // Index of selected option(s)
  }],
  isCorrect: {
    type: Boolean
  },
  pointsEarned: {
    type: Number,
    default: 0
  }
});

const attemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true
  },
  answers: [answerSchema],
  score: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  timeTaken: {
    type: Number // in seconds
  }
}, {
  timestamps: true
});

// Calculate score and percentage before saving
attemptSchema.pre('save', function(next) {
  if (this.submittedAt) {
    this.score = this.answers.reduce((sum, answer) => sum + answer.pointsEarned, 0);
    this.percentage = (this.score / this.totalPoints) * 100;
  }
  next();
});

export default mongoose.model('Attempt', attemptSchema);
