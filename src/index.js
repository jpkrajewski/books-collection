import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = process.env.EXPRESS_PORT;
const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"


async function logger(req, res, next) {
  console.log(`${req.method} | ${JSON.stringify(req.body)}`);
  next();
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(logger);

const db = new pg.Client({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.PG_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.PG_DATABASE,
});

db.connect()
  .then(() => console.log('Connected to the database!'))
  .catch(err => console.error('Database connection error:', err));


function BookData(id, title, authors, isbn, cover, publishedDate, pageCount, description, userDescription, rating, updatedAt) {
  this.id = id;
  this.title = title;
  this.authors = authors;
  this.isbn = isbn;
  this.cover = cover;
  this.publishedDate = publishedDate;
  this.pageCount = pageCount;
  this.description = description;
  this.userDescription = userDescription;
  this.rating = rating;
  this.updatedAt = updatedAt;
  console.log(this);
};

async function getAllBooksFromDb() {
  const result = db.query("SELECT * FROM books ORDER BY updated_at DESC");
  return (await result).rows;
}

async function getBookData(isbn) {
  try {
    const result = await axios.get(GOOGLE_BOOKS_API, {
      params: { q: `isbn:${isbn}` }
    });
    return result.data;
  } catch (error) {
    console.error('Error fetching book data:', error.response ? error.response.data : error.message);
    throw error;
  }
}

function praseBookData(bookData, book) {
  return new BookData(
    book.id,
    bookData.volumeInfo.title,
    bookData.volumeInfo.authors,
    book.isbn,
    bookData.volumeInfo.imageLinks?.thumbnail, // Handle undefined cases (optional chaining)
    bookData.volumeInfo.publishedDate,
    bookData.volumeInfo.pageCount,
    bookData.volumeInfo.description.slice(0, 200) + "...",
    book.description,
    book.rating,
    book.updated_at
  )
}

async function getParsedBooks() {
  let parsedBooks = [];
  let dbBooks = await getAllBooksFromDb();
  for (const book of dbBooks) {
    let bookData = (await getBookData(book.isbn)).items[0];
    parsedBooks.push(praseBookData(bookData, book));
  }

  return parsedBooks;
}

let allBooks = await getParsedBooks();

app.get("/", async (req, res) => {
  res.render("index.ejs", {
    books: allBooks,
  });
});

app.get("/add-book", (req, res) => {
  res.render("add-book.ejs");
});

app.post("/add-book", async (req, res) => {
  const { isbn, title, description, rating } = req.body;
  await db.query(
    "INSERT INTO books (isbn, title, description, rating) VALUES ($1, $2, $3, $4)",
    [isbn, title, description, rating]
  );
  allBooks = await getParsedBooks();
  res.redirect("/");
});

app.get("/books/:id", async (req, res) => {
  const id = req.params.id;
  const book = await db.query("SELECT * FROM books WHERE id = $1", [id]);
  let parsedBook = praseBookData((await getBookData(book.rows[0].isbn)).items[0], book.rows[0]);
  res.render("book.ejs", {
    book: parsedBook,
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
