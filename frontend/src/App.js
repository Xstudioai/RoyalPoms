import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LandingPage from './components/LandingPage';
import TryOnApp from './components/TryOnApp';
import CatalogUpload from './components/CatalogUpload';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/tryon" element={<TryOnApp />} />
          <Route path="/admin" element={<CatalogUpload />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
