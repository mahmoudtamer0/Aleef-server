import ApiError from "../../../utils/ApiError"
import { sendEmail } from "../../../utils/sendEmail";
import pool from "../../../db";
import { clearCache, getCache, setCache } from "../../../cache";

export const createOrder = async (cart: any, shippingAddress: any, paymentMethod: string, user: any) => {

    const client = await pool.connect();
    try {
        console.log(cart);
        await client.query("BEGIN");

        let subTotal = 0;
        let delivery = 20;
        let tax = 0.14;

        const productIds = cart.map((item: any) => item.productId);

        const getProducts = await client.query(
            `SELECT id, "finalPrice", title, thumbnail_url, stock
        FROM products
        WHERE id = ANY($1::uuid[])`,
            [productIds]
        );

        const products = getProducts.rows;

        const productsMap = new Map(
            products.map((p: any) => [p.id, p])
        );

        for (let i = 0; i < cart.length; i++) {
            const item = cart[i]
            const product = productsMap.get(item.productId);
            if (!product) {
                throw new ApiError(404, "not found");
            }

            const stockCheck = await client.query(
                `UPDATE products
                SET stock = stock - $1, buys = buys + $1
                WHERE id = $2 AND stock >= $1
                RETURNING id`,
                [item.quantity, item.productId]
            );

            if (stockCheck.rowCount === 0) {
                throw new ApiError(400, `stock available for ${product.title} is : ${product.stock}`,)
            }

            subTotal += item.quantity * product.finalPrice;
        }

        const order = await client.query(
            `INSERT INTO orders (user_id, shipping_address, shipping_city, shipping_phone, "paymentMethod", "subTotal", delivery, "taxPayed", "totalOrder")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
            [user.id, shippingAddress.address, shippingAddress.city, shippingAddress.phone, paymentMethod, subTotal, delivery, Math.floor(subTotal * tax), subTotal + delivery + Math.floor(subTotal * tax)]
        );

        const orderId = order.rows[0].id;

        for (const item of cart) {

            const product = productsMap.get(item.productId);

            if (!product) {
                throw new ApiError(404, "not found this product");
            }

            await client.query(
                `INSERT INTO order_items ("order", product, title, price, image, quantity, total_price)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [orderId, product.id, product.title, product.finalPrice, product.thumbnail_url, item.quantity, item.quantity * product.finalPrice]
            );
        }


        await client.query("COMMIT");
        clearCache(`upcomingOrders:${user.id}`);

        setImmediate(() => {
            sendEmail({
                email: user.email,
                subject: "Your Order has been placed 🛍️",
                text: "",
                message: `
<div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">

    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

        <h1 style="color: #267D77; text-align: center;">Aleef</h1>
        <h2 style="text-align: center; color: #333;">Order Confirmation</h2>

        <p style="color: #555; font-size: 16px;">
            Hello ${user.name}, your order has been successfully placed 🎉
        </p>

        <hr style="margin: 20px 0;" />

        <h3 style="color: #267D77;">Order Details</h3>

        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>

        <h3 style="color: #267D77; margin-top: 20px;">Summary</h3>

        <p><strong>Subtotal:</strong> ${subTotal} EGP</p>
        <p><strong>Delivery:</strong> ${delivery} EGP</p>
        <p><strong>Tax:</strong> ${Math.floor(subTotal * tax)} EGP</p>

        <h2 style="color: #333;">
            Total: ${subTotal + delivery + Math.floor(subTotal * tax)} EGP
        </h2>

        <hr style="margin: 20px 0;" />

        <h3 style="color: #267D77;">Shipping Address</h3>
        <p style="color: #555;">
            ${shippingAddress.address || ""} <br/>
            ${shippingAddress.city || ""} <br/>
            ${shippingAddress.phone || ""}
        </p>

        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #777; font-size: 14px;">
                We’ll notify you once your order is shipped 🚚
            </p>
        </div>

        <div style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
            <p>If you did not make this order, please contact support.</p>

            <p>&copy; ${new Date().getFullYear()} Aleef. All rights reserved.</p>
        </div>

    </div>

</div>
`
            }).catch(err => {
                console.error("Email failed:", err);
            });
        });



        return orderId;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}


