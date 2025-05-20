#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[SSBU Match Logger]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_instruction() {
    echo -e "${BLUE}$1${NC}"
}

# Load nvm if available
load_nvm() {
    # Try to load nvm from common locations
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        . "$HOME/.nvm/nvm.sh"
        return 0
    elif [ -f "/usr/local/opt/nvm/nvm.sh" ]; then
        . "/usr/local/opt/nvm/nvm.sh"
        return 0
    elif [ -f "/opt/homebrew/opt/nvm/nvm.sh" ]; then
        . "/opt/homebrew/opt/nvm/nvm.sh"
        return 0
    fi
    return 1
}

# Check Node.js version and try to use latest from nvm
check_node_version() {
    local required_major=16
    
    # Try to load nvm
    if load_nvm; then
        print_message "nvm detected, installing and using latest Node.js version..."
        nvm install node # Install latest version
        nvm use node    # Use latest version
        print_message "Using Node.js $(node -v)"
    else
        # Fall back to system Node.js version check
        if command -v node >/dev/null 2>&1; then
            local version=$(node -v | cut -d. -f1 | tr -d 'v')
            if [ "$version" -lt "$required_major" ]; then
                print_error "Node.js version $required_major or higher is required. Current version: $(node -v)"
                print_instruction "Please install nvm (https://github.com/nvm-sh/nvm) or upgrade Node.js from https://nodejs.org"
                exit 1
            fi
        else
            print_error "Node.js is not installed"
            print_instruction "Please install nvm (https://github.com/nvm-sh/nvm) or Node.js from https://nodejs.org"
            exit 1
        fi
    fi
}

# Check npm version and upgrade if necessary
check_npm_version() {
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm is not installed"
        exit 1
    fi

    local npm_version=$(npm -v)
    print_message "Current npm version: $npm_version"
    print_message "Upgrading npm to latest version..."
    npm install -g npm@latest
}

# Check if this is the first run
if [ ! -f ".first_run_complete" ]; then
    print_message "First time setup detected!"
    print_message "Before proceeding, please ensure you have:"
    echo "1. Node.js 16+ and npm installed"
    echo "2. Python 3.8+ installed"
    echo "3. PostgreSQL installed and running"
    echo "4. pgAdmin 4 installed and configured"
    echo ""
    read -p "Have you completed these prerequisites? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please complete the prerequisites and run this script again."
        exit 1
    fi

    # Check Node.js version
    check_node_version

    # Check and upgrade npm
    check_npm_version

    # Detailed pgAdmin setup instructions
    print_message "\nDetailed PostgreSQL Setup Instructions:"
    echo "----------------------------------------"
    print_instruction "1. Open pgAdmin 4"
    echo "   - On first run, you'll be prompted to set a master password"
    echo ""
    
    print_instruction "2. Create Server Connection (if not already done):"
    echo "   a. Right-click 'Servers' in the left sidebar"
    echo "   b. Select 'Register' → 'Server...'"
    echo "   c. In the 'General' tab:"
    echo "      - Name: Local PostgreSQL"
    echo "   d. In the 'Connection' tab:"
    echo "      - Host: localhost"
    echo "      - Port: 5432"
    echo "      - Username: your_system_username"
    echo "      - Password: your_postgres_password (if set)"
    echo ""
    
    print_instruction "3. Create the Database:"
    echo "   a. Expand 'Servers' → 'Local PostgreSQL'"
    echo "   b. Right-click on 'Databases'"
    echo "   c. Select 'Create' → 'Database...'"
    echo "   d. Enter the following:"
    echo "      - Database: ssbu_match_logging"
    echo "      - Owner: your_system_username"
    echo "   e. Click 'Save'"
    echo ""
    
    print_instruction "4. Verify Database Creation:"
    echo "   - The new database should appear under 'Databases'"
    echo "   - It should have default schemas and extensions"
    echo ""
    
    print_instruction "5. Important Notes:"
    echo "   - If you get connection errors, ensure PostgreSQL is running"
    echo "   - The database name MUST be 'ssbu_match_logging'"
    echo "   - Your system username should have the necessary permissions"
    echo "----------------------------------------"
    
    read -p "Have you completed the database setup in pgAdmin? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please complete the database setup and run this script again."
        exit 1
    fi
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required commands
for cmd in python3 node npm; do
    if ! command_exists $cmd; then
        print_error "$cmd is required but not installed."
        exit 1
    fi
