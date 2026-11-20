
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const client = new MongoClient(
  `mongodb://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@ac-qmflq3w-shard-00-00.bmqtlfl.mongodb.net:27017,ac-qmflq3w-shard-00-01.bmqtlfl.mongodb.net:27017,ac-qmfl3w-shard-00-02.bmqtlfl.mongodb.net:27017/?ssl=true&replicaSet=atlas-7oshzy-shard-0&authSource=admin`
);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
  } catch (error) {
    console.log("MongoDB connection failed:", error);
  }
}

const database = client.db("wednestdb")
const users = database.collection("user")
const service = database.collection("services")

app.get("/", (req, res) => {
  res.send("WedNest is running");
});

// Add Service
app.post("/services", async (req, res) => {
  try {
    const serviceData = req.body;

    const result = await service.insertOne({
      ...serviceData,
      price: Number(serviceData.price),
      status: "pending",
      createdAt: new Date(),
    });

    res.send({
      success: true,
      message: "Service added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to add service",
    });
  }
});

// Get Services 
app.get('/services',async(req,res) => {
    const cursor = users.find({})
    const result = await cursor.toArray();
    res.send(result);
})

//users
app.get('/users',async(req,res) => {
    const cursor = users.find({})
    const result = await cursor.toArray();
    res.send(result);
})

async function startServer() {
  await connectToMongoDB();

  app.listen(port, () => {
    console.log(`WedNest is running on port ${port}`);
  });
}

startServer();
