import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OfferModal from './OfferModal';

const Offers = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/matches');
            setMatches(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching matches:', err);
            setError('Failed to load matches. Please ensure the backend is running.');
            setLoading(false);
        }
    };

    const handleGenerateOffer = (match) => {
        setSelectedMatch(match);
        setShowModal(true);
    };

    const formatCurrency = (val) => `R${val.toLocaleString()}`;

    if (loading) return <div className="loading">Loading potential matches...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="offers-page">
            <div className="page-header">
                <h2>Instant Offer Generator</h2>
                <p>Generate professional offers for your highest-priority matches.</p>
                <button onClick={fetchMatches} className="refresh-btn">Refresh Matches</button>
            </div>

            <div className="matches-list">
                {matches.length === 0 ? (
                    <div className="no-matches">
                        No active matches found. Ensure you have available fleet capacity and freight loads.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Score</th>
                                <th>Truck</th>
                                <th>Route (Empty Return)</th>
                                <th>Load Details</th>
                                <th>Potential Revenue</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matches.map((match, index) => (
                                <tr key={`${match.truck_id}-${match.load_id}-${index}`} className={match.tier === 'HIGH_PRIORITY' ? 'high-priority-row' : ''}>
                                    <td>
                                        <span className={`match-score-badge ${match.tier.toLowerCase()}`}>
                                            {match.score}%
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{match.truck_plate}</strong><br />
                                        <small>{match.truck_type} ({match.truck_capacity}T)</small>
                                    </td>
                                    <td>
                                        {match.truck_location} &rarr; {match.truck_return}
                                    </td>
                                    <td>
                                        {match.load_pickup} &rarr; {match.load_dropoff}<br />
                                        <small>{match.cargo_type} | {match.load_size}T</small>
                                    </td>
                                    <td className="revenue-cell">
                                        {formatCurrency(match.estimated_revenue)}
                                    </td>
                                    <td>
                                        <button 
                                            className="action-btn offer-btn" 
                                            onClick={() => handleGenerateOffer(match)}
                                        >
                                            Generate Offer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <OfferModal 
                    match={selectedMatch} 
                    onClose={() => setShowModal(false)} 
                />
            )}
        </div>
    );
};

export default Offers;
