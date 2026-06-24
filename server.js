require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Sirve los archivos estáticos (index.html, script.js, styles.css)
app.use(express.static(path.join(__dirname)));

// ── Conexión a MongoDB ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ── Modelo de usuario ──
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ── Rutas ──

// Registro
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ error: 'Ese correo ya está registrado.' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.json({ ok: true, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Correo o contraseña incorrectos.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Correo o contraseña incorrectos.' });

    res.json({ ok: true, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

// Ruta base
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));