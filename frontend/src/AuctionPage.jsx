import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AuctionPage = () => {
    const [listings, setListings] = useState([]);
    const [selectedListing, setSelectedListing] = useState(null);
    const [showBidModal, setShowBidModal] = useState(false);
    const [bidForm, setBidForm] = useState({ broker_name: '', amount: '', contact_info: '' });
    const [listingBids, setListingBids] = useState({});
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchListings();
    }, []);

    const fetchListings = async () => {
        try {
            const response = await axios.get('/api/auction/listings');
            setListings(response.data);
            // Fetch bids for each listing
            response.data.forEach(listing => fetchBidsForListing(listing.id));
        } catch (error) {
            console.error('Error fetching listings:', error);
        }
    };

    const fetchBidsForListing = async (listingId) => {
        try {
            const response = await axios.get(`/api/auction/listings/${listingId}/bids`);
            setListingBids(prev => ({ ...prev, [listingId]: response.data }));
        } catch (error) {
            console.error(`Error fetching bids for ${listingId}:`, error);
        }
    };

    const handleOpenBidModal = (listing) => {
        setSelectedListing(listing);
        setShowBidModal(true);
    };

    const handleBidSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/auction/bids', {
                listing_id: selectedListing.id,
                ...bidForm
            });
            setMessage('Bid placed successfully!');
            setShowBidModal(false);
            setBidForm({ broker_name: '', amount: '', contact_info: '' });
            fetchBidsForListing(selectedListing.id);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error placing bid: ' + error.message);
        }
    };

    return (
        <div className="auction-page">
            <header className="page-header">
                <h2>Live Auction Mode</h2>
                <p>Bid on unused fleet capacity in real-time.</p>
            </header>

            {message && <div className="message">{message}</div>}

            <div className="listings-grid">
                {listings.length === 0 ? (
                    <p className="no-listings">No active auction listings at the moment.</p>
                ) : (
                    listings.map(listing => {
                        const bids = listingBids[listing.id] || [];
                        const bestBid = bids.length > 0 ? bids[0].amount : null;
                        const inRange = bestBid >= listing.suggested_min_price && bestBid <= listing.suggested_max_price;

                        return (
                            <div key={listing.id} className="auction-card">
                                <div className="card-header">
                                    <span className="route">{listing.route_from} ➔ {listing.route_to}</span>
                                    <span className="capacity">{listing.available_capacity}T</span>
                                </div>
                                <div className="card-body">
                                    <div className="truck-info">
                                        <strong>Truck:</strong> {listing.plate} ({listing.type})
                                    </div>
                                    <div className="price-range">
                                        <strong>Suggested Range:</strong> R{listing.suggested_min_price.toLocaleString()} - R{listing.suggested_max_price.toLocaleString()}
                                    </div>
                                    <div className="best-bid">
                                        <strong>Current Best Bid:</strong> {bestBid ? (
                                            <span className={inRange ? 'bid-in-range' : 'bid-out-range'}>
                                                R{bestBid.toLocaleString()}
                                            </span>
                                        ) : 'No bids yet'}
                                    </div>
                                </div>
                                <div className="card-footer">
                                    <button onClick={() => handleOpenBidModal(listing)}>Place Bid</button>
                                </div>
                                
                                {bids.length > 0 && (
                                    <div className="recent-bids">
                                        <h4>Recent Bids</h4>
                                        <ul>
                                            {bids.slice(0, 3).map(bid => (
                                                <li key={bid.id}>{bid.broker_name}: R{bid.amount.toLocaleString()}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {showBidModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Place Bid for {selectedListing.route_from} ➔ {selectedListing.route_to}</h3>
                        <form onSubmit={handleBidSubmit}>
                            <div className="form-group">
                                <label>Broker Name</label>
                                <input 
                                    value={bidForm.broker_name}
                                    onChange={e => setBidForm({...bidForm, broker_name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Bid Amount (R)</label>
                                <input 
                                    type="number"
                                    value={bidForm.amount}
                                    onChange={e => setBidForm({...bidForm, amount: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Contact Info</label>
                                <input 
                                    placeholder="Phone or Email"
                                    value={bidForm.contact_info}
                                    onChange={e => setBidForm({...bidForm, contact_info: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit">Submit Bid</button>
                                <button type="button" className="cancel-btn" onClick={() => setShowBidModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuctionPage;
