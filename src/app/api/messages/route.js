import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        console.error("CRITICAL: Session found but User ID is missing!", session);
        return new Response(JSON.stringify({ error: "User ID missing from session. Please log out and log back in." }), { status: 400 });
    }

    const { recipient, content } = await req.json();

    console.log("POST Message:", { sender: session.user.id, recipient, content });

    try {
        const newMessage = await Message.create({
            sender: session.user.id,
            recipient,
            content
        });
        return new Response(JSON.stringify(newMessage), { status: 201 });
    } catch (error) {
        console.error("DEBUG: POST Message Error:", error);
        return new Response(error.message, { status: 500 });
    }
}

export async function PATCH(req) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    const { messageId, content } = await req.json();

    try {
        const updated = await Message.findOneAndUpdate(
            { _id: messageId, sender: session.user.id },
            { content, isEdited: true, editedAt: new Date() },
            { new: true }
        );
        return new Response(JSON.stringify(updated), { status: 200 });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}

export async function DELETE(req) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return new Response("Unauthorized", { status: 401 });

    const { messageId } = await req.json();

    try {
        await Message.findOneAndUpdate(
            { _id: messageId, sender: session.user.id },
            { content: "This message was deleted", isDeleted: true }
        );
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}
