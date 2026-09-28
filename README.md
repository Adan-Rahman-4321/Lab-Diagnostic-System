# Smart Diagnostic Lab System

A web-based diagnostic lab and slot management system built with Node.js, Express, and SQL.js. It includes a browser-based interface for managing patients, appointments, queue status, samples, test results, billing, inventory, and reports.

## Requirements

- Node.js 18 or later
- npm

## Getting Started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser. To run with automatic restarts during development:

```bash
npm run dev
```

The server uses port `3000` by default. Set the `PORT` environment variable to use a different port.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lab.com` | `admin123` |
| Receptionist | `receptionist@lab.com` | `rec123` |
| Technician | `tech@lab.com` | `tech123` |
| Doctor | `doctor@lab.com` | `doc123` |
| Patient | `patient@lab.com` | `pat123` |

These seeded accounts and the default session secret are for local development only. Change them and configure a strong session secret before deploying or using real patient data.

## Data Storage

The application creates and updates `lab_system.db` in the project directory. This local database is intentionally excluded from Git. Back it up securely if you need to preserve application data; do not commit patient or other sensitive records.

## Main Technologies

- Node.js and Express
- SQL.js for file-backed database storage
- HTML, CSS, and JavaScript
- Express sessions for authentication
