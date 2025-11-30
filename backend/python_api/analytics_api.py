#analytics_api.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
import traceback
from analytics_processor import process_file_analytics, AnalyticsProcessor

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'public', 'uploads', 'fileRepository')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

print(f"📁 Looking for files in: {os.path.abspath(UPLOAD_FOLDER)}")


def find_file_with_timestamp(filename):
    """Find file that might have a timestamp prefix from multer"""
    if not os.path.exists(UPLOAD_FOLDER):
        return None
    
    exact_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(exact_path):
        return filename
    
    all_files = os.listdir(UPLOAD_FOLDER)
    
    for file in all_files:
        if file.endswith(filename):
            print(f"✅ Found file with timestamp: {file}")
            return file
        
        if '-' in file:
            parts = file.split('-', 1)
            if len(parts) == 2 and parts[1] == filename:
                print(f"✅ Found file with timestamp prefix: {file}")
                return file
    
    filename_lower = filename.lower()
    for file in all_files:
        if filename_lower in file.lower():
            print(f"✅ Found similar file: {file}")
            return file
    
    return None


def load_file_data(filename):
    """Load and parse uploaded file - simplified version"""
    print(f"🔍 Looking for file: {filename}")
    
    actual_filename = find_file_with_timestamp(filename)
    
    if not actual_filename:
        available_files = os.listdir(UPLOAD_FOLDER) if os.path.exists(UPLOAD_FOLDER) else []
        print(f"❌ File not found: {filename}")
        print(f"📂 Available files: {available_files}")
        raise FileNotFoundError(f"File not found: {filename}")
    
    filepath = os.path.join(UPLOAD_FOLDER, actual_filename)
    print(f"✅ Using file: {actual_filename}")
    print(f"📁 Full path: {filepath}")
    
    file_ext = os.path.splitext(actual_filename)[1].lower()
    
    try:
        # Read file based on extension
        if file_ext == '.csv':
            df = pd.read_csv(filepath, low_memory=False)
        elif file_ext in ['.xlsx', '.xls']:
            # Read first few rows without header to analyze structure
            df_preview = pd.read_excel(filepath, header=None, nrows=5, engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
            
            # Find which row has the actual column headers
            # Look for the row with most non-empty text values
            best_header_row = 0
            max_text_count = 0
            
            for idx in range(min(4, len(df_preview))):
                row = df_preview.iloc[idx]
                # Count non-numeric, non-empty cells (likely headers)
                text_count = sum(1 for val in row if pd.notna(val) and not isinstance(val, (int, float)))
                if text_count > max_text_count:
                    max_text_count = text_count
                    best_header_row = idx
            
            print(f"📋 Detected header row at index: {best_header_row}")
            
            # Now read the full file with the correct header row
            df = pd.read_excel(filepath, header=best_header_row, engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
            
            # Clean up column names - remove "Unnamed" and use meaningful names
            new_columns = []
            for i, col in enumerate(df.columns):
                col_str = str(col)
                if 'Unnamed' in col_str or pd.isna(col):
                    # Use first non-null value from this column as name, or default
                    first_val = None
                    for val in df.iloc[:3, i]:  # Check first 3 rows
                        if pd.notna(val) and str(val).strip():
                            first_val = str(val).strip()
                            break
                    
                    if first_val and not first_val.replace('.','').replace('-','').isdigit():
                        new_columns.append(first_val)
                    else:
                        new_columns.append(f"Column_{i+1}")
                else:
                    new_columns.append(col_str.strip())
            
            df.columns = new_columns
            print(f"📋 Renamed columns: {df.columns.tolist()}")
            
        elif file_ext == '.json':
            df = pd.read_json(filepath)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        print(f"✅ Successfully loaded file with {len(df)} rows and {len(df.columns)} columns")
        print(f"📊 Columns: {df.columns.tolist()}")
        print(f"📊 First few rows:\n{df.head(3)}")
        
        # Handle large files
        original_rows = len(df)
        if len(df) > 10000:
            print(f"⚠️ Large file detected ({len(df)} rows). Using first 10,000 rows.")
            df = df.head(10000)
        
        # Find numeric columns and detect enrollment data structure
        numeric_cols = []
        column_descriptions = {}  # Store descriptive names for columns
        enrollment_structure = {
            'total_1st_sem': None,
            'total_2nd_sem': None,
            'first_year_1st_sem': None,
            'first_year_2nd_sem': None,
            'old_students_1st_sem': None,
            'old_students_2nd_sem': None,
            'not_enrolled_1st_sem': None,
            'not_enrolled_2nd_sem': None,
            'dropout_1st_sem': None,
            'dropout_2nd_sem': None
        }
        
        # Read the actual header row to understand structure better
        # Look for category headers in the row above
        df_header_check = pd.read_excel(filepath, header=None, nrows=3, engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
        category_row = df_header_check.iloc[1] if len(df_header_check) > 1 else None  # Row with TOTAL ENROLLEES, 1ST YEAR ENROLLED, etc.
        semester_row = df_header_check.iloc[2] if len(df_header_check) > 2 else None  # Row with 1ST SEM, 2ND SEM
        
        for col_idx, col in enumerate(df.columns):
            # Try to convert column to numeric
            numeric_series = pd.to_numeric(df[col], errors='coerce')
            # If more than 30% of values are numeric, consider it a numeric column (lowered threshold for sparse data)
            valid_count = numeric_series.notna().sum()
            if valid_count > len(df) * 0.3:
                numeric_cols.append(col)
                df[col] = numeric_series
                
                # Detect what this column represents based on position and headers
                descriptive_name = None
                
                # Try to get category and semester from header rows
                if category_row is not None and semester_row is not None:
                    actual_col_idx = df.columns.tolist().index(col) + 1  # +1 because School Year is column 0
                    if actual_col_idx < len(category_row):
                        category = str(category_row.iloc[actual_col_idx]).strip().upper() if pd.notna(category_row.iloc[actual_col_idx]) else ""
                        semester = str(semester_row.iloc[actual_col_idx]).strip().upper() if pd.notna(semester_row.iloc[actual_col_idx]) else ""
                        
                        # Build descriptive name
                        if "TOTAL" in category and "ENROLLEES" in category:
                            if "1ST" in semester:
                                descriptive_name = "Total Enrollees - 1st Semester"
                                enrollment_structure['total_1st_sem'] = col
                            elif "2ND" in semester:
                                descriptive_name = "Total Enrollees - 2nd Semester"
                                enrollment_structure['total_2nd_sem'] = col
                        
                        elif "1ST YEAR" in category or "FIRST YEAR" in category:
                            if "1ST" in semester:
                                descriptive_name = "1st Year Enrolled - 1st Semester"
                                enrollment_structure['first_year_1st_sem'] = col
                            elif "2ND" in semester:
                                descriptive_name = "1st Year Enrolled - 2nd Semester"
                                enrollment_structure['first_year_2nd_sem'] = col
                        
                        elif "OLD" in category and "STUDENT" in category:
                            if "1ST" in semester:
                                descriptive_name = "Old Students - 1st Semester"
                                enrollment_structure['old_students_1st_sem'] = col
                            elif "2ND" in semester:
                                descriptive_name = "Old Students - 2nd Semester"
                                enrollment_structure['old_students_2nd_sem'] = col
                        
                        elif "NOT" in category and "ENROLLED" in category:
                            if "1ST" in semester:
                                descriptive_name = "Not Enrolled - 1st Semester"
                                enrollment_structure['not_enrolled_1st_sem'] = col
                            elif "2ND" in semester:
                                descriptive_name = "Not Enrolled - 2nd Semester"
                                enrollment_structure['not_enrolled_2nd_sem'] = col
                        
                        elif "DROP" in category or "DROPOUT" in category:
                            if "1ST" in semester:
                                descriptive_name = "Drop-out Rate - 1st Semester"
                                enrollment_structure['dropout_1st_sem'] = col
                            elif "2ND" in semester:
                                descriptive_name = "Drop-out Rate - 2nd Semester"
                                enrollment_structure['dropout_2nd_sem'] = col
                
                # If we couldn't detect from headers, use column name
                if not descriptive_name:
                    col_str = str(col).strip()
                    if col_str and not col_str.startswith('Column_') and not col_str.startswith('Unnamed'):
                        descriptive_name = col_str
                    else:
                        descriptive_name = f"Data Series {col_idx + 1}"
                
                column_descriptions[col] = descriptive_name
        
        if not numeric_cols:
            print(f"❌ No numeric columns found")
            print(f"Column types: {df.dtypes.to_dict()}")
            print(f"Sample data:\n{df.head()}")
            raise ValueError("No numeric columns found in file. Please ensure your file contains numeric data.")
        
        print(f"✅ Found {len(numeric_cols)} numeric columns: {numeric_cols}")
        print(f"📝 Column descriptions: {column_descriptions}")
        print(f"📊 Detected enrollment structure: {enrollment_structure}")
        
        # Use first numeric column by default (will be selectable later)
        column_name_raw = numeric_cols[0]
        column_name = column_descriptions.get(column_name_raw, column_name_raw)
        
        # Extract data - convert to list and remove NaN
        data_series = pd.to_numeric(df[column_name_raw], errors='coerce')
        valid_data = data_series.dropna()
        data = valid_data.tolist()
        
        print(f"✅ Extracted {len(data)} valid numeric values from column '{column_name}'")
        
        if len(data) == 0:
            raise ValueError(f"Column '{column_name}' contains no valid numeric data")
        
        # Get labels from first column if it's not numeric
        first_col = df.columns[0]
        if first_col not in numeric_cols:
            # Get labels corresponding to valid data indices
            labels = df.loc[valid_data.index, first_col].astype(str).tolist()
        else:
            labels = [f"Row {i+1}" for i in range(len(data))]
        
        print(f"✅ Prepared {len(data)} values with {len(labels)} labels")
        print(f"📊 Using descriptive column name: '{column_name}'")
        
        # Return all available columns for frontend selection
        available_columns = [
            {
                'raw_name': col,
                'display_name': column_descriptions[col],
                'data_count': int(pd.to_numeric(df[col], errors='coerce').notna().sum())
            }
            for col in numeric_cols
        ]
        
        return {
            'data': data,
            'labels': labels,
            'column_name': column_name,
            'column_name_raw': column_name_raw,
            'filename': actual_filename,
            'total_columns': len(df.columns),
            'numeric_columns': numeric_cols,
            'column_descriptions': column_descriptions,
            'available_columns': available_columns,
            'enrollment_structure': enrollment_structure,
            'total_rows': original_rows,
            'processed_rows': len(data),
            'full_dataframe': df  # Include full dataframe for multi-column analysis
        }
        
    except Exception as e:
        print(f"❌ Error parsing file: {str(e)}")
        print(traceback.format_exc())
        raise Exception(f"Error parsing file: {str(e)}")


@app.route('/api/analytics/process', methods=['POST'])
def process_analytics():
    """Process analytics for a specific file"""
    try:
        data = request.get_json()
        
        print(f"📥 Received request: {data}")
        
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename is required'}), 400
        
        filename = data['filename']
        chart_type = data.get('chart_type', 'bar')
        selected_column = data.get('column', None)  # Allow column selection
        
        print(f"🔄 Processing: {filename} with chart type: {chart_type}")
        if selected_column:
            print(f"📊 Specific column requested: {selected_column}")
        
        # Load file data
        file_data = load_file_data(filename)
        
        # If a specific column is requested, use that instead
        if selected_column and selected_column in file_data.get('numeric_columns', []):
            df = file_data['full_dataframe']
            column_name_raw = selected_column
            column_name = file_data['column_descriptions'].get(selected_column, selected_column)
            
            # Extract data for the selected column
            data_series = pd.to_numeric(df[selected_column], errors='coerce')
            valid_data = data_series.dropna()
            
            # Get corresponding labels
            first_col = df.columns[0]
            if first_col not in file_data['numeric_columns']:
                labels = df.loc[valid_data.index, first_col].astype(str).tolist()
            else:
                labels = [f"Row {i+1}" for i in range(len(valid_data))]
            
            # Update file_data with selected column
            file_data['data'] = valid_data.tolist()
            file_data['labels'] = labels
            file_data['column_name'] = column_name
            file_data['column_name_raw'] = column_name_raw
            
            print(f"✅ Using selected column: {column_name} with {len(valid_data)} values")
        
        # Process analytics
        analytics_result = process_file_analytics(file_data, chart_type)
        
        if 'error' in analytics_result:
            return jsonify(analytics_result), 500
        
        # Add file metadata including all available columns
        analytics_result['file_info'] = {
            'filename': filename,
            'total_columns': file_data['total_columns'],
            'numeric_columns': file_data['numeric_columns'],
            'column_descriptions': file_data.get('column_descriptions', {}),
            'available_columns': file_data.get('available_columns', []),
            'enrollment_structure': file_data.get('enrollment_structure', {}),
            'total_rows': file_data['total_rows'],
            'analyzed_column': file_data['column_name']
        }
        
        print(f"✅ Successfully processed {filename}")
        
        return jsonify(analytics_result), 200
        
    except FileNotFoundError as e:
        error_msg = str(e)
        print(f"❌ File not found: {error_msg}")
        return jsonify({
            'error': error_msg,
            'upload_folder': os.path.abspath(UPLOAD_FOLDER),
            'available_files': os.listdir(UPLOAD_FOLDER) if os.path.exists(UPLOAD_FOLDER) else []
        }), 404
    except Exception as e:
        error_msg = f'Processing failed: {str(e)}'
        print(f"❌ Error: {error_msg}")
        print(traceback.format_exc())
        return jsonify({
            'error': error_msg,
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/analytics/batch-process', methods=['POST'])
def batch_process_analytics():
    """Process analytics for multiple files"""
    try:
        data = request.get_json()
        
        if not data or 'files' not in data:
            return jsonify({'error': 'Files array is required'}), 400
        
        results = []
        errors = []
        
        for file_config in data['files']:
            filename = file_config.get('filename')
            chart_type = file_config.get('chart_type', 'bar')
            
            if not filename:
                errors.append({'filename': 'unknown', 'error': 'Filename missing'})
                continue
            
            try:
                file_data = load_file_data(filename)
                analytics_result = process_file_analytics(file_data, chart_type)
                
                analytics_result['file_info'] = {
                    'filename': filename,
                    'analyzed_column': file_data['column_name']
                }
                
                results.append(analytics_result)
                
            except Exception as e:
                errors.append({'filename': filename, 'error': str(e)})
        
        return jsonify({
            'results': results,
            'errors': errors,
            'total_processed': len(results),
            'total_errors': len(errors)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Batch processing failed: {str(e)}'}), 500


@app.route('/api/analytics/files', methods=['GET'])
def list_available_files():
    """List all available files in the upload directory"""
    try:
        if not os.path.exists(UPLOAD_FOLDER):
            return jsonify({
                'error': 'Upload folder does not exist',
                'path': os.path.abspath(UPLOAD_FOLDER),
                'files': []
            }), 404
        
        files = [f for f in os.listdir(UPLOAD_FOLDER) 
                if f.endswith(('.csv', '.xlsx', '.xls', '.json'))]
        
        return jsonify({
            'files': files,
            'count': len(files),
            'upload_folder': os.path.abspath(UPLOAD_FOLDER)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Analytics API',
        'version': '1.0.0',
        'upload_folder': os.path.abspath(UPLOAD_FOLDER),
        'upload_folder_exists': os.path.exists(UPLOAD_FOLDER),
        'available_files': len([f for f in os.listdir(UPLOAD_FOLDER) 
                               if f.endswith(('.csv', '.xlsx', '.xls', '.json'))]) 
                               if os.path.exists(UPLOAD_FOLDER) else 0
    }), 200


@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'Analytics API is running',
        'endpoints': {
            'health': '/api/health',
            'process': '/api/analytics/process [POST]',
            'batch_process': '/api/analytics/batch-process [POST]',
            'files': '/api/analytics/files [GET]'
        }
    }), 200


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Analytics API Server")
    print("=" * 60)
    print(f"📁 Upload folder: {os.path.abspath(UPLOAD_FOLDER)}")
    print(f"📂 Folder exists: {os.path.exists(UPLOAD_FOLDER)}")
    
    if os.path.exists(UPLOAD_FOLDER):
        files = [f for f in os.listdir(UPLOAD_FOLDER) 
                if f.endswith(('.csv', '.xlsx', '.xls', '.json'))]
        print(f"📊 Available files ({len(files)}): {files}")
    else:
        print("⚠️ Upload folder does not exist! Creating it...")
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    print("=" * 60)
    print("🌐 Server will run on: http://localhost:5000")
    print("🔗 Health check: http://localhost:5000/api/health")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)