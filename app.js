require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const bookSchema = require("./models/Book");

const app = express();

const PORT = process.env.PORT || 3000;


// =====================================================
// DATABASE CONNECTION OPTIONS
// =====================================================

const connectionOptions = {
  maxPoolSize: 2,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000
};


// =====================================================
// DATABASE CONNECTIONS
// =====================================================

// Tài khoản chỉ dùng để đọc dữ liệu
const readConnection = mongoose.createConnection(
  process.env.READ_URI,
  connectionOptions
);

// Tài khoản chỉ dùng để ghi dữ liệu
const writeConnection = mongoose.createConnection(
  process.env.WRITE_URI,
  connectionOptions
);


// =====================================================
// MODELS
// =====================================================

const ReadBook = readConnection.model(
  "Book",
  bookSchema,
  "books"
);

const WriteBook = writeConnection.model(
  "Book",
  bookSchema,
  "books"
);


// =====================================================
// CHECK CONNECTION
// =====================================================

readConnection.on("connected", () => {
  console.log("READ Database connected");
});

readConnection.on("error", (error) => {
  console.error(
    "READ Database error:",
    error.message
  );
});

writeConnection.on("connected", () => {
  console.log("WRITE Database connected");
});

writeConnection.on("error", (error) => {
  console.error(
    "WRITE Database error:",
    error.message
  );
});


// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", async (req, res) => {
  try {

    const books = await ReadBook
      .find({})
      .lean();

    res.json(books);

  } catch (error) {

    res.status(500).send(
      "READ error: " + error.message
    );
  }
});


// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {

    console.log(
      "Connecting to READ and WRITE databases..."
    );

    await Promise.all([
      readConnection.asPromise(),
      writeConnection.asPromise()
    ]);

    console.log(
      "READ and WRITE databases are ready"
    );

    app.listen(PORT, () => {
      console.log(
        `Server running at http://localhost:${PORT}`
      );
    });

  } catch (error) {

    console.error(
      "Cannot start server:",
      error.message
    );

    process.exit(1);
  }
}

startServer();