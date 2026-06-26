import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PLANS = [
  {
    id: 'Growth',
    name: 'Growth Fleet',
    price: 'R20,000',
    priceNum: 20000,
    gmv: '7%',
    gmvNum: 7,
    maxTrucks: '≤35 trucks',
    features: [
      'Up to 35 trucks',
      '7% GMV fee on matched loads',
      'Basic AI matching engine',
      'Route overlap scoring',
      'Email support',
    ],
    popular: false,
  },
  {
    id: 'Professional',
    name: 'Professional Fleet',
    price: 'R35,000',
    priceNum: 35000,
    gmv: '10%',
    gmvNum: 10,
    maxTrucks: '≤150 trucks',
    features: [
      'Up to 150 trucks',
      '10% GMV fee on matched loads',
      'Advanced AI matching engine',
      'Revenue leakage analytics',
      'Priority support',
      'CSV & smart paste import',
    ],
    popular: true,
  },
  {
    id: 'Enterprise',
    name: 'Enterprise Fleet',
    price: 'R65,000',
    priceNum: 65000,
    gmv: '15%',
    gmvNum: 15,
    maxTrucks: 'Unlimited',
    features: [
      'Unlimited trucks',
      '15% GMV fee on matched loads',
      'Full AI matching engine',
      'Revenue leakage analytics',
      'Dedicated account manager',
      'Custom integrations',
      'API access',
    ],
    popular: false,
  },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customer_name: '',
    company: '',
    email: '',
    phone: '',
  });

  const openForm = (planId) => {
    setFormOpen(planId);
    setForm({ customer_name: '', company: '', email: '', phone: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/invoices/create', {
        ...form,
        plan_tier: formOpen,
      });
      const invoice = response.data;
      navigate(`/invoice/${invoice.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h2>Choose Your Plan</h2>
        <p>Monthly subscription — pay via EFT (bank transfer). No credit card required.</p>
        <p className="pricing-subtitle">All plans include a 14-day free trial. Cancel anytime.</p>
      </div>

      <div className="pricing-cards">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <h3>{plan.name}</h3>
            <div className="price">
              <span className="price-amount">{plan.price}</span>
              <span className="price-period">/month</span>
            </div>
            <div className="gmv-badge">+ {plan.gmv} of GMV</div>
            <p className="truck-limit">{plan.maxTrucks}</p>
            <ul className="features">
              {plan.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            {formOpen === plan.id ? (
              <form onSubmit={handleSubmit} className="signup-form">
                {error && <div className="form-error">{error}</div>}
                <input
                  type="text"
                  placeholder="Contact Person *"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Company Name *"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <div className="form-actions">
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Creating Invoice...' : 'Generate Invoice'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={() => setFormOpen(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="btn-get-started" onClick={() => openForm(plan.id)}>
                Get Started
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <h3>Payment Method</h3>
        <p>All invoices are settled via EFT (Electronic Funds Transfer).</p>
        <p>Banking details will be provided on your invoice.</p>
      </div>
    </div>
  );
};

export default PricingPage;
