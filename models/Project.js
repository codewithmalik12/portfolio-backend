import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  technologies: {
    type: [String],
    default: []
  },
  imageUrl: {
    type: String,
    default: ''
  },
  liveLink: {
    type: String,
    default: ''
  },
  githubLink: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
