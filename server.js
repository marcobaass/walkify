require('dotenv').config(); // Add this line at the top of your server.js
const express = require('express');
const axios = require('axios');
const path = require('path');
const querystring = require('querystring');
const app = express();
const port = 3000;

// Use environment variables
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } = process.env;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Redirect to Spotify for login
app.get('/login', (req, res) => {
    const scopes = 'user-top-read user-library-read playlist-modify-private';
    const authUrl = `https://accounts.spotify.com/authorize?` +
        `response_type=code&` +
        `client_id=${SPOTIFY_CLIENT_ID}&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}`;

    res.redirect(authUrl);
});

// Handle callback and get access token
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: SPOTIFY_REDIRECT_URI,
        }), {
            headers: {
                'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = response.data;
        res.redirect(`/profile?access_token=${access_token}`);
    } catch (error) {
        console.error('Error getting access token:', error);
        res.status(500).send('Error getting access token');
    }
});

// Fetch user profile
app.get('/profile', async (req, res) => {
    const accessToken = req.query.access_token;

    try {
        const response = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Send user profile data to client or handle it here
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Error fetching user profile');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
