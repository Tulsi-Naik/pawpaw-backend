const Blog = require("../models/Blog");

// GET ALL BLOGS
exports.getBlogs = async (req, res) => {
  try {
    const { category } = req.query;

    let query = {};
    if (category) query.category = category;

    const blogs = await Blog.find(query).sort({ createdAt: -1 });

    res.json(blogs);
  } catch {
    res.status(500).json({ message: "Error fetching blogs" });
  }
};

// GET SINGLE BLOG
exports.getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.json(blog);
  } catch {
    res.status(500).json({ message: "Error fetching blog" });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const { title, content, category, image } = req.body;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");

    const blog = await Blog.create({
      title,
      content,
      category,
      image,
      slug
    });

    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ message: "Error creating blog" });
  }
};
exports.getAllBlogsAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 })
    res.json(blogs)
  } catch {
    res.status(500).json({ message: "Error fetching blogs" })
  }
}

exports.deleteBlog = async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id)
    res.json({ message: "Blog deleted" })
  } catch {
    res.status(500).json({ message: "Error deleting blog" })
  }
}
exports.updateBlog = async (req, res) => {
  try {
    const { title, content, category, image } = req.body

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-")

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content, category, image, slug },
{ returnDocument: "after" }
    )

    res.json(blog)
  } catch {
    res.status(500).json({ message: "Error updating blog" })
  }
}