import express from 'express';
import Enrollment from '../models/Enrollment.js';
import Module from '../models/Module.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get student's enrollments (My Courses)
router.get('/my-courses', protect, authorize('student'), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate({
        path: 'module',
        populate: [
          { path: 'teacher', select: 'name email' },
          { path: 'quizzes' }
        ]
      })
      .sort('-enrolledAt');
    
    res.json({ enrollments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Enroll in a module
router.post('/', protect, authorize('student'), async (req, res) => {
  try {
    const { moduleId } = req.body;

    if (!moduleId) {
      return res.status(400).json({ message: 'Module ID is required' });
    }

    // Check if module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: req.user._id,
      module: moduleId
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this module' });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: req.user._id,
      module: moduleId
    });

    // Add student to module's enrolled students
    module.enrolledStudents.push(req.user._id);
    await module.save();

    res.status(201).json({ 
      message: 'Successfully enrolled in module', 
      enrollment 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Already enrolled in this module' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check enrollment status
router.get('/check/:moduleId', protect, authorize('student'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      module: req.params.moduleId
    });

    res.json({ 
      isEnrolled: !!enrollment,
      enrollment 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unenroll from module
router.delete('/:moduleId', protect, authorize('student'), async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      module: req.params.moduleId
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Remove student from module
    await Module.findByIdAndUpdate(req.params.moduleId, {
      $pull: { enrolledStudents: req.user._id }
    });

    await enrollment.deleteOne();

    res.json({ message: 'Successfully unenrolled from module' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
