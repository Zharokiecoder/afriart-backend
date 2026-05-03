const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [{
    artwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artwork',
      required: true
    },
    title: String,
    price: Number,
    image: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    fullName: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'paystack'
  },
  paymentReference: String,
  orderStatus: {
    type: String,
    enum: ['processing', 'shipped', 'delivered', 'cancelled'],
    default: 'processing'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: Date
});

module.exports = mongoose.model('Order', orderSchema);