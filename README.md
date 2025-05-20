# SSBU Match Logger

A web application for logging and tracking Super Smash Bros Ultimate matches.

## Prerequisites

Before running the application, ensure you have:

1. **Node.js and npm** installed
2. **Python 3.8+** installed
3. **PostgreSQL** installed and running
4. **pgAdmin 4** installed and configured

## Quick Start

```bash
./run.sh
```

The script will guide you through the setup process on first run.

## Manual Database Setup in pgAdmin 4

### 1. Open pgAdmin 4

- On first run, you'll be prompted to set a master password
- This password is used to access pgAdmin, not your database

### 2. Create Server Connection

If this is your first time using pgAdmin, you'll need to create a server connection:

a. Right-click 'Servers' in the left sidebar
b. Select 'Register' → 'Server...'
c. In the 'General' tab:

- Name: Local PostgreSQL
  d. In the 'Connection' tab:
- Host: localhost
- Port: 5432
- Username: your_system_username
- Password: your_postgres_password (if set)

### 3. Create the Database

a. Expand 'Servers' → 'Local PostgreSQL'
b. Right-click on 'Databases'
c. Select 'Create' → 'Database...'
d. Enter the following:

- Database: ssbu_match_logging
- Owner: your_system_username
  e. Click 'Save'

### 4. Verify Database Creation

- The new database should appear under 'Databases'
- It should have default schemas and extensions

### 5. Important Notes

- If you get connection errors, ensure PostgreSQL is running
- The database name MUST be 'ssbu_match_logging'
- Your system username should have the necessary permissions

## Application Structure

- `frontend/` - React frontend application
- `backend/` - Flask backend API
- `run.sh` - Setup and run script

## Development

The application runs two servers:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Verify database name is exactly 'ssbu_match_logging'
3. Check your user has the necessary permissions
4. Verify connection details in backend/.env file

### Server Issues

1. Check both frontend and backend are running
2. Look for error messages in the terminal
3. Verify all dependencies are installed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
