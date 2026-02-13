'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import HotelSidebar from '@/components/HotelSidebar';
import { useLocale } from '@/context/LocaleContext';

// Types
interface CustomerData {
  name: string | null;
  street: string | null;
  houseNumber: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  tel: string | null;
  company: string | null;
  cin: string | null;
  tin: string | null;
}

interface GiftData {
  name: string | null;
  street: string | null;
  houseNumber: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  tel: string | null;
}

interface Voucher {
  id: number;
  hotel: number;
  code: string;
  number: string;
  lang: string;
  createdAt: string;
  usedAt: string | null;
  canceledAt: string | null;
  paidAt: string | null;
  variableSymbol: number;
  active: boolean;
  price: number;
  purchasePrice: number;
  currency: string;
  validity: string;
  paymentType: string;
  deliveryType: string;
  deliveryPrice: number;
  note: string | null;
  format: string;
  gift: string | null;
  giftMessage: string | null;
  usedIn: string | null;
  reservationNumber: string | null;
  valueTotal: number;
  valueRemaining: number;
  valueUsed: number;
  applicableInBookolo: boolean;
  isPrivateType: boolean;
  isFreeType: boolean;
  customerData: CustomerData;
  giftData: GiftData;
}

type TabType = 'all' | 'active' | 'used' | 'expired' | 'canceled';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';


function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(amount);
}

function getVoucherStatus(voucher: Voucher): { label: string; color: string } {
  if (voucher.canceledAt) {
    return { label: 'Canceled', color: 'bg-red-100 text-red-700' };
  }
  if (voucher.valueRemaining === 0 && voucher.valueUsed > 0) {
    return { label: 'Used', color: 'bg-stone-100 text-stone-700' };
  }
  if (new Date(voucher.validity) < new Date()) {
    return { label: 'Expired', color: 'bg-orange-100 text-orange-700' };
  }
  if (voucher.active && voucher.valueRemaining > 0) {
    if (voucher.valueUsed > 0) {
      return { label: 'Partial', color: 'bg-blue-100 text-blue-700' };
    }
    return { label: 'Active', color: 'bg-green-100 text-green-700' };
  }
  return { label: 'Inactive', color: 'bg-stone-100 text-stone-600' };
}

function isExpired(voucher: Voucher): boolean {
  return new Date(voucher.validity) < new Date();
}

