const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const { setupProfile } = require("../controllers/caregiverController");

const upload = require("../middleware/upload")

router.put(
  "/setup-profile",
  protect,
  upload.single("profilePhoto"),
  setupProfile
)
module.exports = router;