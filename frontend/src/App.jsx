import { useState, useEffect } from 'react'
import axios from 'axios'
import FleetManager from './FleetManager'
import FreightManager from './FreightManager'
import './App.css'

function App() {
  const [health, setHealth] = useState('Checking...')
  const [activeTab, setActiveTab] = useState('fleet')

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setHealth(res.data.status === 'ok' ? 'Healthy' : 'Warning'))
      .catch(err => setHealth('Error connecting to backend'))
  }, [])

  return (
    <div className="App">
      <header>
        <h1>Dead Mile Auction Sniper</h1>
        <div className="status-bar">
          Backend Status: <strong className={health.toLowerCase()}>{health}</strong>
        </div>
      </header>

      <nav className="main-nav">
        <button 
          className={activeTab === 'fleet' ? 'active' : ''} 
          onClick={() => setActiveTab('fleet')}
        >
          Fleet Management
        </button>
        <button 
          className={activeTab === 'freight' ? 'active' : ''} 
          onClick={() => setActiveTab('freight')}
        >
          Freight Loads
        </button>
      </nav>
      
      <main>
        {activeTab === 'fleet' ? <FleetManager /> : <FreightManager />}
      </main>

      <footer>
        <p>&copy; 2026 Dead Mile Auction Sniper. Recovering lost revenue, one mile at a time.</p>
      </footer>
    </div>
  )
}

export default App
