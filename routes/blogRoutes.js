const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  getBlogs,
  getBlogBySlug,
  createBlog,
  getAllBlogsAdmin,
  deleteBlog,
  updateBlog
} = require("../controllers/blogController");

// public
router.get("/", getBlogs);
router.get("/:slug", getBlogBySlug);
router.post("/", protect, createBlog);
router.get("/admin/all", protect, getAllBlogsAdmin);
router.delete("/:id", protect, deleteBlog);
router.put("/:id", protect, updateBlog);
module.exports = router;