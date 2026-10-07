require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const { engine } = require("express-handlebars");

const bookSchema = require("./models/Book");

const app = express();


// =====================================================
// 1. CẤU HÌNH HANDLEBARS
// =====================================================

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views");


// =====================================================
// 2. MIDDLEWARE
// =====================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// =====================================================
// 3. THÔNG TIN SINH VIÊN
// =====================================================

const PORT = process.env.PORT || 3000;

const STUDENT_NAME = "Đặng Công Bằng";
const STUDENT_ID = "23IT019";

// 3 số cuối MSSV
const PREFIX = "019";

// Số cuối MSSV = 9
// VAT = 9 + 4 = 13%
const VAT = 13;


// =====================================================
// 4. CẤU HÌNH KẾT NỐI MONGODB
// =====================================================

const connectionOptions = {
  maxPoolSize: 2,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000
};


// =====================================================
// 5. KẾT NỐI DATABASE BẰNG 2 TÀI KHOẢN
// =====================================================

// Tài khoản chỉ đọc
const readConnection = mongoose.createConnection(
  process.env.READ_URI,
  connectionOptions
);

// Tài khoản chỉ ghi
const writeConnection = mongoose.createConnection(
  process.env.WRITE_URI,
  connectionOptions
);


// =====================================================
// 6. MODEL READ / WRITE
// =====================================================

// Model sử dụng tài khoản READ
const ReadBook = readConnection.model(
  "Book",
  bookSchema,
  "books"
);

// Model sử dụng tài khoản WRITE
const WriteBook = writeConnection.model(
  "Book",
  bookSchema,
  "books"
);


// =====================================================
// 7. KIỂM TRA TRẠNG THÁI DATABASE
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
// 8. SESSION LƯU TRÊN MONGODB ATLAS
// =====================================================

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


// =====================================================
// 9. TRANG CHỦ - ĐỌC DANH SÁCH SÁCH
// =====================================================

app.get("/", async (req, res) => {
  try {

    // Tạo dữ liệu session để chứng minh
    // session được lưu trên MongoDB Atlas
    req.session.lastAccess = new Date();

    // Đọc dữ liệu bằng tài khoản READ
    const books = await ReadBook
      .find({})
      .lean();

    // Render giao diện Handlebars
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


// =====================================================
// 10. THÊM SÁCH
// =====================================================

app.post("/books", async (req, res) => {
  try {

    const {
      productCode,
      title,
      author,
      price
    } = req.body;


    // -------------------------------------------------
    // Kiểm tra dữ liệu nhập
    // -------------------------------------------------

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


    // -------------------------------------------------
    // Kiểm tra mã sản phẩm
    // MSSV: 23IT019
    // Mã phải bắt đầu bằng 019
    // -------------------------------------------------

    if (!productCode.startsWith(PREFIX)) {

      return res.status(400).send(
        `Mã sản phẩm phải bắt đầu bằng ${PREFIX}`
      );
    }


    // -------------------------------------------------
    // Chuyển giá từ String sang Number
    // -------------------------------------------------

    const originalPrice = Number(price);


    // -------------------------------------------------
    // Kiểm tra giá
    // -------------------------------------------------

    if (
      Number.isNaN(originalPrice) ||
      originalPrice < 0
    ) {

      return res.status(400).send(
        "Giá sản phẩm không hợp lệ"
      );
    }


    // -------------------------------------------------
    // Tính giá sau VAT
    // VAT = 13%
    // -------------------------------------------------

    const priceAfterVAT =
      originalPrice * (1 + VAT / 100);


    // -------------------------------------------------
    // Ghi dữ liệu bằng tài khoản WRITE
    // -------------------------------------------------

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


    // Quay lại trang chủ
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


// =====================================================
// 11. KHỞI ĐỘNG SERVER
// =====================================================

async function startServer() {

  try {

    console.log(
      "Connecting to READ and WRITE databases..."
    );


    // -------------------------------------------------
    // Kết nối READ trước
    // -------------------------------------------------

    await readConnection.asPromise();

    console.log(
      "READ database is ready"
    );


    // -------------------------------------------------
    // Sau khi READ thành công mới kết nối WRITE
    // -------------------------------------------------

    await writeConnection.asPromise();

    console.log(
      "WRITE database is ready"
    );


    console.log(
      "READ and WRITE databases are ready"
    );


    // -------------------------------------------------
    // Khởi động Web Server
    // -------------------------------------------------

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


// =====================================================
// 12. CHẠY SERVER
// =====================================================

startServer();