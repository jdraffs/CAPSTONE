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
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'public', 'uploads', 'fileRepository')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Gemini AI Configuration
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY not found in environment")

GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

print(f"📁 Looking for files in: {os.path.abspath(UPLOAD_FOLDER)}")


def generate_gemini_interpretation(statistics, metrics_comparisons, column_name, file_context):
    """
    Use Gemini AI to generate a concise, single-paragraph interpretation (150-200 words)
    """
    # Prepare context for Gemini with STRICT formatting requirements
    context = f"""You are an expert education data analyst writing for school administrators who need clear, actionable insights.

**Dataset Information:**
- Analyzing: {column_name}
- File: {file_context.get('filename', 'Unknown')}
- Total Records: {statistics.get('count', 0)}

**Statistics Summary:**
- Mean: {statistics.get('mean', 0):.2f}
- Median: {statistics.get('median', 0):.2f}
- Standard Deviation: {statistics.get('std', 0):.2f}
- Min: {statistics.get('min', 0):.2f}
- Max: {statistics.get('max', 0):.2f}
- Range: {statistics.get('range', 0):.2f}

"""

    # Add semester comparisons if available
    if metrics_comparisons:
        context += "**Semester-to-Semester Comparisons:**\n"
        for metric_name, comparison in metrics_comparisons.items():
            context += f"- {metric_name}: 1st Sem {comparison['1st_sem_mean']:.0f} → 2nd Sem {comparison['2nd_sem_mean']:.0f} ({comparison['percent_change']:+.1f}% change)\n"

    context += """

**CRITICAL OUTPUT REQUIREMENTS:**

1. Write EXACTLY ONE paragraph (no bullet points, no headings, no line breaks)
2. Target length: 150-200 words
3. Maximum: 1,500 characters (this is a hard limit)
4. Do NOT list statistics mechanically - explain what the numbers mean
5. Focus on what is changing, why it matters, and what actions may be needed
6. Use simple, professional language suitable for school administrators
7. Reference numbers only when they strengthen understanding
8. Avoid technical jargon like "standard deviation," "outliers," or "statistical significance"
9. End naturally after completing your analysis

**Style Guidelines:**
- Write in clear, flowing sentences that explain patterns and trends
- Explain what the data reveals about student enrollment, retention, or behavior
- Highlight semester-to-semester changes and what they indicate
- Suggest practical implications or areas that may need attention
- Keep tone professional but accessible to non-technical readers
- Do NOT use phrases like "the data shows" or "according to the statistics"
- Instead, directly state what is happening: "Enrollment increased..." or "Most students..."

**Example of Good Style:**
"The enrollment data reveals a stable pattern with an average of 350 students per period, though individual periods range from 280 to 420 students. First semester consistently shows higher enrollment at 365 students compared to second semester's 335 students, indicating a typical 8% drop that likely reflects student attrition and transfer patterns. This decline appears across most categories, with continuing students showing better retention than new enrollees. The variation between periods suggests some instability that administrators may want to investigate, particularly in identifying why certain periods attract significantly fewer students and whether scheduling or program factors contribute to these gaps."

Generate your single-paragraph analysis now (150-200 words):"""

    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
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
                    "maxOutputTokens": 4500,  
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
                
                if 'candidates' in result and len(result['candidates']) > 0:
                    candidate = result['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        generated_text = candidate['content']['parts'][0]['text']
                        
                        # Clean up the text - remove any markdown, extra spaces, line breaks
                        generated_text = generated_text.strip()
                        generated_text = generated_text.replace('**', '')
                        generated_text = generated_text.replace('*', '')
                        generated_text = generated_text.replace('\n\n', ' ')
                        generated_text = generated_text.replace('\n', ' ')
                        generated_text = ' '.join(generated_text.split())  # Normalize spaces
                        
                        # Enforce character limit
                        if len(generated_text) > 1500:
                            generated_text = generated_text[:1497] + "..."
                        
                        print(f"✅ Gemini AI generated interpretation: {len(generated_text)} characters (attempt {attempt + 1})")
                        return generated_text
                
                print("⚠️ Unexpected Gemini response format, using fallback")
                return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
            
            elif response.status_code == 429:
                print(f"⚠️ Rate limit hit (attempt {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
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
                time.sleep(retry_delay)
                continue
            else:
                return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
                
        except Exception as e:
            print(f"❌ Error calling Gemini API (attempt {attempt + 1}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            else:
                traceback.print_exc()
                return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)
    
    return generate_fallback_interpretation(statistics, metrics_comparisons, column_name)


def generate_fallback_interpretation(statistics, metrics_comparisons, column_name):
    """
    Fallback interpretation if Gemini AI fails - MUST follow same format (single paragraph, 150-200 words)
    """
    mean = statistics['mean']
    median = statistics['median']
    minimum = statistics['min']
    maximum = statistics['max']
    std = statistics['std']
    count = statistics['count']
    
    # Build single paragraph interpretation
    interpretation = f"The analysis of {column_name} across {count:,} records shows an average of {mean:.1f} with values ranging from {minimum:.1f} to {maximum:.1f}. "
    
    # Add variation insight
    variation_pct = (std / mean * 100) if mean > 0 else 0
    if variation_pct > 30:
        interpretation += f"The data exhibits high variation, suggesting significant differences across periods that may warrant closer examination. "
    elif variation_pct > 15:
        interpretation += f"Moderate variation appears across periods, indicating some inconsistency in the patterns. "
    else:
        interpretation += f"The data shows relatively stable patterns with minimal variation between periods. "
    
    # Add semester comparison if available
    if metrics_comparisons:
        for metric_name, comparison in list(metrics_comparisons.items())[:2]:  # Limit to 2 comparisons
            change = comparison['difference']
            pct = comparison['percent_change']
            trend = "increased" if change > 0 else "decreased" if change < 0 else "remained stable"
            interpretation += f"{metric_name} {trend} from {comparison['1st_sem_mean']:.0f} in first semester to {comparison['2nd_sem_mean']:.0f} in second semester, representing a {abs(pct):.1f}% change. "
    
    # Add actionable insight
    if metrics_comparisons and any(abs(c['percent_change']) > 10 for c in metrics_comparisons.values()):
        interpretation += "These semester-to-semester shifts suggest administrators should examine retention strategies and identify factors contributing to enrollment changes between terms."
    else:
        interpretation += "The consistency suggests stable enrollment management, though continued monitoring will help maintain these patterns."
    
    # Ensure we stay under character limit
    if len(interpretation) > 1500:
        interpretation = interpretation[:1497] + "..."
    
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
    Detect all enrollment metrics and their semester columns
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
    
    for col in column_names[1:]:
        col_upper = col.upper()
        
        if 'TOTAL' in col_upper and 'ENROL' in col_upper:
            if is_first_sem(col_upper):
                metrics['Total Enrollees']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Total Enrollees']['2nd_sem'] = col
        
        elif ('1ST' in col_upper and 'YEAR' in col_upper and 'ENROL' in col_upper) or \
             ('FIRST' in col_upper and 'YEAR' in col_upper and 'ENROL' in col_upper):
            if is_first_sem(col_upper):
                metrics['First Year Enrolled']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['First Year Enrolled']['2nd_sem'] = col
        
        elif 'OLD' in col_upper and 'STUDENT' in col_upper:
            if is_first_sem(col_upper):
                metrics['Old Students']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Old Students']['2nd_sem'] = col
        
        elif 'NOT' in col_upper and 'ENROL' in col_upper:
            if is_first_sem(col_upper):
                metrics['Not Enrolled']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Not Enrolled']['2nd_sem'] = col
        
        elif 'DROP' in col_upper and 'OUT' in col_upper:
            if is_first_sem(col_upper):
                metrics['Dropout']['1st_sem'] = col
            elif is_second_sem(col_upper):
                metrics['Dropout']['2nd_sem'] = col
    
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
        df_raw = pd.read_excel(filepath, header=None, engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
        
        print(f"📋 Raw file preview:\n{df_raw.head(5)}")
        
        title_row = None
        for idx in range(min(3, len(df_raw))):
            row_text = ' '.join([str(val) for val in df_raw.iloc[idx] if pd.notna(val)])
            if 'Statistical Data of Enrollment' in row_text or 'STATISTICAL DATA' in row_text.upper():
                title_row = idx
                print(f"📋 Found title at row {idx}")
                break
        
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
        
        main_headers = df_raw.iloc[main_header_row].tolist()
        sub_headers = df_raw.iloc[sub_header_row].tolist()
        
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
        
        data_start_row = sub_header_row + 1
        df = pd.read_excel(filepath, header=None, skiprows=data_start_row, 
                          engine='openpyxl' if file_ext == '.xlsx' else 'xlrd')
        
        if len(df.columns) < len(column_names):
            column_names = column_names[:len(df.columns)]
        elif len(df.columns) > len(column_names):
            for i in range(len(column_names), len(df.columns)):
                column_names.append(f"Extra_Column_{i}")
        
        df.columns = column_names
        
        numeric_cols = []
        for col in df.columns[1:]:
            numeric_series = pd.to_numeric(df[col], errors='coerce')
            valid_count = numeric_series.notna().sum()
            if valid_count > len(df) * 0.3:
                numeric_cols.append(col)
                df[col] = numeric_series
        
        if not numeric_cols:
            raise ValueError("No numeric columns found")
        
        detected_metrics = detect_enrollment_metrics(df, main_headers, sub_headers, column_names)
        
        metrics_comparisons = {}
        for metric_name, semesters in detected_metrics.items():
            comparison = calculate_metric_comparison(df, semesters['1st_sem'], semesters['2nd_sem'])
            if comparison:
                metrics_comparisons[metric_name] = comparison
        
        column_name_raw = numeric_cols[0]
        column_name = column_descriptions.get(column_name_raw, column_name_raw)
        
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


# analytics_api.py - Add this new endpoint after the existing routes

@app.route('/api/analytics/generate-interpretation', methods=['POST'])
def generate_interpretation_only():
    """Generate AI interpretation for a specific report and save it"""
    try:
        data = request.get_json()
        
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename is required'}), 400
        
        filename = data['filename']
        file_id = data.get('file_id')
        selected_column = data.get('column', None)
        
        print(f"🤖 Generating interpretation for: {filename}")
        
        # Load file data
        file_data = load_file_data(filename)
        
        # If a specific column is selected, use it
        if selected_column and selected_column in file_data.get('numeric_columns', []):
            df = file_data['full_dataframe']
            column_name_raw = selected_column
            column_name = file_data['column_descriptions'].get(selected_column, selected_column)
            
            data_series = pd.to_numeric(df[selected_column], errors='coerce')
            valid_data = data_series.dropna()
            
            file_data['data'] = valid_data.tolist()
            file_data['labels'] = df.loc[valid_data.index, 'School Year'].astype(str).tolist()
            file_data['column_name'] = column_name
            file_data['column_name_raw'] = column_name_raw
        
        # Process analytics to get statistics
        analytics_result = process_file_analytics(file_data, data.get('chart_type', 'bar'))
        
        if 'error' in analytics_result:
            return jsonify(analytics_result), 500
        
        # Generate interpretation
        metrics_comparisons = file_data.get('metrics_comparisons', {})
        gemini_interpretation = generate_gemini_interpretation(
            statistics=analytics_result['statistics'],
            metrics_comparisons=metrics_comparisons,
            column_name=file_data['column_name'],
            file_context={'filename': filename}
        )
        
        # Save interpretation to database if file_id is provided
        if file_id:
            try:
                import requests as http_requests
                save_response = http_requests.post(
                    'http://localhost:3000/api/files/save-interpretation',
                    json={
                        'file_id': file_id,
                        'interpretation': gemini_interpretation,
                        'column_analyzed': file_data['column_name']
                    },
                    timeout=5
                )
                
                if save_response.status_code == 200:
                    print(f"✅ Interpretation saved to database for file_id: {file_id}")
                else:
                    print(f"⚠️ Failed to save interpretation to database: {save_response.status_code}")
            except Exception as save_error:
                print(f"⚠️ Could not save to database: {str(save_error)}")
        
        return jsonify({
            'interpretation': gemini_interpretation,
            'statistics': analytics_result['statistics'],
            'metrics_comparisons': metrics_comparisons,
            'column_analyzed': file_data['column_name']
        }), 200
        
    except Exception as e:
        error_msg = f'Failed to generate interpretation: {str(e)}'
        print(f"❌ Error: {error_msg}")
        print(traceback.format_exc())
        return jsonify({'error': error_msg}), 500


# Update the existing /api/analytics/process endpoint to NOT generate interpretation by default
@app.route('/api/analytics/process', methods=['POST'])
def process_analytics():
    """Process analytics WITHOUT generating AI interpretation by default"""
    try:
        data = request.get_json()
        
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename is required'}), 400
        
        filename = data['filename']
        chart_type = data.get('chart_type', 'bar')
        selected_column = data.get('column', None)
        generate_ai = data.get('generate_interpretation', False)  # NEW FLAG
        
        print(f"🔄 Processing: {filename} with chart type: {chart_type}")
        
        file_data = load_file_data(filename)
        
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
        
        analytics_result = process_file_analytics(file_data, chart_type)
        
        if 'error' in analytics_result:
            return jsonify(analytics_result), 500
        
        metrics_comparisons = file_data.get('metrics_comparisons', {})
        
        # Only generate interpretation if explicitly requested
        if generate_ai:
            print("🤖 Generating Gemini AI interpretation...")
            gemini_interpretation = generate_gemini_interpretation(
                statistics=analytics_result['statistics'],
                metrics_comparisons=metrics_comparisons,
                column_name=file_data['column_name'],
                file_context={'filename': filename}
            )
            analytics_result['interpretation'] = gemini_interpretation
        else:
            # Return placeholder or saved interpretation
            analytics_result['interpretation'] = None
        
        analytics_result['metrics_comparisons'] = metrics_comparisons
        
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
        
        print(f"✅ Successfully processed {filename}")
        
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
            'Gemini AI-powered concise interpretations (150-200 words)',
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