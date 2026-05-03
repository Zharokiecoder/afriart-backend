const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const Order = require('../models/Order');
const { protect, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(protect, isAdmin);

// Get platform stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalArtists, totalArtworks, orders] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'artist' }),
      Artwork.countDocuments(),
      Order.find({})
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.json({
      totalUsers,
      totalArtists,
      totalArtworks,
      totalOrders,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'artist', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete user's artworks too
    await Artwork.deleteMany({ artist: user._id });
    await user.deleteOne();

    res.json({ message: 'User and their artworks deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
