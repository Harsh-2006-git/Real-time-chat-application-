import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const currentUserId = session.user.id;

    try {
        // 1. Get all unique users the current user has had a conversation with
        const conversations = await Message.find({
            $or: [{ sender: currentUserId }, { recipient: currentUserId }]
        }).select("sender recipient");

        const talkedToIds = new Set();
        conversations.forEach(msg => {
            if (msg.sender.toString() !== currentUserId) talkedToIds.add(msg.sender.toString());
            if (msg.recipient.toString() !== currentUserId) talkedToIds.add(msg.recipient.toString());
        });

        // 2. Fetch all users except self
        const allUsers = await User.find({ _id: { $ne: currentUserId } })
            .select("name email image online lastSeen")
            .lean();

        // 3. Categorize
        const recentChats = [];
        const peopleYouMayKnow = [];

        allUsers.forEach(user => {
            if (talkedToIds.has(user._id.toString())) {
                recentChats.push(user);
            } else {
                peopleYouMayKnow.push(user);
            }
        });

        return new Response(JSON.stringify({ recentChats, peopleYouMayKnow }), { status: 200 });
    } catch (error) {
        console.error("Discovery API Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