done

# Create and activate virtual environment if it doesn't exist
if [ ! -d "backend/venv" ]; then
    print_message "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment
print_message "Activating virtual environment..."
source backend/venv/bin/activate

# Install backend dependencies
print_message "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Check if database exists and is accessible
print_message "Checking database connection..."
python3 - << EOF
import psycopg2
try:
    conn = psycopg2.connect("dbname='ssbu_match_logging' host='localhost'")
    conn.close()
    print("Database connection successful!")
except psycopg2.Error as e:
    print("Unable to connect to database: %s" % e)
    exit(1)
EOF

if [ $? -ne 0 ]; then
    print_error "Database connection failed. Please check your PostgreSQL setup."
    print_instruction "\nDetailed PostgreSQL Setup Instructions:"
    echo "----------------------------------------"
    print_instruction "1. Open pgAdmin 4"
    echo "   - On first run, you'll be prompted to set a master password"
    echo "   - This is for pgAdmin access only, not your database"
    echo ""
    
    print_instruction "2. Create Server Connection (if not already done):"
    echo "   a. Right-click 'Servers' in the left sidebar"
    echo "   b. Select 'Register' → 'Server...'"
    echo "   c. In the 'General' tab:"
    echo "      - Name: Local PostgreSQL"
    echo "   d. In the 'Connection' tab:"
    echo "      - Host: localhost"
    echo "      - Port: 5432"
    echo "      - Username: your_system_username"
    echo "      - Password: your_postgres_password (if set)"
    echo ""
    
    print_instruction "3. Create the Database:"
    echo "   a. Expand 'Servers' → 'Local PostgreSQL'"
    echo "   b. Right-click on 'Databases'"
    echo "   c. Select 'Create' → 'Database...'"
    echo "   d. Enter the following:"
    echo "      - Database: ssbu_match_logging"
    echo "      - Owner: your_system_username"
    echo "   e. Click 'Save'"
    echo ""
    
    print_instruction "4. Verify Database Creation:"
    echo "   - The new database should appear under 'Databases'"
    echo "   - It should have default schemas and extensions"
    echo ""
    
    print_instruction "5. Important Notes:"
    echo "   - If you get connection errors, ensure PostgreSQL is running"
    echo "   - The database name MUST be 'ssbu_match_logging'"
    echo "   - Your system username should have the necessary permissions"
    echo "----------------------------------------"
    exit 1
fi
cd ..

# Install frontend dependencies
print_message "Installing frontend dependencies..."
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
cd ..

# Check if .env file exists in backend, create if not
if [ ! -f "backend/.env" ]; then
    print_message "Creating backend .env file..."
    cat > backend/.env << EOL
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=postgresql://localhost/ssbu_match_logging
SECRET_KEY=your-secret-key-change-in-production
EOL
fi

# Create a flag file to indicate first run is complete
touch .first_run_complete

# Function to kill background processes on script exit
cleanup() {
    print_message "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT

# Start backend server
print_message "Starting backend server..."
cd backend
FLASK_APP=app.py FLASK_ENV=development python app.py &
cd ..

# Wait for backend to start
sleep 2

# Start frontend server
print_message "Starting frontend server..."
cd frontend
npm run dev &
cd ..

# Print access information
print_message "Servers are starting up!"
echo "Frontend will be available at: http://localhost:5173"
echo "Backend API will be available at: http://localhost:5000"
echo ""
print_message "Press Ctrl+C to stop both servers"

# Wait for both processes
wait 