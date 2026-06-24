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
          Backend Status: <strong>{health}</strong>
        </div>
        <nav className="tabs">
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
      </header>
      
      <main>
        {activeTab === 'fleet' ? <FleetManager /> : <AuctionMode />}
      </main>

      <footer>
        <p>Logistics intelligence matching engine.</p>
      </footer>
    </div>
  )
}

export default App
