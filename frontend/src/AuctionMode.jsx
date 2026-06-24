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
            setMessage('Bid submitted!');
            setBidForm({ broker_name: '', bid_amount: '' });
            fetchBids(selectedTruck.id);
        } catch (error) {
            setMessage('Error submitting bid: ' + error.message);
        }
    };

    const handleAcceptBid = async (bidId) => {
        try {
            await axios.post('/api/auction/bid/accept', { bid_id: bidId });
            setMessage('Bid accepted!');
            setSelectedTruck(null);
            fetchAuctionTrucks();
        } catch (error) {
            setMessage('Error accepting bid: ' + error.message);
        }
    };

    return (
        <div className="auction-mode">
            <h2>Live Auction Marketplace</h2>
            {message && <div className="message">{message}</div>}

            <div style={{ display: 'flex', gap: '20px' }}>
                <section style={{ flex: 1 }}>
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
                            {trucks.map(truck => (
                                <tr key={truck.id} style={{ background: selectedTruck?.id === truck.id ? '#eef' : 'transparent' }}>
                                    <td>{truck.plate}</td>
                                    <td>{truck.location} → {truck.return_destination}</td>
                                    <td>{truck.capacity}T</td>
                                    <td>{truck.status}</td>
                                    <td>
                                        <button onClick={() => handleSelectTruck(truck)}>View Bids</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {selectedTruck && (
                    <section style={{ flex: 1 }}>
                        <h3>Auction Details for {selectedTruck.plate}</h3>
                        <p><strong>Route:</strong> {selectedTruck.location} to {selectedTruck.return_destination}</p>
                        <p><strong>Capacity:</strong> {selectedTruck.capacity} Tons</p>
                        
                        {suggestion && (
                            <div className="suggestion" style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', marginBottom: '10px' }}>
                                💡 <strong>Recommended price range:</strong> {suggestion.currency}{suggestion.recommended_min} – {suggestion.currency}{suggestion.recommended_max}
                            </div>
                        )}

                        <div className="bid-form">
                            <h4>Submit a Bid</h4>
                            <form onSubmit={handleBidSubmit}>
                                <input 
                                    placeholder="Broker Name" 
                                    value={bidForm.broker_name}
                                    onChange={e => setBidForm({...bidForm, broker_name: e.target.value})}
                                    required
                                />
                                <input 
                                    placeholder="Bid Amount (R)" 
                                    type="number"
                                    value={bidForm.bid_amount}
                                    onChange={e => setBidForm({...bidForm, bid_amount: e.target.value})}
                                    required
                                />
                                <button type="submit">Place Bid</button>
                            </form>
                        </div>

                        <div className="bids-list" style={{ marginTop: '20px' }}>
                            <h4>Current Bids</h4>
                            {bids.length === 0 ? <p>No bids yet.</p> : (
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
                                                <td>R{bid.bid_amount}</td>
                                                <td>{bid.status}</td>
                                                <td>
                                                    {bid.status === 'pending' && (
                                                        <button onClick={() => handleAcceptBid(bid.id)}>Accept</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default AuctionMode;
