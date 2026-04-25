const mongoose = require("mongoose");
require("dotenv").config();

const AdoptionListing = require("../models/AdoptionListing");
const AdoptionRequest = require("../models/AdoptionRequest");
require("../models/Pet");
require("../models/User");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const requestStatuses = await AdoptionRequest.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const listingStatuses = await AdoptionListing.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const completedRequests = await AdoptionRequest.find({ status: "completed" })
    .populate({
      path: "listing",
      populate: { path: "pet", select: "name owner lastAdoptionDate" }
    })
    .populate("requester", "name")
    .sort({ updatedAt: -1 });

  const adoptedListings = await AdoptionListing.find({ status: "adopted" })
    .populate("pet", "name owner lastAdoptionDate")
    .populate("owner", "name")
    .sort({ updatedAt: -1 });

  console.log("AdoptionRequest statuses:", requestStatuses);
  console.log("AdoptionListing statuses:", listingStatuses);

  console.log("\nCompleted requests:");
  for (const request of completedRequests) {
    console.log({
      requestId: request._id.toString(),
      pet: request.listing?.pet?.name,
      previousOwner: request.listing?.owner?.toString(),
      requester: request.requester?.name || request.requester?.toString(),
      requestUpdatedAt: request.updatedAt,
      petOwnerNow: request.listing?.pet?.owner?.toString(),
      petLastAdoptionDate: request.listing?.pet?.lastAdoptionDate
    });
  }

  console.log("\nAdopted listings:");
  for (const listing of adoptedListings) {
    console.log({
      listingId: listing._id.toString(),
      pet: listing.pet?.name,
      previousOwner: listing.owner?.name || listing.owner?.toString(),
      listingUpdatedAt: listing.updatedAt,
      petOwnerNow: listing.pet?.owner?.toString(),
      petLastAdoptionDate: listing.pet?.lastAdoptionDate
    });
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
