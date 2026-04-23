const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const petRoutes = require("./routes/petRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const userRoutes = require("./routes/userRoutes");
const applicationRoutes = require("./routes/applicationRoutes")
const caregiverRoutes = require("./routes/caregiverRoutes");
const locationRoutes = require("./routes/locationRoutes")
const adminRoutes = require("./routes/adminRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adoptionRoutes = require("./routes/adoptionRoutes");
const blogRoutes = require("./routes/blogRoutes");
require("./utils/reminderJob")
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
 app.use("/api/caregivers", caregiverRoutes);
 app.use("/api/location", locationRoutes)
 app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/adoption", adoptionRoutes);
app.use("/api/blogs", blogRoutes);
 app.get("/", (req, res) => {
  res.send("PawPaw backend running 🐾");
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // later we can restrict to your frontend URL
    methods: ["GET", "POST"]
  }
});

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // join booking room
  socket.on("join-booking", (bookingId) => {
    socket.join(bookingId);
    console.log(`Socket ${socket.id} joined booking ${bookingId}`);
  });

  // receive location from caregiver
  socket.on("send-location", ({ bookingId, lat, lng }) => {
    socket.to(bookingId).emit("receive-location", {
      lat,
      lng
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// IMPORTANT FOR RENDER
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});