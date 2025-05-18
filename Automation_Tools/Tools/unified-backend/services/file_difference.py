import os
import pandas as pd
import xml.etree.ElementTree as ET
from flask import jsonify
from werkzeug.utils import secure_filename
import difflib

class FileDifferenceService:
    def __init__(self, upload_folder):
        self.upload_folder = upload_folder
        os.makedirs(self.upload_folder, exist_ok=True)
        self.allowed_extensions = {'csv', 'xml', 'xlsx'}
    
    def allowed_file(self, filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.allowed_extensions

    def get_file_type(self, filename):
        return filename.rsplit('.', 1)[1].lower()
    
    def process_file(self, file_path, file_type):
        """
        Process a file based on its type and return the data
        """
        if file_type == 'csv':
            return self._process_csv(file_path)
        elif file_type == 'xlsx':
            return self._process_excel(file_path)
        elif file_type == 'xml':
            return self._process_xml(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def _process_csv(self, file_path):
        """Process a CSV file and return its data"""
        try:
            # Read CSV file and handle potential errors
            df = pd.read_csv(file_path)
            
            # Drop unnamed columns (these are often empty columns)
            unnamed_cols = [col for col in df.columns if 'Unnamed:' in str(col)]
            if unnamed_cols:
                df = df.drop(columns=unnamed_cols)
            
            # Handle potential NaN values and convert to appropriate types
            df = df.fillna('')
            
            # Convert DataFrame to a standardized format
            columns = df.columns.tolist()
            
            # Convert rows to list of dictionaries
            rows = []
            for _, row in df.iterrows():
                row_dict = {}
                for col in columns:
                    # Convert all values to strings for consistent comparison
                    value = row[col]
                    if pd.isna(value):
                        row_dict[col] = None
                    else:
                        row_dict[col] = str(value) if value != '' else None
                rows.append(row_dict)
            
            return {
                'columns': columns,
                'rows': rows
            }
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error processing CSV file: {str(e)}")
            print(f"Error details: {error_details}")
            raise Exception(f"Error processing CSV file: {str(e)}")
    
    def _process_excel(self, file_path):
        """Process an Excel file and return its data"""
        try:
            print(f"Processing Excel file: {file_path}")
            
            # Read Excel file with explicit engine
            df = pd.read_excel(file_path, engine='openpyxl')
            
            # Drop unnamed columns (these are often empty columns)
            unnamed_cols = [col for col in df.columns if 'Unnamed:' in str(col)]
            if unnamed_cols:
                df = df.drop(columns=unnamed_cols)
            
            # Handle potential NaN values
            df = df.fillna('')
            
            # Convert DataFrame to a standardized format
            columns = df.columns.tolist()
            
            # Convert rows to list of dictionaries
            rows = []
            for _, row in df.iterrows():
                row_dict = {}
                for col in columns:
                    # Convert all values to strings for consistent comparison
                    value = row[col]
                    if pd.isna(value):
                        row_dict[col] = None
                    else:
                        row_dict[col] = str(value) if value != '' else None
                rows.append(row_dict)
            
            print(f"Processed Excel file with {len(columns)} columns and {len(rows)} rows")
            
            return {
                'columns': columns,
                'rows': rows
            }
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error processing Excel file: {str(e)}")
            print(f"Error details: {error_details}")
            raise Exception(f"Error processing Excel file: {str(e)}")
    
    def _process_xml(self, file_path):
        """Process an XML file and return its data"""
        try:
            # Read the XML file as text to preserve original structure
            with open(file_path, 'r', encoding='utf-8') as f:
                xml_content = f.readlines()
            
            # Parse with ElementTree for structured data
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            print(f"Processing XML file: {file_path}")
            print(f"Root tag: {root.tag}")
            
            # Extract all nodes and their paths while preserving source order
            all_nodes = {}  # Dictionary to store node paths and their values
            ordered_paths = []  # List to preserve the order of paths in source file
            
            # Keep track of element occurrences to handle repeated elements
            element_counts = {}
            
            # Track parent-child relationships for proper ordering
            path_hierarchy = {}
            
            def process_element(element, path="", depth=0):
                """Process element and its children, collecting paths and values"""
                # Build current element path
                current_path = path + "/" + element.tag if path else element.tag
                
                # Handle repeated elements by adding index
                element_key = f"{current_path}"
                if element_key in element_counts:
                    element_counts[element_key] += 1
                    indexed_path = f"{current_path}[{element_counts[element_key]}]"
                else:
                    element_counts[element_key] = 1
                    indexed_path = f"{current_path}[{element_counts[element_key]}]"
                
                # Add this path to ordered_paths if it contains a value or attribute
                has_content = False
                
                # Process attributes - add these first
                for attr_name, attr_value in element.attrib.items():
                    attr_path = f"{indexed_path}/@{attr_name}"
                    all_nodes[attr_path] = attr_value
                    ordered_paths.append(attr_path)
                    has_content = True
                    print(f"Found attribute: {attr_path} = {attr_value}")
                
                # Process text content
                if element.text and element.text.strip():
                    text_content = element.text.strip()
                    all_nodes[indexed_path] = text_content
                    ordered_paths.append(indexed_path)  # Add to ordered list
                    has_content = True
                    print(f"Found text node: {indexed_path} = {text_content}")
                elif not element.attrib and len(list(element)) == 0:
                    # Element with no attributes, no text, and no children - mark as empty
                    all_nodes[indexed_path] = ""
                    # We still track it in ordered_paths for structure consistency
                    # but mark it with a special property to filter in the frontend if needed
                    ordered_paths.append(indexed_path)
                    all_nodes[indexed_path + "_isEmpty"] = True
                
                # Store parent-child relationship for ordering
                if path in path_hierarchy:
                    path_hierarchy[path].append(indexed_path)
                else:
                    path_hierarchy[path] = [indexed_path]
                
                # Process child elements in document order
                for child in element:
                    process_element(child, indexed_path, depth + 1)
            
            # Start processing from the root
            process_element(root)
            
            # Create a standardized format for comparison
            # Use ordered_paths to keep original source file order, preserving hierarchy
            columns = ordered_paths if ordered_paths else list(all_nodes.keys())
            
            # Create a single row with all paths and values
            row = {col: all_nodes[col] for col in columns}
            
            print(f"Processed XML with {len(columns)} paths:")
            for col in columns[:10]:  # Print first 10 for debugging
                print(f"  {col}: {row[col]}")
            
            if len(columns) > 10:
                print(f"  ... and {len(columns) - 10} more")
            
            return {
                'columns': columns,
                'rows': [row],  # Return as a single row containing all XML paths
                'originalLines': xml_content  # Include original file lines for reference
            }
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error processing XML file: {str(e)}")
            print(f"Error details: {error_details}")
            raise Exception(f"Error processing XML file: {str(e)}")
    
    def compare_files(self, source_data, target_data, file_type):
        """
        Compare two files and generate a difference report
        
        Args:
            source_data (dict): Source file data in standardized format
            target_data (dict): Target file data in standardized format
            file_type (str): Type of the files being compared
            
        Returns:
            dict: Comparison result with differences highlighted
        """
        if file_type == 'xml':
            return self.compare_xml_files(source_data, target_data)
        else:
            return self.compare_csv_xlsx_files(source_data, target_data, file_type)
    
    def compare_csv_xlsx_files(self, source_data, target_data, file_type):
        """
        Compare two CSV or XLSX files and generate a difference report
        
        Args:
            source_data (dict): Source file data in standardized format
            target_data (dict): Target file data in standardized format
            file_type (str): Type of the files being compared ('csv' or 'xlsx')
            
        Returns:
            dict: Comparison result with differences highlighted
        """
        try:
            # Get all columns (union of both files' columns)
            all_columns = list(set(source_data.get('columns', []) + target_data.get('columns', [])))
            
            # Prepare comparison result
            comparison_result = {
                'fileType': file_type,
                'headers': source_data.get('columns', []),  # Use source file column order
                'sourceData': source_data.get('rows', []),
                'targetData': target_data.get('rows', []),  # Include target data for comparison
                'summary': {
                    'totalRows': len(source_data.get('rows', [])),
                    'matchingRows': 0,
                    'differingRows': 0
                },
                'differences': []  # Array to store differences
            }
            
            # Create a map of source rows for easier lookup
            source_rows = source_data.get('rows', [])
            target_rows = target_data.get('rows', [])
            
            # Compare each row in source with corresponding row in target
            for source_idx, source_row in enumerate(source_rows):
                row_has_differences = False
                
                # Get corresponding target row if it exists
                target_row = target_rows[source_idx] if source_idx < len(target_rows) else {}
                
                # Compare each column
                for col in all_columns:
                    source_value = source_row.get(col)
                    target_value = target_row.get(col)
                    
                    # Normalize values for comparison
                    source_str = str(source_value).strip() if source_value is not None else None
                    target_str = str(target_value).strip() if target_value is not None else None
                    
                    # Handle empty strings as None
                    if source_str == "":
                        source_str = None
                    if target_str == "":
                        target_str = None
                    
                    # Compare values
                    if source_str != target_str:
                        row_has_differences = True
                        # Add to differences array
                        comparison_result['differences'].append({
                            'rowIndex': source_idx,
                            'column': col,
                            'sourceValue': source_value,
                            'targetValue': target_value
                        })
                
                # Update summary
                if row_has_differences:
                    comparison_result['summary']['differingRows'] += 1
                else:
                    comparison_result['summary']['matchingRows'] += 1
            
            return comparison_result
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error comparing CSV/XLSX files: {str(e)}")
            print(f"Error details: {error_details}")
            raise Exception(f"Error comparing CSV/XLSX files: {str(e)}")
    
    def compare_xml_files(self, source_data, target_data):
        """
        Compare two XML files and generate a difference report
        
        Args:
            source_data (dict): Source file data in standardized format
            target_data (dict): Target file data in standardized format
            
        Returns:
            dict: Comparison result with differences highlighted
        """
        try:
            # Use the columns from source_data to maintain source file order
            source_columns = source_data.get('columns', [])
            # Get columns from target that aren't in source
            target_columns = [col for col in target_data.get('columns', []) if col not in source_columns]
            
            # Maintain source file order first, then add any target-only columns at the end
            all_columns = source_columns + target_columns
            
            # Add columns to the result to ensure frontend preserves the order
            comparison_columns = source_columns.copy()
            
            # Prepare comparison result
            comparison_result = {
                'fileType': 'xml',
                'columns': comparison_columns,  # Include source columns in order
                'summary': {
                    'totalRows': len(all_columns),
                    'matchingRows': 0,
                    'differingRows': 0
                },
                'rows': []  # Array to store row comparisons
            }
            
            # Get source and target rows (for XML, there's typically just one row with all paths)
            source_row = source_data.get('rows', [{}])[0] if source_data.get('rows') else {}
            target_row = target_data.get('rows', [{}])[0] if target_data.get('rows') else {}
            
            # Compare each path
            row_comparison = {
                'hasDifferences': False,
                'cells': {}
            }
            
            for col in all_columns:
                source_value = source_row.get(col)
                target_value = target_row.get(col)
                
                # Normalize values for comparison
                source_str = str(source_value).strip() if source_value is not None else None
                target_str = str(target_value).strip() if target_value is not None else None
                
                # Handle empty strings as None
                if source_str == "":
                    source_str = None
                if target_str == "":
                    target_str = None
                
                # Determine status
                if source_str is None and target_str is None:
                    status = 'match'  # Both are null/empty
                elif source_str is None:
                    status = 'target_only'  # Only in target
                    row_comparison['hasDifferences'] = True
                elif target_str is None:
                    status = 'source_only'  # Only in source
                    row_comparison['hasDifferences'] = True
                elif source_str == target_str:
                    status = 'match'  # Values match
                else:
                    status = 'different'  # Values differ
                    row_comparison['hasDifferences'] = True
                
                # Check if this is an empty node
                is_empty = False
                if col + "_isEmpty" in source_row:
                    is_empty = source_row[col + "_isEmpty"]
                
                # Add to cells
                row_comparison['cells'][col] = {
                    'sourceValue': source_value,
                    'targetValue': target_value,
                    'status': status,
                    'isEmpty': is_empty
                }
                
                # Update summary
                if status == 'match':
                    comparison_result['summary']['matchingRows'] += 1
                else:
                    comparison_result['summary']['differingRows'] += 1
            
            # Add row comparison to result
            comparison_result['rows'].append(row_comparison)
            
            # Include original source file structure information
            if 'originalLines' in source_data:
                comparison_result['originalSourceLines'] = source_data['originalLines']
            
            return comparison_result
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error comparing XML files: {str(e)}")
            print(f"Error details: {error_details}")
            raise Exception(f"Error comparing XML files: {str(e)}")
    
    def preview_file(self, request):
        """
        Process a single file and return a preview of its data
        """
        try:
            # Check if file is present in the request
            if 'file' not in request.files:
                return jsonify({'error': 'File is required'}), 400
            
            file = request.files['file']
            
            # Check if filename is empty
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            
            # Check if file is allowed type
            if not self.allowed_file(file.filename):
                return jsonify({'error': 'File type not supported'}), 400
            
            # Get file type
            file_type = self.get_file_type(file.filename)
            
            # Save file
            filename = secure_filename(file.filename)
            file_path = os.path.join(self.upload_folder, filename)
            file.save(file_path)
            
            print(f"File saved to {file_path}, processing for preview...")
            
            # Process file based on its type
            try:
                preview_data = self.process_file(file_path, file_type)
                
                # For preview, limit to first 10 rows
                if 'rows' in preview_data and len(preview_data['rows']) > 10:
                    preview_data['rows'] = preview_data['rows'][:10]
                
                print(f"Preview data generated successfully with {len(preview_data.get('rows', []))} rows")
                return jsonify(preview_data)
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"Error processing file for preview: {str(e)}")
                print(f"Error details: {error_details}")
                
                # Return a more informative error response
                return jsonify({
                    'error': f"Error processing file: {str(e)}",
                    'columns': ['Error'],
                    'rows': [{'Error': f"Could not process file: {str(e)}"}]
                }), 500
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            return jsonify({'error': str(e), 'details': error_details}), 500
    
    def upload_files(self, request):
        """
        Process the uploaded files and compare them
        """
        try:
            # Check if both files are present in the request
            if 'sourceFile' not in request.files or 'targetFile' not in request.files:
                return jsonify({'error': 'Both source and target files are required'}), 400
            
            source_file = request.files['sourceFile']
            target_file = request.files['targetFile']
            
            # Check if filenames are empty
            if source_file.filename == '' or target_file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            
            # Check if files are allowed types
            if not (self.allowed_file(source_file.filename) and self.allowed_file(target_file.filename)):
                return jsonify({'error': 'File type not supported'}), 400
            
            # Check if files are of the same type
            source_type = self.get_file_type(source_file.filename)
            target_type = self.get_file_type(target_file.filename)
            
            if source_type != target_type:
                return jsonify({'error': 'Files are of different types. Please upload files of the same format.'}), 400
            
            # Save files
            source_filename = secure_filename(source_file.filename)
            target_filename = secure_filename(target_file.filename)
            
            source_path = os.path.join(self.upload_folder, source_filename)
            target_path = os.path.join(self.upload_folder, target_filename)
            
            source_file.save(source_path)
            target_file.save(target_path)
            
            # Process files based on their type
            source_data = self.process_file(source_path, source_type)
            target_data = self.process_file(target_path, target_type)
            
            # Compare the files
            comparison_result = self.compare_files(source_data, target_data, file_type=source_type)
            
            return jsonify(comparison_result)
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            return jsonify({'error': str(e), 'details': error_details}), 500
    
    def health_check(self):
        """
        Simple health check endpoint
        """
        return jsonify({'status': 'ok'})
