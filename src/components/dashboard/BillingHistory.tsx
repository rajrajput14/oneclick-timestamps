'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Receipt, ExternalLink, Package, History } from 'lucide-react';

interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: string;
    invoice_url: string;
}

interface Order {
    order_id: string;
    date: string;
    product_name: string;
    order_type: string;
    amount: string;
    status: string;
    receipt_url?: string;
}

export default function BillingHistory() {
    const [activeTab, setActiveTab] = useState<'orders' | 'invoices'>('orders');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [invRes, ordRes] = await Promise.all([
                    fetch('/api/billing/invoices'),
                    fetch('/api/billing/orders')
                ]);

                if (invRes.ok) setInvoices(await invRes.json());
                if (ordRes.ok) setOrders(await ordRes.json());
            } catch (err) {
                console.error('Failed to fetch billing history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const EmptyState = ({ message, icon: Icon }: { message: string, icon: any }) => (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-60 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center">
                <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium uppercase tracking-widest">{message}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-xl font-black uppercase tracking-tightest">Billing History</h2>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-secondary/50 backdrop-blur-md p-1 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-muted-foreground hover:text-white'
                            }`}
                    >
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'invoices' ? 'bg-indigo-600 text-white shadow-lg' : 'text-muted-foreground hover:text-white'
                            }`}
                    >
                        Invoices
                    </button>
                </div>
            </div>

            <Card className="overflow-hidden border-white/5 bg-secondary/30 backdrop-blur-xl rounded-[2.5rem]">
                {loading ? (
                    <div className="p-20 flex justify-center items-center">
                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {activeTab === 'orders' ? (
                            orders.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Date</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Type</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {orders.map((order) => (
                                            <tr key={order.order_id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-5 text-sm font-medium text-foreground">{order.date}</td>
                                                <td className="px-8 py-5 text-sm font-black italic">{order.product_name}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${order.order_type === 'Plan' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                                                        }`}>
                                                        {order.order_type}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-black text-right">{order.amount}</td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${order.status === 'paid' ? 'text-green-500' : 'text-amber-500'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    {order.receipt_url && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 gap-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20"
                                                            onClick={() => window.open(order.receipt_url, '_blank')}
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Download</span>
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <EmptyState message="No orders found for this account" icon={Package} />
                            )
                        ) : (
                            invoices.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Invoice Date</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {invoices.map((invoice) => (
                                            <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-5 text-sm font-medium text-foreground">{invoice.date}</td>
                                                <td className="px-8 py-5 text-sm font-black">{invoice.amount}</td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                                                        {invoice.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 gap-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20"
                                                        onClick={() => window.open(invoice.invoice_url, '_blank')}
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Download</span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <EmptyState message="No invoices available yet" icon={Receipt} />
                            )
                        )}
                    </div>
                )}
            </Card>

            <div className="flex flex-col md:flex-row gap-4 px-2">
                <p className="text-[10px] text-muted-foreground italic flex-1">
                    * Data is fetched in real-time from Lemon Squeezy for security and accuracy.
                </p>
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/5 rounded-full border border-indigo-500/10">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                        Tip: Check "Orders" for Add-on receipts and "Invoices" for Subscription bills.
                    </p>
                </div>
            </div>
        </div>
    );
}
