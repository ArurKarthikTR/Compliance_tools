# Unified Data Tools

A comprehensive suite of data processing tools combined into a single application with a unified interface.

## Tools Included

1. **Date Converter** - Convert dates in CSV files to a specified format
2. **File Difference** - Compare two files (CSV, Excel, XML) and identify differences
3. **Test Data Generator** - Generate test data with configurable fields and formats

## Project Structure

This project consists of two main components:

- **Backend**: A Flask-based Python server that handles data processing
- **Frontend**: An Angular application that provides a user-friendly interface

```
unified-data-tools/
├── unified-backend/         # Python Flask backend
│   ├── services/            # Service modules for each tool
│   │   ├── date_converter.py
│   │   ├── file_difference.py
│   │   └── test_generator.py
│   ├── app.py               # Main Flask application
│   └── requirements.txt     # Python dependencies
│
├── unified-app/             # Angular frontend
│   ├── src/                 # Source code
│   │   ├── app/             # Angular components and services
│   │   │   ├── date-converter/
│   │   │   ├── file-difference/
│   │   │   ├── test-data-generator/
│   │   │   └── services/    # API services
│   │   └── ...
│   └── ...
│
└── start.py                 # Script to run both backend and frontend
```

## Prerequisites

- Python 3.8 or higher
- Node.js 18.x or higher
- Angular CLI 17.x or higher

## Installation

1. Clone this repository
2. Install backend dependencies:
   ```bash
   cd unified-backend
   pip install -r requirements.txt
   ```
3. Install frontend dependencies:
   ```bash
   cd unified-app
   npm install
   ```

## Running the Application

### On Windows

You can run both the backend and frontend with a single command:

```
./start.bat
```

This will:
1. Start the Flask backend server on http://localhost:5000
2. Start the Angular frontend on http://localhost:4200 and open it in your default browser

### On Linux/Mac

You can run both the backend and frontend with a single command:

```bash
python start.py
```

### Running Components Separately

To run the backend only:

```bash
cd unified-backend
python app.py
```

To run the frontend only:

```bash
cd unified-app
ng serve --open
```

## Features

### Date Converter
- Upload CSV files containing dates
- Convert dates to a specified format (dd-mm-yyyy)
- Download the processed file

### File Difference
- Upload two files (CSV, Excel, or XML)
- Compare the files and view differences
- See a summary of the comparison results

### Test Data Generator
- Configure fields with different data types
- Set options for each field type
- Generate preview data
- Download data in CSV, JSON, or Excel format

## Documentation

- [Backend Documentation](unified-backend/README.md)
- [Frontend Documentation](unified-app/README.md)
