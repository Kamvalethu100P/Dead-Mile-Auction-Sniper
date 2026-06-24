import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const FleetManager = () => {
    const [trucks, setTrucks] = useState([]);
    const [manualTruck, setManualTruck] = useState({
        plate: '',
        type: 'flatbed',
        capacity: '',
        location: '',
        return_destination: '',
        status: 'available'
    });
    const [dispatchLog, setDispatchLog] = useState('');
    const [message, setMessage] = useState('');
    const [auctionListing, setAuctionListing] = useState({ truck_id: null, route_from: '', route_to: '', available_capacity: '' });
    const [showListingModal, setShowListingModal] = useState(false);

    useEffect(() => {
        fetchTrucks();
    }, []);

    const fetchTrucks = async () => {
        try {
            const response = await axios.get('/api/fleet');
            setTrucks(response.data);
        } catch (error) {
            console.error('Error fetching trucks:', error);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/fleet', manualTruck);
            setMessage('Truck added successfully');
            setManualTruck({
                plate: '',
                type: 'flatbed',
                capacity: '',
                location: '',
                return_destination: '',
                status: 'available'
            });
            fetchTrucks();
        } catch (error) {
            setMessage('Error adding truck: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/fleet/${id}`);
            fetchTrucks();
        } catch (error) {
            console.error('Error deleting truck:', error);
        }
    };

    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    try {
                        await axios.post('/api/fleet/bulk', results.data);
                        setMessage(`${results.data.length} trucks added from CSV`);
                        fetchTrucks();
                    } catch (error) {
                        setMessage('Error uploading CSV: ' + error.message);
                    }
                }
            });
        }
    };

    const downloadTemplate = () => {
        const template = "plate,type,capacity,location,return_destination,status\nABC-123,flatbed,24,Pretoria,Durban,available\nXYZ-789,refrigerated,18,Cape Town,Johannesburg,available";
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'truck_template.csv';
        a.click();
    };

    const handleOpenListingModal = (truck) => {
        setAuctionListing({
            truck_id: truck.id,
            route_from: truck.location,
            route_to: truck.return_destination,
            available_capacity: truck.capacity
        });
        setShowListingModal(true);
    };

    const handleListingSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/auction/listings', auctionListing);
            setMessage('Auction listing created!');
            setShowListingModal(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error creating listing: ' + error.message);
        }
    };

    return (
        <div className="fleet-manager">
            <h2>Fleet Capacity Management</h2>
            
            {message && <div className="message">{message}</div>}

            <div className="input-sections">
                <section>
                    <h3>Manual Entry</h3>
                    <form onSubmit={handleManualSubmit}>
                        <div className="form-group">
                            <label>Plate</label>
                            <input 
                                placeholder="ABC-123" 
                                value={manualTruck.plate} 
                                onChange={e => setManualTruck({...manualTruck, plate: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Type</label>
                            <select 
                                value={manualTruck.type} 
                                onChange={e => setManualTruck({...manualTruck, type: e.target.value})}
                            >
                                <option value="flatbed">Flatbed</option>
                                <option value="refrigerated">Refrigerated</option>
                                <option value="box">Box</option>
                                <option value="tipper">Tipper</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Capacity (T)</label>
                            <input 
                                placeholder="24" 
                                type="number" 
                                value={manualTruck.capacity} 
                                onChange={e => setManualTruck({...manualTruck, capacity: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Current Location</label>
                            <input 
                                placeholder="City" 
                                value={manualTruck.location} 
                                onChange={e => setManualTruck({...manualTruck, location: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Return Destination</label>
                            <input 
                                placeholder="City" 
                                value={manualTruck.return_destination} 
                                onChange={e => setManualTruck({...manualTruck, return_destination: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select 
                                value={manualTruck.status} 
                                onChange={e => setManualTruck({...manualTruck, status: e.target.value})}
                            >
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                        <button type="submit" style={{ gridColumn: 'span 2' }}>Add Truck to Fleet</button>
                    </form>
                </section>

                <section className="import-actions">
                    <h3>Import Fleet</h3>
                    <div className="csv-upload">
                        <p>Bulk upload via CSV</p>
                        <button onClick={downloadTemplate} style={{ marginBottom: '10px' }}>Template</button>
                        <input type="file" accept=".csv" onChange={handleCSVUpload} />
                    </div>
                    <div className="log-parser">
                        <p>Paste Dispatch Log</p>
                        <textarea 
                            rows="4" 
                            placeholder="TRUCK ABC123 - FLATBED - 22T - FROM Pretoria TO Durban"
                            value={dispatchLog}
                            onChange={e => setDispatchLog(e.target.value)}
                        ></textarea>
                        <button onClick={() => setMessage('Log parsing feature in development')}>Parse & Import</button>
                    </div>
                </section>
            </div>

            <section>
                <h3>Current Fleet</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Plate</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Location</th>
                            <th>Return</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trucks.map(truck => (
                            <tr key={truck.id}>
                                <td><strong>{truck.plate}</strong></td>
                                <td>{truck.type}</td>
                                <td>{truck.capacity}T</td>
                                <td>{truck.location}</td>
                                <td>{truck.return_destination}</td>
                                <td><span className={`status-badge ${truck.status}`}>{truck.status}</span></td>
                                <td className="actions-cell">
                                    <button className="auction-btn" onClick={() => handleOpenListingModal(truck)}>Auction</button>
                                    <button className="delete-btn" onClick={() => handleDelete(truck.id)}>Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {showListingModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Create Auction Listing</h3>
                        <form onSubmit={handleListingSubmit}>
                            <div className="form-group">
                                <label>Route From</label>
                                <input value={auctionListing.route_from} onChange={e => setAuctionListing({...auctionListing, route_from: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Route To</label>
                                <input value={auctionListing.route_to} onChange={e => setAuctionListing({...auctionListing, route_to: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Available Capacity (T)</label>
                                <input type="number" value={auctionListing.available_capacity} onChange={e => setAuctionListing({...auctionListing, available_capacity: e.target.value})} required />
                            </div>
                            <div className="modal-actions">
                                <button type="submit">Create Listing</button>
                                <button type="button" className="cancel-btn" onClick={() => setShowListingModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetManager;
