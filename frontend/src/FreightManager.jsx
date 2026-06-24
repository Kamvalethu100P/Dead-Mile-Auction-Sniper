import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

const FreightManager = () => {
    const [loads, setLoads] = useState([]);
    const [manualLoad, setManualLoad] = useState({
        pickup: '',
        dropoff: '',
        cargo_type: 'general',
        load_size: '',
        price: '',
        urgency: 'medium'
    });
    const [brokerNotes, setBrokerNotes] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchLoads();
    }, []);

    const fetchLoads = async () => {
        try {
            const response = await axios.get('/api/loads');
            setLoads(response.data);
        } catch (error) {
            console.error('Error fetching loads:', error);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/loads', manualLoad);
            setMessage('Freight load added successfully');
            setManualLoad({
                pickup: '',
                dropoff: '',
                cargo_type: 'general',
                load_size: '',
                price: '',
                urgency: 'medium'
            });
            fetchLoads();
        } catch (error) {
            setMessage('Error adding load: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/loads/${id}`);
            fetchLoads();
        } catch (error) {
            console.error('Error deleting load:', error);
        }
    };

    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    try {
                        await axios.post('/api/loads/bulk', results.data);
                        setMessage(`${results.data.length} loads added from CSV`);
                        fetchLoads();
                    } catch (error) {
                        setMessage('Error uploading CSV: ' + error.message);
                    }
                }
            });
        }
    };

    const downloadTemplate = () => {
        const template = "pickup,dropoff,cargo_type,load_size,price,urgency\nJohannesburg,Durban,electronics,12,8500,high\nPretoria,Cape Town,furniture,22,15000,medium";
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'freight_template.csv';
        a.click();
    };

    const parseBrokerNotes = async () => {
        // Simple heuristic parser for broker notes
        // Example: "LOAD: Pretoria -> Durban | TYPE: Electronics | SIZE: 12T | PRICE: R8500 | URGENCY: High"
        const lines = brokerNotes.split('\n');
        const parsedLoads = [];
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            // Heuristic matches
            const fromToMatch = line.match(/(?:FROM\s+)?(.*?)\s*(?:->|TO)\s*(.*?)(?:\||$)/i);
            const typeMatch = line.match(/TYPE:\s*(.*?)(?:\||$)/i);
            const sizeMatch = line.match(/SIZE:\s*(\d+(?:\.\d+)?)(?:\s*T)?(?:\||$)/i);
            const priceMatch = line.match(/PRICE:\s*(?:R)?\s*(\d+)(?:\||$)/i);
            const urgencyMatch = line.match(/URGENCY:\s*(low|medium|high)/i);

            if (fromToMatch) {
                parsedLoads.push({
                    pickup: fromToMatch[1].trim(),
                    dropoff: fromToMatch[2].trim(),
                    cargo_type: typeMatch ? typeMatch[1].trim().toLowerCase() : 'general',
                    load_size: sizeMatch ? parseFloat(sizeMatch[1]) : 10,
                    price: priceMatch ? parseInt(priceMatch[1]) : 0,
                    urgency: urgencyMatch ? urgencyMatch[1].toLowerCase() : 'medium'
                });
            }
        });

        if (parsedLoads.length > 0) {
            try {
                await axios.post('/api/loads/bulk', parsedLoads);
                setMessage(`${parsedLoads.length} loads parsed and added`);
                setBrokerNotes('');
                fetchLoads();
            } catch (error) {
                setMessage('Error saving parsed loads: ' + error.message);
            }
        } else {
            setMessage('Could not parse any loads from the notes. Try format: Pretoria -> Durban | TYPE: General | SIZE: 10 | PRICE: 5000');
        }
    };

    return (
        <div className="freight-manager">
            <h2>Freight Load Input</h2>
            
            {message && <div className="message">{message}</div>}

            <div className="input-sections">
                <section>
                    <h3>Manual Entry</h3>
                    <form onSubmit={handleManualSubmit}>
                        <div className="form-group">
                            <label>Pickup Location</label>
                            <input 
                                value={manualLoad.pickup} 
                                onChange={e => setManualLoad({...manualLoad, pickup: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Drop-off Location</label>
                            <input 
                                value={manualLoad.dropoff} 
                                onChange={e => setManualLoad({...manualLoad, dropoff: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Cargo Type</label>
                            <input 
                                value={manualLoad.cargo_type} 
                                onChange={e => setManualLoad({...manualLoad, cargo_type: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Load Size (tons)</label>
                            <input 
                                type="number" 
                                value={manualLoad.load_size} 
                                onChange={e => setManualLoad({...manualLoad, load_size: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Offered Price (R)</label>
                            <input 
                                type="number" 
                                value={manualLoad.price} 
                                onChange={e => setManualLoad({...manualLoad, price: e.target.value})} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Urgency</label>
                            <select 
                                value={manualLoad.urgency} 
                                onChange={e => setManualLoad({...manualLoad, urgency: e.target.value})}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <button type="submit">Add Load</button>
                    </form>
                </section>

                <section>
                    <h3>Bulk Import</h3>
                    <div className="import-actions">
                        <div>
                            <h4>CSV Upload</h4>
                            <button onClick={downloadTemplate}>Download Template</button>
                            <input type="file" accept=".csv" onChange={handleCSVUpload} />
                        </div>
                        <hr />
                        <div>
                            <h4>Smart Paste (Broker Notes)</h4>
                            <textarea 
                                rows="5" 
                                placeholder="Example: Pretoria -> Durban | TYPE: Electronics | SIZE: 12 | PRICE: 8500 | URGENCY: High"
                                value={brokerNotes}
                                onChange={e => setBrokerNotes(e.target.value)}
                            ></textarea>
                            <button onClick={parseBrokerNotes}>Parse & Import</button>
                        </div>
                    </div>
                </section>
            </div>

            <section className="current-loads">
                <h3>Available Freight Loads</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Pickup</th>
                            <th>Drop-off</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Price</th>
                            <th>Urgency</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loads.map(load => (
                            <tr key={load.id}>
                                <td>{load.pickup}</td>
                                <td>{load.dropoff}</td>
                                <td>{load.cargo_type}</td>
                                <td>{load.load_size}T</td>
                                <td>R{load.price}</td>
                                <td>
                                    <span className={`urgency-badge ${load.urgency}`}>
                                        {load.urgency}
                                    </span>
                                </td>
                                <td>
                                    <button className="delete-btn" onClick={() => handleDelete(load.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                        {loads.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{textAlign: 'center'}}>No loads found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default FreightManager;
