import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req) {
    await dbConnect();

    const testUsers = [
        {
            name: "Alice (Support Bot)",
            email: "alice@example.com",
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
            online: true,
        },
        {
            name: "Bob (Developer)",
            email: "bob@example.com",
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
            online: false,
        },
        {
            name: "Charlie (Community)",
            email: "charlie@example.com",
            image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
            online: true,
        }
    ];

    try {
        for (const u of testUsers) {
            await User.findOneAndUpdate({ email: u.email }, u, { upsert: true });
        }
        return new Response(JSON.stringify({ success: true, message: "Test users added!" }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
