from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os

# Import our service modules
from services.date_converter import DateConverterService
from services.file_difference import FileDifferenceService
from services.test_generator import TestGeneratorService

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure folders
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
OUTPUT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
DOWNLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')

# Create folders if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Initialize services
date_converter_service = DateConverterService(UPLOAD_FOLDER, OUTPUT_FOLDER)
file_difference_service = FileDifferenceService(UPLOAD_FOLDER)
test_generator_service = TestGeneratorService(DOWNLOAD_FOLDER)

# API Routes

# Date Converter routes
@app.route('/api/date-converter/update', methods=['POST'])
def update_dates():
    return date_converter_service.update_dates(request)

# File Difference routes
@app.route('/api/file-difference/upload', methods=['POST'])
def upload_files():
    return file_difference_service.upload_files(request)

@app.route('/api/file-difference/preview', methods=['POST'])
def preview_file():
    return file_difference_service.preview_file(request)

@app.route('/api/file-difference/health', methods=['GET'])
def health_check():
    return file_difference_service.health_check()

# Test Data Generator routes
@app.route('/api/test-generator/generate', methods=['POST'])
def generate_data():
    return test_generator_service.generate_data(request.json)

@app.route('/api/test-generator/download/csv', methods=['POST'])
def download_csv():
    return test_generator_service.download_csv(request.json)

@app.route('/api/test-generator/download/json', methods=['POST'])
def download_json():
    return test_generator_service.download_json(request.json)

@app.route('/api/test-generator/download/excel', methods=['POST'])
def download_excel():
    return test_generator_service.download_excel(request.json)

@app.route('/api/test-generator/download-xml', methods=['POST'])
def download_xml():
    return test_generator_service.download_xml(request.json)

@app.route('/api/test-generator/import', methods=['POST'])
def import_file():
    return test_generator_service.import_file(request)

# General routes
@app.route('/api/health', methods=['GET'])
def api_health_check():
    return jsonify({'status': 'ok', 'message': 'Unified backend is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
