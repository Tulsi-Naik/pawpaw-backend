const mongoose = require("mongoose");
require("dotenv").config();

const Booking = require("../models/Booking");
const Pet = require("../models/Pet");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const ownerlessCount = await Booking.countDocuments({
    owner: { $exists: false }
  });

  const adoptedPets = await Pet.find({
    lastAdoptionDate: { $exists: true }
  }).select("name owner previousOwners lastAdoptionDate");

  console.log("Ownerless bookings remaining:", ownerlessCount);
  console.log("Pets with adoption metadata:");
  for (const pet of adoptedPets) {
    console.log({
      name: pet.name,
      owner: pet.owner?.toString(),
      previousOwners: pet.previousOwners?.map(owner => owner.toString()) || [],
      lastAdoptionDate: pet.lastAdoptionDate
    });
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
