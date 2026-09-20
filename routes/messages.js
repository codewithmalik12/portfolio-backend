import express from 'express';
import nodemailer from 'nodemailer';
import Message from '../models/Message.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Check Gmail connection
transporter.verify((error) => {
  if (error) {
    console.error('GMAIL SMTP ERROR:', error.message);
  } else {
    console.log('GMAIL SMTP READY: true');
  }
});

// Submit contact message
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    if (!name || !email || !message) {
      return res.status(400).json({
        message: 'Name, email, and message are required',
      });
    }

    // Save message to MongoDB
    const newMessage = new Message({
      name,
      email,
      message,
    });

    const savedMessage = await newMessage.save();

    console.log('SENDING EMAIL TO:', process.env.EMAIL_USER);

    // Send email
    const info = await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `New Portfolio Message from ${name}`,
      text: `

Name: ${name}
Email: ${email}

Message:
${message}

      `,
    });

    console.log('EMAIL SENT:', info.messageId);

    res.status(201).json({
      message: 'Message saved and email sent successfully',
      data: savedMessage,
    });

  } catch (error) {
    console.error('Message/Email Error:', error);

    res.status(500).json({
      message: error.message || 'Failed to send message',
    });
  }
});

// Get all messages
router.get('/', protect, admin, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// Mark message as read
router.put('/:id/read', protect, admin, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
      });
    }

    message.read =
      req.body.read !== undefined ? req.body.read : true;

    const updatedMessage = await message.save();

    res.json(updatedMessage);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// Delete message
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: 'Message not found',
      });
    }

    await message.deleteOne();

    res.json({
      message: 'Message deleted successfully',
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

export default router;