import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './utils/themeContext';
import Register from './pages/Register';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import QRCodePage from './pages/QRCode';
import UserSearch from './pages/UserSearch';
import Products from './pages/Products';
import BackupPage from './pages/Backup';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chat/:userId" element={<Chat />} />
          <Route path="/qrcode" element={<QRCodePage />} />
          <Route path="/search" element={<UserSearch />} />
          <Route path="/products" element={<Products />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

