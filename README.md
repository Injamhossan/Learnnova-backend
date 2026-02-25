# Learnova Backend API 🚀

Welcome to the **Learnova Backend**! This is a robust, scalable API built with **Node.js**, **Express**, and **Prisma** to power the Learnova LMS platform.

## 📖 About Learnova
Learnova is a premium online learning platform designed to bridge the gap between expert instructors and eager students. The backend handles complex role-based authentication, course management, dynamic filtering, and real-time notifications.

### ✨ Key Features
- **Role-Based Authorization**: Secure access control for Admin, Instructor, and Student.
- **Course Management Engine**: Advanced CRUD for courses with slugify support and database indexing.
- **Secure Authentication**: JWT-based auth with Bcrypt hashing and social login support.
- **Email System**: Transactional emails for OTP verification and password resets via Brevo (Brevo/SMTP).
- **Zod Validation**: Strict schema validation for all API requests.
- **Database Architecture**: Powered by Prisma ORM and PostgreSQL with complex relations.
- **Global Error Handling**: Centralized middleware for consistent API responses.
- **Rate Limiting & Security**: Helmet, CORS, and request rate limiting implemented.
---

---

## 👤 Author
- **Injam Hossan Mamun** - [GitHub](https://github.com/Injamhossan)

## 🏗️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Security**: JWT, Bcrypt, Helmet
- **Validation**: Zod
- **Email**: Nodemailer

---

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- `pnpm` or `npm`

### 2. Installation
```bash
git clone <repository-url>
cd backend
pnpm install
```

### 3. Database Setup
Ensure your PostgreSQL database is running, then:
```bash
npx prisma generate
npx prisma db push
```

### 4. Seeding Data
Create a super-admin account for testing:
```bash
npx ts-node prisma/seed.ts
```

### 5. Start Development Server
```bash
pnpm dev
```

---

## 🔑 Environment Variables
Create a `.env` file in the root directory and add the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/learnnova"

# Auth
JWT_SECRET="your_very_secure_secret"
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL="http://localhost:3000"

# SMTP Settings (Example: Brevo)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="your_smtp_user"
SMTP_PASS="your_smtp_password"
FROM_EMAIL="noreply@learnnova.com"
FROM_NAME="Learnova"
```

---

## 📡 API Documentation

### Auth Routes (`/api/auth`)
- `POST /login`: Authenticate user.
- `POST /register`: Register new user.
- `POST /verify-email`: Verify email with OTP.
- `POST /forgot-password`: Request password reset.
- `POST /social-login`: Google/Github authentication.

### Admin Routes (`/api/admin`)
- `GET /users`: List all users (Paginated).
- `PATCH /users/:id`: Toggle user status.
- `GET /stats`: Dashboard analytics.

### Course Routes (`/api/courses`)
- `GET /`: Public course list with filters.
- `GET /:slug`: Course details.
- `POST /`: Create course (Instructor only).

---

## 🧪 Testing Credentials
You can use the following credentials after running the seed script:

**Admin Account:**
- **Email**: `admin@learnnova.com`
- **Password**: `learnnova123`

**Student Account:**
- **Email**: `jabed@gmail.com`
- **Password**: `12345678`

**Instructor Account:**
- **Email**: `jahedulislam@gmail.com`
- **Password**: `12345678`

