import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './InvoicePage.css';

const InvoicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/invoices/${id}`);
      setInvoice(response.data);
    } catch (err) {
      setError('Invoice not found. It may have been deleted or the link is invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadView = () => {
    window.open(`/api/invoices/${id}/download`, '_blank');
  };

  if (loading) {
    return (
      <div className="invoice-page">
        <div className="invoice-loading">
          <div className="spinner"></div>
          <p>Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invoice-page">
        <div className="invoice-error">
          <h2>Invoice Not Found</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/pricing')} className="btn-back">
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  const plan = invoice.plan_details || {};
  const createdDate = new Date(invoice.created_at || Date.now());
  const formattedDate = createdDate.toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const dueDate = new Date(createdDate);
  dueDate.setDate(dueDate.getDate() + 30);
  const formattedDue = dueDate.toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="invoice-page">
      <div className="invoice-actions no-print">
        <button onClick={handlePrint} className="btn-print">
          🖨️ Download PDF (Print)
        </button>
        <button onClick={handleDownloadView} className="btn-view">
          📄 Open Print-Ready Version
        </button>
        <button onClick={() => navigate('/pricing')} className="btn-back">
          ← Back to Pricing
        </button>
      </div>

      <div className="invoice-document" id="invoice-doc">
        <div className="invoice-header">
          <div className="invoice-brand">
            <h1>Dead Mile Auction Sniper</h1>
            <p className="brand-subtitle">Logistics Intelligence Platform</p>
          </div>
          <div className="invoice-meta">
            <h2>INVOICE</h2>
            <p className="invoice-number">{invoice.invoice_number}</p>
            <p className="invoice-date">Date: {formattedDate}</p>
            <p className="invoice-due">Due: {formattedDue}</p>
          </div>
        </div>

        <div className="invoice-divider"></div>

        <div className="invoice-body">
          <div className="bill-to">
            <h3>Bill To</h3>
            <p className="customer-name">{invoice.customer_name}</p>
            <p className="customer-company">{invoice.company}</p>
            <p className="customer-email">{invoice.email}</p>
            {invoice.phone && <p className="customer-phone">{invoice.phone}</p>}
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Details</th>
                <th className="amount-col">Amount (ZAR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>{plan.label || invoice.plan_tier}</strong></td>
                <td>
                  Monthly subscription.
                  {plan.max_trucks && ` Up to ${plan.max_trucks} trucks.`}
                  {plan.gmv_percent && ` ${plan.gmv_percent}% GMV fee on matched loads.`}
                </td>
                <td className="amount-col">R {invoice.amount?.toLocaleString('en-ZA')}.00</td>
              </tr>
              <tr>
                <td colSpan="2" className="text-right"><strong>Monthly GMV Fee</strong></td>
                <td className="amount-col">{invoice.gmv_percent || 0}% of GMV</td>
              </tr>
              <tr className="total-row">
                <td colSpan="2" className="text-right">Total Due</td>
                <td className="amount-col total-amount">R {invoice.amount?.toLocaleString('en-ZA')}.00</td>
              </tr>
            </tbody>
          </table>

          <div className="banking-details">
            <h3>EFT Payment Details</h3>
            <div className="banking-grid">
              <div className="bank-row">
                <span className="bank-label">Bank</span>
                <span className="bank-value">Standard Bank</span>
              </div>
              <div className="bank-row">
                <span className="bank-label">Account Number</span>
                <span className="bank-value mono">10243855972</span>
              </div>
              <div className="bank-row">
                <span className="bank-label">Branch Code</span>
                <span className="bank-value mono">051001</span>
              </div>
              <div className="bank-row">
                <span className="bank-label">Account Type</span>
                <span className="bank-value">Business Cheque Account</span>
              </div>
            </div>
          </div>

          <div className="payment-reference">
            <p>Payment Reference: <strong>{invoice.invoice_number} — {invoice.company}</strong></p>
          </div>

          <div className="invoice-footer-text">
            <p>Thank you for choosing Dead Mile Auction Sniper.</p>
            <p>For any queries, contact accounts@deadmile.dev</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
