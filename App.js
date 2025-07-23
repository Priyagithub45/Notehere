const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // ✅ Added for frontend serving
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// ✅ Serve static files from "Frontend" folder
app.use(express.static(path.join(__dirname, '../Frontend')));

// ✅ Optional: Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Connect to MongoDB Atlas
const mongoURI = "mongodb+srv://Priya44:Pmongodb%403@cluster0.t9gg6oh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.error(err));

// Mongoose schema and model
const complimentSchema = new mongoose.Schema({
  text: String,
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  authorEmail: String,
  author: String, // ✅ Add this
  isAnonymous: { type: Boolean, default: false },
  room: String
});

const Compliment = mongoose.model('Compliment', complimentSchema);

// ✅ User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
   tagline: String,
  bio: String,
  notes: { type: Number, default: 0 },
  rooms: { type: Number, default: 0 },
  likes: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);
// Routes

// Get all compliments

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const newUser = new User({ name, email, password });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/update-profile', async (req, res) => {
  const { email, name, tagline, bio } = req.body;

  try {
    const updated = await User.findOneAndUpdate(
      { email },
      { name, tagline, bio },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    res.json({ message: 'Login successful', user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/get-user', async (req, res) => {
  const { email } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      name: user.name,
      email: user.email,
      tagline: user.tagline || '',
      bio: user.bio || '',
      notes: user.notes,
      rooms: user.rooms,
      likes: user.likes
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// app.post('/compliments', async (req, res) => {
//   try {
//     const { text, isAnonymous, room, email } = req.body;

//     const newCompliment = new Compliment({ text, isAnonymous, room, authorEmail: email });
//     await newCompliment.save();

//     if (!isAnonymous && email) {
//       await User.findOneAndUpdate(
//         { email },
//         { $inc: { notes: 1 } }
//       );
//     }

//     res.status(201).json(newCompliment);
//   } catch (err) {
//     res.status(400).json({ error: 'Bad request' });
//   }
// });

// app.post('/compliments', async (req, res) => {
//   try {
//     const { text, author, isAnonymous } = req.body;

//     const newCompliment = new Compliment({
//       text,
//       author,
//       isAnonymous
//     });

//     await newCompliment.save();
//     res.status(201).json(newCompliment);
//   } catch (err) {
//     res.status(400).json({ error: 'Bad request' });
//   }
// });

app.post('/compliments', async (req, res) => {
  const { text, room, isAnonymous, author } = req.body;

  const newNote = new Compliment({
    text,
    room,
    isAnonymous,
    author
  });

  await newNote.save();
  res.status(201).json(newNote);
});

app.get('/compliments', async (req, res) => {
  try {
    const compliments = await Compliment.find().sort({ createdAt: -1 });
    res.json(compliments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/compliments/:id/like', async (req, res) => {
  try {
    const compliment = await Compliment.findById(req.params.id);
    if (!compliment) return res.status(404).json({ error: 'Not found' });

    compliment.likes++;
    await compliment.save();

    if (compliment.authorEmail) {
      await User.findOneAndUpdate(
        { email: compliment.authorEmail },
        { $inc: { likes: 1 } }
      );
    }

    res.json(compliment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/create-room', async (req, res) => {
  const { email, roomName } = req.body;
  try {
    await User.findOneAndUpdate(
      { email },
      { $inc: { rooms: 1 } }
    );
    res.json({ message: 'Room created and count updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));