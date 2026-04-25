const mongoose = require("mongoose");
require("dotenv").config();

const AdoptionListing = require("../models/AdoptionListing");
const AdoptionRequest = require("../models/AdoptionRequest");
const Booking = require("../models/Booking");
const Pet = require("../models/Pet");
require("../models/User");

const applyChanges = process.argv.includes("--apply");

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const completedRequests = await AdoptionRequest.find({ status: "completed" })
    .populate("listing")
    .sort({ updatedAt: 1 });

  const operations = [];
  const adoptedPetIds = new Set();

  for (const request of completedRequests) {
    if (!request.listing?.pet || !request.listing?.owner) continue;

    const petId = request.listing.pet;
    const previousOwnerId = request.listing.owner;
    const newOwnerId = request.requester;
    const handoverDate = request.updatedAt || request.createdAt || new Date();

    adoptedPetIds.add(petId.toString());

    operations.push({
      label: `Stamp pet ${petId} adoption metadata`,
      run: () =>
        Pet.updateOne(
          { _id: petId },
          {
            lastAdoptionDate: handoverDate,
            $addToSet: { previousOwners: previousOwnerId }
          }
        )
    });

    operations.push({
      label: `Assign pre-adoption bookings for pet ${petId} to previous owner ${previousOwnerId}`,
      run: () =>
        Booking.updateMany(
          {
            pet: petId,
            owner: { $exists: false },
            createdAt: { $lt: handoverDate }
          },
          { owner: previousOwnerId }
        )
    });

    operations.push({
      label: `Assign post-adoption bookings for pet ${petId} to new owner ${newOwnerId}`,
      run: () =>
        Booking.updateMany(
          {
            pet: petId,
            owner: { $exists: false },
            createdAt: { $gte: handoverDate }
          },
          { owner: newOwnerId }
        )
    });
  }

  const adoptedListings = await AdoptionListing.find({ status: "adopted" })
    .populate("pet", "owner")
    .sort({ updatedAt: 1 });

  for (const listing of adoptedListings) {
    if (!listing.pet?._id || !listing.owner || adoptedPetIds.has(listing.pet._id.toString())) {
      continue;
    }

    const petId = listing.pet._id;
    const previousOwnerId = listing.owner;
    const newOwnerId = listing.pet.owner;
    const handoverDate = listing.updatedAt || listing.createdAt || new Date();

    adoptedPetIds.add(petId.toString());

    operations.push({
      label: `Stamp adopted listing pet ${petId} adoption metadata`,
      run: () =>
        Pet.updateOne(
          { _id: petId },
          {
            lastAdoptionDate: handoverDate,
            $addToSet: { previousOwners: previousOwnerId }
          }
        )
    });

    operations.push({
      label: `Assign pre-adoption bookings for adopted listing pet ${petId} to previous owner ${previousOwnerId}`,
      run: () =>
        Booking.updateMany(
          {
            pet: petId,
            owner: { $exists: false },
            createdAt: { $lt: handoverDate }
          },
          { owner: previousOwnerId }
        )
    });

    operations.push({
      label: `Assign post-adoption bookings for adopted listing pet ${petId} to current owner ${newOwnerId}`,
      run: () =>
        Booking.updateMany(
          {
            pet: petId,
            owner: { $exists: false },
            createdAt: { $gte: handoverDate }
          },
          { owner: newOwnerId }
        )
    });
  }

  const remainingOwnerlessBookings = await Booking.find({
    owner: { $exists: false },
    ...(adoptedPetIds.size ? { pet: { $nin: [...adoptedPetIds] } } : {})
  }).populate("pet", "owner name");

  for (const booking of remainingOwnerlessBookings) {
    if (!booking.pet?.owner) continue;

    operations.push({
      label: `Assign ownerless booking ${booking._id} for ${booking.pet.name || "pet"} to current owner ${booking.pet.owner}`,
      run: () =>
        Booking.updateOne(
          { _id: booking._id, owner: { $exists: false } },
          { owner: booking.pet.owner }
        )
    });
  }

  console.log(`${applyChanges ? "Applying" : "Dry run:"} ${operations.length} cleanup operations`);

  let modifiedCount = 0;

  for (const operation of operations) {
    if (!applyChanges) {
      console.log(`- ${operation.label}`);
      continue;
    }

    const result = await operation.run();
    const changed = result.modifiedCount || 0;
    modifiedCount += changed;
    console.log(`- ${operation.label}: modified ${changed}`);
  }

  if (!applyChanges) {
    console.log("\nNo data was changed. Run with --apply to update MongoDB.");
  } else {
    console.log(`\nDone. Modified ${modifiedCount} documents.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
