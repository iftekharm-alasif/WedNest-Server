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
  `mongodb://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@ac-qmflq3w-shard-00-00.bmqtlfl.mongodb.net:27017,ac-qmflq3w-shard-00-01.bmqtlfl.mongodb.net:27017,ac-qmfl3w-shard-00-02.bmqtlfl.mongodb.net:27017/?ssl=true&replicaSet=atlas-7oshzy-shard-0&authSource=admin`,
);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
  } catch (error) {
    console.log("MongoDB connection failed:", error);
  }
}

const database = client.db("wednestdb");
const users = database.collection("user");
const service = database.collection("services");
const bookings = database.collection("bookings");

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
          },
        );

        const result = await response.json();

        console.log("ImgBB Response:", result);

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || "Image upload failed");
        }

        return result.data.url;
      }),
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

// Upload Image URL to ImgBB
app.post("/upload-image-url", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).send({
        success: false,
        message: "Image URL is required",
      });
    }

    const url = new URL(imageUrl);

    if (url.protocol !== "https:" || url.hostname === "localhost") {
      return res.status(400).send({
        success: false,
        message: "Please provide a valid public HTTPS image URL",
      });
    }

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error("Could not download image from this URL");
    }

    const contentType = imageResponse.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      return res.status(400).send({
        success: false,
        message: "The provided URL is not an image",
      });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    if (imageBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).send({
        success: false,
        message: "Image size must be under 5 MB",
      });
    }

    const formData = new URLSearchParams();
    formData.append("image", imageBuffer.toString("base64"));

    const uploadResponse = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData,
      },
    );

    const result = await uploadResponse.json();

    if (!uploadResponse.ok || !result.success) {
      throw new Error("ImgBB upload failed");
    }

    res.send({
      success: true,
      image: result.data.url,
      message: "Image uploaded to ImgBB successfully",
    });
  } catch (error) {
    console.log("URL Image Upload Error:", error.message);

    res.status(500).send({
      success: false,
      message: error.message || "Image upload failed",
    });
  }
});

// Create Booking
app.post("/bookings", async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      serviceId,
      vendorId,
      customerId,
      eventDate,
      eventLocation,
      message,
    } = req.body;

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !serviceId ||
      !vendorId ||
      !customerId ||
      !eventDate ||
      !eventLocation
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required information",
      });
    }

    const selectedService = await service.findOne({
      _id: new ObjectId(serviceId),
      status: "approved",
      isActive: true,
    });

    if (!selectedService) {
      return res.status(404).send({
        success: false,
        message: "Service is not available",
      });
    }

    const result = await bookings.insertOne({
      customerName,
      customerEmail,
      customerPhone,
      serviceId,
      vendorId,
      customerId,
      eventDate,
      eventLocation,
      message,
      status: "pending",
      createdAt: new Date(),
    });

    res.send({
      success: true,
      message: "Booking request sent successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log("Booking Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create booking",
    });
  }
});

// Get Vendor Bookings
app.get("/vendor-bookings", async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).send({
        success: false,
        message: "Vendor ID is required",
      });
    }

    const result = await bookings
      .find({ vendorId })
      .sort({ createdAt: -1 })
      .toArray();

    const bookingDetails = await Promise.all(
      result.map(async (item) => {
        const serviceDetails = await service.findOne({
          _id: new ObjectId(item.serviceId),
        });

        return {
          ...item,
          serviceName: serviceDetails?.serviceName || "Service Not Found",
          price: serviceDetails?.price || 0,
        };
      }),
    );

    res.send(bookingDetails);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Failed to load bookings",
    });
  }
});


// Update Booking Status
app.patch("/bookings/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking ID",
      });
    }

    if (!["accepted", "rejected", "completed"].includes(status)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking status",
      });
    }

    let allowedStatus;

    if (status === "completed") {
      allowedStatus = "accepted";
    } else {
      allowedStatus = "pending";
    }

    const result = await bookings.updateOne(
      {
        _id: new ObjectId(id),
        status: allowedStatus,
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: `Booking cannot be updated to ${status}`,
      });
    }

    res.send({
      success: true,
      message: `Booking ${status} successfully`,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to update booking",
    });
  }
});


// Get Customer Bookings
app.get("/customer-bookings", async (req, res) => {
  try {
    const { customerId } = req.query;

    if (!customerId) {
      return res.status(400).send({
        success: false,
        message: "Customer ID is required",
      });
    }

    const result = await bookings
      .find({ customerId })
      .sort({ createdAt: -1 })
      .toArray();

    const bookingDetails = await Promise.all(
      result.map(async (item) => {
        const serviceDetails = ObjectId.isValid(item.serviceId)
          ? await service.findOne({
              _id: new ObjectId(item.serviceId),
            })
          : null;

        return {
          ...item,
          serviceName: serviceDetails?.serviceName || "Service Not Available",
          price: serviceDetails?.price || 0,
          serviceImage: serviceDetails?.images?.[0] || "",
          vendorName: serviceDetails?.vendorName || "WedNest Vendor",
        };
      }),
    );

    res.send(bookingDetails);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to load customer bookings",
    });
  }
});

