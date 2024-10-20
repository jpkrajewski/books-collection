CREATE USER docker;
CREATE DATABASE mydb;
GRANT ALL PRIVILEGES ON DATABASE mydb TO docker;

-- Connect to the database
\c mydb

-- Create the todo table using the ENUM type
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(13),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rating INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

