require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const { engine } = require("express-handlebars");

const bookSchema = require("./models/Book");

const app = express();



app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");



app.use(express.urlencoded({ extended: true }));
app.use(express.json());



const PORT = process.env.PORT || 3000;

const STUDENT_NAME = "Đặng Công Bằng";
const STUDENT_ID = "23IT019";


const PREFIX = "019";


const VAT = 13;



const connectionOptions = {
  maxPoolSize: 2,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000
};


const readConnection = mongoose.createConnection(
  process.env.READ_URI,
  connectionOptions
);


const writeConnection = mongoose.createConnection(
  process.env.WRITE_URI,
  connectionOptions
);



// Model dùng tài khoản READ
const ReadBook = readConnection.model(
  "Book",
  bookSchema,
  "books"
);

// Model dùng tài khoản WRITE
const WriteBook = writeConnection.model(
  "Book",
  bookSchema,
  "books"
);



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



app.use(
  session({
    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.SESSION_URI,

      collectionName: "sessions",

      mongoOptions: {
        maxPoolSize: 2,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000
      }
    }),

    cookie: {
      maxAge: 1000 * 60 * 60
    }
  })
);


app.get("/", async (req, res) => {
  try {

    req.session.lastAccess = new Date();

    // Đọc dữ liệu bằng tài khoản READ
    const books = await ReadBook
      .find({})
      .lean();


    res.render("home", {
      books: books,

      studentName: STUDENT_NAME,

      studentId: STUDENT_ID,

      vat: VAT
    });

  } catch (error) {

    console.error(
      "READ ERROR:",
      error.message
    );

    res.status(500).send(
      "Lỗi đọc dữ liệu: " + error.message
    );
  }
});


app.post("/books", async (req, res) => {
  try {

    const {
      productCode,
      title,
      author,
      price
    } = req.body;

------------------------------------------------

    if (
      !productCode ||
      !title ||
      !author ||
      price === undefined
    ) {
      return res.status(400).send(
        "Vui lòng nhập đầy đủ thông tin sách."
      );
    }



    if (!productCode.startsWith(PREFIX)) {

      return res.status(400).send(
        `Mã sản phẩm phải bắt đầu bằng ${PREFIX}`
      );
    }



    if (
      Number.isNaN(originalPrice) ||
      originalPrice < 0
    ) {

      return res.status(400).send(
        "Giá sản phẩm không hợp lệ"
      );
    }


    const priceAfterVAT =
      originalPrice * (1 + VAT / 100);



    await WriteBook.create({

      productCode: productCode,

      title: title,

      author: author,

      price: originalPrice,

      priceAfterVAT:
        Math.round(priceAfterVAT)
    });


    console.log(
      `Book inserted: ${productCode}`
    );



    res.redirect("/");

  } catch (error) {

    console.error(
      "WRITE ERROR:",
      error.message
    );

    res.status(500).send(
      "Lỗi thêm sách: " + error.message
    );
  }
});



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
      "Cannot start server."
    );

    console.error(
      error.message
    );


    process.exit(1);
  }
}



startServer();