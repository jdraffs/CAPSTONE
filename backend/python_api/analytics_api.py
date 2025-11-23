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
CORS(app)  # Enable CORS for all routes

# IMPORTANT: Adjust these paths to match YOUR project structure
# If your Flask app is in backend/python_api/, then:
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'public', 'uploads', 'fileRepository')
# Or use absolute path: UPLOAD_FOLDER = 'C:/Users/Infor/Desktop/CAPSTONE/backend/public/uploads/fileRepository'

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

print(f"📁 Looking for files in: {os.path.abspath(UPLOAD_FOLDER)}")


def find_file_with_timestamp(filename):
    """
    Find file that might have a timestamp prefix from multer
    e.g., '1762759717407-Student Enrollment Data 2024.xlsx'
    """
    if not os.path.exists(UPLOAD_FOLDER):
        return None
    
    # First, try exact match
    exact_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(exact_path):
        return filename
    
    # If not found, look for files with timestamp prefix
    all_files = os.listdir(UPLOAD_FOLDER)
    
    # Look for pattern: {timestamp}-{filename}
    for file in all_files:
        # Check if file ends with the requested filename
        if file.endswith(filename):
            print(f"✅ Found file with timestamp: {file}")
            return file
        
        # Also check if the filename (without timestamp) matches
        # Pattern: numbers-originalname
        if '-' in file:
            parts = file.split('-', 1)  # Split only on first dash
            if len(parts) == 2 and parts[1] == filename:
                print(f"✅ Found file with timestamp prefix: {file}")
                return file
    
    # If still not found, try fuzzy matching (case-insensitive, partial match)
    filename_lower = filename.lower()
    for file in all_files:
        if filename_lower in file.lower():
            print(f"✅ Found similar file: {file}")
            return file
    
    return None


