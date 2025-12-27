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
            return NextResponse.json([]); // No orders if no customer ID yet
        }

        const apiKey = process.env.LEMONSQUEEZY_API_KEY;
        const lsUrl = `https://api.lemonsqueezy.com/v1/orders?filter[customer_id]=${customerId}`;

        const response = await fetch(lsUrl, {
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[OrdersAPI] LemonSqueezy Error:', errorData);
            return NextResponse.json({ error: 'Failed to fetch orders from LemonSqueezy' }, { status: response.status });
        }

        const data = await response.json();

        // Map to simplified format
        const orders = data.data.map((order: any) => {
            const attrs = order.attributes;
            const customData = order.meta?.custom_data || {};

            // Determine order type
            let type = 'Plan';
            if (customData.type === 'addon' || attrs.first_order_item?.product_name?.toLowerCase().includes('minutes')) {
                type = 'Add-on';
            }

            return {
                order_id: order.id,
                date: new Date(attrs.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }),
                product_name: attrs.first_order_item?.product_name || 'OneClick Timestamps',
                order_type: type,
                amount: attrs.total_formatted,
                status: attrs.status
            };
        });

        return NextResponse.json(orders);
    } catch (error) {
        console.error('[OrdersAPI] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
