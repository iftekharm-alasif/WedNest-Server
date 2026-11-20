import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import multer from "multer";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

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


// Upload Images to ImgBB

app.post("/upload-images", upload.array("images", 5), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Please select images",
      });
    }

    if (!process.env.IMGBB_API_KEY) {
      throw new Error("ImgBB API key is missing");
    }

    const imageUrls = await Promise.all(
      files.map(async (file) => {
        const formData = new URLSearchParams();

        formData.append("image", file.buffer.toString("base64"));

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();

        console.log("ImgBB Response:", result);

        if (!response.ok || !result.success) {
          throw new Error(
            result.error?.message || "Image upload failed"
          );
        }

        return result.data.url;
      })
    );

    res.send({
      success: true,
      images: imageUrls,
      message: "Images uploaded successfully",
    });
  } catch (error) {
    console.log("Image Upload Error:", error.message);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});


// Add Service
app.post("/services", async (req, res) => {
  try {
    console.log("Received Data:", req.body);

    const result = await service.insertOne({
      ...req.body,
      price: Number(req.body.price),
      status: "pending",
      createdAt: new Date(),
    });

    res.send({
      success: true,
      message: "Service added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log("Service Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add service",
    });
  }
});

// Get All Services
app.get("/services", async (req, res) => {
  const result = await service.find({}).toArray();
  res.send(result);
});

// Delete Service
app.delete("/services/:id", async (req, res) => {
  const { id } = req.params;

  const result = await service.deleteOne({
    _id: new ObjectId(id),
  });

  res.send({
    success: result.deletedCount > 0,
    message: "Service deleted successfully",
  });
});

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