export const getMyUpcomingOrders = async (user: any) => {
    const cacheKey = `upcomingOrders:${user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT 
            o.id, o.status, o."paymentMethod", o."totalOrder"::float8,
            o."createdAt", o."updatedAt",
            jsonb_build_object('address',o.shipping_address, 'city', o.shipping_city, 'phone', o.shipping_phone) AS "shippingAddress",
            json_agg(jsonb_build_object(
                'id', oi.id, 'title', oi.title, 'image', oi.image,
                'quantity', oi.quantity, 'price', oi.price, 'total_price', oi.total_price
            )) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order = o.id
        WHERE o.user_id = $1 AND o.status IN ('pending', 'shipped')
        GROUP BY o.id
        ORDER BY o."updatedAt" DESC`,
        [user.id]
    );

    setCache(cacheKey, result.rows, 300);
    return result.rows;
};

export const getMyPreviousOrders = async (user: any) => {
    const cacheKey = `previousOrders:${user.id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT 
            o.id, o.status, o."paymentMethod", o."totalOrder":float8,
            o."createdAt", o."updatedAt",
            jsonb_build_object('address',o.shipping_address, 'city', o.shipping_city, 'phone', o.shipping_phone) AS "shippingAddress",
            json_agg(jsonb_build_object(
                'id', oi.id, 'title', oi.title, 'image', oi.image,
                'quantity', oi.quantity, 'price', oi.price::float8, 'total_price', oi.total_price::float8
            )) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order = o.id
        WHERE o.user_id = $1 AND o.status IN ('cancelled', 'delivered')
        GROUP BY o.id
        ORDER BY o."updatedAt" DESC`,
        [user.id]
    );

    setCache(cacheKey, result.rows, 300);
    return result.rows;
};


export const getAllOrders = async (reqQuery: any) => {
    const { status, search, sort } = reqQuery;

    const page = Number(reqQuery.page) || 1;
    const limit = Number(reqQuery.limit) < 10 ? Number(reqQuery.limit) || 10 : 10;
    const offset = (page - 1) * limit;

    const cacheKey = `orders:${page}_${limit}_${status}_${search}_${sort}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const filters: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== "") {
        filters.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
    }

    if (search && search !== "") {
        filters.push(`(
            o.shipping_address ILIKE $${paramIndex} OR
            o.shipping_city ILIKE $${paramIndex} OR
            u.name ILIKE $${paramIndex} OR
            u.email ILIKE $${paramIndex} OR
            u.phone ILIKE $${paramIndex}
        )`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    let orderClause = `ORDER BY o."updatedAt" DESC`;
    if (sort === "oldest") orderClause = `ORDER BY o."updatedAt" ASC`;
    if (sort === "cheapest") orderClause = `ORDER BY o."totalOrder" ASC`;
    if (sort === "priciest") orderClause = `ORDER BY o."totalOrder" DESC`;

    const result = await pool.query(
        `SELECT
            o.id, o.status, o."paymentMethod", o."totalOrder"::float8,
            jsonb_build_object('address',o.shipping_address, 'city', o.shipping_city, 'phone', o.shipping_phone) AS "shippingAddress",
            o."createdAt", o."updatedAt",
            jsonb_build_object(
                'id', u.id, 'name', u.name, 'email', u.email,
                'phone', u.phone, 'profilePic', u."profilePic"
            ) AS user,
            COUNT(*) OVER() AS total_count
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
    );

    const total = Number(result.rows[0]?.total_count ?? 0);

    const response = {
        orders: result.rows,
        totalOrders: total,
        results: result.rowCount,
        totalPages: Math.ceil(total / limit),
        page
    };

    setCache(cacheKey, response, 200);
    return response;
};


export const getAllOrderDetailsForAdmin = async (orderId: any) => {
    const cacheKey = `order_details_admin:${orderId}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
        `SELECT
            o.id, o.status, o."paymentMethod", o."totalOrder"::float8,
            o."subTotal"::float8, o.delivery::float8, o."taxPayed"::float8,
            jsonb_build_object('address',o.shipping_address, 'city', o.shipping_city, 'phone', o.shipping_phone) AS "shippingAddress",
            o."createdAt", o."updatedAt",
            jsonb_build_object(
                'id', u.id, 'name', u.name, 'email', u.email,
                'phone', u.phone, 'profilePic', u."profilePic"
            ) AS user,
            json_agg(jsonb_build_object(
                'id', oi.id, 'title', oi.title, 'image', oi.image,
                'quantity', oi.quantity, 'price', oi.price::float8, 'total_price', oi.total_price::float8
            )) AS items
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON oi.order = o.id
        WHERE o.id = $1
        GROUP BY o.id, u.id`,
        [orderId]
    );

    if (!result.rows.length) throw new ApiError(404, "Order not found");

    setCache(cacheKey, result.rows[0], 300);
    return result.rows[0];
};