const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Pet = require("../models/Pet");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const CaregiverApplication = require("../models/CaregiverApplication");
const Blog = require("../models/Blog");

const CITIES = ["Pune", "Mumbai", "Nashik", "Nagpur", "Pimpri-Chinchwad"];
const AVAILABILITY_WINDOWS = ["morning", "afternoon", "evening"];
const DOG_SIZES = ["Small", "Medium", "Large"];
const BLOG_CATEGORIES = ["training", "grooming", "health", "food", "adoption"];

const DOG_BREEDS = [
  { breed: "Labrador Retriever", weight: 14, size: "Large" },
  { breed: "Golden Retriever", weight: 10, size: "Large" },
  { breed: "German Shepherd", weight: 9, size: "Large" },
  { breed: "Beagle", weight: 8, size: "Medium" },
  { breed: "Pug", weight: 7, size: "Small" },
  { breed: "Shih Tzu", weight: 8, size: "Small" },
  { breed: "Indie", weight: 12, size: "Medium" },
  { breed: "Siberian Husky", weight: 5, size: "Large" },
  { breed: "Dachshund", weight: 5, size: "Small" },
  { breed: "Mixed Breed", weight: 22, size: "Medium" }
];

const DOG_NAMES = [
  "Bruno", "Luna", "Simba", "Bella", "Rocky", "Milo", "Coco", "Buddy", "Max",
  "Charlie", "Daisy", "Kobe", "Rani", "Tommy", "Leo", "Shadow", "Ruby", "Nala",
  "Sultan", "Tuffy", "Juno", "Rex", "Peanut", "Mocha", "Zara", "Oreo", "Bingo"
];

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Ananya", "Ira", "Myra", "Aanya",
  "Rohan", "Kiran", "Sana", "Nikita", "Rahul", "Kartik", "Riya", "Meera",
  "Neha", "Ishaan", "Dev", "Kabir", "Arjun", "Priya", "Tanvi", "Sneha"
];

const LAST_NAMES = [
  "Sharma", "Patel", "Verma", "Nair", "Reddy", "Khan", "Yadav", "Joshi",
  "Iyer", "Pawar", "Kapoor", "Singh", "Jain", "Malhotra", "Desai", "Kulkarni"
];

const TIME_SLOTS = [
  "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"
];

const DEFAULTS = {
  owners: 320,
  caregivers: 95,
  pets: 720,
  bookings: 2400,
  applications: 60,
  blogs: 18,
  months: 6
};

