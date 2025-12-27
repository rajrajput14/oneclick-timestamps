import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUserRes = await getCurrentUser();
        if (!currentUserRes || 'error' in currentUserRes) {
            return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
        }

        const user = currentUserRes;
        const customerId = user.lemonsqueezyCustomerId;

        if (!customerId) {
            return NextResponse.json([]); // No invoices if no customer ID yet
        }

        const apiKey = process.env.LEMONSQUEEZY_API_KEY;
        const lsUrl = `https://api.lemonsqueezy.com/v1/invoices?filter[customer_id]=${customerId}`;

        const response = await fetch(lsUrl, {
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[InvoicesAPI] LemonSqueezy Error:', errorData);
            return NextResponse.json({ error: 'Failed to fetch invoices from LemonSqueezy' }, { status: response.status });
        }

        const data = await response.json();

        // Map to simplified format
        const invoices = data.data.map((invoice: any) => ({
            id: invoice.id,
            date: new Date(invoice.attributes.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }),
            amount: invoice.attributes.total_formatted,
            status: invoice.attributes.status,
            invoice_url: invoice.attributes.invoice_url
        }));

        return NextResponse.json(invoices);
    } catch (error) {
        console.error('[InvoicesAPI] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
