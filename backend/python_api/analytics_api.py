#analytics_api.py - Fixed for proper enrollment data structure
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
    """Load and parse uploaded file with proper enrollment structure detection"""
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
        # Read the Excel file without header first to detect structure
        df_raw = pd.read_excel(filepath, header=None, engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
        
        print(f"📋 Raw file preview:\n{df_raw.head(5)}")
        
        # Find the title row (should contain "Statistical Data of Enrollment")
        title_row = None
        for idx in range(min(3, len(df_raw))):
            row_text = ' '.join([str(val) for val in df_raw.iloc[idx] if pd.notna(val)])
            if 'Statistical Data of Enrollment' in row_text or 'STATISTICAL DATA' in row_text.upper():
                title_row = idx
                print(f"📋 Found title at row {idx}")
                break
        
        # Find main headers row (TOTAL ENROLLEES, 1ST YEAR ENROLLED, etc.)
        main_header_row = None
        sub_header_row = None
        
        for idx in range(title_row + 1 if title_row is not None else 0, min(5, len(df_raw))):
            row_text = ' '.join([str(val) for val in df_raw.iloc[idx] if pd.notna(val)]).upper()
            if 'TOTAL ENROLLEES' in row_text or 'ENROLLEES' in row_text:
                main_header_row = idx
                sub_header_row = idx + 1
                print(f"📋 Found main headers at row {idx}")
                print(f"📋 Sub headers at row {idx + 1}")
                break
        
        if main_header_row is None:
            raise ValueError("Could not find enrollment data structure headers")
        
        # Extract main headers and sub headers
        main_headers = df_raw.iloc[main_header_row].tolist()
        sub_headers = df_raw.iloc[sub_header_row].tolist()
        
        print(f"📊 Main headers: {main_headers}")
        print(f"📊 Sub headers: {sub_headers}")
        
        # Build proper column names combining main headers and sub headers
        column_names = ['School Year']  # First column is always School Year
        column_descriptions = {}
        current_main = None
        
        for i in range(1, len(main_headers)):
            main_val = str(main_headers[i]).strip() if pd.notna(main_headers[i]) else ''
            sub_val = str(sub_headers[i]).strip() if pd.notna(sub_headers[i]) else ''
            
            # Update current main header if we have a new one
            if main_val and main_val not in ['nan', '']:
                current_main = main_val
            
            # Create combined column name
            if current_main and sub_val and sub_val not in ['nan', '']:
                # Clean up the names
                main_clean = current_main.replace('\n', ' ').strip()
                sub_clean = sub_val.replace('\n', ' ').strip().upper()
                
                # Format: "Main Header - Sub Header"
                col_name = f"{main_clean} - {sub_clean}"
                column_names.append(col_name)
                column_descriptions[col_name] = col_name
            else:
                column_names.append(f"Column_{i}")
        
        print(f"✅ Built column names: {column_names}")
        
        # Read the actual data starting from the row after sub headers
        data_start_row = sub_header_row + 1
        df = pd.read_excel(filepath, header=None, skiprows=data_start_row, 
                          engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
        
        # Ensure we have the right number of columns
        if len(df.columns) < len(column_names):
            column_names = column_names[:len(df.columns)]
        elif len(df.columns) > len(column_names):
            for i in range(len(column_names), len(df.columns)):
                column_names.append(f"Extra_Column_{i}")
        
        df.columns = column_names
        
        print(f"✅ Data loaded with {len(df)} rows")
        print(f"📊 Columns: {df.columns.tolist()}")
        print(f"📊 First few rows:\n{df.head(3)}")
        
        # Find numeric columns (exclude School Year)
        numeric_cols = []
        for col in df.columns[1:]:  # Skip first column (School Year)
            numeric_series = pd.to_numeric(df[col], errors='coerce')
            valid_count = numeric_series.notna().sum()
            if valid_count > len(df) * 0.3:  # At least 30% valid numeric data
                numeric_cols.append(col)
                df[col] = numeric_series
        
        if not numeric_cols:
            raise ValueError("No numeric columns found in the enrollment data")
        
        print(f"✅ Found {len(numeric_cols)} numeric columns")
        
        # Build enrollment structure mapping
        enrollment_structure = {}
        for col in numeric_cols:
            col_upper = col.upper()
            if 'TOTAL ENROLLEES' in col_upper:
                if '1ST SEM' in col_upper:
                    enrollment_structure['total_1st_sem'] = col
                elif '2ND SEM' in col_upper:
                    enrollment_structure['total_2nd_sem'] = col
            elif '1ST YEAR' in col_upper or 'FIRST YEAR' in col_upper:
                if '1ST SEM' in col_upper:
                    enrollment_structure['first_year_1st_sem'] = col
                elif '2ND SEM' in col_upper:
                    enrollment_structure['first_year_2nd_sem'] = col
            elif 'OLD STUDENT' in col_upper:
                if '1ST SEM' in col_upper:
                    enrollment_structure['old_students_1st_sem'] = col
                elif '2ND SEM' in col_upper:
                    enrollment_structure['old_students_2nd_sem'] = col
            elif 'NOT ENROLLED' in col_upper:
                if '1ST SEM' in col_upper:
                    enrollment_structure['not_enrolled_1st_sem'] = col
                elif '2ND SEM' in col_upper:
                    enrollment_structure['not_enrolled_2nd_sem'] = col
            elif 'DROP' in col_upper:
                if '1ST SEM' in col_upper:
                    enrollment_structure['dropout_1st_sem'] = col
                elif '2ND SEM' in col_upper:
                    enrollment_structure['dropout_2nd_sem'] = col
        
        print(f"📊 Enrollment structure: {enrollment_structure}")
        
        # Use first numeric column by default
        column_name_raw = numeric_cols[0]
        column_name = column_descriptions.get(column_name_raw, column_name_raw)
        
        # Extract data
        data_series = pd.to_numeric(df[column_name_raw], errors='coerce')
        valid_data = data_series.dropna()
        data = valid_data.tolist()
        
        # Get School Year labels
        labels = df.loc[valid_data.index, 'School Year'].astype(str).tolist()
        
        print(f"✅ Extracted {len(data)} values from column '{column_name}'")
        
        # Prepare available columns for selection
        available_columns = [
            {
                'raw_name': col,
                'display_name': col,
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
            'total_rows': len(df),
            'processed_rows': len(data),
            'full_dataframe': df
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
        selected_column = data.get('column', None)
        
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
            
            # Get corresponding School Year labels
            labels = df.loc[valid_data.index, 'School Year'].astype(str).tolist()
            
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
        
        # Add file metadata
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
    """List all available files"""
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
        'service': 'Analytics API - Enrollment Data',
        'version': '2.0.0',
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
        'message': 'Analytics API for Enrollment Data',
        'endpoints': {
            'health': '/api/health',
            'process': '/api/analytics/process [POST]',
            'batch_process': '/api/analytics/batch-process [POST]',
            'files': '/api/analytics/files [GET]'
        }
    }), 200


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Analytics API Server - Enrollment Data")
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