export default function VouchersPage() {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal states
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  // PDF ref
  const pdfRef = useRef<HTMLDivElement>(null);

  // Form state
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    price: 0,
    currency: 'CZK',
    validity: '',
    paymentType: 'payment-online-card',
    deliveryType: 'email',
    deliveryPrice: 0,
    note: '',
    format: 'DL',
    gift: '',
    giftMessage: '',
    customerName: '',
    customerEmail: '',
    customerTel: '',
    customerStreet: '',
    customerHouseNumber: '',
    customerCity: '',
    customerPostalCode: '',
    customerCountry: 'CZ',
    customerCompany: '',
    customerCin: '',
    customerTin: '',
    giftName: '',
    giftEmail: '',
    giftTel: '',
    giftStreet: '',
    giftHouseNumber: '',
    giftCity: '',
    giftPostalCode: '',
    giftCountry: 'CZ',
  });

  // Clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch vouchers
  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      // Try to fetch from API first
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { vouchers { id number code active price currency validity createdAt paidAt usedAt canceledAt valueTotal valueRemaining valueUsed customerData { name email } } }`,
        }),
      });
      const result = await response.json();
      if (!result.errors && result.data?.vouchers) {
        setVouchers(result.data.vouchers);
      } else {
        setError(result.errors?.[0]?.message || 'Failed to fetch vouchers');
      }
    } catch {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Filter vouchers based on tab and search
  const filteredVouchers = vouchers.filter((v) => {
    // Tab filter
    const status = getVoucherStatus(v);
    if (activeTab === 'active' && status.label !== 'Active' && status.label !== 'Partial') return false;
    if (activeTab === 'used' && status.label !== 'Used') return false;
    if (activeTab === 'expired' && status.label !== 'Expired') return false;
    if (activeTab === 'canceled' && status.label !== 'Canceled') return false;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNumber = v.number.toLowerCase().includes(q);
      const matchCode = v.code.toLowerCase().includes(q);
      const matchCustomer = v.customerData.name?.toLowerCase().includes(q);
      const matchEmail = v.customerData.email?.toLowerCase().includes(q);
      if (!matchNumber && !matchCode && !matchCustomer && !matchEmail) return false;
    }

    // Date filter
    if (dateFrom) {
      const created = new Date(v.createdAt);
      if (created < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const created = new Date(v.createdAt);
      if (created > new Date(dateTo + 'T23:59:59')) return false;
    }

    return true;
  });

  // Generate random voucher number
  const generateVoucherNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create voucher
  const handleCreateVoucher = async () => {
    setLoading(true);
    try {
      const newVoucher: Voucher = {
        id: Date.now(),
        hotel: 1130,
        code: voucherForm.code,
        number: generateVoucherNumber(),
        lang: 'cs',
        createdAt: new Date().toISOString(),
        usedAt: null,
        canceledAt: null,
        paidAt: new Date().toISOString(),
        variableSymbol: Math.floor(Math.random() * 90000000) + 10000000,
        active: true,
        price: voucherForm.price,
        purchasePrice: voucherForm.price,
        currency: voucherForm.currency,
        validity: voucherForm.validity,
        paymentType: voucherForm.paymentType,
        deliveryType: voucherForm.deliveryType,
        deliveryPrice: voucherForm.deliveryPrice,
        note: voucherForm.note || null,
        format: voucherForm.format,
        gift: voucherForm.gift || null,
        giftMessage: voucherForm.giftMessage || null,
        usedIn: null,
        reservationNumber: null,
        valueTotal: voucherForm.price,
        valueRemaining: voucherForm.price,
        valueUsed: 0,
        applicableInBookolo: false,
        isPrivateType: false,
        isFreeType: voucherForm.price === 0,
        customerData: {
          name: voucherForm.customerName,
          email: voucherForm.customerEmail,
          tel: voucherForm.customerTel,
          street: voucherForm.customerStreet || null,
          houseNumber: voucherForm.customerHouseNumber || null,
          city: voucherForm.customerCity || null,
          postalCode: voucherForm.customerPostalCode || null,
          country: voucherForm.customerCountry,
          company: voucherForm.customerCompany || null,
          cin: voucherForm.customerCin || null,
          tin: voucherForm.customerTin || null,
        },
        giftData: {
          name: voucherForm.giftName || null,
          email: voucherForm.giftEmail || null,
          tel: voucherForm.giftTel || null,
          street: voucherForm.giftStreet || null,
          houseNumber: voucherForm.giftHouseNumber || null,
          city: voucherForm.giftCity || null,
          postalCode: voucherForm.giftPostalCode || null,
          country: voucherForm.giftCountry || null,
        },
      };

      // Try API call
      try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `mutation($input: CreateVoucherInput!) { createVoucher(input: $input) { voucher { id } } }`,
            variables: { input: newVoucher },
          }),
        });
        const result = await response.json();
        if (result.errors) throw new Error(result.errors[0]?.message);
      } catch {
        // API not available, use local state
      }

      setVouchers([newVoucher, ...vouchers]);
      setSuccessMessage('Voucher created successfully');
      setShowVoucherModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create voucher');
    } finally {
      setLoading(false);
    }
  };

  // Update voucher
  const handleUpdateVoucher = async () => {
    if (!editingVoucher) return;
    setLoading(true);
    try {
      const updatedVoucher: Voucher = {
        ...editingVoucher,
        code: voucherForm.code,
        price: voucherForm.price,
        currency: voucherForm.currency,
        validity: voucherForm.validity,
        paymentType: voucherForm.paymentType,
        deliveryType: voucherForm.deliveryType,
        deliveryPrice: voucherForm.deliveryPrice,
        note: voucherForm.note || null,
        format: voucherForm.format,
        gift: voucherForm.gift || null,
        giftMessage: voucherForm.giftMessage || null,
        customerData: {
          name: voucherForm.customerName,
          email: voucherForm.customerEmail,
          tel: voucherForm.customerTel,
          street: voucherForm.customerStreet || null,
          houseNumber: voucherForm.customerHouseNumber || null,
          city: voucherForm.customerCity || null,
          postalCode: voucherForm.customerPostalCode || null,
          country: voucherForm.customerCountry,
          company: voucherForm.customerCompany || null,
          cin: voucherForm.customerCin || null,
          tin: voucherForm.customerTin || null,
        },
        giftData: {
          name: voucherForm.giftName || null,
          email: voucherForm.giftEmail || null,
          tel: voucherForm.giftTel || null,
          street: voucherForm.giftStreet || null,
          houseNumber: voucherForm.giftHouseNumber || null,
          city: voucherForm.giftCity || null,
          postalCode: voucherForm.giftPostalCode || null,
          country: voucherForm.giftCountry || null,
        },
      };

      setVouchers(vouchers.map((v) => (v.id === editingVoucher.id ? updatedVoucher : v)));
      setSuccessMessage('Voucher updated successfully');
      setShowVoucherModal(false);
      setEditingVoucher(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update voucher');
    } finally {
      setLoading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (voucher: Voucher) => {
    const action = voucher.active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this voucher?`)) return;

    try {
      const updatedVoucher = { ...voucher, active: !voucher.active };
      setVouchers(vouchers.map((v) => (v.id === voucher.id ? updatedVoucher : v)));
      setSuccessMessage(`Voucher ${action}d successfully`);
    } catch {
      setError(`Failed to ${action} voucher`);
    }
  };

  // Cancel voucher
  const handleCancelVoucher = async (voucher: Voucher) => {
    if (!confirm('Are you sure you want to cancel this voucher? This cannot be undone.')) return;

    try {
      const updatedVoucher = {
        ...voucher,
        active: false,
        canceledAt: new Date().toISOString(),
      };
      setVouchers(vouchers.map((v) => (v.id === voucher.id ? updatedVoucher : v)));
      setSuccessMessage('Voucher canceled successfully');
    } catch {
      setError('Failed to cancel voucher');
    }
  };

  // Reset form
  const resetForm = () => {
    setVoucherForm({
      code: '',
      price: 0,
      currency: 'CZK',
      validity: '',
      paymentType: 'payment-online-card',
      deliveryType: 'email',
      deliveryPrice: 0,
      note: '',
      format: 'DL',
      gift: '',
      giftMessage: '',
      customerName: '',
      customerEmail: '',
      customerTel: '',
      customerStreet: '',
      customerHouseNumber: '',
      customerCity: '',
      customerPostalCode: '',
      customerCountry: 'CZ',
      customerCompany: '',
      customerCin: '',
      customerTin: '',
      giftName: '',
      giftEmail: '',
      giftTel: '',
      giftStreet: '',
      giftHouseNumber: '',
      giftCity: '',
      giftPostalCode: '',
      giftCountry: 'CZ',
    });
  };

  // Open edit modal
  const openEditVoucher = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      code: voucher.code,
      price: voucher.price,
      currency: voucher.currency,
      validity: voucher.validity,
      paymentType: voucher.paymentType,
      deliveryType: voucher.deliveryType,
      deliveryPrice: voucher.deliveryPrice,
      note: voucher.note || '',
      format: voucher.format,
      gift: voucher.gift || '',
      giftMessage: voucher.giftMessage || '',
      customerName: voucher.customerData.name || '',
      customerEmail: voucher.customerData.email || '',
      customerTel: voucher.customerData.tel || '',
      customerStreet: voucher.customerData.street || '',
      customerHouseNumber: voucher.customerData.houseNumber || '',
      customerCity: voucher.customerData.city || '',
      customerPostalCode: voucher.customerData.postalCode || '',
      customerCountry: voucher.customerData.country || 'CZ',
      customerCompany: voucher.customerData.company || '',
      customerCin: voucher.customerData.cin || '',
      customerTin: voucher.customerData.tin || '',
      giftName: voucher.giftData.name || '',
      giftEmail: voucher.giftData.email || '',
      giftTel: voucher.giftData.tel || '',
      giftStreet: voucher.giftData.street || '',
      giftHouseNumber: voucher.giftData.houseNumber || '',
      giftCity: voucher.giftData.city || '',
      giftPostalCode: voucher.giftData.postalCode || '',
      giftCountry: voucher.giftData.country || 'CZ',
    });
    setShowVoucherModal(true);
  };

  // View detail
  const openDetailModal = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowDetailModal(true);
  };

  // Generate PDF
  const handleDownloadPdf = async (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowPdfPreview(true);
  };

  // Print PDF
  const printPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !pdfRef.current) return;

    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .voucher-card {
          width: 210mm;
          min-height: 99mm;
          padding: 20mm;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .voucher-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }
        .voucher-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15mm;
          position: relative;
          z-index: 1;
        }
        .hotel-name {
          font-size: 28pt;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .voucher-type {
          font-size: 14pt;
          opacity: 0.9;
          margin-top: 2mm;
        }
        .voucher-number {
          text-align: right;
          font-size: 10pt;
          opacity: 0.8;
        }
        .voucher-code {
          font-size: 14pt;
          font-weight: bold;
          letter-spacing: 2px;
          background: rgba(255,255,255,0.2);
          padding: 2mm 4mm;
          border-radius: 4px;
          margin-top: 2mm;
        }
        .voucher-body {
          position: relative;
          z-index: 1;
        }
        .voucher-value {
          font-size: 48pt;
          font-weight: bold;
          text-align: center;
          margin: 10mm 0;
          text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
        }
        .voucher-validity {
          text-align: center;
          font-size: 12pt;
          opacity: 0.9;
          margin-bottom: 10mm;
        }
        .voucher-footer {
          display: flex;
          justify-content: space-between;
          font-size: 10pt;
          opacity: 0.8;
          border-top: 1px solid rgba(255,255,255,0.3);
          padding-top: 5mm;
          position: relative;
          z-index: 1;
        }
        .gift-message {
          background: rgba(255,255,255,0.15);
          padding: 5mm;
          border-radius: 4px;
          margin: 5mm 0;
          font-style: italic;
          text-align: center;
        }
        .qr-placeholder {
          width: 25mm;
          height: 25mm;
          background: white;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #667eea;
          font-size: 8pt;
          font-weight: bold;
        }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Voucher ${selectedVoucher?.number}</title>
          ${styles}
        </head>
        <body>
          ${pdfRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Stats
  const stats = {
    total: vouchers.length,
    active: vouchers.filter((v) => getVoucherStatus(v).label === 'Active' || getVoucherStatus(v).label === 'Partial').length,
    totalValue: vouchers.reduce((sum, v) => sum + v.valueTotal, 0),
    remainingValue: vouchers.reduce((sum, v) => sum + v.valueRemaining, 0),
  };

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-900">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-stone-800 dark:text-stone-100 mb-2">{t('vouchers.title')}</h1>
            <p className="text-stone-600 dark:text-stone-300">{t('vouchers.subtitle')}</p>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
                &times;
              </button>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                &times;
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.totalVouchers')}</div>
              <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.activeVouchers')}</div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </div>
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.totalValue')}</div>
              <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">{formatCurrency(stats.totalValue, 'CZK')}</div>
            </div>
            <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4">
              <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.remainingValue')}</div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.remainingValue, 'CZK')}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('vouchers.searchPlaceholder')}
                  className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-stone-600 dark:text-stone-300">{t('vouchers.from')}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-stone-600 dark:text-stone-300">{t('vouchers.to')}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                />
              </div>
              <button
                onClick={fetchVouchers}
                className="px-4 py-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
              >
                {t('common.refresh')}
              </button>
              <button
                onClick={() => {
                  setEditingVoucher(null);
                  resetForm();
                  // Set default validity to 1 year from now
                  const nextYear = new Date();
                  nextYear.setFullYear(nextYear.getFullYear() + 1);
                  setVoucherForm((f) => ({ ...f, validity: nextYear.toISOString().split('T')[0] }));
                  setShowVoucherModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('vouchers.createVoucher')}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 mb-6">
            <div className="flex border-b border-stone-200 dark:border-stone-700">
              {(['all', 'active', 'used', 'expired', 'canceled'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/30'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-stone-500 dark:text-stone-400">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                {t('common.loading')}
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">{t('vouchers.noVouchers')}</h3>
                <p className="text-stone-500 dark:text-stone-400">
                  {searchQuery || dateFrom || dateTo ? t('common.tryAdjusting') : t('vouchers.createFirst')}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('vouchers.number')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('vouchers.customer')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('vouchers.value')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('vouchers.remaining')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('vouchers.validUntil')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                  {filteredVouchers.map((voucher) => {
                    const status = getVoucherStatus(voucher);
                    return (
                      <tr key={voucher.id} className="hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono font-semibold text-stone-800 dark:text-stone-100">{voucher.number}</div>
                          {voucher.code && <div className="text-xs text-stone-500 dark:text-stone-400">Code: {voucher.code}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-stone-800 dark:text-stone-100">{voucher.customerData.name || '-'}</div>
                          <div className="text-xs text-stone-500 dark:text-stone-400">{voucher.customerData.email || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-stone-800 dark:text-stone-100">
                            {formatCurrency(voucher.valueTotal, voucher.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={`font-semibold ${
                              voucher.valueRemaining > 0 ? 'text-green-600' : 'text-stone-400 dark:text-stone-400'
                            }`}
                          >
                            {formatCurrency(voucher.valueRemaining, voucher.currency)}
                          </div>
                          {voucher.valueUsed > 0 && (
                            <div className="text-xs text-stone-500 dark:text-stone-400">
                              Used: {formatCurrency(voucher.valueUsed, voucher.currency)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={isExpired(voucher) ? 'text-red-600' : 'text-stone-800 dark:text-stone-100'}>
                            {formatDate(voucher.validity)}
                          </div>
                          <div className="text-xs text-stone-500 dark:text-stone-400">Created: {formatDate(voucher.createdAt)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openDetailModal(voucher)}
                              className="px-2 py-1 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded"
                              title="View details"
                            >
                              {t('common.view')}
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(voucher)}
                              className="px-2 py-1 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded"
                              title="Download PDF"
                            >
                              {t('vouchers.pdf')}
                            </button>
                            {!voucher.canceledAt && (
                              <>
                                <button
                                  onClick={() => openEditVoucher(voucher)}
                                  className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                >
                                  {t('common.edit')}
                                </button>
                                <button
                                  onClick={() => handleToggleActive(voucher)}
                                  className={`px-2 py-1 text-sm rounded ${
                                    voucher.active
                                      ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                      : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                                  }`}
                                >
                                  {voucher.active ? t('vouchers.disable') : t('vouchers.enable')}
                                </button>
                                {voucher.active && (
                                  <button
                                    onClick={() => handleCancelVoucher(voucher)}
                                    className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                  >
                                    {t('common.cancel')}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Voucher Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700 sticky top-0 bg-white dark:bg-stone-800 z-10">
              <h2 className="text-xl font-semibold dark:text-stone-100">{editingVoucher ? t('vouchers.editVoucher') : t('vouchers.createNew')}</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">{t('vouchers.basicInfo')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.promoCode')}</label>
                    <input
                      type="text"
                      value={voucherForm.code}
                      onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                      placeholder="e.g., WELLNESS2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.format')}</label>
                    <select
                      value={voucherForm.format}
                      onChange={(e) => setVoucherForm({ ...voucherForm, format: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value="DL">DL (99x210mm)</option>
                      <option value="A5">A5 (148x210mm)</option>
                      <option value="A4">A4 (210x297mm)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.valueStar')}</label>
                    <input
                      type="number"
                      value={voucherForm.price}
                      onChange={(e) => setVoucherForm({ ...voucherForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('bookings.currency')}</label>
                    <select
                      value={voucherForm.currency}
                      onChange={(e) => setVoucherForm({ ...voucherForm, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value="CZK">CZK</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.validUntilStar')}</label>
                    <input
                      type="date"
                      value={voucherForm.validity}
                      onChange={(e) => setVoucherForm({ ...voucherForm, validity: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.paymentType')}</label>
                    <select
                      value={voucherForm.paymentType}
                      onChange={(e) => setVoucherForm({ ...voucherForm, paymentType: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value="payment-online-card">Online Card</option>
                      <option value="payment-bank-transfer">Bank Transfer</option>
                      <option value="payment-cash">Cash</option>
                      <option value="payment-invoice">Invoice</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.deliveryType')}</label>
                    <select
                      value={voucherForm.deliveryType}
                      onChange={(e) => setVoucherForm({ ...voucherForm, deliveryType: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value="email">Email</option>
                      <option value="post">Post</option>
                      <option value="pickup">Pickup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.deliveryPrice')}</label>
                    <input
                      type="number"
                      value={voucherForm.deliveryPrice}
                      onChange={(e) => setVoucherForm({ ...voucherForm, deliveryPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                      min="0"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.note')}</label>
                  <textarea
                    value={voucherForm.note}
                    onChange={(e) => setVoucherForm({ ...voucherForm, note: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    rows={2}
                    placeholder={t('vouchers.internalNote')}
                  />
                </div>
              </div>

              {/* Customer Data */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">{t('vouchers.customerInfo')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.nameStar')}</label>
                    <input
                      type="text"
                      value={voucherForm.customerName}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerName: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.emailStar')}</label>
                    <input
                      type="email"
                      value={voucherForm.customerEmail}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('common.phone')}</label>
                    <input
                      type="tel"
                      value={voucherForm.customerTel}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerTel: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.company')}</label>
                    <input
                      type="text"
                      value={voucherForm.customerCompany}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerCompany: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div className="col-span-2 grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.street')}</label>
                      <input
                        type="text"
                        value={voucherForm.customerStreet}
                        onChange={(e) => setVoucherForm({ ...voucherForm, customerStreet: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.houseNo')}</label>
                      <input
                        type="text"
                        value={voucherForm.customerHouseNumber}
                        onChange={(e) => setVoucherForm({ ...voucherForm, customerHouseNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.postalCode')}</label>
                      <input
                        type="text"
                        value={voucherForm.customerPostalCode}
                        onChange={(e) => setVoucherForm({ ...voucherForm, customerPostalCode: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.city')}</label>
                    <input
                      type="text"
                      value={voucherForm.customerCity}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerCity: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.country')}</label>
                    <select
                      value={voucherForm.customerCountry}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerCountry: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    >
                      <option value="CZ">Czech Republic</option>
                      <option value="SK">Slovakia</option>
                      <option value="DE">Germany</option>
                      <option value="AT">Austria</option>
                      <option value="PL">Poland</option>
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.cin')}</label>
                    <input
                      type="text"
                      value={voucherForm.customerCin}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerCin: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.tin')}</label>
                    <input
                      type="text"
                      value={voucherForm.customerTin}
                      onChange={(e) => setVoucherForm({ ...voucherForm, customerTin: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* Gift Data */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">
                  {t('vouchers.giftRecipient')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.recipientName')}</label>
                    <input
                      type="text"
                      value={voucherForm.giftName}
                      onChange={(e) => setVoucherForm({ ...voucherForm, giftName: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.recipientEmail')}</label>
                    <input
                      type="email"
                      value={voucherForm.giftEmail}
                      onChange={(e) => setVoucherForm({ ...voucherForm, giftEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{t('vouchers.giftMessage')}</label>
                    <textarea
                      value={voucherForm.giftMessage}
                      onChange={(e) => setVoucherForm({ ...voucherForm, giftMessage: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg dark:bg-stone-900 dark:text-stone-100"
                      rows={2}
                      placeholder={t('vouchers.giftMessagePlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
                <button
                  onClick={() => {
                    setShowVoucherModal(false);
                    setEditingVoucher(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 dark:text-stone-100"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={editingVoucher ? handleUpdateVoucher : handleCreateVoucher}
                  disabled={loading || !voucherForm.price || !voucherForm.validity || !voucherForm.customerName || !voucherForm.customerEmail}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
                >
                  {loading ? t('common.saving') : editingVoucher ? t('vouchers.updateVoucher') : t('vouchers.createVoucher')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold dark:text-stone-100">{t('vouchers.voucherDetails')}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVoucherStatus(selectedVoucher).color}`}>
                  {getVoucherStatus(selectedVoucher).label}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Voucher Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.voucherNumber')}</div>
                  <div className="font-mono font-semibold text-lg dark:text-stone-100">{selectedVoucher.number}</div>
                </div>
                {selectedVoucher.code && (
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.promoCode')}</div>
                    <div className="font-semibold dark:text-stone-100">{selectedVoucher.code}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.totalValue')}</div>
                  <div className="font-semibold text-lg dark:text-stone-100">{formatCurrency(selectedVoucher.valueTotal, selectedVoucher.currency)}</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.remainingValue')}</div>
                  <div className={`font-semibold text-lg ${selectedVoucher.valueRemaining > 0 ? 'text-green-600' : 'text-stone-400 dark:text-stone-400'}`}>
                    {formatCurrency(selectedVoucher.valueRemaining, selectedVoucher.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.used')}</div>
                  <div className="font-semibold dark:text-stone-100">{formatCurrency(selectedVoucher.valueUsed, selectedVoucher.currency)}</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.validUntil')}</div>
                  <div className={`font-semibold ${isExpired(selectedVoucher) ? 'text-red-600' : 'dark:text-stone-100'}`}>
                    {formatDate(selectedVoucher.validity)}
                  </div>
                </div>
              </div>

              {/* Usage Progress */}
              <div>
                <div className="text-sm text-stone-500 dark:text-stone-400 mb-2">{t('vouchers.usageProgress')}</div>
                <div className="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${(selectedVoucher.valueUsed / selectedVoucher.valueTotal) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {((selectedVoucher.valueUsed / selectedVoucher.valueTotal) * 100).toFixed(1)}% used
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 dark:bg-stone-900 rounded-lg">
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('common.created')}</div>
                  <div className="dark:text-stone-100">{formatDateTime(selectedVoucher.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.paid')}</div>
                  <div className="dark:text-stone-100">{formatDateTime(selectedVoucher.paidAt)}</div>
                </div>
                {selectedVoucher.usedAt && (
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.firstUsed')}</div>
                    <div className="dark:text-stone-100">{formatDateTime(selectedVoucher.usedAt)}</div>
                  </div>
                )}
                {selectedVoucher.canceledAt && (
                  <div>
                    <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.canceled')}</div>
                    <div className="text-red-600">{formatDateTime(selectedVoucher.canceledAt)}</div>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div>
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 uppercase tracking-wider">{t('vouchers.customer')}</div>
                <div className="p-4 bg-stone-50 dark:bg-stone-900 rounded-lg">
                  <div className="font-semibold dark:text-stone-100">{selectedVoucher.customerData.name}</div>
                  <div className="text-sm text-stone-600 dark:text-stone-300">{selectedVoucher.customerData.email}</div>
                  {selectedVoucher.customerData.tel && (
                    <div className="text-sm text-stone-600 dark:text-stone-300">{selectedVoucher.customerData.tel}</div>
                  )}
                  {selectedVoucher.customerData.company && (
                    <div className="text-sm text-stone-600 dark:text-stone-300 mt-2">
                      {selectedVoucher.customerData.company}
                      {selectedVoucher.customerData.cin && ` (ICO: ${selectedVoucher.customerData.cin})`}
                    </div>
                  )}
                  {selectedVoucher.customerData.street && (
                    <div className="text-sm text-stone-500 dark:text-stone-400 mt-2">
                      {selectedVoucher.customerData.street} {selectedVoucher.customerData.houseNumber},{' '}
                      {selectedVoucher.customerData.postalCode} {selectedVoucher.customerData.city},{' '}
                      {selectedVoucher.customerData.country}
                    </div>
                  )}
                </div>
              </div>

              {/* Gift Recipient */}
              {selectedVoucher.giftData.name && (
                <div>
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 uppercase tracking-wider">{t('vouchers.giftRecipient')}</div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="font-semibold dark:text-stone-100">{selectedVoucher.giftData.name}</div>
                    {selectedVoucher.giftData.email && (
                      <div className="text-sm text-stone-600 dark:text-stone-300">{selectedVoucher.giftData.email}</div>
                    )}
                    {selectedVoucher.giftMessage && (
                      <div className="mt-2 italic text-stone-600 dark:text-stone-300">&ldquo;{selectedVoucher.giftMessage}&rdquo;</div>
                    )}
                  </div>
                </div>
              )}

              {/* Note */}
              {selectedVoucher.note && (
                <div>
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 uppercase tracking-wider">{t('vouchers.note')}</div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-stone-700 dark:text-stone-300">{selectedVoucher.note}</div>
                </div>
              )}

              {/* Reservation */}
              {selectedVoucher.reservationNumber && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <div className="text-sm text-stone-500 dark:text-stone-400">{t('vouchers.usedInReservation')}</div>
                  <div className="font-semibold text-green-700">{selectedVoucher.reservationNumber}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 dark:text-stone-100"
                >
                  {t('common.close')}
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleDownloadPdf(selectedVoucher);
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {t('vouchers.downloadPdf')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && selectedVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Voucher Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={printPdf}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Print / Download PDF
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="px-4 py-2 border border-stone-200 rounded-lg hover:bg-stone-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-8 bg-stone-100">
              {/* PDF Content */}
              <div ref={pdfRef}>
                <div
                  style={{
                    width: '210mm',
                    minHeight: '99mm',
                    padding: '20mm',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    margin: '0 auto',
                  }}
                >
                  {/* Decorative circle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-50%',
                      right: '-30%',
                      width: '80%',
                      height: '200%',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15mm', position: 'relative', zIndex: 1 }}>
                    <div>
                      <div style={{ fontSize: '28pt', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
                        Hotel Wellness
                      </div>
                      <div style={{ fontSize: '14pt', opacity: 0.9, marginTop: '2mm' }}>Gift Voucher</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10pt', opacity: 0.8 }}>Voucher No.</div>
                      <div
                        style={{
                          fontSize: '14pt',
                          fontWeight: 'bold',
                          letterSpacing: '2px',
                          background: 'rgba(255,255,255,0.2)',
                          padding: '2mm 4mm',
                          borderRadius: '4px',
                          marginTop: '2mm',
                        }}
                      >
                        {selectedVoucher.number}
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <div
                    style={{
                      fontSize: '48pt',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      margin: '10mm 0',
                      textShadow: '3px 3px 6px rgba(0,0,0,0.3)',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {formatCurrency(selectedVoucher.valueTotal, selectedVoucher.currency)}
                  </div>

                  {/* Validity */}
                  <div style={{ textAlign: 'center', fontSize: '12pt', opacity: 0.9, marginBottom: '10mm', position: 'relative', zIndex: 1 }}>
                    Valid until: {formatDate(selectedVoucher.validity)}
                  </div>

                  {/* Gift Message */}
                  {selectedVoucher.giftMessage && (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        padding: '5mm',
                        borderRadius: '4px',
                        margin: '5mm 0',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      &ldquo;{selectedVoucher.giftMessage}&rdquo;
                      {selectedVoucher.giftData.name && (
                        <div style={{ marginTop: '2mm', fontSize: '10pt' }}>For: {selectedVoucher.giftData.name}</div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      fontSize: '10pt',
                      opacity: 0.8,
                      borderTop: '1px solid rgba(255,255,255,0.3)',
                      paddingTop: '5mm',
                      marginTop: '5mm',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <div>
                      <div>Variable Symbol: {selectedVoucher.variableSymbol}</div>
                      <div>Issued: {formatDate(selectedVoucher.createdAt)}</div>
                    </div>
                    <div
                      style={{
                        width: '25mm',
                        height: '25mm',
                        background: 'white',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#667eea',
                        fontSize: '8pt',
                        fontWeight: 'bold',
                      }}
                    >
                      QR CODE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
