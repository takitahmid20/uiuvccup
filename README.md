# UIU VCCUP - Sports Auction Management System

A Next.js application for managing football and cricket player auctions at UIU.

## Features

- 🏈 Football team & player management
- 🏏 Cricket team & player management
- 💰 Live auction system
- 👤 Team owner account creation
- 📊 CSV bulk player upload
- 🔐 Role-based authentication (Admin/Team Owner)
- 👁️ Player photo integration with UIU API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your Firebase and Cloudinary credentials in `.env.local`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Deploy on Vercel

### Quick Deploy

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Manual Configuration

The project includes a `vercel.json` configuration file for optimal Vercel deployment. The following environment variables need to be configured in Vercel:

- All Firebase configuration variables (NEXT_PUBLIC_*)
- Cloudinary configuration variables

### Image Optimization

The project uses Next.js Image optimization with the following remote domains:
- `res.cloudinary.com` - Cloudinary images
- `firebasestorage.googleapis.com` - Firebase Storage
- `dsa.uiu.ac.bd` - UIU student photo API

These are pre-configured in `next.config.mjs`.

## Build & Start

```bash
npm run build    # Build for production
npm start        # Start production server
```

## Project Structure

- `app/` - Next.js App Router pages
- `components/` - Reusable UI components
- `lib/` - Utility functions (Firebase, Cloudinary, etc.)
- `contexts/` - React context providers
- `public/` - Static assets

## Admin Credentials

Default admin email: `uiuvccup@gmail.com`
