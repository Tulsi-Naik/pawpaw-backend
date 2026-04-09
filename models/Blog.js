const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },

  slug: { type: String, required: true, unique: true },

  content: { type: String, required: true },

  image: { type: String },

  category: {
    type: String,
    enum: ["training", "grooming", "health", "food", "adoption"],
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Blog", blogSchema);