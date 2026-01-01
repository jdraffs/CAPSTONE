# analytics_api.py - PART 1: Enhanced Multi-Metric Detection with Gemini AI
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
import traceback
import requests
import time
from analytics_processor import process_file_analytics, AnalyticsProcessor

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'public', 'uploads', 'fileRepository')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Gemini AI Configuration
GEMINI_API_KEY = "AIzaSyBhYn-arUzoAkQoib4s3BLtu72R9iCdBR0"
# Use stable model with better free tier limits
GEMINI_MODEL = "gemini-2.5-flash"  # Changed from experimental model
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

print(f"📁 Looking for files in: {os.path.abspath(UPLOAD_FOLDER)}")


def generate_gemini_interpretation(statistics, metrics_comparisons, column_name, file_context):
    """
    Use Gemini AI to generate comprehensive enrollment interpretation with retry logic
    """
    # Prepare context for Gemini
    context = f"""You are an expert education data analyst. Analyze the following enrollment statistics and provide a comprehensive, natural interpretation.

**Dataset Information:**
- Analyzing: {column_name}
- File: {file_context.get('filename', 'Unknown')}
- Total Records: {statistics.get('count', 0)}

**Statistics Summary:**
- Mean: {statistics.get('mean', 0):.2f}
- Median: {statistics.get('median', 0):.2f}
- Mode: {statistics.get('mode', 0):.2f}
- Standard Deviation: {statistics.get('std', 0):.2f}
- Min: {statistics.get('min', 0):.2f}
- Max: {statistics.get('max', 0):.2f}
- Range: {statistics.get('range', 0):.2f}
- Q1: {statistics.get('q1', 0):.2f}
- Q3: {statistics.get('q3', 0):.2f}

"""

    # Add semester comparisons if available
    if metrics_comparisons:
        context += "\n**Semester-to-Semester Comparisons:**\n"
        for metric_name, comparison in metrics_comparisons.items():
            context += f"""
- **{metric_name}:**
  - 1st Semester Average: {comparison['1st_sem_mean']:.0f} students
  - 2nd Semester Average: {comparison['2nd_sem_mean']:.0f} students
  - Change: {comparison['difference']:+.0f} students ({comparison['percent_change']:+.1f}%)
"""

    context += """

**Required Analysis Format:**

1. **Overview**: Start with a clear summary of what the data shows about enrollment patterns.

2. **Overall Enrollment Trends**: Describe the total enrollment patterns, growth or decline over time, and semester variations.

3. **First Year Enrollment**: Analyze new student enrollment patterns and retention between semesters.

4. **Continuing Students (Old Students)**: Discuss returning student trends and stability.

5. **Not Enrolled**: Explain gaps in enrollment and what they indicate.

6. **Dropout Analysis**: Examine dropout patterns, when they occur most, and their severity.

7. **Key Insights**: Provide 3-5 actionable insights based on the data.

8. **Recommendations**: Suggest 2-3 specific interventions or areas of focus based on the patterns observed.

**Style Guidelines:**
- Write in clear, professional language suitable for educational administrators
- Use specific numbers from the data to support each observation
- Highlight patterns and trends, not just individual data points
- Compare semester-to-semester changes meaningfully
- Provide context for what the numbers mean in practical terms
- Be concise but comprehensive (aim for 300-500 words)
- Use bullet points for key findings where appropriate

Generate a comprehensive analysis now:"""

    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Call Gemini API
            payload = {
                "contents": [{
                    "parts": [{
                        "text": context
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 4096,
                }
            }

            response = requests.post(
                GEMINI_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                
                # Extract the generated text
                if 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        generated_text = candidate['content']['parts'][0]['text']
                        
                        # Clean up the text
                        generated_text = generated_text.strip()
                        
                        # Format with HTML for better display
                        formatted_text = generated_text.replace('\n', '<br>')
                        
                        print(f"✅ Gemini AI generated interpretation successfully (attempt {attempt + 1})")
                        return formatted_text
                
                print("⚠️ Unexpected Gemini response format, using fallback")
                return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
            
            elif response.status_code == 429:
                print(f"⚠️ Rate limit hit (attempt {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    import time
                    wait_time = retry_delay * (attempt + 1)
                    print(f"⏳ Waiting {wait_time} seconds before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    print("❌ Max retries reached, using fallback interpretation")
                    return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
            else:
                print(f"❌ Gemini API error: {response.status_code}")
                print(f"Response: {response.text}")
                return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
                
        except requests.exceptions.Timeout:
            print(f"⚠️ Request timeout (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                import time
                time.sleep(retry_delay)
                continue
            else:
                return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
                
        except Exception as e:
            print(f"❌ Error calling Gemini API (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries - 1:
                import time
                time.sleep(retry_delay)
                continue
            else:
                traceback.print_exc()
                return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
    
    # Should never reach here, but just in case
    return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)


def generate_fallback_interpretation(statistics, metrics_comparisons, column_name):
    """
    Fallback interpretation if Gemini AI fails
    """
    mean = statistics['mean']
    median = statistics['median']
    minimum = statistics['min']
    maximum = statistics['max']
    count = statistics['count']
    
    interpretation = f"""<strong>📊 Enrollment Data Analysis</strong><br><br>

<strong>Overview:</strong><br>
This dataset contains information about <strong>{count:,} records</strong> for {column_name}. The average value is <strong>{mean:.1f}</strong>, with values ranging from <strong>{minimum:.1f}</strong> to <strong>{maximum:.1f}</strong>.<br><br>

<strong>Key Statistics:</strong><br>
• Average (Mean): {mean:.1f}<br>
• Middle Value (Median): {median:.1f}<br>
• Lowest Value: {minimum:.1f}<br>
• Highest Value: {maximum:.1f}<br>
• Variation: The data shows {"high" if statistics['std'] > mean * 0.3 else "moderate" if statistics['std'] > mean * 0.15 else "low"} variation with a standard deviation of {statistics['std']:.1f}<br><br>
"""

    # Add semester comparisons if available
    if metrics_comparisons:
        interpretation += "<strong>📈 Semester Comparisons:</strong><br>"
        for metric_name, comparison in metrics_comparisons.items():
            trend = "increased" if comparison['difference'] > 0 else "decreased" if comparison['difference'] < 0 else "remained stable"
            interpretation += f"• <strong>{metric_name}</strong> {trend} from {comparison['1st_sem_mean']:.0f} (1st sem) to {comparison['2nd_sem_mean']:.0f} (2nd sem), a change of {comparison['percent_change']:+.1f}%<br>"
        interpretation += "<br>"

    interpretation += """<strong>💡 Recommendation:</strong><br>
Review the semester-to-semester patterns to identify retention opportunities and address enrollment gaps."""

    return interpretation


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


def detect_enrollment_metrics(df, main_headers, sub_headers, column_names):
    """
    Detect all four enrollment metrics and their semester columns
    Returns a dictionary mapping metric names to their 1st and 2nd semester columns
    """
    metrics = {
        'Total Enrollees': {'1st_sem': None, '2nd_sem': None},
        'First Year Enrolled': {'1st_sem': None, '2nd_sem': None},
        'Old Students': {'1st_sem': None, '2nd_sem': None},
        'Not Enrolled': {'1st_sem': None, '2nd_sem': None},
        'Dropout': {'1st_sem': None, '2nd_sem': None}
    }
    
    def is_first_sem(text):
        text_upper = text.upper()
        return ('1ST' in text_upper or 'FIRST' in text_upper or 
                'SEM 1' in text_upper or 'SEM I' in text_upper)
    
    def is_second_sem(text):
        text_upper = text.upper()
        return ('2ND' in text_upper or 'SECOND' in text_upper or 
                'SEM 2' in text_upper or 'SEM II' in text_upper)
    
    # Iterate through all columns to categorize them
    for col in column_names[1:]:  # Skip 'School Year'
        col_upper = col.upper()
        
        # Check for Total Enrollees
        if 'TOTAL' in col_upper and 'ENROL' in col_upper:
            if is_first_sem(col_upper):
                metrics['Total Enrollees']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Total Enrollees']['2nd_sem'] = col
        
        # Check for First Year Enrolled
        elif ('1ST' in col_upper and 'YEAR' in col_upper and 'ENROL' in col_upper) or \
             ('FIRST' in col_upper and 'YEAR' in col_upper and 'ENROL' in col_upper):
            if is_first_sem(col_upper):
                metrics['First Year Enrolled']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['First Year Enrolled']['2nd_sem'] = col
        
        # Check for Old Students
        elif 'OLD' in col_upper and 'STUDENT' in col_upper:
            if is_first_sem(col_upper):
                metrics['Old Students']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Old Students']['2nd_sem'] = col
        
        # Check for Not Enrolled
        elif 'NOT' in col_upper and 'ENROL' in col_upper:
            if is_first_sem(col_upper):
                metrics['Not Enrolled']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Not Enrolled']['2nd_sem'] = col
        
        # Check for Dropout
        elif 'DROP' in col_upper and 'OUT' in col_upper:
            if is_first_sem(col_upper):
                metrics['Dropout']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Dropout']['2nd_sem'] = col
    
    # Filter out metrics that don't have both semesters
    detected_metrics = {}
    for metric_name, semesters in metrics.items():
        if semesters['1st_sem'] and semesters['2nd_sem']:
            detected_metrics[metric_name] = semesters
            print(f"✅ Detected {metric_name}: 1st={semesters['1st_sem']}, 2nd={semesters['2nd_sem']}")
        else:
            print(f"⚠️ Incomplete data for {metric_name} - skipping")
    
    return detected_metrics


def calculate_metric_comparison(df, col_1st, col_2nd):
    """
    Calculate mean, difference, and percent change between two semester columns
    """
    # Convert to numeric and drop NaN
    vals_1st = pd.to_numeric(df[col_1st], errors='coerce').dropna()
    vals_2nd = pd.to_numeric(df[col_2nd], errors='coerce').dropna()
    
    if vals_1st.empty or vals_2nd.empty:
        return None
    
    mean_1st = float(vals_1st.mean())
    mean_2nd = float(vals_2nd.mean())
    difference = mean_2nd - mean_1st
    percent_change = (difference / mean_1st * 100) if mean_1st != 0 else 0
    
    return {
        '1st_sem_mean': round(mean_1st, 2),
        '2nd_sem_mean': round(mean_2nd, 2),
        'difference': round(difference, 2),
        'percent_change': round(percent_change, 2)
    }

# analytics_api.py - PART 2: File Loading and Processing Routes
# Place this after Part 1

def load_file_data(filename):
    """Load and parse uploaded file with comprehensive enrollment metrics detection"""
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
        
        # Find the title row
        title_row = None
        for idx in range(min(3, len(df_raw))):
            row_text = ' '.join([str(val) for val in df_raw.iloc[idx] if pd.notna(val)])
            if 'Statistical Data of Enrollment' in row_text or 'STATISTICAL DATA' in row_text.upper():
                title_row = idx
                print(f"📋 Found title at row {idx}")
                break
        
        # Find main headers row
        main_header_row = None
        sub_header_row = None
        
        for idx in range(title_row + 1 if title_row is not None else 0, min(5, len(df_raw))):
            row_text = ' '.join([str(val) for val in df_raw.iloc[idx] if pd.notna(val)]).upper()
            if 'TOTAL ENROLLEES' in row_text or 'ENROLLEES' in row_text:
                main_header_row = idx
                sub_header_row = idx + 1
                print(f"📋 Found main headers at row {idx}")
                break
        
        if main_header_row is None:
            raise ValueError("Could not find enrollment data structure headers")
        
        # Extract headers
        main_headers = df_raw.iloc[main_header_row].tolist()
        sub_headers = df_raw.iloc[sub_header_row].tolist()
        
        # Build column names
        column_names = ['School Year']
        column_descriptions = {}
        current_main = None
        
        for i in range(1, len(main_headers)):
            main_val = str(main_headers[i]).strip() if pd.notna(main_headers[i]) else ''
            sub_val = str(sub_headers[i]).strip() if pd.notna(sub_headers[i]) else ''
            
            if main_val and main_val not in ['nan', '']:
                current_main = main_val
            
            if current_main and sub_val and sub_val not in ['nan', '']:
                main_clean = current_main.replace('\n', ' ').strip()
                sub_clean = sub_val.replace('\n', ' ').strip().upper()
                col_name = f"{main_clean} - {sub_clean}"
                column_names.append(col_name)
                column_descriptions[col_name] = col_name
            else:
                column_names.append(f"Column_{i}")
        
        # Read actual data
        data_start_row = sub_header_row + 1
        df = pd.read_excel(filepath, header=None, skiprows=data_start_row, 
                          engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
        
        # Ensure column count matches
        if len(df.columns) < len(column_names):
            column_names = column_names[:len(df.columns)]
        elif len(df.columns) > len(column_names):
            for i in range(len(column_names), len(df.columns)):
                column_names.append(f"Extra_Column_{i}")
        
        df.columns = column_names
        
        # Find numeric columns
        numeric_cols = []
        for col in df.columns[1:]:
            numeric_series = pd.to_numeric(df[col], errors='coerce')
            valid_count = numeric_series.notna().sum()
            if valid_count > len(df) * 0.3:
                numeric_cols.append(col)
                df[col] = numeric_series
        
        if not numeric_cols:
            raise ValueError("No numeric columns found")
        
        # Detect all enrollment metrics
        detected_metrics = detect_enrollment_metrics(df, main_headers, sub_headers, column_names)
        
        # Calculate comparisons
        metrics_comparisons = {}
        for metric_name, semesters in detected_metrics.items():
            comparison = calculate_metric_comparison(df, semesters['1st_sem'], semesters['2nd_sem'])
            if comparison:
                metrics_comparisons[metric_name] = comparison
        
        # Use first numeric column for visualization
        column_name_raw = numeric_cols[0]
        column_name = column_descriptions.get(column_name_raw, column_name_raw)
        
        # Extract data
        data_series = pd.to_numeric(df[column_name_raw], errors='coerce')
        valid_data = data_series.dropna()
        data = valid_data.tolist()
        labels = df.loc[valid_data.index, 'School Year'].astype(str).tolist()
        
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
            'detected_metrics': detected_metrics,
            'metrics_comparisons': metrics_comparisons,
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
    """Process analytics with Gemini AI interpretation"""
    try:
        data = request.get_json()
        
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename is required'}), 400
        
        filename = data['filename']
        chart_type = data.get('chart_type', 'bar')
        selected_column = data.get('column', None)
        
        print(f"🔄 Processing: {filename} with chart type: {chart_type}")
        
        # Load file data
        file_data = load_file_data(filename)
        
        # If specific column requested
        if selected_column and selected_column in file_data.get('numeric_columns', []):
            df = file_data['full_dataframe']
            column_name_raw = selected_column
            column_name = file_data['column_descriptions'].get(selected_column, selected_column)
            
            data_series = pd.to_numeric(df[selected_column], errors='coerce')
            valid_data = data_series.dropna()
            
            labels = df.loc[valid_data.index, 'School Year'].astype(str).tolist()
            
            file_data['data'] = valid_data.tolist()
            file_data['labels'] = labels
            file_data['column_name'] = column_name
            file_data['column_name_raw'] = column_name_raw
        
        # Process analytics
        analytics_result = process_file_analytics(file_data, chart_type)
        
        if 'error' in analytics_result:
            return jsonify(analytics_result), 500
        
        # ====================================================================
        # GEMINI AI ENHANCEMENT: Generate comprehensive interpretation
        # ====================================================================
        metrics_comparisons = file_data.get('metrics_comparisons', {})
        
        print("🤖 Generating Gemini AI interpretation...")
        gemini_interpretation = generate_gemini_interpretation(
            statistics=analytics_result['statistics'],
            metrics_comparisons=metrics_comparisons,
            column_name=file_data['column_name'],
            file_context={'filename': filename}
        )
        
        # Replace the basic interpretation with Gemini's enhanced version
        analytics_result['interpretation'] = gemini_interpretation
        analytics_result['metrics_comparisons'] = metrics_comparisons
        
        # Add file metadata
        analytics_result['file_info'] = {
            'filename': filename,
            'total_columns': file_data['total_columns'],
            'numeric_columns': file_data['numeric_columns'],
            'column_descriptions': file_data.get('column_descriptions', {}),
            'available_columns': file_data.get('available_columns', []),
            'detected_metrics': file_data.get('detected_metrics', {}),
            'total_rows': file_data['total_rows'],
            'analyzed_column': file_data['column_name']
        }
        
        print(f"✅ Successfully processed {filename} with Gemini AI")
        
        return jsonify(analytics_result), 200
        
    except FileNotFoundError as e:
        return jsonify({
            'error': str(e),
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

# analytics_api.py - PART 3: Additional Routes and Server Start
# Place this after Part 2

@app.route('/api/analytics/batch-process', methods=['POST'])
def batch_process_analytics():
    """Process analytics for multiple files with Gemini AI"""
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
                
                # Generate Gemini interpretation
                metrics_comparisons = file_data.get('metrics_comparisons', {})
                gemini_interpretation = generate_gemini_interpretation(
                    statistics=analytics_result['statistics'],
                    metrics_comparisons=metrics_comparisons,
                    column_name=file_data['column_name'],
                    file_context={'filename': filename}
                )
                
                analytics_result['interpretation'] = gemini_interpretation
                analytics_result['metrics_comparisons'] = metrics_comparisons
                
                analytics_result['file_info'] = {
                    'filename': filename,
                    'analyzed_column': file_data['column_name'],
                    'detected_metrics': file_data.get('detected_metrics', {})
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


@app.route('/api/analytics/test-gemini', methods=['GET'])
def test_gemini():
    """Test Gemini AI connection"""
    try:
        test_context = """You are an expert education data analyst. 
        
        Test data:
        - Mean: 350
        - Median: 340
        - Total students: 1000
        
        Provide a brief 2-sentence analysis of this enrollment data."""
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": test_context
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 200,
            }
        }

        response = requests.post(
            GEMINI_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                text = result['candidates'][0]['content']['parts'][0]['text']
                return jsonify({
                    'status': 'success',
                    'message': 'Gemini AI connection successful',
                    'sample_response': text,
                    'model': GEMINI_MODEL
                }), 200
        
        return jsonify({
            'status': 'error',
            'message': 'Failed to get valid response from Gemini',
            'status_code': response.status_code,
            'response': response.text
        }), 500
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Gemini AI test failed: {str(e)}'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Analytics API with Gemini AI',
        'version': '4.0.0',
        'ai_provider': 'Google Gemini',
        'model': GEMINI_MODEL,
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
        'message': 'Analytics API with Gemini AI Integration',
        'version': '4.0.0',
        'ai_provider': 'Google Gemini 2.0 Flash',
        'features': [
            'Automatic detection of enrollment metrics',
            'Semester-to-semester comparison',
            'Gemini AI-powered comprehensive interpretations',
            'Multiple visualization types',
            'Natural language insights'
        ],
        'endpoints': {
            'health': '/api/health [GET]',
            'test_gemini': '/api/analytics/test-gemini [GET]',
            'process': '/api/analytics/process [POST]',
            'batch_process': '/api/analytics/batch-process [POST]',
            'files': '/api/analytics/files [GET]'
        }
    }), 200


if __name__ == '__main__':
    print("=" * 70)
    print("🚀 Starting Analytics API Server with Gemini AI")
    print("=" * 70)
    print(f"🤖 AI Provider: Google Gemini")
    print(f"🧠 Model: {GEMINI_MODEL}")
    print(f"📁 Upload folder: {os.path.abspath(UPLOAD_FOLDER)}")
    print(f"📂 Folder exists: {os.path.exists(UPLOAD_FOLDER)}")
    
    if os.path.exists(UPLOAD_FOLDER):
        files = [f for f in os.listdir(UPLOAD_FOLDER) 
                if f.endswith(('.csv', '.xlsx', '.xls', '.json'))]
        print(f"📊 Available files ({len(files)}): {files[:5]}")
        if len(files) > 5:
            print(f"    ... and {len(files) - 5} more")
    else:
        print("⚠️ Upload folder does not exist! Creating it...")
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    print("=" * 70)
    print("🌐 Server endpoints:")
    print("   • Main: http://localhost:5000")
    print("   • Health: http://localhost:5000/api/health")
    print("   • Test Gemini: http://localhost:5000/api/analytics/test-gemini")
    print("=" * 70)
    
    app.run(host='0.0.0.0', port=5000, debug=True)