import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom'
import axios from 'axios'
import FleetManager from './FleetManager'
import FreightManager from './FreightManager'
import Dashboard from './Dashboard'
import AuctionPage from './AuctionPage'
import './App.css'

function App() {
  const [health, setHealth] = useState('Checking...')

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setHealth(res.data.message))
      .catch(err => setHealth('Error connecting to backend'))
  }, [])

  return (
    <Router>
      <div className="App">
        <header>
          <div className="header-left">
            <h1>Dead Mile Auction Sniper</h1>
            <nav className="main-nav">
              <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>Dashboard</NavLink>
              <NavLink to="/fleet" className={({ isActive }) => isActive ? 'active' : ''}>Fleet Management</NavLink>
              <NavLink to="/loads" className={({ isActive }) => isActive ? 'active' : ''}>Freight Loads</NavLink>
              <NavLink to="/auction" className={({ isActive }) => isActive ? 'active' : ''}>Live Auction</NavLink>
            </nav>
          </div>
          <div className="status-bar">
            Backend: <strong className={health.includes('Error') ? 'error' : 'healthy'}>{health}</strong>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fleet" element={<FleetManager />} />
            <Route path="/loads" element={<FreightManager />} />
            <Route path="/auction" element={<AuctionPage />} />
          </Routes>
        </main>

        <footer>
          <p>&copy; 2026 Dead Mile Auction Sniper. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
