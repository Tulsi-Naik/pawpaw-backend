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


// 🔹 6. APPROVE / REJECT (SAFE VERSION)
router.put("/request/:id", protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { action } = req.body;

    // ✅ VALIDATION
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const request = await AdoptionRequest.findById(req.params.id).session(session);
    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Not found" });
    }

    const listing = await AdoptionListing.findById(request.listing).session(session);
    if (!listing || listing.owner.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not allowed" });
    }

    if (listing.status !== "available") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Already processed" });
    }

    // 🔥 APPROVE
    if (action === "approve") {

      await Pet.findByIdAndUpdate(
        listing.pet,
        { owner: request.requester },
        { session }
      );

      listing.status = "adopted";
      await listing.save({ session });

      request.status = "approved";
      await request.save({ session });

      await AdoptionRequest.updateMany(
        { listing: listing._id, _id: { $ne: request._id } },
        { status: "rejected" },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      // 🔥 NON-BLOCKING NOTIFICATIONS
      const approvedUser = await User.findById(request.requester);

      try {
        await sendEmail(
          approvedUser.email,
          "Adoption Approved 🐶",
          `<p>Congrats! Your adoption request has been approved.</p>`
        );
      } catch (e) {
        console.log("Email failed:", e.message);
      }

      try {
        if (approvedUser.phone) {
          await sendSMS(
            approvedUser.phone,
            "Your adoption request has been approved 🐶"
          );
        }
      } catch (e) {
        console.log("SMS failed:", e.message);
      }

      return res.json({ message: "Adoption approved" });
    }

    // 🔥 REJECT
    if (action === "reject") {
      request.status = "rejected";
      await request.save({ session });

      await session.commitTransaction();
      session.endSession();

      const rejectedUser = await User.findById(request.requester);

      try {
        await sendEmail(
          rejectedUser.email,
          "Adoption Request Update",
          `<p>Your request was not approved.</p>`
        );
      } catch (e) {
        console.log("Email failed:", e.message);
      }

      return res.json({ message: "Request rejected" });
    }

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Error updating request" });
  }
});

module.exports = router;