function parseArgs() {
  const config = { ...DEFAULTS };
  for (const arg of process.argv.slice(2)) {
    const [rawKey, rawValue] = arg.split("=");
    if (!rawKey || rawValue === undefined) continue;
    const key = rawKey.replace(/^--/, "");
    const value = Number(rawValue);
    if (Number.isNaN(value)) continue;
    if (key in config) config[key] = value;
  }
  return config;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function pickManyDistinct(arr, count) {
  const copy = [...arr];
  const result = [];
  const safeCount = Math.min(count, arr.length);
  while (result.length < safeCount && copy.length) {
    const idx = randInt(0, copy.length - 1);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

function weightedPick(weightedItems) {
  const total = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * total;
  for (const item of weightedItems) {
    threshold -= item.weight;
    if (threshold <= 0) return item;
  }
  return weightedItems[weightedItems.length - 1];
}

function randomDateBetween(start, end) {
  const min = start.getTime();
  const max = end.getTime();
  return new Date(randInt(min, max));
}

function distribute(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((total * w) / sum));
  let assigned = counts.reduce((a, b) => a + b, 0);
  while (assigned < total) {
    const idx = randInt(0, counts.length - 1);
    counts[idx] += 1;
    assigned += 1;
  }
  return counts;
}

function makePhone(seed) {
  const tail = String(seed).padStart(8, "0").slice(-8);
  return `9${tail}1`;
}

function slotToPeriod(slot) {
  const upper = slot.toUpperCase();
  if (upper.includes("AM")) return "morning";
  if (upper.startsWith("12")) return "afternoon";
  const hour = Number(slot.split(":")[0]);
  if (Number.isFinite(hour) && hour <= 4) return "afternoon";
  return "evening";
}

function clampDate(value, min, max) {
  const t = value.getTime();
  if (t < min.getTime()) return new Date(min);
  if (t > max.getTime()) return new Date(max);
  return value;
}

function maybe(value, probability) {
  return Math.random() < probability ? value : null;
}

async function ensureServices() {
  const existing = await Service.find({});
  const byCategory = new Map(existing.map((s) => [s.category, s]));

  const toCreate = [];
  if (!byCategory.has("walking")) {
    toCreate.push({
      name: "Dog Walking",
      category: "walking",
      price: 299,
      duration: 30
    });
  }

  if (!byCategory.has("grooming")) {
    toCreate.push({
      name: "Dog Grooming",
      category: "grooming",
      price: 799,
      duration: 60
    });
  }

  if (toCreate.length) {
    const created = await Service.insertMany(toCreate);
    for (const service of created) byCategory.set(service.category, service);
  }

  return byCategory;
}

async function seed() {
  const config = parseArgs();
  const runTag = `demo${Date.now()}`;
  const now = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - Math.max(1, config.months));

  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash("PawPaw@123", 10);
  const servicesByCategory = await ensureServices();
  const walkingService = servicesByCategory.get("walking");
  const groomingService = servicesByCategory.get("grooming");

  const ownerDocs = [];
  for (let i = 0; i < config.owners; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const createdAt = randomDateBetween(startDate, now);
    ownerDocs.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${runTag}.owner${i}@pawpaw.demo`,
      phone: makePhone(100000 + i),
      password: passwordHash,
      city: pick(CITIES),
      address: `${randInt(10, 999)}, ${pick(["MG Road", "Baner", "Koregaon Park", "Andheri", "Civil Lines"])}`,
      role: "user",
      hasDog: true,
      onboardingStatus: pick([
        "active", "active", "active", "profile_completed", "pending_setup"
      ]),
      createdAt,
      updatedAt: createdAt
    });
  }

  const caregiverDocs = [];
  const caregiverStatusBuckets = distribute(config.caregivers, [73, 17, 10]);
  const caregiverStatuses = [
    ...Array(caregiverStatusBuckets[0]).fill("active"),
    ...Array(caregiverStatusBuckets[1]).fill("pending_setup"),
    ...Array(caregiverStatusBuckets[2]).fill("suspended")
  ];

  for (let i = 0; i < config.caregivers; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const skills = Math.random() < 0.7
      ? ["walking"]
      : Math.random() < 0.75
        ? ["grooming"]
        : ["walking", "grooming"];
    const availabilityCount = randInt(1, 3);
    const createdAt = randomDateBetween(startDate, now);
    caregiverDocs.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${runTag}.care${i}@pawpaw.demo`,
      phone: makePhone(300000 + i),
      password: passwordHash,
      city: pick(CITIES),
      address: `${randInt(1, 99)}, ${pick(["Shivaji Nagar", "Powai", "Kothrud", "Wakad", "Sitabuldi"])}`,
      role: "caregiver",
      hasDog: maybe(true, 0.45) ?? false,
      skills,
      onboardingStatus: caregiverStatuses[i],
      bio: "Experienced with dogs of different temperaments and routines.",
      serviceRadius: pick([25, 50, 100, 150, 300]),
      walkingPrice: randInt(199, 449),
      groomingPrice: randInt(499, 1299),
      dogSizesHandled: pickManyDistinct(DOG_SIZES, randInt(1, 3)),
      availability: pickManyDistinct(AVAILABILITY_WINDOWS, availabilityCount),
      createdAt,
      updatedAt: createdAt
    });
  }

  const insertedOwners = await User.insertMany(ownerDocs, { ordered: false });
  const insertedCaregivers = await User.insertMany(caregiverDocs, { ordered: false });

  const ownerPetMap = new Map(insertedOwners.map((o) => [String(o._id), []]));

  const petDocs = [];
  const guaranteedOwners = [...insertedOwners];
  const totalPets = Math.max(config.pets, guaranteedOwners.length);
  for (let i = 0; i < totalPets; i += 1) {
    const owner = guaranteedOwners.length ? guaranteedOwners.pop() : pick(insertedOwners);
    const breedMeta = weightedPick(DOG_BREEDS);
    const createdAt = randomDateBetween(clampDate(new Date(owner.createdAt), startDate, now), now);
    const pet = {
      name: `${pick(DOG_NAMES)}${randInt(1, 99)}`,
      type: "Dog",
      breed: breedMeta.breed,
      size: breedMeta.size,
      dateOfBirth: randomDateBetween(new Date(now.getFullYear() - 12, 0, 1), new Date(now.getFullYear() - 1, 11, 31)),
      owner: owner._id,
      energyLevel: randInt(1, 5),
      friendliness: randInt(2, 5),
      anxietyLevel: randInt(1, 4),
      walkSpeed: randInt(1, 5),
      dogFriendly: Math.random() < 0.8,
      kidFriendly: Math.random() < 0.76,
      allergies: Math.random() < 0.2 ? pick(["None", "Chicken", "Dust", "Pollen"]) : "",
      medicalNotes: Math.random() < 0.16 ? pick(["Mild arthritis", "Sensitive stomach", "Needs regular meds"]) : "",
      fears: Math.random() < 0.22 ? pickManyDistinct(["Thunder", "Traffic", "Loud noises", "Strangers"], randInt(1, 2)) : [],
      favoriteTreat: pick(["Peanut butter", "Chicken bites", "Carrot sticks", "Biscuits", "Paneer cubes"]),
      createdAt,
      updatedAt: createdAt
    };
    petDocs.push(pet);
  }

  const insertedPets = await Pet.insertMany(petDocs, { ordered: false });
  for (const pet of insertedPets) {
    const key = String(pet.owner);
    if (!ownerPetMap.has(key)) ownerPetMap.set(key, []);
    ownerPetMap.get(key).push(pet);
  }

  const activeCaregivers = insertedCaregivers.filter((c) => c.onboardingStatus === "active");
  const highActivityCaregivers = pickManyDistinct(
    activeCaregivers,
    Math.max(1, Math.ceil(activeCaregivers.length * 0.2))
  );

  const ownerIds = insertedOwners.map((o) => String(o._id));
  const vipOwnerIds = new Set(
    pickManyDistinct(ownerIds, Math.max(1, Math.ceil(ownerIds.length * 0.12)))
  );

  const statusCounts = distribute(config.bookings, [58, 12, 8, 16, 6]);
  const statuses = [
    ...Array(statusCounts[0]).fill("Completed"),
    ...Array(statusCounts[1]).fill("Accepted"),
    ...Array(statusCounts[2]).fill("InProgress"),
    ...Array(statusCounts[3]).fill("Pending"),
    ...Array(statusCounts[4]).fill("Cancelled")
  ];

  const bookingDocs = [];
  for (let i = 0; i < statuses.length; i += 1) {
    const status = statuses[i];
    const ownerPool = Math.random() < 0.42
      ? ownerIds.filter((id) => vipOwnerIds.has(id))
      : ownerIds;
    const ownerId = pick(ownerPool);
    const pets = ownerPetMap.get(ownerId);
    if (!pets || !pets.length) continue;
    const pet = pick(pets);
    const isWalking = Math.random() < 0.7;
    const service = isWalking ? walkingService : groomingService;
    const duration = isWalking ? pick([30, 45, 60]) : pick([45, 60, 90]);

    const base = service?.price || (isWalking ? 299 : 799);
    const multiplier = duration / (service?.duration || 30);
    const totalAmount = Math.round(base * multiplier);
    const platformFee = Math.round(totalAmount * 0.2);
    const caregiverEarning = totalAmount - platformFee;

    const bookingDate = randomDateBetween(startDate, now);
    const createdAt = clampDate(
      new Date(bookingDate.getTime() - randInt(0, 8) * 24 * 60 * 60 * 1000),
      startDate,
      now
    );
    const updatedAt = clampDate(
      new Date(bookingDate.getTime() + randInt(0, 2) * 24 * 60 * 60 * 1000),
      createdAt,
      now
    );

    let caregiver = null;
    let paymentStatus = "Unpaid";
    let rating = null;
    let review = "";
    let isRated = false;

    if (status === "Completed" || status === "Accepted" || status === "InProgress") {
      const caregiverPool = Math.random() < 0.6 ? highActivityCaregivers : activeCaregivers;
      caregiver = caregiverPool.length ? pick(caregiverPool)._id : null;
    }

    if (status === "Completed") {
      const paymentRoll = Math.random();
      paymentStatus = paymentRoll < 0.83 ? "Paid" : paymentRoll < 0.9 ? "Refunded" : "Pending";
      if (Math.random() < 0.63) {
        rating = randInt(3, 5);
        review = pick([
          "Very punctual and handled my dog well.",
          "Great experience, will book again.",
          "Friendly caregiver and smooth service.",
          "My dog came back happy and calm.",
          "On-time and professional support."
        ]);
        isRated = true;
      }
    } else if (status === "InProgress") {
      paymentStatus = Math.random() < 0.75 ? "Paid" : "Pending";
    } else if (status === "Accepted") {
      paymentStatus = Math.random() < 0.45 ? "Paid" : "Pending";
    } else if (status === "Pending") {
      paymentStatus = Math.random() < 0.2 ? "Pending" : "Unpaid";
    } else if (status === "Cancelled") {
      paymentStatus = Math.random() < 0.18 ? "Refunded" : "Unpaid";
      if (Math.random() < 0.28 && activeCaregivers.length) {
        caregiver = pick(activeCaregivers)._id;
      }
    }

    bookingDocs.push({
      pet: pet._id,
      owner: pet.owner,
      service: service?._id,
      date: bookingDate,
      timeSlot: pick(TIME_SLOTS),
      duration,
      packageType: Math.random() < 0.82 ? "one-time" : "recurring",
      finalPrice: totalAmount,
      caregiver,
      status,
      paymentStatus,
      totalAmount,
      platformFee,
      caregiverEarning,
      rating,
      review,
      isRated,
      createdAt,
      updatedAt
    });
  }

  await Booking.insertMany(bookingDocs, { ordered: false });

  const appStatusCounts = distribute(config.applications, [45, 32, 23]);
  const appStatuses = [
    ...Array(appStatusCounts[0]).fill("pending"),
    ...Array(appStatusCounts[1]).fill("approved"),
    ...Array(appStatusCounts[2]).fill("rejected")
  ];

  const appDocs = [];
  for (let i = 0; i < appStatuses.length; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const createdAt = randomDateBetween(startDate, now);
    const status = appStatuses[i];
    appDocs.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${runTag}.app${i}@pawpaw.demo`,
      phone: makePhone(600000 + i),
      city: pick(CITIES),
      skills: Math.random() < 0.6 ? ["walking"] : ["walking", "grooming"],
      experienceYears: randInt(1, 9),
      experienceDetails: pick([
        "Handled neighborhood dog-walking requests for 2+ years.",
        "Worked with anxious dogs and high-energy breeds.",
        "Experienced in grooming and coat maintenance.",
        "Comfortable with multi-dog households."
      ]),
      availability: pickManyDistinct(AVAILABILITY_WINDOWS, randInt(1, 3)),
      idProofType: pick(["aadhar", "driving_license", "pan"]),
      idProofNumber: `${randInt(1000, 9999)}-${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
      referenceName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      referencePhone: makePhone(800000 + i),
      status,
      decisionInfo: status === "pending" ? undefined : {
        decidedBy: activeCaregivers.length ? pick(activeCaregivers)._id : insertedCaregivers[0]?._id,
        decidedAt: clampDate(new Date(createdAt.getTime() + randInt(1, 12) * 24 * 60 * 60 * 1000), createdAt, now),
        rejectionReason: status === "rejected" ? pick([
          "Incomplete documents",
          "Insufficient availability",
          "Failed verification checks"
        ]) : ""
      },
      createdAt,
      updatedAt: createdAt
    });
  }

  await CaregiverApplication.insertMany(appDocs, { ordered: false });

  const blogDocs = [];
  for (let i = 0; i < config.blogs; i += 1) {
    const category = pick(BLOG_CATEGORIES);
    const createdAt = randomDateBetween(startDate, now);
    blogDocs.push({
      title: `Dog Care ${category} Guide ${runTag}-${i + 1}`,
      slug: `dog-care-${category}-${runTag}-${i + 1}`,
      content: "Practical tips for dog parents, focused on routines, behavior, safety, and healthier daily care habits.",
      image: `https://picsum.photos/seed/${runTag}${i}/1200/700`,
      category,
      createdAt,
      updatedAt: createdAt
    });
  }
  await Blog.insertMany(blogDocs, { ordered: false });

  console.log("Seed completed successfully.");
  console.log({
    runTag,
    inserted: {
      users: insertedOwners.length + insertedCaregivers.length,
      owners: insertedOwners.length,
      caregivers: insertedCaregivers.length,
      pets: insertedPets.length,
      bookings: bookingDocs.length,
      caregiverApplications: appDocs.length,
      blogs: blogDocs.length
    },
    defaultLoginPassword: "PawPaw@123"
  });

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error("Failed to seed realistic demo data:", err);
  await mongoose.disconnect();
  process.exit(1);
});
