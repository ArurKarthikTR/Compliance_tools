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
            
            # Handle potential NaN values and convert to appropriate types
            df = df.fillna('')
            
            # Convert all numeric columns to string to ensure consistent comparison
            for col in df.select_dtypes(include=['number']).columns:
                df[col] = df[col].astype(str)
                
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
                    elif isinstance(value, (int, float)):
                        # Format numbers consistently
                        row_dict[col] = str(value)
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
            start_time = pd.Timestamp.now()
            
            # Use nrows parameter to check the first few rows to determine header
            sample_df = pd.read_excel(file_path, engine='openpyxl', nrows=10)
            
            # Check if columns are unnamed
            unnamed_count = sum(1 for col in sample_df.columns if 'Unnamed:' in str(col))
            
            # Determine the header row based on the sample
            header_row = 0
            if unnamed_count > len(sample_df.columns) / 2:
                # Try with header in row 1
                header_row = 1
                sample_df = pd.read_excel(file_path, engine='openpyxl', nrows=10, header=1)
                unnamed_count = sum(1 for col in sample_df.columns if 'Unnamed:' in str(col))
                
                if unnamed_count > len(sample_df.columns) / 2:
                    # Try with header in row 2
                    header_row = 2
            
            print(f"Determined header row: {header_row}")
            
            # Now read the actual data with the determined header row
            # Use chunksize for better memory management with large files
            df = pd.read_excel(file_path, engine='openpyxl', header=header_row)
            
            # Handle potential NaN values first
            df = df.fillna('')
            
            # Optimize memory usage
            # Convert object columns to category if they have few unique values
            # Only do this after handling NaN values to avoid categorical errors
            for col in df.select_dtypes(include=['object']).columns:
                if df[col].nunique() < len(df) * 0.5:  # If less than 50% unique values
                    df[col] = df[col].astype('category')
            
            # Convert all numeric columns to string to ensure consistent comparison
            for col in df.select_dtypes(include=['number']).columns:
                df[col] = df[col].astype(str)
                
            # Convert DataFrame to a standardized format
            columns = df.columns.tolist()
            
            # Convert rows to list of dictionaries more efficiently
            # Use df.to_dict(orient='records') which is faster than iterating
            rows = df.to_dict(orient='records')
            
            # Post-process the rows to ensure consistent string representation
            for row_dict in rows:
                for col, value in row_dict.items():
                    if value == '':
                        row_dict[col] = None
                    elif value is not None:
                        row_dict[col] = str(value)
            
            end_time = pd.Timestamp.now()
            processing_time = (end_time - start_time).total_seconds()
            print(f"Excel processing completed in {processing_time:.2f} seconds")
            
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
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            # Extract paths to all nodes to use as columns
            all_paths = set()
            
            def collect_paths(element, current_path=""):
                path = current_path + "/" + element.tag if current_path else element.tag
                
                # Add attributes as paths
                for attr_name, attr_value in element.attrib.items():
                    attr_path = f"{path}[@{attr_name}]"
                    all_paths.add(attr_path)
                
                # Add element path if it has text
                if element.text and element.text.strip():
                    all_paths.add(path)
                
                # Process children
                for child in element:
                    collect_paths(child, path)
            
            # Start collecting paths from root's children
            for child in root:
                collect_paths(child)
            
            columns = sorted(list(all_paths))
            
            # Process each child element as a row
            rows = []
            for child in root:
                row_dict = {}
                
                # Function to extract values based on path
                def extract_value(element, path_parts):
                    if not path_parts:
                        return None
                        
                    current = path_parts[0]
                    
                    # Handle attribute paths
                    if current.startswith("[") and current.endswith("]"):
                        attr_name = current[2:-1]  # Extract attribute name
                        return element.attrib.get(attr_name)
                        
                    # Handle element paths
                    if current == element.tag:
                        if len(path_parts) == 1:
                            # This is the target element
                            return element.text.strip() if element.text else None
                        else:
                            # Need to go deeper
                            for child in element:
                                result = extract_value(child, path_parts[1:])
                                if result is not None:
                                    return result
                    
                    return None
                
                # Extract values for each path
                for col in columns:
                    path_parts = col.split("/")
                    row_dict[col] = extract_value(child, path_parts)
                    
                rows.append(row_dict)
            
            return {
                'columns': columns,
                'rows': rows
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
        try:
            # Print debug information
            print(f"Source data structure: {source_data.keys() if isinstance(source_data, dict) else 'Not a dict'}")
            print(f"Target data structure: {target_data.keys() if isinstance(target_data, dict) else 'Not a dict'}")
            
            if 'columns' in source_data:
                print(f"Source columns: {source_data['columns']}")
            if 'rows' in source_data:
                print(f"Source rows count: {len(source_data['rows'])}")
            if 'columns' in target_data:
                print(f"Target columns: {target_data['columns']}")
            if 'rows' in target_data:
                print(f"Target rows count: {len(target_data['rows'])}")
            
            # Ensure both files have the same structure
            if not self._validate_structure(source_data, target_data):
                raise ValueError("Files have incompatible structures for comparison")
            
            # Get all columns (union of both files' columns)
            all_columns = sorted(list(set(source_data['columns'] + target_data['columns'])))
            print(f"All columns for comparison: {all_columns}")
            
            # Prepare comparison result
            comparison_result = {
                'fileType': file_type,
                'columns': all_columns,
                'rows': [],
                'summary': {
                    'totalRows': max(len(source_data['rows']), len(target_data['rows'])),
                    'matchingRows': 0,
                    'differingRows': 0,
                    'extraRowsInSource': 0,
                    'extraRowsInTarget': 0
                }
            }
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error in compare_files initial setup: {str(e)}")
            print(f"Error details: {error_details}")
            raise
        
        # Compare rows
        source_rows = source_data['rows']
        target_rows = target_data['rows']
        
        # Find matching rows and differences
        matched_target_indices = set()
        
        for source_idx, source_row in enumerate(source_rows):
            best_match_idx = self._find_best_match(source_row, target_rows, matched_target_indices)
            
            if best_match_idx is not None:
                # Found a matching row
                target_row = target_rows[best_match_idx]
                matched_target_indices.add(best_match_idx)
                
                # Compare the rows cell by cell
                row_comparison = self._compare_row(source_row, target_row, all_columns)
                
                if row_comparison['hasDifferences']:
                    comparison_result['summary']['differingRows'] += 1
                else:
                    comparison_result['summary']['matchingRows'] += 1
                    
                comparison_result['rows'].append(row_comparison)
            else:
                # Row exists only in source
                comparison_result['summary']['extraRowsInSource'] += 1
                row_comparison = {
                    'rowIndex': source_idx,
                    'hasDifferences': True,
                    'cells': {}
                }
                
                for col in all_columns:
                    value = source_row.get(col)
                    row_comparison['cells'][col] = {
                        'sourceValue': value,
                        'targetValue': None,
                        'status': 'source_only'
                    }
                
                comparison_result['rows'].append(row_comparison)
        
        # Add rows that exist only in target
        for target_idx, target_row in enumerate(target_rows):
            if target_idx not in matched_target_indices:
                comparison_result['summary']['extraRowsInTarget'] += 1
                row_comparison = {
                    'rowIndex': target_idx,
                    'hasDifferences': True,
                    'cells': {}
                }
                
                for col in all_columns:
                    value = target_row.get(col)
                    row_comparison['cells'][col] = {
                        'sourceValue': None,
                        'targetValue': value,
                        'status': 'target_only'
                    }
                
                comparison_result['rows'].append(row_comparison)
        
        return comparison_result

    def _validate_structure(self, source_data, target_data):
        """
        Validate that both files have compatible structures for comparison
        
        Args:
            source_data (dict): Source file data
            target_data (dict): Target file data
            
        Returns:
            bool: True if structures are compatible, False otherwise
        """
        # Basic structure validation
        if not isinstance(source_data, dict) or not isinstance(target_data, dict):
            return False
        
        if 'columns' not in source_data or 'rows' not in source_data:
            return False
        
        if 'columns' not in target_data or 'rows' not in target_data:
            return False
        
        # Files can have different columns, we'll handle that in the comparison
        return True

    def _create_row_fingerprint(self, row):
        """
        Create a simple fingerprint of a row for quick comparison
        
        Args:
            row (dict): Row data
            
        Returns:
            dict: Fingerprint with value lengths and first/last chars
        """
        fingerprint = {}
        for key, value in row.items():
            if value is None:
                fingerprint[key] = (0, '', '')
            else:
                str_val = str(value)
                fingerprint[key] = (
                    len(str_val),
                    str_val[:1] if str_val else '',
                    str_val[-1:] if str_val else ''
                )
        return fingerprint
        
    def _fingerprint_similarity(self, fp1, fp2):
        """
        Calculate similarity between two fingerprints
        
        Args:
            fp1 (dict): First fingerprint
            fp2 (dict): Second fingerprint
            
        Returns:
            float: Similarity score (0-1)
        """
        # Get common keys
        common_keys = set(fp1.keys()) & set(fp2.keys())
        
        if not common_keys:
            return 0
            
        matches = 0
        for key in common_keys:
            len1, first1, last1 = fp1[key]
            len2, first2, last2 = fp2[key]
            
            # Length similarity
            len_sim = 1.0 - min(abs(len1 - len2) / max(len1 + len2, 1), 1.0)
            
            # First/last char match
            char_match = 0
            if first1 == first2:
                char_match += 0.5
            if last1 == last2:
                char_match += 0.5
                
            matches += (len_sim * 0.5) + (char_match * 0.5)
            
        return matches / len(common_keys)
        
    def _find_best_match(self, source_row, target_rows, matched_indices):
        """
        Find the best matching row in target_rows for the given source_row
        
        Args:
            source_row (dict): Source row
            target_rows (list): List of target rows
            matched_indices (set): Set of already matched target row indices
            
        Returns:
            int or None: Index of the best matching row, or None if no match found
        """
        best_match_idx = None
        best_match_score = 0
        
        # Create a quick fingerprint of the source row for faster initial filtering
        source_fingerprint = self._create_row_fingerprint(source_row)
        
        # First pass: quick filtering using fingerprints
        potential_matches = []
        for idx, target_row in enumerate(target_rows):
            if idx in matched_indices:
                continue
                
            # Quick check using fingerprint
            target_fingerprint = self._create_row_fingerprint(target_row)
            if self._fingerprint_similarity(source_fingerprint, target_fingerprint) > 0.2:
                potential_matches.append(idx)
        
        # If we have too many potential matches, limit to the most promising ones
        if len(potential_matches) > 50:
            # Sort by a quick similarity estimate and take top 50
            potential_matches.sort(
                key=lambda idx: self._fingerprint_similarity(
                    source_fingerprint, 
                    self._create_row_fingerprint(target_rows[idx])
                ),
                reverse=True
            )
            potential_matches = potential_matches[:50]
        
        # Second pass: detailed comparison only on potential matches
        for idx in potential_matches:
            # Calculate detailed similarity score
            score = self._calculate_similarity(source_row, target_rows[idx])
            
            if score > best_match_score:
                best_match_score = score
                best_match_idx = idx
        
        # Use a threshold to determine if it's a good match
        # This helps with detecting moved rows vs completely different rows
        if best_match_score < 0.3:  # Require at least 30% similarity
            return None
        
        return best_match_idx

    def _calculate_similarity(self, row1, row2):
        """
        Calculate similarity score between two rows
        
        Args:
            row1 (dict): First row
            row2 (dict): Second row
            
        Returns:
            float: Similarity score (0-1)
        """
        # Get common keys
        common_keys = set(row1.keys()) & set(row2.keys())
        
        if not common_keys:
            return 0
        
        # Count matching values with weighted scoring
        matches = 0
        total_weight = 0
        
        # First, check for exact matches which are faster to compute
        exact_match_keys = []
        non_exact_match_keys = []
        
        for key in common_keys:
            # Skip None values
            if row1.get(key) is None or row2.get(key) is None:
                continue
                
            # Convert values to strings for comparison
            val1 = str(row1.get(key)).strip() if row1.get(key) is not None else ""
            val2 = str(row2.get(key)).strip() if row2.get(key) is not None else ""
            
            # Check for exact matches first (faster)
            if val1 == val2:
                exact_match_keys.append(key)
            else:
                non_exact_match_keys.append((key, val1, val2))
        
        # Process exact matches (weight = 1.0)
        matches += len(exact_match_keys)
        total_weight += len(exact_match_keys)
        
        # Process non-exact matches (need similarity calculation)
        for key, val1, val2 in non_exact_match_keys:
            # For very long values, use a faster approximation
            similarity = self._string_similarity(val1, val2)
            matches += similarity
            total_weight += 1
        
        # Calculate similarity score
        if total_weight == 0:
            return 0
        
        return matches / total_weight

    def _string_similarity(self, s1, s2):
        """
        Calculate similarity between two strings
        
        Args:
            s1 (str): First string
            s2 (str): Second string
            
        Returns:
            float: Similarity score (0-1)
        """
        # If strings are identical
        if s1 == s2:
            return 1.0
            
        # If one string is empty
        if not s1 or not s2:
            return 0.0
            
        # For long strings, use a faster approximation
        if len(s1) > 50 or len(s2) > 50:
            # Compare first and last N characters
            n = 20
            prefix_sim = self._quick_similarity(s1[:n], s2[:n])
            suffix_sim = self._quick_similarity(s1[-n:], s2[-n:])
            
            # Length similarity
            len_diff = abs(len(s1) - len(s2))
            max_len = max(len(s1), len(s2))
            len_sim = 1.0 - (len_diff / max_len if max_len > 0 else 0)
            
            # Weighted combination
            return (0.4 * prefix_sim) + (0.4 * suffix_sim) + (0.2 * len_sim)
        
        # For shorter strings, use difflib's SequenceMatcher which is faster than Levenshtein
        # for shorter strings but still accurate
        import difflib
        return difflib.SequenceMatcher(None, s1, s2).ratio()
        
    def _quick_similarity(self, s1, s2):
        """
        Quick similarity check for string segments
        
        Args:
            s1 (str): First string segment
            s2 (str): Second string segment
            
        Returns:
            float: Similarity score (0-1)
        """
        if s1 == s2:
            return 1.0
            
        if not s1 or not s2:
            return 0.0
            
        # Count matching characters
        matches = sum(c1 == c2 for c1, c2 in zip(s1, s2))
        return matches / max(len(s1), len(s2))

    def _levenshtein_distance(self, s1, s2):
        """
        Calculate Levenshtein distance between two strings
        
        Args:
            s1 (str): First string
            s2 (str): Second string
            
        Returns:
            int: Levenshtein distance
        """
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]

    def _compare_row(self, source_row, target_row, all_columns):
        """
        Compare two rows cell by cell
        
        Args:
            source_row (dict): Source row
            target_row (dict): Target row
            all_columns (list): List of all columns
            
        Returns:
            dict: Row comparison result
        """
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
                
            if source_str == target_str:
                status = 'match'
            else:
                status = 'different'
                row_comparison['hasDifferences'] = True
            
            row_comparison['cells'][col] = {
                'sourceValue': source_value,
                'targetValue': target_value,
                'status': status
            }
        
        return row_comparison
    
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
            
            # Process file based on its type
            if file_type == 'xlsx':
                # For Excel files, we'll use a special preview method
                preview_data = self._preview_excel(file_path)
            else:
                # For other file types, just use the regular process method
                preview_data = self.process_file(file_path, file_type)
            
            return jsonify(preview_data)
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            return jsonify({'error': str(e), 'details': error_details}), 500
    
    def _preview_excel(self, file_path):
        """
        Process an Excel file and return a preview of its data (first 10 rows)
        """
        try:
            print(f"Previewing Excel file: {file_path}")
            
            # Use nrows parameter to check the first few rows to determine header
            sample_df = pd.read_excel(file_path, engine='openpyxl', nrows=10)
            
            # Check if columns are unnamed
            unnamed_count = sum(1 for col in sample_df.columns if 'Unnamed:' in str(col))
            
            # Determine the header row based on the sample
            header_row = 0
            if unnamed_count > len(sample_df.columns) / 2:
                # Try with header in row 1
                header_row = 1
                sample_df = pd.read_excel(file_path, engine='openpyxl', nrows=10, header=1)
                unnamed_count = sum(1 for col in sample_df.columns if 'Unnamed:' in str(col))
                
                if unnamed_count > len(sample_df.columns) / 2:
                    # Try with header in row 2
                    header_row = 2
                    sample_df = pd.read_excel(file_path, engine='openpyxl', nrows=10, header=2)
            
            # Handle potential NaN values first
            sample_df = sample_df.fillna('')
            
            # Convert all numeric columns to string to ensure consistent representation
            for col in sample_df.select_dtypes(include=['number']).columns:
                sample_df[col] = sample_df[col].astype(str)
                
            # Note: We don't convert to category type here since we're just previewing
            # and don't need the memory optimization
                
            # Convert DataFrame to a standardized format
            columns = sample_df.columns.tolist()
            
            # Convert rows to list of dictionaries
            rows = sample_df.to_dict(orient='records')
            
            # Post-process the rows to ensure consistent string representation
            for row_dict in rows:
                for col, value in row_dict.items():
                    if value == '':
                        row_dict[col] = None
                    elif value is not None:
                        row_dict[col] = str(value)
            
            return {
                'columns': columns,
                'rows': rows
            }
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error previewing Excel file: {str(e)}")
            print(f"Error details: {error_details}")
            raise Exception(f"Error previewing Excel file: {str(e)}")
    
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
