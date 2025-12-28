import express from 'express';
import Attempt from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import Enrollment from '../models/Enrollment.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get student's attempts for a quiz
router.get('/quiz/:quizId', protect, authorize('student'), async (req, res) => {
  try {
    const attempts = await Attempt.find({
      student: req.user._id,
      quiz: req.params.quizId
    })
    .populate('quiz', 'title totalPoints')
    .sort('-createdAt');
    
    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all attempts for a module
router.get('/module/:moduleId', protect, authorize('student'), async (req, res) => {
  try {
    const attempts = await Attempt.find({
      student: req.user._id,
      module: req.params.moduleId
    })
    .populate('quiz', 'title totalPoints')
    .sort('-createdAt');
    
    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start quiz attempt
router.post('/start', protect, authorize('student'), async (req, res) => {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({ message: 'Quiz ID is required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if student is enrolled in the module
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      module: quiz.module
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'You must be enrolled in this module to attempt the quiz' });
    }

    // Create attempt
    const attempt = await Attempt.create({
      student: req.user._id,
      quiz: quizId,
      module: quiz.module,
      totalPoints: quiz.totalPoints,
      answers: []
    });

    res.status(201).json({ 
      message: 'Quiz attempt started', 
      attemptId: attempt._id,
      startedAt: attempt.startedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit quiz attempt
router.post('/submit/:attemptId', protect, authorize('student'), async (req, res) => {
  try {
    const { answers } = req.body; // Array of { questionId, selectedAnswers: [indices] }

    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('quiz');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({ message: 'Quiz already submitted' });
    }

    const quiz = attempt.quiz;

    // Grade the answers
    const gradedAnswers = answers.map(answer => {
      const question = quiz.questions.id(answer.questionId);
      
      if (!question) {
        return {
          questionId: answer.questionId,
          selectedAnswers: answer.selectedAnswers,
          isCorrect: false,
          pointsEarned: 0
        };
      }

      // Check if answer is correct
      const correctAnswers = question.correctAnswers.sort();
      const selectedAnswers = answer.selectedAnswers.sort();
      
      const isCorrect = 
        correctAnswers.length === selectedAnswers.length &&
        correctAnswers.every((val, index) => val === selectedAnswers[index]);

      return {
        questionId: answer.questionId,
        selectedAnswers: answer.selectedAnswers,
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0
      };
    });

    // Update attempt
    attempt.answers = gradedAnswers;
    attempt.submittedAt = new Date();
    attempt.timeTaken = Math.floor((attempt.submittedAt - attempt.startedAt) / 1000); // in seconds

    await attempt.save();

    res.json({ 
      message: 'Quiz submitted successfully',
      score: attempt.score,
      totalPoints: attempt.totalPoints,
      percentage: attempt.percentage,
      answers: gradedAnswers
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attempt details (after submission)
router.get('/:attemptId', protect, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('quiz')
      .populate('student', 'name email');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check authorization
    if (req.user.role === 'student' && attempt.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ attempt });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all attempts for teacher (view student results)
router.get('/teacher/module/:moduleId', protect, authorize('teacher'), async (req, res) => {
  try {
    const attempts = await Attempt.find({ 
      module: req.params.moduleId,
      submittedAt: { $exists: true }
    })
    .populate('student', 'name email')
    .populate('quiz', 'title totalPoints')
    .sort('-submittedAt');
    
    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all attempts for a specific quiz (teacher only)
router.get('/teacher/quiz/:quizId', protect, authorize('teacher'), async (req, res) => {
  try {
    const attempts = await Attempt.find({ 
      quiz: req.params.quizId,
      submittedAt: { $exists: true }
    })
    .populate('student', 'name email')
    .populate('quiz', 'title totalPoints')
    .sort('-submittedAt');
    
    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
