const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const sendEmail = require("../utils/sendEmail");
const sendSMS = require("../utils/sendSMS");
const User = require("../models/User");
const mongoose = require("mongoose");

const AdoptionListing = require("../models/AdoptionListing");
const AdoptionRequest = require("../models/AdoptionRequest");
const Pet = require("../models/Pet");


// 🔹 1. CREATE LISTING
router.post("/create", protect, async (req, res) => {
  try {
    const { petId, description } = req.body;

    const pet = await Pet.findById(petId);

    if (!pet || pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const existing = await AdoptionListing.findOne({
      pet: petId,
      status: "available"
    });

    if (existing) {
      return res.status(400).json({ message: "Already listed" });
    }

    const listing = await AdoptionListing.create({
      pet: petId,
      owner: req.user.id,
      description
    });

    res.status(201).json(listing);

  } catch (err) {
    res.status(500).json({ message: "Error creating listing" });
  }
});


// 🔹 2. GET ALL LISTINGS
router.get("/", protect, async (req, res) => {
  try {
    const listings = await AdoptionListing.find({ status: "available" })
      .populate({
        path: "pet",
        populate: { path: "owner", select: "city" }
      })
      .sort({ createdAt: -1 });

    res.json(listings);

  } catch {
    res.status(500).json({ message: "Error fetching listings" });
  }
});


// 🔹 3. SEND REQUEST
router.post("/request", protect, async (req, res) => {
  try {
    const { listingId, message } = req.body;

    const listing = await AdoptionListing.findById(listingId);
    const user = await User.findById(req.user.id);

    if (!user.phone || !user.city || !user.bio) {
      return res.status(400).json({
        message: "Complete profile before requesting adoption"
      });
    }

    if (!listing || listing.status !== "available") {
      return res.status(400).json({ message: "Not available" });
    }

    if (listing.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot request own dog" });
    }

    const existing = await AdoptionRequest.findOne({
      listing: listingId,
      requester: req.user.id
    });

    if (existing) {
      return res.status(400).json({ message: "Already requested" });
    }

    const request = await AdoptionRequest.create({
      listing: listingId,
      requester: req.user.id,
      message
    });

    res.status(201).json(request);

  } catch {
    res.status(500).json({ message: "Error sending request" });
  }
});


// 🔹 4. MY LISTINGS
router.get("/my-listings", protect, async (req, res) => {
  try {
    const listings = await AdoptionListing.find({ owner: req.user.id })
      .populate("pet")
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      listings.map(async (listing) => {
        const requests = await AdoptionRequest.find({
          listing: listing._id
        }).populate({
          path: "requester",
          select: "name phone city bio profilePhoto"
        });

        return { listing, requests };
      })
    );

    res.json(result);

  } catch {
    res.status(500).json({ message: "Error fetching listings" });
  }
});


// 🔹 5. MY REQUESTS

router.get("/my-requests", protect, async (req, res) => {
  try {
    const requests = await AdoptionRequest.find({
      requester: req.user.id
    })
      .populate({
        path: "listing",
        populate: [
          { path: "pet" },
          { path: "owner", select: "name phone" } // 🔥 ADD THIS LINE
        ]
      })
      .populate({
        path: "requester",
        select: "name bio"
      })
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch {
    res.status(500).json({ message: "Error fetching requests" });
  }
});

// 🔹 6. APPROVE / REJECT (STAGE 1: OWNER APPROVAL)
router.put("/request/:id", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { action } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const request = await AdoptionRequest.findById(req.params.id).session(session);
    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Request not found" });
    }

    const listing = await AdoptionListing.findById(request.listing).session(session);
    if (!listing || listing.owner.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not allowed" });
    }

    if (listing.status !== "available") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Listing is no longer available" });
    }

    if (action === "approve") {
      // Set request to approved. 
      // NOTE: We do NOT change Pet.owner or Cancel Bookings here anymore.
      // That happens in the 'finalize' route called by the adopter.
      request.status = "approved";
      await request.save({ session });

      // Reject all other pending requests for this dog immediately
      await AdoptionRequest.updateMany(
        { listing: listing._id, _id: { $ne: request._id } },
        { status: "rejected" },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // Notifications
      const approvedUser = await User.findById(request.requester);
      try {
        if (approvedUser.phone) {
          await sendSMS(
            approvedUser.phone,
            `PawPaw: Your request for ${listing.pet.name} was approved! Please meet the owner and click 'Confirm Received' in the app to finish.`
          );
        }
      } catch (e) {
        console.log("Notification failed:", e.message);
      }

      return res.json({ message: "Request approved. Waiting for adopter to confirm receipt." });
    }

    if (action === "reject") {
      request.status = "rejected";
      await request.save({ session });

      await session.commitTransaction();
      session.endSession();
      return res.json({ message: "Request rejected" });
    }

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ message: "Error processing approval" });
  }
});

// 🔹 7. FINALIZE HANDOVER (Called by Adopter)
router.put("/finalize/:id", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await AdoptionRequest.findById(req.params.id)
      .populate("listing")
      .session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Request not found" });
    }

    // Security: Only the adopter (requester) can confirm they received the dog
    if (request.requester.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Only the adopter can finalize handover" });
    }

    if (request.status !== "approved") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Request must be approved by owner first" });
    }

    // 1. Officially change the Pet's owner to the Adopter
    await Pet.findByIdAndUpdate(
      request.listing.pet,
      { owner: req.user.id },
      { session }
    );

    // 2. Mark the request as completed
    request.status = "completed";
    await request.save({ session });

    // 3. Update listing status to adopted
    await AdoptionListing.findByIdAndUpdate(
      request.listing._id,
      { status: "adopted" },
      { session }
    );

    // 4. FIND FUTURE PAID BOOKINGS FOR REFUND
    const Booking = require("../models/Booking");
    const razorpay = require("../utils/razorpay"); // Ensure this path is correct

    const futurePaidBookings = await Booking.find({
      pet: request.listing.pet,
      paymentStatus: "Paid",
      date: { $gte: new Date() }
    }).session(session);

    // 5. TRIGGER RAZORPAY REFUNDS
    for (let booking of futurePaidBookings) {
      try {
        if (booking.razorpayPaymentId) {
          await razorpay.payments.refund(booking.razorpayPaymentId, {
            amount: booking.totalAmount * 100, // Amount in paise
            notes: { reason: "Automated refund due to pet adoption handover" }
          });

          booking.paymentStatus = "Refunded";
        }
      } catch (refundErr) {
        // We log the error but don't stop the adoption if a refund fails 
        // (can be handled manually in Razorpay dashboard if needed)
        console.error(`Refund failed for booking ${booking._id}:`, refundErr.message);
      }
      
      // Mark as cancelled regardless of refund success to stop the caregiver
      booking.status = "Cancelled";
      booking.cancellationReason = "Dog adopted - Ownership transferred";
      await booking.save({ session });
    }

    // 6. ALSO CANCEL PENDING/UNPAID FUTURE BOOKINGS
    await Booking.updateMany(
      {
        pet: request.listing.pet,
        paymentStatus: { $ne: "Paid" },
        status: { $in: ["Pending", "Accepted"] },
        date: { $gte: new Date() }
      },
      { 
        status: "Cancelled",
        cancellationReason: "Dog adopted - Ownership transferred" 
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ 
      message: "Handover finalized! The dog is now yours, and future bookings have been refunded." 
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ message: "Error finalizing handover" });
  }
});

module.exports = router;