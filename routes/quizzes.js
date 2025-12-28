import express from 'express';
import Quiz from '../models/Quiz.js';
import Module from '../models/Module.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all quizzes for a module
router.get('/module/:moduleId', protect, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ module: req.params.moduleId })
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    
    res.json({ quizzes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single quiz (with questions for teachers, without answers for students)
router.get('/:id', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('module')
      .populate('createdBy', 'name email');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // If student, hide correct answers
    if (req.user.role === 'student') {
      const quizData = quiz.toObject();
      quizData.questions = quizData.questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        points: q.points
        // correctAnswers removed
      }));
      return res.json({ quiz: quizData });
    }
    
    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quiz (teachers only)
router.post('/', protect, authorize('teacher'), async (req, res) => {
  try {
    const { title, description, moduleId, questions, duration } = req.body;

    if (!title || !moduleId || !questions || questions.length === 0) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Verify module exists and belongs to teacher
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    if (module.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add quiz to this module' });
    }

    // Create quiz
    const quiz = await Quiz.create({
      title,
      description,
      module: moduleId,
      questions,
      duration,
      createdBy: req.user._id
    });

    // Add quiz to module
    module.quizzes.push(quiz._id);
    await module.save();

    res.status(201).json({ 
      message: 'Quiz created successfully', 
      quiz 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update quiz (teachers only - own quizzes)
router.put('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this quiz' });
    }

    const { title, description, questions, duration } = req.body;

    quiz.title = title || quiz.title;
    quiz.description = description || quiz.description;
    quiz.questions = questions || quiz.questions;
    quiz.duration = duration || quiz.duration;

    await quiz.save();

    res.json({ 
      message: 'Quiz updated successfully', 
      quiz 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete quiz (teachers only - own quizzes)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this quiz' });
    }

    // Remove quiz from module
    await Module.findByIdAndUpdate(quiz.module, {
      $pull: { quizzes: quiz._id }
    });

    await quiz.deleteOne();

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
