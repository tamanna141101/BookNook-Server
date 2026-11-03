const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "booknook";

const client = new MongoClient(MONGODB_URI);

let booksCollection;
let borrowsCollection;

// ===============================
// MongoDB Connection
// ===============================

async function connectDB() {
  try {
    await client.connect();

    const db = client.db(DB_NAME);

    booksCollection = db.collection("books");
    borrowsCollection = db.collection("borrows");

    console.log("MongoDB Connected Successfully!");

    // Indexes for faster queries
    await booksCollection.createIndex({ createdAt: -1 });
    await booksCollection.createIndex({ userEmail: 1 });
    await borrowsCollection.createIndex({ userEmail: 1 });
    await borrowsCollection.createIndex({ bookId: 1, userEmail: 1 });

    app.listen(PORT, () => {
      console.log(`BookNook Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
}

// ===============================
// Helper Functions
// ===============================

const isValidId = (id) => ObjectId.isValid(id);

const getObjectId = (id) => new ObjectId(id);

// ===============================
// Home Route
// ===============================

app.get("/", (req, res) => {
  res.send("BookNook Server is Running!");
});

// ===============================
// API 1: GET ALL BOOKS
// GET /books
// ===============================

app.get("/books", async (req, res) => {
  try {
    const { category, search, limit } = req.query;

    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
      ];
    }

    let query = booksCollection
      .find(filter)
      .sort({ createdAt: -1 });

    if (limit && Number(limit) > 0) {
      query = query.limit(Number(limit));
    }

    const books = await query.toArray();

    res.status(200).json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch books",
      error: error.message,
    });
  }
});

// ===============================
// API 2: GET SINGLE BOOK
// GET /books/:id
// ===============================

app.get("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book = await booksCollection.findOne({
      _id: getObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
      error: error.message,
    });
  }
});

// ===============================
// API 3: ADD NEW BOOK
// POST /books
// ===============================

app.post("/books", async (req, res) => {
  try {
    const {
      title,
      author,
      category,
      image,
      description,
      userName,
      userEmail,
      totalCopies,
    } = req.body;

    if (
      !title ||
      !author ||
      !category ||
      !image ||
      !description ||
      !userName ||
      !userEmail
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required book information",
      });
    }

    const copies = Number(totalCopies);

    if (!Number.isInteger(copies) || copies < 1) {
      return res.status(400).json({
        success: false,
        message: "Total copies must be at least 1",
      });
    }

    const allowedCategories = [
      "Fiction",
      "Science",
      "History",
      "Kids",
      "Others",
    ];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book category",
      });
    }

    const newBook = {
      title: title.trim(),
      author: author.trim(),
      category,
      image,
      description,
      userName,
      userEmail: userEmail.toLowerCase().trim(),
      totalCopies: copies,
      availableCopies: copies,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await booksCollection.insertOne(newBook);

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      insertedId: result.insertedId,
      book: {
        ...newBook,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add book",
      error: error.message,
    });
  }
});

// ===============================
// API 4: UPDATE BOOK
// PATCH /books/:id
// ===============================

app.patch("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail, ...updates } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "User email is required",
      });
    }

    const book = await booksCollection.findOne({
      _id: getObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.userEmail !== userEmail.toLowerCase().trim()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own books",
      });
    }

    const allowedFields = [
      "title",
      "author",
      "category",
      "image",
      "description",
      "totalCopies",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    if (updateData.totalCopies !== undefined) {
      const newTotal = Number(updateData.totalCopies);

      if (!Number.isInteger(newTotal) || newTotal < 1) {
        return res.status(400).json({
          success: false,
          message: "Total copies must be at least 1",
        });
      }

      const borrowedCopies = book.totalCopies - book.availableCopies;

      if (newTotal < borrowedCopies) {
        return res.status(400).json({
          success: false,
          message: "Total copies cannot be less than borrowed copies",
        });
      }

      updateData.totalCopies = newTotal;
      updateData.availableCopies = newTotal - borrowedCopies;
    }

    if (updateData.category) {
      const allowedCategories = [
        "Fiction",
        "Science",
        "History",
        "Kids",
        "Others",
      ];

      if (!allowedCategories.includes(updateData.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid book category",
        });
      }
    }

    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length === 1) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    await booksCollection.updateOne(
      { _id: getObjectId(id) },
      { $set: updateData }
    );

    const updatedBook = await booksCollection.findOne({
      _id: getObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      book: updatedBook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update book",
      error: error.message,
    });
  }
});

// ===============================
// API 5: DELETE BOOK
// DELETE /books/:id
// ===============================

app.delete("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "User email is required",
      });
    }

    const book = await booksCollection.findOne({
      _id: getObjectId(id),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.userEmail !== userEmail.toLowerCase().trim()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own books",
      });
    }

    const activeBorrows = await borrowsCollection.countDocuments({
      bookId: id,
    });

    if (activeBorrows > 0) {
      return res.status(400).json({
        success: false,
        message: "This book cannot be deleted while it is borrowed",
      });
    }

    await booksCollection.deleteOne({
      _id: getObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete book",
      error: error.message,
    });
  }
});

// ===============================
// API 6: BORROW BOOK
// POST /borrows
// ===============================

app.post("/borrows", async (req, res) => {
  try {
    const { bookId, userEmail, userName, returnDate } = req.body;

    if (!bookId || !userEmail || !userName || !returnDate) {
      return res.status(400).json({
        success: false,
        message: "Book ID, user information and return date are required",
      });
    }

    if (!isValidId(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const email = userEmail.toLowerCase().trim();

    const book = await booksCollection.findOne({
      _id: getObjectId(bookId),
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.availableCopies < 1) {
      return res.status(400).json({
        success: false,
        message: "No copies available for borrowing",
      });
    }

    // Prevent the same user from borrowing the same book twice
    const existingBorrow = await borrowsCollection.findOne({
      bookId,
      userEmail: email,
    });

    if (existingBorrow) {
      return res.status(409).json({
        success: false,
        message: "You have already borrowed this book",
      });
    }

    const borrowDate = new Date();
    const parsedReturnDate = new Date(returnDate);

    if (
      Number.isNaN(parsedReturnDate.getTime()) ||
      parsedReturnDate <= borrowDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Return date must be a valid future date",
      });
    }

    // Atomically reduce available copies
    const stockUpdate = await booksCollection.updateOne(
      {
        _id: getObjectId(bookId),
        availableCopies: { $gt: 0 },
      },
      {
        $inc: { availableCopies: -1 },
      }
    );

    if (stockUpdate.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message: "This book is no longer available",
      });
    }

    const borrowInfo = {
      bookId,
      bookTitle: book.title,
      bookImage: book.image,
      userName,
      userEmail: email,
      borrowDate,
      returnDate: parsedReturnDate,
    };

    const result = await borrowsCollection.insertOne(borrowInfo);

    res.status(201).json({
      success: true,
      message: "Book borrowed successfully",
      borrow: {
        ...borrowInfo,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to borrow book",
      error: error.message,
    });
  }
});

// ===============================
// API 7: GET BORROWED BOOKS
// GET /borrows
// GET /borrows?userEmail=example@gmail.com
// ===============================

app.get("/borrows", async (req, res) => {
  try {
    const { userEmail } = req.query;

    const filter = {};

    if (userEmail) {
      filter.userEmail = userEmail.toLowerCase().trim();
    }

    const borrows = await borrowsCollection
      .find(filter)
      .sort({ borrowDate: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: borrows.length,
      borrows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch borrowed books",
      error: error.message,
    });
  }
});

// ===============================
// API 8: RETURN BOOK
// DELETE /borrows/:id
// ===============================

app.delete("/borrows/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid borrow ID",
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "User email is required",
      });
    }

    const borrow = await borrowsCollection.findOne({
      _id: getObjectId(id),
    });

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: "Borrow record not found",
      });
    }

    if (borrow.userEmail !== userEmail.toLowerCase().trim()) {
      return res.status(403).json({
        success: false,
        message: "You can only return your own borrowed books",
      });
    }

    const stockUpdate = await booksCollection.updateOne(
      {
        _id: getObjectId(borrow.bookId),
      },
      {
        $inc: { availableCopies: 1 },
      }
    );

    if (stockUpdate.matchedCount !== 1) {
      return res.status(404).json({
        success: false,
        message: "Original book record not found",
      });
    }

    await borrowsCollection.deleteOne({
      _id: getObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Book returned successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to return book",
      error: error.message,
    });
  }
});

// ===============================
// 404 Route
// ===============================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ===============================
// Start Server
// ===============================

connectDB();