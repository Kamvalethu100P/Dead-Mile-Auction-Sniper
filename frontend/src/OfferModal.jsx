import React, { useState } from 'react';

const OfferModal = ({ match, onClose }) => {
    const [activeTab, setActiveTab] = useState('whatsapp');

    if (!match) return null;

    const truckType = match.truck_type || 'truck';
    const capacity = match.load_size || match.truck_capacity || 0;
    const route = `${match.truck_location} → ${match.truck_return}`;
    const price = Math.round(match.price * 0.9); // Suggest a starting price slightly lower than match if appropriate

    const templates = {
        whatsapp: `Available ${capacity}T ${truckType} return capacity from ${route}. Immediate dispatch. Accepting loads from R${price.toLocaleString()}.`,
        email: `Subject: Available Return Capacity: ${route}\n\nHi Broker,\n\nWe have a ${truckType} with ${capacity}T available capacity returning from ${match.truck_location} to ${match.truck_return}.\n\nExpected Rate: R${price.toLocaleString()}\nAvailability: Immediate\n\nPlease let us know if you have any matching loads.\n\nBest regards,\nFleet Dispatch`,
        quotation: `OFFICIAL FREIGHT QUOTATION\n--------------------------\nRoute: ${route}\nVehicle: ${truckType} (${capacity}T)\nRate: R${price.toLocaleString()}\nTerms: Valid for 24 hours\nDispatch: Immediate`
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const openWhatsApp = () => {
        const text = encodeURIComponent(templates.whatsapp);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const openEmail = () => {
        const subject = encodeURIComponent(`Available Return Capacity: ${route}`);
        const body = encodeURIComponent(templates.email.split('\n\n').slice(1).join('\n\n'));
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    return (
        <div className="modal-overlay">
            <div className="modal offer-modal">
                <div className="modal-header">
                    <h3>Generate Instant Offer</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <div className="match-summary-mini">
                    <strong>Match: {match.truck_plate}</strong> | {match.score}% Score
                </div>

                <div className="tab-buttons">
                    <button 
                        className={activeTab === 'whatsapp' ? 'active' : ''} 
                        onClick={() => setActiveTab('whatsapp')}
                    >
                        WhatsApp
                    </button>
                    <button 
                        className={activeTab === 'email' ? 'active' : ''} 
                        onClick={() => setActiveTab('email')}
                    >
                        Email
                    </button>
                    <button 
                        className={activeTab === 'quotation' ? 'active' : ''} 
                        onClick={() => setActiveTab('quotation')}
                    >
                        Formal Quote
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'quotation' ? (
                        <div className="quotation-preview">
                            <div className="quote-brand">Dead Mile Auction Sniper</div>
                            <div className="quote-title">OFFICIAL FREIGHT QUOTATION</div>
                            <hr />
                            <div className="quote-row"><strong>Route:</strong> {route}</div>
                            <div className="quote-row"><strong>Vehicle:</strong> {truckType} ({capacity}T)</div>
                            <div className="quote-row"><strong>Expected Rate:</strong> R{price.toLocaleString()}</div>
                            <div className="quote-row"><strong>Validity:</strong> 24 Hours</div>
                            <div className="quote-row"><strong>Dispatch:</strong> Immediate</div>
                            <hr />
                            <small>Generated via Dead Mile Instant Offer System</small>
                        </div>
                    ) : (
                        <pre className="offer-preview">
                            {templates[activeTab]}
                        </pre>
                    )}
                </div>

                <div className="modal-actions">
                    {activeTab === 'whatsapp' && (
                        <button className="whatsapp-btn" onClick={openWhatsApp}>
                            Send via WhatsApp
                        </button>
                    )}
                    {activeTab === 'email' && (
                        <button className="email-btn" onClick={openEmail}>
                            Open in Email Client
                        </button>
                    )}
                    <button onClick={() => copyToClipboard(templates[activeTab])}>
                        Copy to Clipboard
                    </button>
                    <button className="cancel-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default OfferModal;
