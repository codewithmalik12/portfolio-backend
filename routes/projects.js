import express from 'express';
import Project from '../models/Project.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a project
// @route   POST /api/projects
// @access  Private
router.post('/', protect, admin, async (req, res) => {
  const { title, description, technologies, imageUrl, liveLink, githubLink } = req.body;

  try {
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    const project = new Project({
      title,
      description,
      technologies: Array.isArray(technologies) ? technologies : String(technologies).split(',').map(t => t.trim()),
      imageUrl,
      liveLink,
      githubLink
    });

    const createdProject = await project.save();
    res.status(201).json(createdProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private
router.put('/:id', protect, admin, async (req, res) => {
  const { title, description, technologies, imageUrl, liveLink, githubLink } = req.body;

  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.title = title || project.title;
    project.description = description || project.description;
    if (technologies) {
      project.technologies = Array.isArray(technologies) ? technologies : String(technologies).split(',').map(t => t.trim());
    }
    project.imageUrl = imageUrl !== undefined ? imageUrl : project.imageUrl;
    project.liveLink = liveLink !== undefined ? liveLink : project.liveLink;
    project.githubLink = githubLink !== undefined ? githubLink : project.githubLink;

    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await project.deleteOne();
    res.json({ message: 'Project removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
