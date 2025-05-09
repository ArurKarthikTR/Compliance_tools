import os
import json
import csv
import io
import datetime
import random
import string
from flask import jsonify, send_file, send_from_directory
from openpyxl import Workbook

class TestGeneratorService:
    def __init__(self, download_folder):
        self.download_folder = download_folder
        os.makedirs(self.download_folder, exist_ok=True)
        
        # Import the Faker module
        try:
            from faker import Faker
            self.fake = Faker()
        except ImportError:
            # If Faker is not installed, we'll handle it later
            self.fake = None
    
    def generate_data(self, request_json):
        """
        Generate mock data based on the provided field configuration
        """
        try:
            # Check if Faker is available
            if self.fake is None:
                return jsonify({"error": "Faker module is not installed. Please install it with 'pip install faker'"}), 500
            
            fields = request_json.get('fields', [])
            row_count = request_json.get('rowCount', 10)
            
            # Validate input
            if not fields:
                return jsonify({"error": "No fields provided"}), 400
            
            if not isinstance(row_count, int) or row_count <= 0 or row_count > 1000:
                return jsonify({"error": "Invalid row count. Must be between 1 and 1000"}), 400
            
            # Generate data
            generated_data = self._generate_mock_data(fields, row_count)
            
            return jsonify(generated_data)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    def download_csv(self, request_json):
        """
        Generate mock data and return it as a CSV file
        """
        try:
            # Check if Faker is available
            if self.fake is None:
                return jsonify({"error": "Faker module is not installed. Please install it with 'pip install faker'"}), 500
            
            fields = request_json.get('fields', [])
            row_count = request_json.get('rowCount', 10)
            
            # Validate input
            if not fields:
                return jsonify({"error": "No fields provided"}), 400
            
            if not isinstance(row_count, int) or row_count <= 0 or row_count > 1000:
                return jsonify({"error": "Invalid row count. Must be between 1 and 1000"}), 400
            
            # Generate data
            generated_data = self._generate_mock_data(fields, row_count)
            
            # Generate a unique filename
            filename = f"test-data-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
            filepath = os.path.join(self.download_folder, filename)
            
            # Save to file
            with open(filepath, 'w', newline='') as csvfile:
                if generated_data:
                    writer = csv.DictWriter(csvfile, fieldnames=generated_data[0].keys())
                    writer.writeheader()
                    writer.writerows(generated_data)
            
            # Create response
            return send_from_directory(
                self.download_folder, 
                filename, 
                as_attachment=True,
                mimetype='text/csv'
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    def download_json(self, request_json):
        """
        Generate mock data and return it as a JSON file
        """
        try:
            # Check if Faker is available
            if self.fake is None:
                return jsonify({"error": "Faker module is not installed. Please install it with 'pip install faker'"}), 500
            
            fields = request_json.get('fields', [])
            row_count = request_json.get('rowCount', 10)
            
            # Validate input
            if not fields:
                return jsonify({"error": "No fields provided"}), 400
            
            if not isinstance(row_count, int) or row_count <= 0 or row_count > 1000:
                return jsonify({"error": "Invalid row count. Must be between 1 and 1000"}), 400
            
            # Generate data
            generated_data = self._generate_mock_data(fields, row_count)
            
            # Generate a unique filename
            filename = f"test-data-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.json"
            filepath = os.path.join(self.download_folder, filename)
            
            # Save to file
            with open(filepath, 'w') as jsonfile:
                json.dump(generated_data, jsonfile, indent=2)
            
            # Create response
            return send_from_directory(
                self.download_folder, 
                filename, 
                as_attachment=True,
                mimetype='application/json'
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    def download_excel(self, request_json):
        """
        Generate mock data and return it as an Excel file
        """
        try:
            # Check if Faker is available
            if self.fake is None:
                return jsonify({"error": "Faker module is not installed. Please install it with 'pip install faker'"}), 500
            
            fields = request_json.get('fields', [])
            row_count = request_json.get('rowCount', 10)
            
            # Validate input
            if not fields:
                return jsonify({"error": "No fields provided"}), 400
            
            if not isinstance(row_count, int) or row_count <= 0 or row_count > 1000:
                return jsonify({"error": "Invalid row count. Must be between 1 and 1000"}), 400
            
            # Generate data
            generated_data = self._generate_mock_data(fields, row_count)
            
            # Generate a unique filename
            filename = f"test-data-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
            filepath = os.path.join(self.download_folder, filename)
            
            # Create Excel workbook
            wb = Workbook()
            ws = wb.active
            ws.title = "Generated Data"
            
            if generated_data:
                # Add headers
                headers = list(generated_data[0].keys())
                for col_idx, header in enumerate(headers, 1):
                    ws.cell(row=1, column=col_idx, value=header)
                
                # Add data rows
                for row_idx, row_data in enumerate(generated_data, 2):
                    for col_idx, header in enumerate(headers, 1):
                        ws.cell(row=row_idx, column=col_idx, value=row_data.get(header, ''))
            
            # Save the workbook
            wb.save(filepath)
            
            # Create response
            return send_from_directory(
                self.download_folder, 
                filename, 
                as_attachment=True,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    def _generate_mock_data(self, fields, row_count):
        """
        Generate mock data based on field configurations
        
        Args:
            fields (list): List of field configurations
            row_count (int): Number of rows to generate
            
        Returns:
            list: List of dictionaries containing the generated data
        """
        generated_data = []
        unique_values = {}
        
        # Initialize unique value tracking
        for field in fields:
            if field.get('unique', False):
                unique_values[field['id']] = set()
        
        # Generate data for each row
        for _ in range(row_count):
            row_data = {}
            
            for field in fields:
                field_id = field['id']
                field_type = field['type']
                field_options = field.get('options', {})
                is_unique = field.get('unique', False)
                
                # Generate value based on field type
                value = self._generate_field_value(field_type, field_options)
                
                # Handle unique constraint
                if is_unique:
                    # Try up to 10 times to generate a unique value
                    attempts = 0
                    while str(value) in unique_values[field_id] and attempts < 10:
                        value = self._generate_field_value(field_type, field_options)
                        attempts += 1
                    
                    unique_values[field_id].add(str(value))
                
                row_data[field['name']] = value
            
            generated_data.append(row_data)
        
        return generated_data
    
    def _generate_field_value(self, field_type, options):
        """
        Generate a value for a specific field type
        
        Args:
            field_type (str): The type of field
            options (dict): Options for the field
            
        Returns:
            The generated value
        """
        if field_type == 'text':
            return self._generate_text(options)
        elif field_type == 'number':
            return self._generate_number(options)
        elif field_type == 'date':
            return self._generate_date(options)
        elif field_type == 'boolean':
            return self._generate_boolean(options)
        elif field_type == 'name':
            return self._generate_name(options)
        elif field_type == 'email':
            return self._generate_email(options)
        elif field_type == 'phone':
            return self._generate_phone(options)
        elif field_type == 'address':
            return self._generate_address(options)
        elif field_type == 'select':
            return self._generate_select(options)
        else:
            return "Unsupported field type"
    
    def _generate_text(self, options):
        """Generate text data"""
        min_length = options.get('minLength', 5)
        max_length = options.get('maxLength', 20)
        
        if self.fake:
            return self.fake.text(max_nb_chars=max_length)[:max_length]
        else:
            length = random.randint(min_length, max_length)
            return ''.join(random.choice(string.ascii_letters + ' ') for _ in range(length))
    
    def _generate_number(self, options):
        """Generate number data"""
        min_value = options.get('min', 0)
        max_value = options.get('max', 100)
        decimal = options.get('decimal', False)
        
        if decimal:
            return round(random.uniform(min_value, max_value), 2)
        else:
            return random.randint(min_value, max_value)
    
    def _generate_date(self, options):
        """Generate date data"""
        start_date = options.get('startDate', '2020-01-01')
        end_date = options.get('endDate', '2025-12-31')
        
        if self.fake:
            return self.fake.date_between(start_date=start_date, end_date=end_date).strftime('%Y-%m-%d')
        else:
            # Simple random date between start and end
            start = datetime.datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.datetime.strptime(end_date, '%Y-%m-%d')
            delta = end - start
            random_days = random.randint(0, delta.days)
            return (start + datetime.timedelta(days=random_days)).strftime('%Y-%m-%d')
    
    def _generate_boolean(self, options):
        """Generate boolean data"""
        return random.choice([True, False])
    
    def _generate_name(self, options):
        """Generate name data"""
        if self.fake:
            return self.fake.name()
        else:
            first_names = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah']
            last_names = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis']
            return f"{random.choice(first_names)} {random.choice(last_names)}"
    
    def _generate_email(self, options):
        """Generate email data"""
        if self.fake:
            return self.fake.email()
        else:
            domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'example.com']
            username_length = random.randint(5, 10)
            username = ''.join(random.choice(string.ascii_lowercase) for _ in range(username_length))
            return f"{username}@{random.choice(domains)}"
    
    def _generate_phone(self, options):
        """Generate phone data"""
        if self.fake:
            return self.fake.phone_number()
        else:
            return f"+1-{random.randint(100, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"
    
    def _generate_address(self, options):
        """Generate address data"""
        if self.fake:
            return self.fake.address().replace('\n', ', ')
        else:
            street_numbers = [str(random.randint(100, 9999)) for _ in range(5)]
            street_names = ['Main St', 'Oak Ave', 'Maple Rd', 'Washington Blvd', 'Park Lane']
            cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']
            states = ['NY', 'CA', 'IL', 'TX', 'AZ']
            zip_codes = [f"{random.randint(10000, 99999)}" for _ in range(5)]
            
            street_number = random.choice(street_numbers)
            street_name = random.choice(street_names)
            city = random.choice(cities)
            state = random.choice(states)
            zip_code = random.choice(zip_codes)
            
            return f"{street_number} {street_name}, {city}, {state} {zip_code}"
    
    def _generate_select(self, options):
        """Generate select data from provided options"""
        values = options.get('values', [])
        if values:
            return random.choice(values)
        else:
            return "No options available"
