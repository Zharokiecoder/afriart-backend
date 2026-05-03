const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  initializePayment,
  verifyPayment,
  updateOrderStatus,
  getAllOrders
} = require('../controllers/orderController');
const { protect, isAdmin } = require('../middleware/auth');

// All order routes require authentication
router.post('/', protect, createOrder);
router.get('/myorders', protect, getUserOrders);

// Paystack payment routes
router.post('/pay/initialize', protect, initializePayment);
router.get('/pay/verify/:reference', protect, verifyPayment);

// Admin routes
router.get('/', protect, isAdmin, getAllOrders);
router.put('/:id/status', protect, isAdmin, updateOrderStatus);

module.exports = router;