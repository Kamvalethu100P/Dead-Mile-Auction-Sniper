import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/matches/revenue-leakage');
      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please ensure the backend is running.');
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Loading Enterprise Analytics...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!data) return null;

  const COLORS = ['#27ae60', '#f39c12', '#e74c3c', '#3498db'];

  const fleetData = [
    { name: 'Available', value: data.fleet_summary.available },
    { name: 'Busy', value: data.fleet_summary.busy },
    { name: 'Maintenance', value: data.fleet_summary.maintenance },
  ];

  const formatCurrency = (val) => `R${val.toLocaleString()}`;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Revenue Leakage Dashboard</h2>
        <button onClick={fetchDashboardData} className="refresh-btn">Refresh Data</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <label>Total Empty Distance</label>
          <div className="value">{data.empty_km_analysis.total_empty_km.toLocaleString()} km</div>
          <div className="sub-value">Current fleet return legs</div>
        </div>
        <div className="kpi-card danger">
          <label>Estimated Lost Revenue</label>
          <div className="value">{formatCurrency(data.revenue_analysis.lost_revenue)}</div>
          <div className="sub-value">Based on R14.00 avg rate/km</div>
        </div>
        <div className="kpi-card success">
          <label>Captured Revenue</label>
          <div className="value">{formatCurrency(data.revenue_analysis.captured_revenue)}</div>
          <div className="sub-value">From potential matches</div>
        </div>
        <div className="kpi-card highlight">
          <label>Recovery Rate</label>
          <div className="value">{data.empty_km_analysis.recovery_rate}%</div>
          <div className="sub-value">Matched empty kilometres</div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Revenue Capture vs Leakage */}
        <section className="chart-section">
          <h3>Revenue Analysis (Potential vs Captured)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={[
                  {
                    name: 'Revenue',
                    Captured: data.revenue_analysis.captured_revenue,
                    Lost: data.revenue_analysis.lost_revenue
                  }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `R${value/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Captured" fill="#27ae60" />
                <Bar dataKey="Lost" fill="#e74c3c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Fleet Status */}
        <section className="chart-section">
          <h3>Fleet Utilization</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={fleetData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fleetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Worst Performing Routes */}
        <section className="chart-section full-width">
          <h3>Top Revenue Leakage Routes (Return Lanes)</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={data.worst_routes}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `R${value/1000}k`} />
                <YAxis dataKey="route" type="category" width={150} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="lost_revenue" name="Lost Revenue (Monthly Est.)" fill="#e67e22" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Insights Section */}
      <div className="insights-grid">
        <section className="insight-card-detailed">
          <h3>Actionable Insights</h3>
          <div className="insight-list">
            {data.worst_routes.length > 0 && (
              <div className="insight-item">
                <span className="icon">⚠️</span>
                <p>
                  Your <strong>{data.worst_routes[0].route}</strong> return lanes are losing approximately 
                  <strong> {formatCurrency(data.worst_routes[0].lost_revenue)}</strong> per month. 
                  Targeting loads for these specific depots could increase MRR by 12%.
                </p>
              </div>
            )}
            <div className="insight-item">
              <span className="icon">💡</span>
              <p>
                Fleet average match score is <strong>{data.revenue_analysis.avg_match_score}%</strong>. 
                Improving data hygiene in broker notes can increase match accuracy by up to 15 points.
              </p>
            </div>
            <div className="insight-item">
              <span className="icon">🚚</span>
              <p>
                <strong>{data.empty_km_analysis.avg_empty_km_per_truck} km</strong> avg empty return distance per truck. 
                Dead Mile Auction Sniper has already recovered <strong>{data.empty_km_analysis.recovered_km} km</strong> this period.
              </p>
            </div>
          </div>
        </section>

        <section className="top-opps-section">
          <h3>Top Matching Opportunities</h3>
          <div className="mini-table-container">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Truck</th>
                  <th>Route</th>
                  <th>Match</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {data.top_opportunities.slice(0, 5).map(opp => (
                  <tr key={`${opp.truck_id}-${opp.load_id}`}>
                    <td>{opp.truck_plate}</td>
                    <td>{opp.load_pickup} → {opp.load_dropoff}</td>
                    <td><span className="match-badge">{opp.score}%</span></td>
                    <td className="success-text">{formatCurrency(opp.estimated_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
