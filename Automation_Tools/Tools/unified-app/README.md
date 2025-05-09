# Unified Data Tools Frontend

This is a unified Angular application that integrates three data processing tools:
1. Date Converter - Convert dates in CSV files to a specified format
2. File Difference - Compare two files and identify differences
3. Test Data Generator - Generate test data with configurable fields

## Prerequisites

- Node.js 18.x or higher
- npm (Node package manager)
- Angular CLI 17.x or higher

## Installation

1. Clone the repository
2. Navigate to the unified-app directory
3. Install the required dependencies:

```bash
npm install
```

## Running the Application

Before running the frontend, make sure the backend server is running. See the [backend README](../unified-backend/README.md) for instructions.

To start the development server:

```bash
ng serve
```

The application will be available at http://localhost:4200

## Building for Production

To build the application for production:

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
unified-app/
├── src/
│   ├── app/
│   │   ├── app.component.*        # Main app component
│   │   ├── app.config.ts          # App configuration
│   │   ├── app.routes.ts          # Routing configuration
│   │   ├── date-converter/        # Date Converter component
│   │   ├── file-difference/       # File Difference component
│   │   ├── test-data-generator/   # Test Data Generator component
│   │   ├── landing-page/          # Landing page component
│   │   └── services/              # API services
│   │       ├── date-converter.service.ts
│   │       ├── file-difference.service.ts
│   │       └── test-data-generator.service.ts
│   ├── assets/                    # Static assets
│   ├── index.html                 # Main HTML file
│   ├── main.ts                    # Entry point
│   └── styles.scss                # Global styles
├── angular.json                   # Angular configuration
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript configuration
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

## Development

### Adding a New Component

```bash
ng generate component components/new-component
```

### Adding a New Service

```bash
ng generate service services/new-service
