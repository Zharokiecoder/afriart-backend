const Order = require('../models/Order');
const Artwork = require('../models/Artwork');
const axios = require('axios');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;

    const order = new Order({
      buyer: req.user._id,
      items,
      shippingAddress,
      totalAmount,
      paymentStatus: 'pending',
      orderStatus: 'processing'
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Initialize Paystack payment
exports.initializePayment = async (req, res) => {
  try {
    const { orderId, email } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: 'Payment gateway not configured' });
    }

    // Initialize Paystack transaction
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email,
        amount: Math.round(order.totalAmount * 100), // Paystack uses kobo (NGN) or cents
        reference: `afriart_${order._id}_${Date.now()}`,
        callback_url: `${process.env.CLIENT_URL}/orders`,
        metadata: {
          order_id: order._id.toString(),
          buyer_id: req.user._id.toString()
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status) {
      // Save the Paystack reference on the order
      order.paymentReference = response.data.data.reference;
      await order.save();

      return res.json({
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference
      });
    } else {
      return res.status(400).json({ message: 'Failed to initialize payment' });
    }
  } catch (error) {
    console.error('Paystack init error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Payment initialization failed' });
  }
};

// Verify Paystack payment
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: 'Payment gateway not configured' });
    }

    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (response.data.data.status === 'success') {
      const orderId = response.data.data.metadata.order_id;
      
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.paymentReference = reference;
        await order.save();

        // Mark artworks as sold
        for (const item of order.items) {
          if (item.artwork) {
            await Artwork.findByIdAndUpdate(item.artwork, { inStock: false });
          }
        }
      }

      return res.json({ 
        message: 'Payment verified successfully', 
        order 
      });
    } else {
      return res.status(400).json({ message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('buyer', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};