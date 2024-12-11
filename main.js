const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

// Middleware to enable CORS
const corsOptions = {
  origin: process.env.ORIGIN, // Replace with your frontend's URL
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
};

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('views'));

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP configuration issue:', error);
    process.exit(1);
  } else {
    console.log('SMTP server is ready to accept messages:', success);
  }
});

app.get('/', (req, res) => {
  res.send("Hello, this is the backend endpoint nothing to see here.");
});

app.post('/submit', async (req, res) => {
  const { name, email, message, recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ success: false, message: 'reCAPTCHA token is missing' });
  }

  try {
    const recaptchaResponse = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        },
      }
    );

    if (!recaptchaResponse.data.success) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed' });
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.SMTP_TO, // Use the SMTP_TO environment variable
      subject: `New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
