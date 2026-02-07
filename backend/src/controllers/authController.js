const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const { loginSchema } = require('../utils/validation');

const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e hyrjes janë të pavlefshme.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [value.email]);
    if (!result.rows.length) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(value.password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({ token });
  } catch (error) {
    return next(error);
  }
};

module.exports = { login };
