# WedNest – Backend Server

WedNest is a wedding planning platform that connects customers with wedding service providers. This repository contains the backend server responsible for API management, authentication, booking management, payment processing, and database operations.

## 🚀 Technologies Used

- Node.js
- Express.js
- MongoDB
- Better Auth
- JWT Authentication
- Stripe Payment Integration
- Vercel

## ✨ Core Features

### Authentication & Authorization
- Secure authentication using Better Auth.
- JWT-based API authorization.
- Role-based access control for Admin, Vendor, and Customer.
- Protected API routes.

### Customer
- Browse available wedding services.
- View service details.
- Create booking requests.
- View booking history.
- Cancel booking requests.
- Make payments through Stripe.

### Vendor
- Create and manage wedding services.
- Update service information.
- Manage customer booking requests.
- Accept or reject booking requests.
- Mark accepted bookings as completed.

### Admin
- Manage users and user roles.
- Ban and unban user accounts.
- Manage wedding services.
- Approve or reject submitted services.
- View platform transactions.

### Booking Management
- Create and manage bookings.
- Prevent duplicate active bookings.
- Allow customers to book a service again after a booking is completed, rejected, or cancelled.
- Track booking statuses.

### Payment Integration
- Stripe payment processing.
- Secure payment handling.
- Transaction management.

## 📁 Project Structure

```text
wednest-server/
├── index.js
├── package.json
├── package-lock.json
├── vercel.json
├── .env
└── README.md
```

## ⚙️ Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_URL=your_frontend_auth_url
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Never share your environment variables or commit your `.env` file to GitHub.

## 💻 Installation

Clone the repository:

```bash
git clone https://github.com/iftekharm-alasif/WedNest-Server.git
```

Go to the project directory:

```bash
cd WedNest-Server
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node index.js
```

The server will run locally on:

```text
http://localhost:5000
```

## 🌐 API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check server status |
| GET | `/services` | Get services |
| GET | `/browse-services` | Browse approved services |
| GET | `/services/:id` | Get service details |
| POST | `/bookings` | Create booking |
| GET | `/customer-bookings` | Get customer bookings |
| GET | `/customer-booking` | Get active booking for a service |
| GET | `/vendor-bookings` | Get vendor bookings |
| PATCH | `/bookings/:id/cancel` | Cancel booking |
| PATCH | `/bookings/:id/status` | Update booking status |

Additional admin, vendor, payment, and authentication endpoints are available in the server.

## 🔐 Security

- JWT token verification for protected routes.
- Role-based authorization.
- Input validation for important operations.
- Environment variables for sensitive credentials.
- Protected customer, vendor, and admin operations.

## 🚀 Deployment

The backend is deployed using Vercel.

## 🌐 Live Website

**Live Website:** https://wed-nest.vercel.app

## 🔗 GitHub Repositories

- **Client Repository:** https://github.com/iftekharm-alasif/WedNest
- **Server Repository:** https://github.com/iftekharm-alasif/WedNest-Server
---

**Iftekhar Mahamud Al Asif**

GitHub: https://github.com/iftekharm-alasif

---

© 2026 WedNest. All rights reserved.
