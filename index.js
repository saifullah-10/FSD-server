const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const PORT = process.env.PORT || 3000;
dotenv.config();

// middleware
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:5173", // Allow only this origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Allow credentials
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kpsyb7k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const database = client.db("mfs-database");
const users = database.collection("users");
// const hashPin = async (pin) => {
//   const saltRounds = 10;
//   try {
//     const hashedPin = await bcrypt.hash(pin, saltRounds);
//     console.log(hashedPin);
//   } catch (e) {
//     throw new Error("Error hashing PIN");
//   }
// };
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    app.get("/users", async (req, res) => {
      const user = await users.find().toArray();
      res.send(user);
    });
    // create User
    app.post("/user-registration", async (req, res) => {
      const data = req.body;
      const { pin, name, email, phone, role, amount, status } = data;

      if (!pin || !name || !email || !phone) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (pin.length < 5) {
        return res
          .status(400)
          .json({ message: "Pin must be at least 5 characters long" });
      }
      if (phone.length < 11) {
        return res
          .status(400)
          .json({ message: "Phone number must be at least 11 digits long" });
      }

      try {
        const hashed = await bcrypt.hash(pin, 10);

        const response = await users.insertOne({
          name,
          amount,
          status,
          email,
          phone,
          pin: hashed,
          role,
        });
        const getUser = await users.findOne({ email: email });
        return res.status(200).send(getUser);
      } catch (e) {
        return res.status(400).json({
          message: "An error occurred while connecting to the database",
          error: e.message,
        });
      }
    });
    // login User
    app.post("/user-login", async (req, res) => {
      const { email, phone, pin } = req.body;
      if (!pin || !email || !phone) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (pin.length < 5) {
        return res
          .status(400)
          .json({ message: "Pin must be at least 5 characters long" });
      }
      // if (phone.length < 11) {
      //   return res
      //     .status(400)
      //     .json({ message: "Phone number must be at least 11 digits long" });
      // }
      try {
        const user = await users.findOne({ email, phone });

        const hashPin = user?.pin;
        const isMatch = await bcrypt.compare(pin, hashPin);
        console.log(isMatch);
        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        if (!isMatch) {
          return res.status(401).json({ message: "Input Doesn't Match" });
        }
        return res.status(200).json(user);
      } catch (e) {
        return res.status(400).json({
          message: "An error occurred while connecting to the database",
          error: e.message,
        });
      }
    });
    // get user
    app.get("/user-info", async (req, res) => {
      const { id } = req.query;

      try {
        const user = await users.findOne({
          _id: new ObjectId(id),
        });

        return res.status(200).send(user);
      } catch (err) {
        return res.status(400).json({
          message: "An error occurred while connecting to the database",
        });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
