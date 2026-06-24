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
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

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

    const parseDispatchLog = async () => {
        // Simple regex parser for common dispatch log formats
        // Example: "TRUCK GP1234 - FLATBED - 22T - FROM Pretoria TO Durban - STATUS Available"
        const lines = dispatchLog.split('\n');
        const parsedTrucks = [];
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            // Very basic heuristic parser
            const plateMatch = line.match(/([A-Z0-9]{4,10})/);
            const typeMatch = line.match(/(flatbed|refrigerated|box|tipper)/i);
            const capacityMatch = line.match(/(\d+)\s*T/i);
            const fromToMatch = line.match(/FROM (.*?) TO (.*?)( -|$)/i);
            const statusMatch = line.match(/STATUS (available|busy|maintenance)/i);

            if (plateMatch) {
                parsedTrucks.push({
                    plate: plateMatch[1],
                    type: typeMatch ? typeMatch[1].toLowerCase() : 'box',
                    capacity: capacityMatch ? capacityMatch[1] : 20,
                    location: fromToMatch ? fromToMatch[1] : 'Unknown',
                    return_destination: fromToMatch ? fromToMatch[2] : 'Unknown',
                    status: statusMatch ? statusMatch[1].toLowerCase() : 'available'
                });
            }
        });

        if (parsedTrucks.length > 0) {
            try {
                await axios.post('/api/fleet/bulk', parsedTrucks);
                setMessage(`${parsedTrucks.length} trucks parsed and added`);
                setDispatchLog('');
                fetchTrucks();
            } catch (error) {
                setMessage('Error saving parsed trucks: ' + error.message);
            }
        } else {
            setMessage('Could not parse any trucks from the log');
        }
    };

    return (
        <div className="fleet-manager">
            <h2>Fleet Capacity Input</h2>
            
            {message && <div className="message">{message}</div>}

            <section>
                <h3>Manual Entry</h3>
                <form onSubmit={handleManualSubmit}>
                    <div className="form-group">
                        <label>Plate</label>
                        <input 
                            placeholder="Plate" 
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
                        <label>Capacity (tons)</label>
                        <input 
                            placeholder="Capacity" 
                            type="number" 
                            value={manualTruck.capacity} 
                            onChange={e => setManualTruck({...manualTruck, capacity: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Current Location</label>
                        <input 
                            placeholder="Location" 
                            value={manualTruck.location} 
                            onChange={e => setManualTruck({...manualTruck, location: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Return Destination</label>
                        <input 
                            placeholder="Return" 
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
                    <button type="submit">Add Truck</button>
                </form>
            </section>

            <div className="input-sections">
                <section>
                    <h3>CSV Upload</h3>
                    <button onClick={downloadTemplate}>Download Template</button>
                    <input type="file" accept=".csv" onChange={handleCSVUpload} />
                </section>

                <section>
                    <h3>Copy-Paste Dispatch Log Parser</h3>
                    <textarea 
                        rows="5" 
                        placeholder="Paste log here... e.g. TRUCK ABC123 - FLATBED - 22T - FROM Pretoria TO Durban - STATUS Available"
                        value={dispatchLog}
                        onChange={e => setDispatchLog(e.target.value)}
                    ></textarea>
                    <button onClick={parseDispatchLog}>Parse & Import</button>
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
                                <td>{truck.plate}</td>
                                <td>{truck.type}</td>
                                <td>{truck.capacity}T</td>
                                <td>{truck.location}</td>
                                <td>{truck.return_destination}</td>
                                <td>{truck.status}</td>
                                <td>
                                    <button onClick={() => handleDelete(truck.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default FleetManager;
