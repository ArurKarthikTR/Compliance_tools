import os
import re
import pandas as pd
from datetime import datetime
from flask import request, send_file, jsonify

class DateConverterService:
    def __init__(self, upload_folder, output_folder):
        self.upload_folder = upload_folder
        self.output_folder = output_folder
        os.makedirs(self.upload_folder, exist_ok=True)
        os.makedirs(self.output_folder, exist_ok=True)
    
    def update_dates(self, request):
        """
        Process the uploaded CSV file and update dates to the specified format
        """
        try:
            file = request.files['file']
            new_date_input = request.form['date']

            # Validate the date format
            try:
                new_date_obj = datetime.strptime(new_date_input, '%d-%m-%Y')
            except ValueError:
                return jsonify({"error": "Invalid date format. Please enter the date in dd-mm-yyyy format."}), 400

            # Save the uploaded file
            input_file_path = os.path.join(self.upload_folder, file.filename)
            file.save(input_file_path)

            # Load the CSV file
            df = pd.read_csv(input_file_path)

            # Regex pattern for both date formats
            date_regex = re.compile(r'(\d{2})[-/](\d{2})[-/](\d{4})')

            # Variable to hold a sample updated date for naming the file
            sample_updated_date = None

            for column in df.columns:
                for index, value in df[column].items():
                    if isinstance(value, str):
                        # Match both slash and dash date formats
                        match = date_regex.search(value)
                        if match:
                            # Determine the separator used in the original value
                            separator = match.group(0)[2]
                            new_date = new_date_obj.strftime(f'%d{separator}%m{separator}%Y')
                            # Replace the entire date with the new date
                            updated_value = value.replace(match.group(0), new_date)
                            df.at[index, column] = updated_value
                            sample_updated_date = new_date

            # Construct the output filename based on the sample updated date
            if sample_updated_date:
                output_file_name = f"{sample_updated_date}-AL_STATE.csv"
            else:
                output_file_name = 'Book_combined_updated.csv'
            
            output_file_path = os.path.join(self.output_folder, output_file_name)
            df.to_csv(output_file_path, index=False)

            return send_file(output_file_path, as_attachment=True)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
