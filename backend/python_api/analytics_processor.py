import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import io
import base64
from scipy import stats
import json

class AnalyticsProcessor:
    """Process analytics data using numpy, pandas, and matplotlib"""
    
    def __init__(self, data, labels=None, column_name="Dataset"):
        """
        Initialize with data array and optional labels
        
        Args:
            data: List or array of numeric values
            labels: List of labels for the data points
            column_name: Name of the data column
        """
        self.df = pd.DataFrame({
            'Label': labels if labels else [f"Item {i+1}" for i in range(len(data))],
            'Value': pd.to_numeric(data, errors='coerce')
        })
        self.df = self.df.dropna()  # Remove any NaN values
        self.column_name = column_name
        
    def calculate_statistics(self):
        """Calculate comprehensive statistics using numpy and pandas"""
        values = self.df['Value'].values
        
        stats_dict = {
            'mean': float(np.mean(values)),
            'median': float(np.median(values)),
            'mode': float(stats.mode(values, keepdims=True)[0][0]) if len(values) > 0 else 0,
            'std': float(np.std(values)),
            'variance': float(np.var(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'q1': float(np.percentile(values, 25)),
            'q3': float(np.percentile(values, 75)),
            'count': int(len(values)),
            'sum': float(np.sum(values)),
            'range': float(np.ptp(values))  # Peak to peak (max - min)
        }
        
        # Calculate skewness and kurtosis
        if len(values) > 2:
            stats_dict['skewness'] = float(stats.skew(values))
            stats_dict['kurtosis'] = float(stats.kurtosis(values))
        
        return stats_dict
    
    def generate_interpretation(self, statistics):
        """Generate intelligent interpretation based on statistical analysis"""
        mean = statistics['mean']
        std = statistics['std']
        skewness = statistics.get('skewness', 0)
        
        interpretations = []
        
        # Overall performance assessment
        if mean > 75:
            interpretations.append("📈 **Strong Performance**: The dataset shows excellent overall values with a mean of {:.2f}.".format(mean))
        elif mean > 50:
            interpretations.append("📊 **Moderate Performance**: The dataset demonstrates satisfactory values with a mean of {:.2f}.".format(mean))
        elif mean > 25:
            interpretations.append("📉 **Developing Performance**: The dataset shows room for improvement with a mean of {:.2f}.".format(mean))
        else:
            interpretations.append("⚠️ **Low Performance**: The dataset indicates significant improvement opportunities with a mean of {:.2f}.".format(mean))
        
        # Variability analysis
        cv = (std / mean * 100) if mean != 0 else 0  # Coefficient of variation
        if cv < 10:
            interpretations.append("✅ **High Consistency**: Data points show minimal variation (CV: {:.1f}%), indicating stable and predictable patterns.".format(cv))
        elif cv < 25:
            interpretations.append("📊 **Moderate Variability**: Data shows acceptable variation (CV: {:.1f}%), suggesting some fluctuation within normal ranges.".format(cv))
        else:
            interpretations.append("⚡ **High Variability**: Significant variation detected (CV: {:.1f}%), indicating diverse or inconsistent patterns that may require attention.".format(cv))
        
        # Distribution shape analysis
        if abs(skewness) < 0.5:
            interpretations.append("⚖️ **Balanced Distribution**: The data is approximately symmetrical, suggesting even distribution across the range.")
        elif skewness > 0.5:
            interpretations.append("📈 **Right-Skewed Distribution**: More values cluster on the lower end, with fewer high outliers. This suggests potential for growth.")
        else:
            interpretations.append("📉 **Left-Skewed Distribution**: More values cluster on the higher end, indicating generally strong performance with few low outliers.")
        
        # Range analysis
        data_range = statistics['range']
        if data_range > mean * 1.5:
            interpretations.append("🎯 **Wide Range**: Significant gap between minimum ({:.2f}) and maximum ({:.2f}) values suggests diverse performance levels.".format(
                statistics['min'], statistics['max']))
        
        # Actionable recommendations
        if mean < 50 and cv > 25:
            interpretations.append("💡 **Recommendation**: Focus on both improving average performance and reducing inconsistency across data points.")
        elif mean > 70 and cv < 15:
            interpretations.append("💡 **Recommendation**: Excellent performance detected. Consider strategies to maintain and replicate this success.")
        elif cv > 30:
            interpretations.append("💡 **Recommendation**: Address high variability through standardization or targeted interventions for outliers.")
        
        return " ".join(interpretations)
    
    def create_visualization(self, chart_type='bar', figsize=(10, 6), dpi=100):
        """
        Create matplotlib visualization and return as base64 encoded image
        
        Args:
            chart_type: Type of chart ('bar', 'line', 'pie', 'histogram', 'box')
            figsize: Figure size tuple
            dpi: DPI for the figure
            
        Returns:
            Base64 encoded image string
        """
        plt.figure(figsize=figsize, dpi=dpi)
        plt.style.use('seaborn-v0_8-darkgrid')
        
        values = self.df['Value'].values
        labels = self.df['Label'].values
        
        colors = plt.cm.Set3(np.linspace(0, 1, len(values)))
        
        if chart_type == 'bar':
            bars = plt.bar(range(len(values)), values, color=colors, edgecolor='black', linewidth=1.2)
            plt.xticks(range(len(values)), labels, rotation=45, ha='right')
            plt.ylabel('Value', fontsize=12, fontweight='bold')
            plt.title(f'{self.column_name} - Bar Chart', fontsize=14, fontweight='bold', pad=20)
            plt.grid(axis='y', alpha=0.3, linestyle='--')
            
            # Add value labels on bars
            for i, (bar, val) in enumerate(zip(bars, values)):
                plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(values)*0.01, 
                        f'{val:.1f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
        
        elif chart_type == 'line':
            plt.plot(range(len(values)), values, marker='o', linewidth=2.5, 
                    markersize=8, color='#2E86AB', markerfacecolor='#A23B72', markeredgecolor='black', markeredgewidth=1.5)
            plt.xticks(range(len(values)), labels, rotation=45, ha='right')
            plt.ylabel('Value', fontsize=12, fontweight='bold')
            plt.title(f'{self.column_name} - Line Chart', fontsize=14, fontweight='bold', pad=20)
            plt.grid(True, alpha=0.3, linestyle='--')
            plt.fill_between(range(len(values)), values, alpha=0.2, color='#2E86AB')
        
        elif chart_type == 'pie':
            plt.pie(values, labels=labels, autopct='%1.1f%%', startangle=90, 
                   colors=colors, explode=[0.05]*len(values), shadow=True,
                   wedgeprops={'edgecolor': 'black', 'linewidth': 1.5})
            plt.title(f'{self.column_name} - Distribution', fontsize=14, fontweight='bold', pad=20)
            plt.axis('equal')
        
        elif chart_type == 'histogram':
            n, bins, patches = plt.hist(values, bins=min(10, len(values)), 
                                       color='#06D6A0', edgecolor='black', linewidth=1.2, alpha=0.7)
            plt.xlabel('Value Range', fontsize=12, fontweight='bold')
            plt.ylabel('Frequency', fontsize=12, fontweight='bold')
            plt.title(f'{self.column_name} - Distribution Histogram', fontsize=14, fontweight='bold', pad=20)
            plt.grid(axis='y', alpha=0.3, linestyle='--')
            
            # Color bars by height
            cm = plt.cm.RdYlGn
            norm = plt.Normalize(vmin=n.min(), vmax=n.max())
            for patch, height in zip(patches, n):
                patch.set_facecolor(cm(norm(height)))
        
        elif chart_type == 'box':
            bp = plt.boxplot(values, vert=True, patch_artist=True, 
                           notch=True, showmeans=True,
                           boxprops=dict(facecolor='#FFB703', edgecolor='black', linewidth=1.5),
                           whiskerprops=dict(color='black', linewidth=1.5),
                           capprops=dict(color='black', linewidth=1.5),
                           medianprops=dict(color='#023047', linewidth=2),
                           meanprops=dict(marker='D', markerfacecolor='red', markeredgecolor='black', markersize=8))
            plt.ylabel('Value', fontsize=12, fontweight='bold')
            plt.title(f'{self.column_name} - Box Plot', fontsize=14, fontweight='bold', pad=20)
            plt.grid(axis='y', alpha=0.3, linestyle='--')
            
            # Add statistical annotations
            stats_text = f"Median: {np.median(values):.2f}\nMean: {np.mean(values):.2f}\nStd: {np.std(values):.2f}"
            plt.text(1.15, np.median(values), stats_text, fontsize=9, 
                    bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
        
        plt.tight_layout()
        
        # Convert plot to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=dpi)
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        plt.close()
        
        return f"data:image/png;base64,{image_base64}"
    
    def get_full_analysis(self, chart_type='bar'):
        """
        Get complete analysis with statistics, interpretation, and visualization
        
        Returns:
            Dictionary with all analysis components
        """
        statistics = self.calculate_statistics()
        interpretation = self.generate_interpretation(statistics)
        chart_image = self.create_visualization(chart_type)
        
        return {
            'statistics': statistics,
            'interpretation': interpretation,
            'chart_image': chart_image,
            'table_data': {
                'headers': ['Label', 'Value'],
                'rows': self.df.values.tolist()
            },
            'summary': {
                'total_records': statistics['count'],
                'data_quality': 'Good' if statistics['count'] > 0 else 'No Data',
                'outliers_detected': self._detect_outliers()
            }
        }
    
    def _detect_outliers(self):
        """Detect outliers using IQR method"""
        values = self.df['Value'].values
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = values[(values < lower_bound) | (values > upper_bound)]
        return len(outliers)


def process_file_analytics(file_data, chart_type='bar'):
    """
    Process uploaded file and return analytics
    
    Args:
        file_data: Dictionary with 'data', 'labels', 'filename', 'column_name'
        chart_type: Type of visualization
        
    Returns:
        Complete analytics dictionary
    """
    try:
        processor = AnalyticsProcessor(
            data=file_data.get('data', []),
            labels=file_data.get('labels'),
            column_name=file_data.get('column_name', file_data.get('filename', 'Dataset'))
        )
        
        return processor.get_full_analysis(chart_type)
    except Exception as e:
        return {
            'error': str(e),
            'statistics': {},
            'interpretation': f"Error processing data: {str(e)}",
            'chart_image': None
        }