// Cancel Customer Booking
app.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const result = await bookings.updateOne(
      {
        _id: new ObjectId(id),
        customerId,
        status: "pending",
      },
      {
        $set: { status: "cancelled" },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Pending booking not found",
      });
    }

    res.send({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: "Failed to cancel booking",
    });
  }
});

// Get Customer Booking for a Service
app.get("/customer-booking", async (req, res) => {
  try {
    const { serviceId, customerId } = req.query;

    if (!serviceId || !customerId) {
      return res.status(400).send({
        success: false,
        message: "Service ID and Customer ID are required",
      });
    }

    const result = await bookings
      .find({ serviceId, customerId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    res.send(result || null);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Failed to load customer booking",
    });
  }
});



// Add Service


app.post("/services", async (req, res) => {
  try {
    const {
      serviceName,
      category,
      description,
      price,
      location,
      images,
      vendorId,
      vendorName,
      vendorEmail,
    } = req.body;

    if (!vendorId) {
      return res.status(400).send({
        success: false,
        message: "Vendor information is required",
      });
    }

    if (!ObjectId.isValid(vendorId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const vendor = await users.findOne({
      _id: new ObjectId(vendorId),
      role: "vendor",
    });

    if (!vendor) {
      return res.status(404).send({
        success: false,
        message: "Vendor not found",
      });
    }


const currentPlan = vendor.subscriptionPlan || "free";

if (currentPlan !== "premium") {
  const totalServices = await service.countDocuments({
    vendorId: vendorId,
  });

  if (totalServices >= 3) {
    return res.status(403).send({
      success: false,
      message:
        "Free Plan allows maximum 3 services. Upgrade to Premium for unlimited services.",
    });
  }
}


    const newService = {
      serviceName,
      category,
      description,
      price: Number(price),
      location,
      images,
      vendorId,
      vendorName,
      vendorEmail,
      status: "pending",
      isActive: false,
      createdAt: new Date(),
    };

    const result = await service.insertOne(newService);

    res.send({
      success: true,
      message: "Service submitted successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.log("Create Service Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create service",
    });
  }
});



// Get All Services
app.get("/services", async (req, res) => {
  const result = await service.find({}).toArray();
  res.send(result);
});

// Get Single Service
app.get("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid service ID",
      });
    }

    const result = await service.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Service not found",
      });
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to load service",
    });
  }
});


// Update Service
app.put("/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serviceName,
      category,
      description,
      price,
      location,
      images,
      vendorId,
    } = req.body;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(vendorId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid service or vendor ID",
      });
    }

    const existingService = await service.findOne({
      _id: new ObjectId(id),
    });

    if (!existingService) {
      return res.status(404).send({
        success: false,
        message: "Service not found",
      });
    }

    if (existingService.vendorId !== vendorId) {
      return res.status(403).send({
        success: false,
        message: "You cannot edit this service",
      });
    }

    if (
      !serviceName ||
      !category ||
      !description ||
      !location ||
      !Array.isArray(images) ||
      images.length === 0 ||
      images.length > 5 ||
      Number(price) <= 0
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide valid service information and 1-5 images",
      });
    }

    const result = await service.updateOne(
      {
        _id: new ObjectId(id),
        vendorId: vendorId,
      },
      {
        $set: {
          serviceName,
          category,
          description,
          price: Number(price),
          location,
          images,
          updatedAt: new Date(),
        },
      }
    );

    res.send({
      success: true,
      message: "Service updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log("Update Service Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update service",
    });
  }
});

// Get All Approved Services (Active and Inactive)
app.get("/browse-services", async (req, res) => {
  try {
    const result = await service
      .find({ status: "approved" })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to get services",
    });
  }
});

// Vendor Update Service Active Status
app.patch("/services/:id/active", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).send({
        success: false,
        message: "Invalid active status",
      });
    }

    const result = await service.updateOne(
      {
        _id: new ObjectId(id),
        status: "approved",
      },
      {
        $set: { isActive },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(400).send({
        success: false,
        message: "Only approved services can be activated",
      });
    }

    res.send({
      success: true,
      message: "Service active status updated",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update service",
    });
  }
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
app.get("/users", async (req, res) => {
  const cursor = users.find({});
  const result = await cursor.toArray();
  res.send(result);
});

async function startServer() {
  await connectToMongoDB();

  app.listen(port, () => {
    console.log(`WedNest is running on port ${port}`);
  });
}

startServer();
