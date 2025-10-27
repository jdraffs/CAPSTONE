const sampleReports = [
  {
    id: 1,
    title: 'Enrollment per Semester 2024-2025',
    dataset: 'Enrollment_Data_2024-2025.xlsx',
    metric: 'Student Enrollment by Semester',
    date: '2025-06-15',
    chartType: 'bar',
    recordsProcessed: 4850,
    chartData: {
      labels: ['1st Sem 2024', '2nd Sem 2024', '1st Sem 2025', '2nd Sem 2025'],
      datasets: [{
        label: 'Enrolled Students',
        data: [1245, 1198, 1356, 1289],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
      }]
    },
    stats: { mean: 1272, median: 1267, mode: 1245, count: 4850 },
    interpretation: 'Enrollment shows positive growth trajectory with 1st Semester 2025 reaching peak enrollment of 1,356 students (9% increase vs 1st Sem 2024). Second semester typically shows slight decline (5-7%) due to academic transfers and mid-year departures, which is normal seasonal pattern. The consistent growth in first semester enrollments indicates strong recruitment efforts and institutional reputation. Key insight: Retention between semesters averages 95%, which is above national average of 92%. Recommendation: Maintain current recruitment strategies while focusing on improving 2nd semester retention through enhanced student support services and mid-year orientation programs.',
    tableData: {
      headers: ['Semester', 'Enrolled', 'Change'],
      rows: [
        ['1st Sem 2024', '1,245', '-'],
        ['2nd Sem 2024', '1,198', '-3.8%'],
        ['1st Sem 2025', '1,356', '+13.2%'],
        ['2nd Sem 2025', '1,289', '-4.9%']
      ]
    }
  },
  {
    id: 2,
    title: 'Dropout Analysis per Semester',
    dataset: 'Dropout_Report_2024-2025.csv',
    metric: 'Student Dropouts by Semester',
    date: '2025-06-20',
    chartType: 'line',
    recordsProcessed: 342,
    chartData: {
      labels: ['1st Sem 2024', '2nd Sem 2024', '1st Sem 2025', '2nd Sem 2025'],
      datasets: [{
        label: 'Dropouts',
        data: [95, 78, 89, 80],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    stats: { mean: 86, median: 84, mode: 80, count: 342 },
    interpretation: 'Total dropout count of 342 students across academic year 2024-2025 represents 7.1% of total enrollment, which is below the national average of 9.3%. Dropout rates show seasonal patterns with 1st semester averaging 92 students and 2nd semester averaging 79 students. The decline trend from 1st Sem 2024 (95 dropouts) to 2nd Sem 2025 (80 dropouts) indicates improving retention efforts. Analysis by course shows BS Information Technology has lowest dropout rate at 5.2%, while BS Office Administration faces challenges at 9.8%. Primary dropout reasons: Financial constraints (38%), academic difficulties (28%), and personal circumstances (22%). Recommendation: Implement early intervention programs targeting students showing warning signs in first 6 weeks, expand scholarship opportunities, and provide academic tutoring support especially for BS Office Administration students.',
    tableData: {
      headers: ['Semester', 'Dropouts', 'Rate'],
      rows: [
        ['1st Sem 2024', '95', '7.6%'],
        ['2nd Sem 2024', '78', '6.5%'],
        ['1st Sem 2025', '89', '6.6%'],
        ['2nd Sem 2025', '80', '6.2%']
      ]
    }
  },
  {
    id: 3,
    title: 'Graduates per Year by Course',
    dataset: 'Graduate_Report_2020-2024.xlsx',
    metric: 'Total Graduates per Course',
    date: '2025-05-15',
    chartType: 'bar',
    recordsProcessed: 1847,
    chartData: {
      labels: ['BS Information Technology', 'BS Hotel Management', 'BS Computer Engineering', 'BS Office Administration'],
      datasets: [{
        label: 'Graduates (2024)',
        data: [285, 198, 245, 167],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
      }]
    },
    stats: { mean: 224, median: 222, mode: 285, count: 895 },
    interpretation: 'Academic year 2024 produced 895 graduates across all four courses, marking a 12% increase from 2023 (799 graduates). BS Information Technology leads with 285 graduates (31.8% of total), reflecting strong industry demand and high program completion rates. BS Computer Engineering follows with 245 graduates (27.4%), showing consistent growth aligned with tech sector expansion. BS Hotel Management graduated 198 students (22.1%), recovering from pandemic impacts with 18% year-over-year growth. BS Office Administration produced 167 graduates (18.7%), the smallest cohort but maintaining steady output. Five-year trend analysis shows overall 34% growth in graduate numbers from 2020 to 2024. Graduation rate across all courses averages 87%, exceeding national benchmark of 83%. Key success factors: Enhanced career guidance, industry partnerships, and improved academic support services. Recommendation: Continue strengthening industry linkages, particularly for BS Hotel Management to capitalize on tourism recovery, and expand BS Information Technology capacity to meet growing enrollment demand.',
    tableData: {
      headers: ['Course', 'Graduates', 'Percentage'],
      rows: [
        ['BS Information Technology', '285', '31.8%'],
        ['BS Hotel Management', '198', '22.1%'],
        ['BS Computer Engineering', '245', '27.4%'],
        ['BS Office Administration', '167', '18.7%']
      ]
    }
  },
  {
    id: 4,
    title: 'Enrollment per Course - 1st Sem 2025',
    dataset: 'Course_Enrollment_1stSem2025.xlsx',
    metric: 'Current Enrollment by Course',
    date: '2025-08-20',
    chartType: 'pie',
    recordsProcessed: 1356,
    chartData: {
      labels: ['BS Information Technology', 'BS Hotel Management', 'BS Computer Engineering', 'BS Office Administration'],
      datasets: [{
        data: [425, 298, 387, 246],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
      }]
    },
    stats: { mean: 339, median: 343, mode: 425, count: 1356 },
    interpretation: 'Current semester (1st Sem 2025) shows total enrollment of 1,356 students distributed across four courses. BS Information Technology dominates with 425 students (31.3%), driven by strong job market prospects and digital transformation trends. BS Computer Engineering enrolls 387 students (28.5%), maintaining competitive position with hardware-software integration focus. BS Hotel Management has 298 students (22.0%), showing recovery momentum as tourism industry rebounds. BS Office Administration enrolls 246 students (18.1%), the smallest program but stable with consistent demand from administrative sectors. Course capacity utilization: BSIT at 94%, BSCE at 86%, BSHM at 83%, and BSOA at 82%. Demographic analysis reveals 58% female enrollment overall, with BSOA highest at 73% female and BSCE lowest at 35% female. First-year student retention after first semester averages 93% across all courses. Recommendation: Consider expanding BSIT capacity given high demand and waitlist of 47 qualified applicants. Develop targeted recruitment for BSOA to optimize resource utilization. Implement gender diversity initiatives for BSCE program.',
    tableData: {
      headers: ['Course', 'Students', 'Percentage'],
      rows: [
        ['BS Information Technology', '425', '31.3%'],
        ['BS Hotel Management', '298', '22.0%'],
        ['BS Computer Engineering', '387', '28.5%'],
        ['BS Office Administration', '246', '18.1%']
      ]
    }
  }
];