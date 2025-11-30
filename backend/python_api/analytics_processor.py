#analytics_processor.py
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64
from scipy import stats
import json
import warnings
warnings.filterwarnings('ignore')

class AnalyticsProcessor:
    """Process analytics data using numpy, pandas, and matplotlib"""
    
    def __init__(self, data, labels=None, column_name="Dataset", max_data_points=500):
        """
        Initialize with data array and optional labels
        
        Args:
            data: List or array of numeric values
            labels: List of labels for the data points
            column_name: Name of the data column
            max_data_points: Maximum data points to visualize (prevents memory issues)
        """
        # Convert data to list if it's not already
        if not isinstance(data, list):
            data = list(data)
        
        # Convert all data to numeric, filtering out non-numeric values
        clean_data = []
        clean_labels = []
        
        for i, value in enumerate(data):
            try:
                # Try to convert to float
                numeric_value = float(value)
                # Skip NaN values
                if not np.isnan(numeric_value):
                    clean_data.append(numeric_value)
                    # Get corresponding label
                    if labels and i < len(labels):
                        clean_labels.append(str(labels[i]))
                    else:
                        clean_labels.append(f"Item {len(clean_data)}")
            except (ValueError, TypeError):
                # Skip non-numeric values
                continue
        
        # Check if we have any valid data
        if len(clean_data) == 0:
            raise ValueError("No valid numeric data found in the dataset. Please check your file format.")
        
        original_length = len(clean_data)
        
        # Handle large datasets by sampling if necessary
        if len(clean_data) > max_data_points:
            # Sample data for visualization while keeping all for statistics
            indices = np.linspace(0, len(clean_data) - 1, max_data_points, dtype=int)
            sampled_data = [clean_data[i] for i in indices]
            sampled_labels = [clean_labels[i] for i in indices]
            
            self.viz_df = pd.DataFrame({
                'Label': sampled_labels,
                'Value': sampled_data
            })
            
            # Keep full data for statistics
            self.full_data = np.array(clean_data)
            self.is_sampled = True
        else:
            self.viz_df = pd.DataFrame({
                'Label': clean_labels,
                'Value': clean_data
            })
            self.full_data = np.array(clean_data)
            self.is_sampled = False
        
        self.column_name = column_name
        self.original_length = original_length
        
        print(f"✅ Initialized with {len(clean_data)} valid numeric values")
        
    def calculate_statistics(self):
        """Calculate comprehensive statistics using numpy and pandas"""
        # Use full dataset for accurate statistics
        values = self.full_data
        
        if len(values) == 0:
            return {
                'mean': 0, 'median': 0, 'mode': 0, 'std': 0,
                'variance': 0, 'min': 0, 'max': 0, 'q1': 0,
                'q3': 0, 'count': 0, 'sum': 0, 'range': 0
            }
        
        # Handle mode calculation safely
        try:
            mode_result = stats.mode(values, keepdims=True)
            mode_value = float(mode_result[0][0])
        except:
            mode_value = float(values[0]) if len(values) > 0 else 0
        
        stats_dict = {
            'mean': float(np.mean(values)),
            'median': float(np.median(values)),
            'mode': mode_value,
            'std': float(np.std(values)),
            'variance': float(np.var(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'q1': float(np.percentile(values, 25)),
            'q3': float(np.percentile(values, 75)),
            'count': int(len(values)),
            'sum': float(np.sum(values)),
            'range': float(np.ptp(values))
        }
        
        if len(values) > 2:
            try:
                stats_dict['skewness'] = float(stats.skew(values))
                stats_dict['kurtosis'] = float(stats.kurtosis(values))
            except:
                pass
        
        return stats_dict
    
    def generate_interpretation(self, statistics):
        """Generate simple, plain-English interpretation that explains what the data actually shows"""
        mean = statistics['mean']
        median = statistics['median']
        minimum = statistics['min']
        maximum = statistics['max']
        count = statistics['count']
        total = statistics['sum']
        
        # Get the actual data with labels for context
        df = self.viz_df.copy()
        
        interpretations = []
        
        # 1. Simple data overview - what are we looking at?
        interpretations.append(f"Looking at this data, we have information about <strong>{count:,} entries</strong> for {self.column_name}.")
        
        # 2. What's the typical/average value?
        interpretations.append(f"The average value is <strong>{mean:.1f}</strong>, which means this is the typical number you'll see across all the data.")
        
        # 3. What's the range? (highest and lowest)
        interpretations.append(f"The values range from a low of <strong>{minimum:.1f}</strong> to a high of <strong>{maximum:.1f}</strong>.")
        
        # 4. Find what's highest and lowest (if we have labels)
        if len(df) > 0 and len(df) < 100:  # Only for reasonable dataset sizes
            highest_idx = df['Value'].idxmax()
            lowest_idx = df['Value'].idxmin()
            highest_label = df.loc[highest_idx, 'Label']
            highest_value = df.loc[highest_idx, 'Value']
            lowest_label = df.loc[lowest_idx, 'Label']
            lowest_value = df.loc[lowest_idx, 'Value']
            
            interpretations.append(f"The highest value is <strong>{highest_value:.1f}</strong> for {highest_label}, while the lowest is <strong>{lowest_value:.1f}</strong> for {lowest_label}.")
        
        # 5. Are the numbers similar or different from each other?
        value_spread = maximum - minimum
        if value_spread < mean * 0.3:  # Values are close together
            interpretations.append("The numbers are fairly similar to each other, meaning there's not much variation in the data.")
        elif value_spread < mean * 1.0:  # Moderate spread
            interpretations.append("There's some variation in the numbers - some are higher and some are lower, but they're relatively balanced.")
        else:  # Large spread
            interpretations.append("There's a significant difference between the highest and lowest values, showing quite a bit of variation in the data.")
        
        # 6. What does this mean in practical terms?
        column_lower = self.column_name.lower()
        
        if 'student' in column_lower or 'enrollment' in column_lower or 'enrollee' in column_lower:
            if mean > median:
                interpretations.append(f"Based on these numbers, there are <strong>more students in the higher-enrolled categories</strong>, with some categories having significantly more students than others.")
            else:
                interpretations.append(f"The student numbers are <strong>fairly evenly distributed</strong>, with most categories having similar enrollment numbers.")
        
        elif 'grade' in column_lower or 'score' in column_lower or 'mark' in column_lower:
            if mean >= 75:
                interpretations.append(f"Overall, the grades/scores are <strong>quite good</strong>, with an average of {mean:.1f} indicating strong performance.")
            elif mean >= 50:
                interpretations.append(f"The grades/scores are <strong>moderate</strong>, with an average of {mean:.1f} showing decent but improvable performance.")
            else:
                interpretations.append(f"The grades/scores are <strong>on the lower side</strong>, with an average of {mean:.1f} suggesting there may be areas needing improvement.")
        
        elif 'pass' in column_lower or 'fail' in column_lower:
            interpretations.append(f"Looking at the pass/fail data, the total number is {total:.0f}, with variations across different categories.")
        
        else:
            # Generic interpretation for any data type
            if mean > median + (maximum - minimum) * 0.1:
                interpretations.append(f"Most of the values are on the lower end, with a few higher values pulling the average up.")
            elif mean < median - (maximum - minimum) * 0.1:
                interpretations.append(f"Most of the values are on the higher end, with a few lower values pulling the average down.")
            else:
                interpretations.append(f"The values are relatively balanced around the middle, with no extreme outliers significantly affecting the average.")
        
        # 7. Simple actionable insight
        if maximum > mean * 2:
            interpretations.append(f"<strong>Key Finding:</strong> There are some categories with much higher values than others - these stand out as the top performers or most significant areas.")
        elif value_spread < mean * 0.2:
            interpretations.append(f"<strong>Key Finding:</strong> All the values are very close to each other, showing consistency across the board.")
        
        return " ".join(interpretations)
    
    def create_visualization(self, chart_type='bar', figsize=(12, 7), dpi=100):
        """
        Create professional matplotlib visualization with multiple colors
        
        Args:
            chart_type: Type of chart ('bar', 'line', 'pie', 'histogram', 'box')
            figsize: Figure size tuple
            dpi: DPI for the figure
            
        Returns:
            Base64 encoded image string
        """
        # Professional color palette
        PROFESSIONAL_COLORS = [
            '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
            '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#5470C6',
        ]
        
        plt.figure(figsize=figsize, dpi=dpi)
        
        # Clean, professional style
        plt.rcParams['font.family'] = 'sans-serif'
        plt.rcParams['font.sans-serif'] = ['Arial', 'Helvetica', 'DejaVu Sans']
        plt.rcParams['axes.facecolor'] = '#FAFAFA'
        plt.rcParams['figure.facecolor'] = '#FFFFFF'
        
        values = self.viz_df['Value'].values
        labels = self.viz_df['Label'].values
        
        # Limit labels for readability
        if len(labels) > 20:
            step = len(labels) // 20
            display_labels = [labels[i] if i % step == 0 else '' for i in range(len(labels))]
        else:
            display_labels = labels
        
        # Assign colors
        colors = [PROFESSIONAL_COLORS[i % len(PROFESSIONAL_COLORS)] for i in range(len(values))]
        
        if chart_type == 'bar':
            bars = plt.bar(range(len(values)), values, 
                          color=colors, 
                          edgecolor='white', 
                          linewidth=1.5,
                          alpha=0.85)
            
            plt.xticks(range(len(values)), display_labels, rotation=45, ha='right', fontsize=10)
            plt.ylabel('Value', fontsize=13, fontweight='500', color='#333333')
            plt.xlabel('Categories', fontsize=13, fontweight='500', color='#333333')
            plt.title(f'{self.column_name}', fontsize=16, fontweight='600', 
                     color='#2C3E50', pad=20)
            
            plt.grid(axis='y', alpha=0.15, linestyle='-', linewidth=0.8, color='#CCCCCC')
            ax = plt.gca()
            ax.set_axisbelow(True)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_linewidth(0.8)
            ax.spines['left'].set_color('#CCCCCC')
            ax.spines['bottom'].set_linewidth(0.8)
            ax.spines['bottom'].set_color('#CCCCCC')
            
            if len(values) <= 30:
                for bar, val in zip(bars, values):
                    height = bar.get_height()
                    plt.text(bar.get_x() + bar.get_width()/2., height,
                           f'{val:.0f}',
                           ha='center', va='bottom', fontsize=9, 
                           color='#333333', fontweight='500')
        
        elif chart_type == 'line':
            plt.plot(range(len(values)), values, 
                    marker='o', linewidth=3, markersize=7,
                    color='#5470C6', markerfacecolor='#5470C6', 
                    markeredgecolor='white', markeredgewidth=2)
            
            for i, (x, y) in enumerate(zip(range(len(values)), values)):
                plt.scatter(x, y, color=colors[i], s=80, zorder=5, 
                          edgecolor='white', linewidth=2)
            
            plt.xticks(range(len(values)), display_labels, rotation=45, ha='right', fontsize=10)
            plt.ylabel('Value', fontsize=13, fontweight='500', color='#333333')
            plt.xlabel('Categories', fontsize=13, fontweight='500', color='#333333')
            plt.title(f'{self.column_name} - Trend', fontsize=16, 
                     fontweight='600', color='#2C3E50', pad=20)
            
            plt.grid(True, alpha=0.15, linestyle='-', linewidth=0.8, color='#CCCCCC')
            ax = plt.gca()
            ax.set_axisbelow(True)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
        
        elif chart_type == 'pie':
            wedges, texts, autotexts = plt.pie(values, labels=labels if len(labels) <= 10 else None,
                   autopct='%1.1f%%', startangle=90,
                   colors=colors,
                   wedgeprops={'edgecolor': 'white', 'linewidth': 2.5},
                   textprops={'fontsize': 11, 'fontweight': '500', 'color': '#333333'})
            
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('700')
                autotext.set_fontsize(10)
            
            plt.title(f'{self.column_name} - Distribution', fontsize=16, 
                     fontweight='600', color='#2C3E50', pad=20)
        
        elif chart_type == 'histogram':
            n, bins, patches = plt.hist(values, bins=min(30, len(values)//10 if len(values) > 50 else 10),
                                       color='#5470C6', edgecolor='white', 
                                       linewidth=1.5, alpha=0.85)
            
            for i, patch in enumerate(patches):
                patch.set_facecolor(colors[i % len(colors)])
            
            plt.xlabel('Value Range', fontsize=13, fontweight='500', color='#333333')
            plt.ylabel('Frequency', fontsize=13, fontweight='500', color='#333333')
            plt.title(f'{self.column_name} - Distribution', fontsize=16, 
                     fontweight='600', color='#2C3E50', pad=20)
            
            plt.grid(axis='y', alpha=0.15, linestyle='-', linewidth=0.8, color='#CCCCCC')
            ax = plt.gca()
            ax.set_axisbelow(True)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
        
        elif chart_type == 'box':
            bp = plt.boxplot(values, vert=True, patch_artist=True, widths=0.5,
                           boxprops=dict(facecolor='#5470C6', edgecolor='#2C3E50', 
                                       linewidth=2, alpha=0.7),
                           whiskerprops=dict(color='#2C3E50', linewidth=2),
                           capprops=dict(color='#2C3E50', linewidth=2),
                           medianprops=dict(color='#EE6666', linewidth=3),
                           meanprops=dict(marker='D', markerfacecolor='#FAC858', 
                                        markeredgecolor='white', markersize=10, 
                                        markeredgewidth=2),
                           showmeans=True)
            
            plt.ylabel('Value', fontsize=13, fontweight='500', color='#333333')
            plt.title(f'{self.column_name} - Statistics', fontsize=16, 
                     fontweight='600', color='#2C3E50', pad=20)
            
            plt.grid(axis='y', alpha=0.15, linestyle='-', linewidth=0.8, color='#CCCCCC')
            ax = plt.gca()
            ax.set_axisbelow(True)
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            
            stats_text = (f"Median: {np.median(values):.1f}\n"
                         f"Mean: {np.mean(values):.1f}\n"
                         f"Range: {np.ptp(values):.1f}")
            plt.text(1.15, np.median(values), stats_text, fontsize=11,
                    bbox=dict(boxstyle='round,pad=0.8', facecolor='white', 
                            edgecolor='#CCCCCC', linewidth=1.5),
                    fontweight='500', color='#333333')
        
        if self.is_sampled:
            plt.figtext(0.99, 0.01, f'Showing {len(values):,} of {self.original_length:,} data points', 
                       ha='right', fontsize=9, style='italic', color='#999999')
        
        plt.tight_layout()
        
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=dpi, facecolor='white')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        plt.close()
        
        return f"data:image/png;base64,{image_base64}"
    
    def get_full_analysis(self, chart_type='bar'):
        """Get complete analysis with statistics, interpretation, and visualization"""
        try:
            statistics = self.calculate_statistics()
            interpretation = self.generate_interpretation(statistics)
            chart_image = self.create_visualization(chart_type)
            
            table_rows = self.viz_df.values.tolist()
            if len(table_rows) > 100:
                table_rows = table_rows[:100]
            
            return {
                'statistics': statistics,
                'interpretation': interpretation,
                'chart_image': chart_image,
                'table_data': {
                    'headers': ['Label', 'Value'],
                    'rows': table_rows
                },
                'summary': {
                    'total_records': statistics['count'],
                    'data_quality': 'Good' if statistics['count'] > 0 else 'No Data',
                    'outliers_detected': self._detect_outliers(),
                    'is_sampled': self.is_sampled,
                    'original_length': self.original_length
                }
            }
        except Exception as e:
            print(f"❌ Analysis failed: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise Exception(f"Analysis failed: {str(e)}")
    
    def _detect_outliers(self):
        """Detect outliers using IQR method"""
        values = self.full_data
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = values[(values < lower_bound) | (values > upper_bound)]
        return len(outliers)


def process_file_analytics(file_data, chart_type='bar'):
    """Process uploaded file and return analytics"""
    try:
        processor = AnalyticsProcessor(
            data=file_data.get('data', []),
            labels=file_data.get('labels'),
            column_name=file_data.get('column_name', file_data.get('filename', 'Dataset')),
            max_data_points=500
        )
        
        return processor.get_full_analysis(chart_type)
    except Exception as e:
        print(f"❌ Processing failed: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return {
            'error': str(e),
            'statistics': {},
            'interpretation': f"Unable to process data: {str(e)}",
            'chart_image': None
        }