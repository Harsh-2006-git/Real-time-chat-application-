# Real-Time Chat Application

---
<img width="1897" height="901" alt="image" src="https://github.com/user-attachments/assets/8963e090-5ec4-40ab-9ad4-52d7f965e9aa" />

---
Live Demo Link: https://quantum-chat-harsh.vercel.app/

---


A modern, real-time chat application built with Next.js, Socket.io, and MongoDB. Optimized for **single-port deployment on Vercel**.

## ✨ Features

- 🔐 **Authentication** with NextAuth.js
- 💬 **Real-time messaging** with Socket.io
- 👥 **User presence** (online/offline status)
- ✏️ **Message editing and deletion**
- ⌨️ **Typing indicators**
- 📱 **Responsive design**
- 🚀 **Single-port architecture** for easy deployment

## 🏗️ Architecture

This application uses a **unified single-port architecture**:
- Next.js app and Socket.io run on the **same port**
- Socket.io is available at `/api/socket` endpoint
- **No separate backend server needed**
- Fully compatible with Vercel's serverless infrastructure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB database (local or MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Deployment to Vercel

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. Push your code to GitHub/GitLab/Bitbucket
2. Import to Vercel at [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `MONGODB_URI`
   - `NEXTAUTH_URL` (your Vercel domain)
   - `NEXTAUTH_SECRET`
4. Deploy!

**That's it!** Both your app and Socket.io will work on the same domain.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19
- **Real-time**: Socket.io
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Styling**: CSS Modules
- **State Management**: Zustand

## 📁 Project Structure

```
chat-app/
├── pages/
│   └── api/
│       └── socket.js          # Socket.io API route (Pages Router)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # REST API routes
│   │   └── ...
│   ├── components/           # React components
│   ├── context/
│   │   └── SocketContext.js  # Socket.io client context
│   ├── models/               # Mongoose models
│   └── lib/                  # Utilities
├── vercel.json               # Vercel configuration
└── package.json
```

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | Yes |

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
