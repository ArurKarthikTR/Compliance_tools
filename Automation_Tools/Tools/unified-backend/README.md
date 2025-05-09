# Unified Data Tools Backend

This is a unified backend server that integrates three data processing tools:
1. Date Converter - Convert dates in CSV files to a specified format
2. File Difference - Compare two files and identify differences
3. Test Data Generator - Generate test data with configurable fields

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Installation

1. Clone the repository
2. Navigate to the unified-backend directory
3. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Running the Server

To start the backend server, run:

```bash
python app.py
```

The server will start on http://localhost:5000

## API Endpoints

### Date Converter

- `POST /api/date-converter/update` - Convert dates in a CSV file
  - Request: multipart/form-data with `file` (CSV file) and `date` (new date format, dd-mm-yyyy)
  - Response: The processed CSV file as a download

### File Difference

- `POST /api/file-difference/upload` - Compare two files
  - Request: multipart/form-data with `sourceFile` and `targetFile`
  - Response: JSON with comparison results
- `GET /api/file-difference/health` - Health check endpoint
  - Response: `{"status": "ok"}`

### Test Data Generator

- `POST /api/test-generator/generate` - Generate preview data
  - Request: JSON with `fields` array and `rowCount`
  - Response: JSON array of generated data
- `POST /api/test-generator/download/csv` - Download generated data as CSV
  - Request: JSON with `fields` array and `rowCount`
  - Response: CSV file download
- `POST /api/test-generator/download/json` - Download generated data as JSON
  - Request: JSON with `fields` array and `rowCount`
  - Response: JSON file download
- `POST /api/test-generator/download/excel` - Download generated data as Excel
  - Request: JSON with `fields` array and `rowCount`
  - Response: Excel file download

### General

- `GET /api/health` - General health check endpoint
  - Response: `{"status": "ok", "message": "Unified backend is running"}`

## Project Structure

```
unified-backend/
├── app.py                  # Main Flask application
├── requirements.txt        # Dependencies
├── services/               # Service modules
│   ├── __init__.py
│   ├── date_converter.py   # Date Converter service
│   ├── file_difference.py  # File Difference service
│   └── test_generator.py   # Test Data Generator service
├── uploads/                # Uploaded files directory
└── downloads/              # Downloaded files directory
```

## Development

To run the server in development mode with auto-reload:

```bash
FLASK_APP=app.py FLASK_ENV=development flask run
