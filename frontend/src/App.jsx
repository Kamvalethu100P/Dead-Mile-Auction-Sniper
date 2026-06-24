import { useState, useEffect } from 'react'
import axios from 'axios'
import FleetManager from './FleetManager'
import AuctionMode from './AuctionMode'
import './App.css'

function App() {
  const [health, setHealth] = useState('Checking...')
  const [activeTab, setActiveTab] = useState('fleet')

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setHealth(res.data.message))
      .catch(err => setHealth('Error connecting to backend'))
  }, [])

  return (
    <div className="App">
      <header>
        <h1>Dead Mile Auction Sniper</h1>
        <div className="status-bar">
          Backend: <strong className={health.includes('Error') ? 'error' : 'healthy'}>{health}</strong>
        </div>
      </header>
      
      <nav className="main-nav">
        <button 
          className={activeTab === 'fleet' ? 'active' : ''} 
          onClick={() => setActiveTab('fleet')}
        >
          Fleet Capacity
        </button>
        <button 
          className={activeTab === 'auction' ? 'active' : ''} 
          onClick={() => setActiveTab('auction')}
        >
          Live Auction
        </button>
      </nav>

      <main>
        {activeTab === 'fleet' ? <FleetManager /> : <AuctionMode />}
      </main>

      <footer>
        <p>&copy; 2026 Dead Mile Auction Sniper. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
