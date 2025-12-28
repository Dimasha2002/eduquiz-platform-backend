import express from 'express';
import Module from '../models/Module.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all modules (public - for students to browse)
router.get('/', protect, async (req, res) => {
  try {
    const modules = await Module.find()
      .populate('teacher', 'name email subjects')
      .sort('-createdAt');
    
    res.json({ modules });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get teacher's modules
router.get('/my-modules', protect, authorize('teacher'), async (req, res) => {
  try {
    const modules = await Module.find({ teacher: req.user._id })
      .populate('quizzes')
      .sort('-createdAt');
    
    res.json({ modules });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single module
router.get('/:id', protect, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate('teacher', 'name email subjects')
      .populate('quizzes');
    
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }
    
    res.json({ module });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create module (teachers only)
router.post('/', protect, authorize('teacher'), async (req, res) => {
  try {
    const { title, description, subject } = req.body;

    if (!title || !description || !subject) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const module = await Module.create({
      title,
      description,
      subject,
      teacher: req.user._id
    });

    res.status(201).json({ 
      message: 'Module created successfully', 
      module 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update module (teachers only - own modules)
router.put('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    if (module.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this module' });
    }

    const { title, description, subject } = req.body;

    module.title = title || module.title;
    module.description = description || module.description;
    module.subject = subject || module.subject;

    await module.save();

    res.json({ 
      message: 'Module updated successfully', 
      module 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete module (teachers only - own modules)
router.delete('/:id', protect, authorize('teacher'), async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    if (module.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this module' });
    }

    await module.deleteOne();

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
