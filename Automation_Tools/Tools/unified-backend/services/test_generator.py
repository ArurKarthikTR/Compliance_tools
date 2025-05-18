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
            
    def download_xml(self, request_json):
        """
        Generate mock data and return it as an XML file
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
            filename = f"test-data-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.xml"
            filepath = os.path.join(self.download_folder, filename)
            
            # Create XML content
            xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n'
            
            for row in generated_data:
                xml_content += '  <row>\n'
                for key, value in row.items():
                    # Escape special characters in XML
                    if isinstance(value, str):
                        value = value.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&apos;')
                    xml_content += f'    <{key}>{value}</{key}>\n'
                xml_content += '  </row>\n'
            
            xml_content += '</data>'
            
            # Save to file
            with open(filepath, 'w', encoding='utf-8') as xmlfile:
                xmlfile.write(xml_content)
            
            # Create response
            return send_from_directory(
                self.download_folder, 
                filename, 
                as_attachment=True,
                mimetype='application/xml'
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
                    # Try up to 100 times to generate a unique value
                    attempts = 0
                    max_attempts = 100
                    while str(value) in unique_values[field_id] and attempts < max_attempts:
                        value = self._generate_field_value(field_type, field_options)
                        attempts += 1
                    
                    # If we couldn't generate a unique value after max attempts, add a suffix to make it unique
                    if attempts >= max_attempts:
                        value = f"{value}_{len(unique_values[field_id])}"
                    
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
        # Only handle the allowed data types
        if field_type == 'String' or field_type == 'string':
            return self._generate_text(options)
        elif field_type == 'Number' or field_type == 'number':
            return self._generate_number(options)
        elif field_type == 'Float' or field_type == 'float':
            options['decimal'] = True
            return self._generate_number(options)
        elif field_type == 'Decimal' or field_type == 'decimal':
            options['decimal'] = True
            return self._generate_number(options)
        elif field_type == 'Boolean' or field_type == 'boolean':
            return self._generate_boolean(options)
        elif field_type == 'Date' or field_type == 'date':
            return self._generate_date(options)
        else:
            return f"Unsupported field type: {field_type}"
    
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
        length = options.get('length')
        
        if decimal:
            return round(random.uniform(min_value, max_value), 2)
        elif length:
            # Generate a number with specific length
            length = int(length)
            if length <= 0:
                return random.randint(min_value, max_value)
            
            # Generate a random number with exactly 'length' digits
            if length == 1:
                return random.randint(0, 9)
            else:
                min_length_value = 10 ** (length - 1)
                max_length_value = (10 ** length) - 1
                
                # Respect min and max constraints
                actual_min = max(min_value, min_length_value)
                actual_max = min(max_value, max_length_value)
                
                # If constraints conflict, prioritize length
                if actual_min > actual_max:
                    actual_min = min_length_value
                    actual_max = max_length_value
                
                return random.randint(actual_min, actual_max)
        else:
            return random.randint(min_value, max_value)
    
    def _generate_date(self, options):
        """Generate date data"""
        # Default dates if not provided or if there's an error parsing
        default_start = datetime.datetime(2020, 1, 1)
        default_end = datetime.datetime(2025, 12, 31)
        
        # Get date strings from options
        start_date_str = options.get('startDate', '2020-01-01')
        end_date_str = options.get('endDate', '2025-12-31')
        
        # Try to parse the dates
        try:
            start = datetime.datetime.strptime(start_date_str, '%Y-%m-%d')
        except (ValueError, TypeError):
            start = default_start
            
        try:
            end = datetime.datetime.strptime(end_date_str, '%Y-%m-%d')
        except (ValueError, TypeError):
            end = default_end
            
        # Ensure end date is not before start date
        if end < start:
            end = start + datetime.timedelta(days=365)  # Default to 1 year range
        
        if self.fake:
            return self.fake.date_between(start_date=start, end_date=end).strftime('%Y-%m-%d')
        else:
            # Simple random date between start and end
            delta = end - start
            random_days = random.randint(0, max(0, delta.days))
            return (start + datetime.timedelta(days=random_days)).strftime('%Y-%m-%d')
    
    def _generate_boolean(self, options):
        """Generate boolean data"""
        return random.choice([True, False])
    
    # Only keeping the methods needed for the supported data types
