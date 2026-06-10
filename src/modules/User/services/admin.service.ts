import { clearCache, getCache, setCache } from "../../../cache";
import pool from "../../../db";
import { banUserTemplate, unBanUserTemplate } from "../../../emails/user.emails";
import ApiError from "../../../utils/ApiError";
import { sendEmail } from "../../../utils/sendEmail";

export const getAllUsers = async (reqQuery: any) => {
    const { search, status } = reqQuery;


    const filters: string[] = []
    const values: any[] = []
    let index = 1


    const page = reqQuery.page * 1 || 1;
    const limit = reqQuery.limit < 8 ? reqQuery.limit * 1 || 8 : 8;
    const offset = (page - 1) * limit

    const cacheKey = `users_all_users_${search}_${status}_${page}_${limit}`

    const cashed = await getCache(cacheKey);
    if (cashed) return cashed;


    if (search) {
        filters.push(`(name ILIKE $${index} OR email ILIKE $${index})`)
        values.push(`%${search}%`)
        index++
    }

    if (status) {
        filters.push(`status = $${index}`)
        values.push(status)
        index++
    }

    let query = `SELECT users.id, name, email, "createdAt", phone, status FROM users`

    if (filters.length > 0) {
        query += ` WHERE ${filters.join(" AND ")}`
    }


    const filterValues = [...values];


    const limitIndex = index;
    values.push(limit);

    const offsetIndex = index + 1;
    values.push(offset);


    query += ` ORDER BY users."createdAt" DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`
    let countQuery = `SELECT COUNT(*) AS total FROM users`

    if (filters.length > 0) {
        countQuery += ` WHERE ${filters.join(" AND ")}`
    }

    const [users, totalCount] = await Promise.all([
        pool.query(query, values),
        pool.query(countQuery, filterValues)
    ])

    const response = {
        users: users.rows,
        results: users.rowCount,
        totalUsers: totalCount.rows[0].total,
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        page
    };

    await setCache(cacheKey, response, 200);
    return response;
}

export const banUser = async (req: any) => {
    const { userId } = req.params;
    const { banAction, banDays } = req.body;

    const client = await pool.connect();
    try {

        await client.query("BEGIN");

        if (banAction == "ban") {

            const days = banDays ? Number(banDays) : 5;

            const banDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

            const user = await client.query("UPDATE users SET status = $1, \"banExpiresAt\" = $2 WHERE id = $3", ["banned", banDate, userId])

            if (user.rows.length == 0) throw new ApiError(404, "user not fount");

            const userSessions = await client.query(
                `SELECT id FROM sessions WHERE user_id = $1`,
                [userId]
            );

            await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);

            userSessions.rows.forEach(session => {
                clearCache(`session:${session.id}`);
            });

            setImmediate(async () => {
                await sendEmail({
                    email: user.rows[0].email,
                    subject: "Important update about your Aleef account",

                    text: `
                Hello ${user.rows[0].name},
    
                We want to inform you that your account access has been temporarily restricted.
    
                Ban start: ${new Date().toLocaleString()}
                Ban ends: ${banDate.toLocaleString()}
    
                If you believe this was a mistake, please contact our support team.
    
                - Aleef Team
                `,

                    message: banUserTemplate(user.rows[0].name, banDate.toLocaleString())
                }).catch(err => console.log("email error:", err));

            })

            return { status: "success", message: "User banned successfully" }
        } else if (banAction == "remove") {
            const user = await client.query("UPDATE users SET status = $1, \"banExpiresAt\" = $2 WHERE id = $3 RETURNING id,name,email", ["active", null, userId])
            if (user.rowCount == 0) throw new ApiError(404, "user not fount");

            setImmediate(() => {
                sendEmail({
                    email: user.rows[0].email,
                    subject: "Your Aleef account is now accessible",

                    text: `
        Hello ${user.rows[0].name},
        
        Good news! Your account access has been restored and you can now use Aleef normally.
        
        If you experience any issues, feel free to contact our support team.
        
        - Aleef Team
        `,

                    message: unBanUserTemplate(user.rows[0].name)
                }).catch(err => console.log("email error:", err));
            })

            return { status: "success", message: "ban removed successfuly" }
        }

        clearCache(`session:${userId}`);
        await client.query("COMMIT");
        throw new ApiError(400, "unexpected ban action");
    } catch (err) {
        await client.query("ROLLBACK");
        return new ApiError(500, "error")
    } finally {
        client.release();
    }

}