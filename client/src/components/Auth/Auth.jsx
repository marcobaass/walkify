import React, { useState, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from '../Login/Login';
import App from '../App/App';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import Callback from '../Callback/Callback';

export default function Auth() {
  const code = new URLSearchParams(window.location.search).get('code');
  const [isLoading, setLoading] = useState(!!code);
  const { accessToken, loginRef } = useAuth(code, setLoading);

  useEffect(() => {
    console.log("Auth component: code =", code);
    console.log("Auth component: accessToken =", accessToken);
  }, [code, accessToken]);

  if (isLoading) {
    return (
      <div className="flex flex-1 h-screen justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Handle the redirect logic directly in the same component
  if (!accessToken && code) {
    return (
      <div>Logging you in...</div>  // You can add a spinner or loading message here
    );
  }

  return (
    <Routes>
      <Route path="/callback" element={<Callback />} />
      <Route path="/" element={accessToken ? <App accessToken={accessToken} loginRef={loginRef} /> : <Login />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
