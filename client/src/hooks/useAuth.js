import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// const API_URL = 'http://localhost:3001';
// const API_URL = import.meta.env.VITE_API_URL
const API_URL = '/.netlify/functions';

export default function useAuth(code, setLoading) {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  // const [expiresIn, setExpiresIn] = useState(localStorage.getItem('expiresIn') || null);
  const [expiresIn, setExpiresIn] = useState(parseInt(localStorage.getItem('expiresIn'), 10) || null);
  const [expirationTime, setExpirationTime] = useState(() => Date.now() + (expiresIn ? expiresIn * 1000 : 0)); // setting expiration time
  const loginRef = useRef(false);

  useEffect(() => {
    // Only attempt login when code is present (initial login)
    console.log('Initial login code: ', code);
    if (code && !accessToken && !loginRef.current) {
      console.log('Attempting login with code...');
      loginRef.current = true;
      const login = async () => {
        console.log('sending Login Request to server');

        try {
          setLoading(true);
          console.log('Sending Login Request to server with code:', code);
          const response = await axios.post(`${API_URL}/login`, { code });
          console.log('Login response:', response.data);
          const { accessToken, refreshToken, expiresIn } = response.data;
          console.log('Access token:', accessToken);
          console.log('Refresh token:', refreshToken);
          console.log('Expiration:', expiresIn);

          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
          setExpiresIn(expiresIn);

          // Store tokens in localStorage
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('expiresIn', expiresIn);

          const storedExpiresIn = localStorage.getItem('expiresIn');  // Retrieving
          console.log('Stored expiresIn:', storedExpiresIn);

          window.history.replaceState({}, null, '/');  // Remove the code from the URL
        } catch (error) {
          console.error('Error during login:', error);
        } finally {
          setLoading(false);
        }
      };
      login();
    }
  }, [code, accessToken, setLoading]);

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

        // Update localStorage
        localStorage.setItem('accessToken', accessToken);
        // localStorage.setItem('expiresIn', expiresIn);
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
