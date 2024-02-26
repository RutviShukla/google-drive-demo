const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors()); // Enable CORS

const CLIENT_ID = "634361333695-jlirc95lj49ojuf2dtc2j38jqnj697dc.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:5000/oauth2callback";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive'];

let authed = false;

const upload = multer({
  dest: 'uploads/', // Destination to store uploaded files
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!authed) {
    return res
      .status(400)
      .json({ error: 'Authentication required. Please authorize.' });
  }

  try {
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const fileMetadata = {
      name: req.file.originalname,
    };
    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    fs.unlinkSync(req.file.path); // Delete the temporary file

    console.log('File uploaded successfully:', response.data.id);
    res.status(200).json({ message: 'File uploaded successfully', fileId: response.data.id });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/authorize', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    authed = true;
    res.redirect('http://localhost:3000'); // Redirect back to the client
  } catch (error) {
    console.error('Error retrieving access token:', error);
    res.status(500).json({ error: 'Failed to retrieve access token' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
