import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AuctionMode = () => {
    const [trucks, setTrucks] = useState([]);
    const [selectedTruck, setSelectedTruck] = useState(null);
    const [bids, setBids] = useState([]);
    const [suggestion, setSuggestion] = useState(null);
    const [bidForm, setBidForm] = useState({ broker_name: '', bid_amount: '' });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchAuctionTrucks();
    }, []);

    const fetchAuctionTrucks = async () => {
        try {
            const response = await axios.get('/api/auction/trucks');
            setTrucks(response.data);
        } catch (error) {
            console.error('Error fetching auction trucks:', error);
        }
    };

    const handleSelectTruck = async (truck) => {
        setSelectedTruck(truck);
        fetchBids(truck.id);
        fetchSuggestion(truck.id);
    };

    const fetchBids = async (truckId) => {
        try {
            const response = await axios.get(`/api/auction/bids/${truckId}`);
            setBids(response.data);
        } catch (error) {
            console.error('Error fetching bids:', error);
        }
    };

    const fetchSuggestion = async (truckId) => {
        try {
            const response = await axios.get(`/api/auction/suggest-price/${truckId}`);
            setSuggestion(response.data);
        } catch (error) {
            console.error('Error fetching suggestion:', error);
        }
    };

    const handleBidSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/auction/bid', {
                truck_id: selectedTruck.id,
                ...bidForm
            });
            setMessage('Bid submitted successfully!');
            setBidForm({ broker_name: '', bid_amount: '' });
            fetchBids(selectedTruck.id);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error submitting bid: ' + error.message);
        }
    };

    const handleAcceptBid = async (bidId) => {
        try {
            await axios.post('/api/auction/bid/accept', { bid_id: bidId });
            setMessage('Bid accepted! Truck has been assigned.');
            setSelectedTruck(null);
            fetchAuctionTrucks();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error accepting bid: ' + error.message);
        }
    };

    return (
        <div className="auction-mode">
            <h2>Live Auction Marketplace</h2>
            <p>Brokers can bid on available empty return capacity.</p>
            
            {message && <div className="message">{message}</div>}

            <div className="input-sections">
                <section>
                    <h3>Available Capacity Slots</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Plate</th>
                                <th>Route</th>
                                <th>Capacity</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trucks.length === 0 ? (
                                <tr><td colSpan="5">No empty trucks available for auction.</td></tr>
                            ) : trucks.map(truck => (
                                <tr key={truck.id} className={selectedTruck?.id === truck.id ? 'selected-row' : ''}>
                                    <td><strong>{truck.plate}</strong></td>
                                    <td>{truck.location} → {truck.return_destination}</td>
                                    <td>{truck.capacity}T</td>
                                    <td><span className={`status-badge ${truck.status}`}>{truck.status}</span></td>
                                    <td>
                                        <button onClick={() => handleSelectTruck(truck)}>View Bids</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {selectedTruck ? (
                    <section>
                        <h3>Auction: {selectedTruck.plate}</h3>
                        <div className="route-info" style={{ marginBottom: '1.5rem' }}>
                            <p><strong>Route:</strong> {selectedTruck.location} to {selectedTruck.return_destination}</p>
                            <p><strong>Type:</strong> {selectedTruck.type} | <strong>Capacity:</strong> {selectedTruck.capacity} Tons</p>
                        </div>
                        
                        {suggestion && (
                            <div className="suggestion" style={{ 
                                padding: '1rem', 
                                background: '#fff3cd', 
                                borderLeft: '4px solid #f39c12', 
                                borderRadius: '4px', 
                                marginBottom: '1.5rem' 
                            }}>
                                💡 <strong>System Suggestion:</strong> Recommended price range for this route and capacity is 
                                <span style={{ color: '#d35400', fontWeight: 'bold', marginLeft: '5px' }}>
                                    {suggestion.currency}{suggestion.recommended_min.toLocaleString()} – {suggestion.currency}{suggestion.recommended_max.toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="bid-form-container" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <h4>Place New Bid</h4>
                            <form onSubmit={handleBidSubmit}>
                                <div className="form-group">
                                    <label>Broker Name</label>
                                    <input 
                                        placeholder="Company or Agent Name" 
                                        value={bidForm.broker_name}
                                        onChange={e => setBidForm({...bidForm, broker_name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Bid Amount ({suggestion?.currency || 'R'})</label>
                                    <input 
                                        placeholder="0.00" 
                                        type="number"
                                        value={bidForm.bid_amount}
                                        onChange={e => setBidForm({...bidForm, bid_amount: e.target.value})}
                                        required
                                    />
                                </div>
                                <button type="submit" style={{ width: '100%', marginTop: '10px' }}>Submit Bid</button>
                            </form>
                        </div>

                        <div className="bids-list">
                            <h4>Current Bids</h4>
                            {bids.length === 0 ? <p className="text-muted">No bids have been placed for this slot yet.</p> : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Broker</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bids.map(bid => (
                                            <tr key={bid.id}>
                                                <td>{bid.broker_name}</td>
                                                <td><strong>R{parseFloat(bid.bid_amount).toLocaleString()}</strong></td>
                                                <td>
                                                    <span className={`urgency-badge ${bid.status === 'accepted' ? 'low' : bid.status === 'rejected' ? 'high' : 'medium'}`}>
                                                        {bid.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {bid.status === 'pending' && (
                                                        <button className="accept-btn" onClick={() => handleAcceptBid(bid.id)}>Accept</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                ) : (
                    <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7f8c8d' }}>
                        <p>Select a truck from the list to view or place bids.</p>
                    </section>
                )}
            </div>
        </div>
    );
};

export default AuctionMode;
