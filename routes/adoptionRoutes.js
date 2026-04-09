const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

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


// 🔹 2. GET ALL LISTINGS (BROWSE)
router.get("/", protect, async (req, res) => {
  try {
    const listings = await AdoptionListing.find({ status: "available" })
      .populate({
        path: "pet",
        populate: {
          path: "owner",
          select: "city"
        }
      })
      .sort({ createdAt: -1 });

    res.json(listings);

  } catch (err) {
    res.status(500).json({ message: "Error fetching listings" });
  }
});


// 🔹 3. SEND REQUEST
router.post("/request", protect, async (req, res) => {
  try {
    const { listingId, message } = req.body;
    //9 april msg issue logs
console.log("BODY:", req.body)
console.log("MESSAGE:", message)
    const listing = await AdoptionListing.findById(listingId);
    const user = await require("../models/User").findById(req.user.id)

if (!user.phone || !user.city || !user.bio) {
  return res.status(400).json({
    message: "Complete profile before requesting adoption"
  })
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
    console.log("SAVED REQUEST:", request)

    res.status(201).json(request);

  } catch (err) {
    res.status(500).json({ message: "Error sending request" });
  }
});


// 🔹 4. MY LISTINGS (OWNER VIEW)
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

        return {
          listing,
          requests
        };
      })
    );

    res.json(result);

  } catch (err) {
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
        populate: {
          path: "pet"
        }
      })
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch (err) {
    res.status(500).json({ message: "Error fetching requests" });
  }
});


// 🔹 6. APPROVE / REJECT
router.put("/request/:id", protect, async (req, res) => {
  try {
    const { action } = req.body;

    const request = await AdoptionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Not found" });
    }

    const listing = await AdoptionListing.findById(request.listing);
    if (!listing || listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (listing.status !== "available") {
      return res.status(400).json({ message: "Already processed" });
    }

    if (action === "approve") {

      // transfer pet
      await Pet.findByIdAndUpdate(listing.pet, {
        owner: request.requester
      });

      // mark listing adopted
      listing.status = "adopted";
      await listing.save();

      // approve this
      request.status = "approved";
      await request.save();

      // reject others
      await AdoptionRequest.updateMany(
        { listing: listing._id, _id: { $ne: request._id } },
        { status: "rejected" }
      );

      return res.json({ message: "Adoption approved" });
    }

    if (action === "reject") {
      request.status = "rejected";
      await request.save();

      return res.json({ message: "Request rejected" });
    }

    res.status(400).json({ message: "Invalid action" });

  } catch (err) {
    res.status(500).json({ message: "Error updating request" });
  }
});


module.exports = router;