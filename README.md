# 📚 BookNook – Backend API

BookNook Server is the backend REST API for the BookNook online book library application. It provides APIs for managing books and borrowing/returning books using MongoDB.

## 🌐 Live API

[BookNook Server](https://booknook-server-gfkb.onrender.com)

## ✨ Features

- Retrieve all books.
- Search books by title or other supported fields.
- Filter books by category.
- Retrieve individual book details.
- Add new books.
- Update existing books.
- Delete books.
- Borrow books with availability validation.
- Prevent duplicate borrowing by the same user.
- Track borrowed books.
- Return borrowed books and update available copies.
- MongoDB database integration.

## 🛠️ Technologies Used

- Node.js
- Express.js
- MongoDB
- MongoDB Node.js Driver
- CORS
- dotenv

## 📂 Project Structure

```text
booknook-server/
├── server.js
├── package.json
├── package-lock.json
└── .gitignore
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tamanna141101/BookNook-Server.git
```

### 2. Navigate to the Project

```bash
cd BookNook-Server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=booknook
```

Add your MongoDB connection string. Keep your credentials private and never upload the `.env` file.

### 5. Run the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will run at:

```text
http://localhost:5000
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check server status |
| GET | `/books` | Get all books |
| GET | `/books/:id` | Get a single book |
| POST | `/books` | Add a new book |
| PATCH | `/books/:id` | Update a book |
| DELETE | `/books/:id` | Delete a book |
| POST | `/borrows` | Borrow a book |
| GET | `/borrows` | Get borrowed books |
| DELETE | `/borrows/:id` | Return a borrowed book |

## 🔗 Frontend Repository

[BookNook Client](https://github.com/tamanna141101/BookNook-Client)

## 👩‍💻 Developer

**Tamanna Islam**

- GitHub: [tamanna141101](https://github.com/tamanna141101)
- LinkedIn: [Tamanna Islam](https://www.linkedin.com/in/tamannaislam14/)

---

⭐ Thank you for checking out BookNook Server!
