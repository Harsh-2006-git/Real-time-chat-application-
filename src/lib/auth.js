import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            const email = user.email || profile.email;
            if (!email) return false;

            await dbConnect();
            try {
                // ALWAYS update the name and image from Google to keep DB fresh
                await User.findOneAndUpdate(
                    { email },
                    {
                        name: user.name || profile.name,
                        image: user.image || profile.picture,
                    },
                    { upsert: true, new: true }
                );
                return true;
            } catch (err) {
                console.error("SignIn Sync Error:", err);
                return false;
            }
        },
        async jwt({ token, user, trigger, session }) {
            // On initial login, user object is available
            if (user) {
                token.email = user.email;
            }

            // Fetch the latest data from DB to ensure session always has name/image
            if (token.email) {
                await dbConnect();
                const dbUser = await User.findOne({ email: token.email }).lean();
                if (dbUser) {
                    token.id = dbUser._id.toString();
                    token.name = dbUser.name;
                    token.picture = dbUser.image;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.image = token.picture;
                session.user.email = token.email;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
