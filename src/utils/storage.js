const fs = require('fs/promises');
const path = require('path');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const LESSONS_PATH = path.join(__dirname, '..', 'data', 'lessons.json');

async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, '[]', 'utf-8');
      return [];
    }
    throw err;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function readUsers() {
  return readJSON(USERS_PATH);
}

async function writeUsers(users) {
  return writeJSON(USERS_PATH, users);
}

async function readLessons() {
  return readJSON(LESSONS_PATH);
}

module.exports = { readUsers, writeUsers, readLessons };
