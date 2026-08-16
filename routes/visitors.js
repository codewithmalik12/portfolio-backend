import express from 'express';
import Visitor from '../models/Visitor.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

const parseUA = (ua) => {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (!ua) return { browser, os, device };

  if (ua.includes('Firefox') && !ua.includes('Seamonkey')) browser = 'Firefox';
  else if (ua.includes('Chrome') && !ua.includes('Chromium') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile';
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    device = 'Tablet';
  }

  return { browser, os, device };
};

// @desc    Log a visitor hit
// @route   POST /api/visitors/hit
// @access  Public
router.post('/hit', async (req, res) => {
  const { referrer, path } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous';
  
  const { browser, os, device } = parseUA(userAgent);

  try {
    const visitor = new Visitor({
      ip: ip.split(',')[0].trim(), // Get actual client IP if behind proxy
      userAgent,
      browser,
      os,
      device,
      referrer: referrer || 'Direct',
      path: path || '/'
    });

    await visitor.save();
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get visitor statistics for dashboard
// @route   GET /api/visitors/stats
// @access  Private
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalViews = await Visitor.countDocuments();
    
    // Unique IPs count
    const uniqueIPsResult = await Visitor.distinct('ip');
    const uniqueVisitors = uniqueIPsResult.length;

    // Group by browser
    const browserStats = await Visitor.aggregate([
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Group by OS
    const osStats = await Visitor.aggregate([
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Group by device
    const deviceStats = await Visitor.aggregate([
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Views by day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const viewsByDay = await Visitor.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Recent visitors list
    const recentActivity = await Visitor.find()
      .sort({ timestamp: -1 })
      .limit(15);

    res.json({
      totalViews,
      uniqueVisitors,
      browserStats,
      osStats,
      deviceStats,
      viewsByDay,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
