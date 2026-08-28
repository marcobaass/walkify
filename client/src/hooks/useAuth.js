import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// const API_URL = 'http://localhost:3001';
// const API_URL = import.meta.env.VITE_API_URL
const API_URL = '/.netlify/functions';

const getStoredAccessToken = () =>
  localStorage.getItem('accessToken') || localStorage.getItem('spotify_access_token');

export default function useAuth(code, setLoading) {
  const [accessToken, setAccessToken] = useState(getStoredAccessToken);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  const [expiresIn, setExpiresIn] = useState(parseInt(localStorage.getItem('expiresIn'), 10) || null);
  const [expirationTime, setExpirationTime] = useState(() => Date.now() + (expiresIn ? expiresIn * 1000 : 0));
  const loginRef = useRef(false);

  const persistTokens = (nextAccessToken, nextRefreshToken, nextExpiresIn) => {
    localStorage.setItem('accessToken', nextAccessToken);
    localStorage.setItem('spotify_access_token', nextAccessToken);
    localStorage.setItem('refreshToken', nextRefreshToken);
    localStorage.setItem('expiresIn', nextExpiresIn.toString());
  };

  useEffect(() => {
    console.log('Initial login code: ', code);

    if (!code) {
      return;
    }

    if (loginRef.current) {
      return;
    }

    loginRef.current = true;

    const login = async () => {
      try {
        setLoading(true);
        console.log('Sending Login Request to server with code:', code);
        const response = await axios.post(`${API_URL}/login`, { code });
        console.log('Login response:', response.data);
        const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: newExpiresIn } = response.data;

        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        setExpiresIn(newExpiresIn);
        setExpirationTime(Date.now() + newExpiresIn * 1000);
        persistTokens(newAccessToken, newRefreshToken, newExpiresIn);

        window.history.replaceState({}, null, '/');
      } catch (error) {
        console.error('Error during login:', error);
        loginRef.current = false;
        window.history.replaceState({}, null, '/');
      } finally {
        setLoading(false);
      }
    };

    login();
  }, [code, setLoading]);

  // Refresh token logic (this runs independently of the code logic)
  useEffect(() => {
    console.log('Initial values - refreshToken:', refreshToken, 'expiresIn:', expiresIn);

    if (!refreshToken || !expiresIn) {
      console.log('Missing refreshToken or expiresIn, cannot refresh');
      return;
    }

    console.log('Setting up refresh with expiresIn:', expiresIn);

    const refreshAccessToken = async () => {
      try {
        console.log('Refreshing access token in useAuth...');
        console.log('Refresh Token: ', refreshToken);
        console.log(`${API_URL}/refresh`, { refreshToken });
        const response = await axios.post(`${API_URL}/refresh`, { refreshToken });
        const { accessToken, expiresIn } = response.data;
        console.log('New access token:', accessToken);
        console.log('New expiration:', expiresIn);

        setAccessToken(accessToken);
        setExpiresIn(expiresIn);

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('expiresIn', expiresIn.toString());

        // Update expiration time
        setExpirationTime(Date.now() + expiresIn * 1000);

        console.log('Access token refreshed');
      } catch (error) {
        console.error('Error refreshing token:', error);
        // window.location = '/';  // Redirect to login if refresh fails
      }
    };

    // Calculate the expiration time (in milliseconds)
    // const expirationTime = Date.now() + expiresIn * 1000;  // Calculate when the token expires

    // Set up an interval to check token expiration every 60 seconds
    const interval = setInterval(() => {
      const timeRemaining = expirationTime - Date.now(); // Calculate remaining time

      console.log('Time remaining until token expiration:', timeRemaining);

      if (timeRemaining <= 60000) {  // If less than 60 seconds before expiration, refresh token
        refreshAccessToken();
      }
    }, 60000);  // Check every minute

    return () => clearInterval(interval);  // Cleanup on component unmount
  }, [refreshToken, expiresIn, expirationTime]);

  return { accessToken, loginRef };
}
