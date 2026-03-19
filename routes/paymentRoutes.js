// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const razorpay = require("../utils/razorpay");
const Booking = require("../models/Booking");

router.post("/create-order/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    // 💡 calculate split
const total = booking.finalPrice;
    const platformFee = Math.round(total * 0.2);
    const caregiverEarning = total - platformFee;

    const options = {
      amount: total * 100, // paise
      currency: "INR",
      receipt: `receipt_${booking._id}`,
    };

    const order = await razorpay.orders.create(options);

    // save in DB
    booking.totalAmount = total;
    booking.platformFee = platformFee;
    booking.caregiverEarning = caregiverEarning;
    booking.paymentStatus = "pending";
    booking.razorpayOrderId = order.id;

    await booking.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

const crypto = require("crypto");

router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ msg: "Payment verification failed" });
    }

    // update booking
    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id });

    booking.paymentStatus = "paid";
    booking.razorpayPaymentId = razorpay_payment_id;

    await booking.save();

    res.json({ msg: "Payment successful" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;