def load_file_data(filename):
    """Load and parse uploaded file (CSV, Excel, JSON)"""
    print(f"🔍 Looking for file: {filename}")
    
    # Try to find the file (with or without timestamp)
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
        # Read file with optimizations for large files
        if file_ext == '.csv':
            # Read CSV in chunks if large
            df = pd.read_csv(filepath, low_memory=False)
        elif file_ext in ['.xlsx', '.xls']:
            # Read Excel with optimization
            df = pd.read_excel(filepath, engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
        elif file_ext == '.json':
            df = pd.read_json(filepath)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        print(f"✅ Successfully loaded file with {len(df)} rows and {len(df.columns)} columns")
        
        # Handle large files - limit to first 10,000 rows for processing
        if len(df) > 10000:
            print(f"⚠️ Large file detected ({len(df)} rows). Using first 10,000 rows for analysis.")
            original_rows = len(df)
            df = df.head(10000)
        else:
            original_rows = len(df)
        
        print(f"📊 Columns: {df.columns.tolist()}")
        
        # Get numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if not numeric_cols:
            print(f"⚠️ No numeric columns found. Column types: {df.dtypes.to_dict()}")
            raise ValueError("No numeric columns found in file")
        
        # Use first numeric column by default
        column_name = numeric_cols[0]
        data = df[column_name].dropna().tolist()
        
        # Try to use first column as labels if it's not numeric
        label_col = df.columns[0] if df.columns[0] not in numeric_cols else None
        
        if label_col:
            labels = df[label_col].astype(str).tolist()[:len(data)]
        else:
            # For large datasets, create simplified labels
            if len(data) > 100:
                labels = [f"Row {i+1}" for i in range(len(data))]
            else:
                labels = [f"Row {i+1}" for i in range(len(data))]
        
        print(f"✅ Using column '{column_name}' with {len(data)} values")
        
        return {
            'data': data,
            'labels': labels,
            'column_name': column_name,
            'filename': actual_filename,
            'total_columns': len(df.columns),
            'numeric_columns': numeric_cols,
            'total_rows': original_rows,
            'processed_rows': len(data)
        }
    except Exception as e:
        print(f"❌ Error parsing file: {str(e)}")
        print(traceback.format_exc())
        raise Exception(f"Error parsing file: {str(e)}")


@app.route('/api/analytics/process', methods=['POST'])
def process_analytics():
    """
    Process analytics for a specific file
    
    Expected JSON payload:
    {
        "filename": "data.csv",
        "chart_type": "bar",  # optional: bar, line, pie, histogram, box
        "column": "column_name"  # optional: specific column to analyze
    }
    """
    try:
        data = request.get_json()
        
        print(f"📥 Received request: {data}")
        
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename is required'}), 400
        
        filename = data['filename']
        chart_type = data.get('chart_type', 'bar')
        column = data.get('column', None)
        
        print(f"🔄 Processing: {filename} with chart type: {chart_type}")
        
        # Load file data
        file_data = load_file_data(filename)
        
        # Process analytics
        analytics_result = process_file_analytics(file_data, chart_type)
        
        # Add file metadata
        analytics_result['file_info'] = {
            'filename': filename,
            'total_columns': file_data['total_columns'],
            'numeric_columns': file_data['numeric_columns'],
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
    """
    Process analytics for multiple files
    
    Expected JSON payload:
    {
        "files": [
            {"filename": "data1.csv", "chart_type": "bar"},
            {"filename": "data2.xlsx", "chart_type": "line"}
        ]
    }
    """
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


@app.route('/api/analytics/compare', methods=['POST'])
def compare_datasets():
    """
    Compare statistics across multiple files
    
    Expected JSON payload:
    {
        "files": ["data1.csv", "data2.csv", "data3.xlsx"]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'files' not in data:
            return jsonify({'error': 'Files array is required'}), 400
        
        comparisons = []
        
        for filename in data['files']:
            try:
                file_data = load_file_data(filename)
                processor = AnalyticsProcessor(
                    data=file_data['data'],
                    labels=file_data['labels'],
                    column_name=file_data['column_name']
                )
                
                stats = processor.calculate_statistics()
                
                comparisons.append({
                    'filename': filename,
                    'column': file_data['column_name'],
                    'statistics': stats
                })
                
            except Exception as e:
                comparisons.append({
                    'filename': filename,
                    'error': str(e)
                })
        
        # Generate comparative insights
        valid_comparisons = [c for c in comparisons if 'statistics' in c]
        
        if len(valid_comparisons) > 1:
            means = [c['statistics']['mean'] for c in valid_comparisons]
            insights = {
                'highest_mean': valid_comparisons[np.argmax(means)]['filename'],
                'lowest_mean': valid_comparisons[np.argmin(means)]['filename'],
                'mean_range': float(np.max(means) - np.min(means)),
                'overall_average': float(np.mean(means))
            }
        else:
            insights = {}
        
        return jsonify({
            'comparisons': comparisons,
            'insights': insights
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Comparison failed: {str(e)}'}), 500


@app.route('/api/analytics/columns/<filename>', methods=['GET'])
def get_file_columns(filename):
    """Get available columns from a file"""
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        file_ext = os.path.splitext(filename)[1].lower()
        
        if file_ext == '.csv':
            df = pd.read_csv(filepath)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(filepath)
        elif file_ext == '.json':
            df = pd.read_json(filepath)
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        all_cols = df.columns.tolist()
        
        return jsonify({
            'all_columns': all_cols,
            'numeric_columns': numeric_cols,
            'total_rows': len(df),
            'sample_data': df.head(5).to_dict('records')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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


@app.route('/api/analytics/resolve-filename', methods=['POST'])
def resolve_filename():
    """
    Resolve a filename that might have a timestamp prefix
    
    Expected JSON payload:
    {
        "filename": "Student Enrollment Data 2024.xlsx"
    }
    
    Returns:
    {
        "original_filename": "Student Enrollment Data 2024.xlsx",
        "actual_filename": "1762759717407-Student Enrollment Data 2024.xlsx",
        "found": true
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename is required'}), 400
        
        filename = data['filename']
        actual_filename = find_file_with_timestamp(filename)
        
        if actual_filename:
            return jsonify({
                'original_filename': filename,
                'actual_filename': actual_filename,
                'found': True
            }), 200
        else:
            available_files = os.listdir(UPLOAD_FOLDER) if os.path.exists(UPLOAD_FOLDER) else []
            return jsonify({
                'original_filename': filename,
                'actual_filename': None,
                'found': False,
                'available_files': available_files
            }), 404
            
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
            'compare': '/api/analytics/compare [POST]',
            'columns': '/api/analytics/columns/<filename> [GET]',
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