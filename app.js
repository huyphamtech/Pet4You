const express = require("express");
const fs = require("fs");
const multer = require("multer");
const bodyParser = require("body-parser");
const AWS = require("aws-sdk");
const path = require("path");
require("dotenv").config();

const app = express();
const port = 3000;

// AWS config
AWS.config.update({
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const S3_BUCKET = process.env.S3_BUCKET_NAME;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// File upload middleware
const upload = multer({ dest: "uploads/" });

const PETS_FILE = "pets.json";

// Load pets data
const loadPets = () => {
  if (!fs.existsSync(PETS_FILE)) return [];
  const data = fs.readFileSync(PETS_FILE);
  return JSON.parse(data);
};

// Save pets data
const savePet = (pet) => {
  const pets = loadPets();
  pets.push(pet);
  fs.writeFileSync(PETS_FILE, JSON.stringify(pets, null, 2));
};

// Routes
app.get("/", (req, res) => {
  const pets = loadPets();
  res.render("index", { pets });
});

app.get("/upload", (req, res) => {
  res.render("upload");
});

app.post("/upload", upload.single("image"), async (req, res) => {
  const { name, age, breed } = req.body;
  const file = req.file;

  // Upload to S3
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: `${Date.now()}_${file.originalname}`,
    Body: fs.readFileSync(file.path),
    ContentType: file.mimetype,
  };

  try {
    const result = await s3.upload(s3Params).promise();

    const newPet = {
      name,
      age,
      breed,
      imageUrl: result.Location,
    };

    savePet(newPet);
    fs.unlinkSync(file.path); // Clean up temp file
    res.redirect("/");
  } catch (err) {
    console.error("Upload failed:", err);
    res.send("Image upload failed");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
