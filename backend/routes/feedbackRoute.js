// backend/routes/feedbackRoute.js
// Transaction-Based Feedback & Satisfaction Rating System

import express from "express";
import pool from "../db.js";
const router = express.Router();
console.log('✅ Feedback routes file loaded');

// ============================================
// PUBLIC ENDPOINTS (Student & Visitor Side)
// ============================================

// POST - Validate transaction before feedback (STUDENT)
router.post("/feedback/validate", async (req, res) => {
  console.log('🔍 POST /feedback/validate hit');
  const { transaction_id, student_number, department } = req.body;
  
  if (!transaction_id || !student_number || !department) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }
  
  try {
    const query = `
      SELECT t.*, d.department_name, d.department_id
      FROM transactions t
      JOIN departments d ON t.department_id = d.department_id
      WHERE t.transaction_id = $1 
        AND t.student_number = $2 
        AND d.department_name = $3
        AND t.status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM feedback f WHERE f.transaction_id = t.transaction_id
        )
    `;
    
    const result = await pool.query(query, [transaction_id, student_number, department]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found, already has feedback, or is not eligible"
      });
    }
    
    res.json({
      success: true,
      transaction: result.rows[0]
    });
  } catch (err) {
    console.error("Transaction validation error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to validate transaction"
    });
  }
});

// POST - Submit feedback (STUDENT)
router.post("/feedback", async (req, res) => {
  console.log('🔍 POST /feedback (STUDENT) hit');
  console.log('📦 Request body:', req.body);
  
  const {
    transaction_id,
    student_number,
    department_id,
    overall_rating,
    processing_time,
    staff_assistance,
    clarity,
    facility,
    comments,
    is_anonymous
  } = req.body;
  
  // Validation
  if (!transaction_id || !student_number || !department_id || 
      !overall_rating || !processing_time || !staff_assistance || 
      !clarity || !facility) {
    console.log('❌ Missing required fields');
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }
  
  // Validate ratings are between 1-5
  const ratings = [overall_rating, processing_time, staff_assistance, clarity, facility];
  if (ratings.some(r => r < 1 || r > 5)) {
    console.log('❌ Invalid rating values');
    return res.status(400).json({
      success: false,
      message: "Invalid rating values. Must be between 1 and 5"
    });
  }
  
  try {
    // Check if feedback already exists
    const checkQuery = `SELECT feedback_id FROM feedback WHERE transaction_id = $1`;
    const checkResult = await pool.query(checkQuery, [transaction_id]);
    
    if (checkResult.rows.length > 0) {
      console.log('❌ Feedback already exists for this transaction');
      return res.status(409).json({
        success: false,
        message: "Feedback already submitted for this transaction"
      });
    }
    
    // Insert feedback with user_type = 'student'
    const insertQuery = `
      INSERT INTO feedback (
        transaction_id,
        student_number,
        department_id,
        overall_rating,
        processing_time,
        staff_assistance,
        clarity,
        facility,
        comments,
        is_anonymous,
        user_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'student', NOW())
      RETURNING feedback_id, created_at
    `;
    
    const values = [
      transaction_id,
      student_number,
      department_id,
      overall_rating,
      processing_time,
      staff_assistance,
      clarity,
      facility,
      comments || null,
      is_anonymous || false
    ];
    
    const result = await pool.query(insertQuery, values);
    const feedback = result.rows[0];
    
    console.log('✅ Student feedback saved successfully:', feedback);
    
    // Send notification if rating is 2 or below
    if (overall_rating <= 2) {
      await sendLowRatingNotification(department_id, feedback.feedback_id, 'student');
    }
    
    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback_id: `FB-${feedback.feedback_id}`,
      submitted_at: feedback.created_at
    });
  } catch (err) {
    console.error("❌ Feedback submission error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback"
    });
  }
});

// POST - Submit feedback (VISITOR)
router.post("/feedback/visitor", async (req, res) => {
  console.log('🔍 POST /feedback/visitor hit');
  console.log('📦 Request body:', req.body);
  
  const {
    visitor_name,
    visitor_email,
    visitor_phone,
    department_id,
    service_type,
    visit_date,
    overall_rating,
    processing_time,
    staff_assistance,
    clarity,
    facility,
    comments
  } = req.body;
  
  // Validation
  if (!visitor_name || !department_id || !service_type || !visit_date ||
      !overall_rating || !processing_time || !staff_assistance || 
      !clarity || !facility) {
    console.log('❌ Missing required fields');
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }
  
  // Validate ratings are between 1-5
  const ratings = [overall_rating, processing_time, staff_assistance, clarity, facility];
  if (ratings.some(r => r < 1 || r > 5)) {
    console.log('❌ Invalid rating values');
    return res.status(400).json({
      success: false,
      message: "Invalid rating values. Must be between 1 and 5"
    });
  }
  
  try {
    // Insert visitor feedback
    const insertQuery = `
      INSERT INTO feedback (
        visitor_name,
        visitor_email,
        visitor_phone,
        department_id,
        service_type,
        visit_date,
        overall_rating,
        processing_time,
        staff_assistance,
        clarity,
        facility,
        comments,
        user_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'visitor', NOW())
      RETURNING feedback_id, created_at
    `;
    
    const values = [
      visitor_name,
      visitor_email || null,
      visitor_phone || null,
      department_id,
      service_type,
      visit_date,
      overall_rating,
      processing_time,
      staff_assistance,
      clarity,
      facility,
      comments || null
    ];
    
    const result = await pool.query(insertQuery, values);
    const feedback = result.rows[0];
    
    console.log('✅ Visitor feedback saved successfully:', feedback);
    
    // Send notification if rating is 2 or below
    if (overall_rating <= 2) {
      await sendLowRatingNotification(department_id, feedback.feedback_id, 'visitor');
    }
    
    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback_id: `FB-V-${feedback.feedback_id}`,
      submitted_at: feedback.created_at
    });
  } catch (err) {
    console.error("❌ Visitor feedback submission error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback"
    });
  }
});

// ============================================
// ADMIN ENDPOINTS (Department Staff)
// ============================================

// GET - Fetch feedback for specific department (with filters)
router.get("/feedback/department/:department_id", async (req, res) => {
  console.log('🔍 GET /feedback/department/:id hit');
  const { department_id } = req.params;
  const { start_date, end_date, min_rating, max_rating, user_type } = req.query;
  
  try {
    let query = `
      SELECT 
        f.feedback_id,
        f.transaction_id,
        f.user_type,
        CASE 
          WHEN f.user_type = 'student' THEN
            CASE 
              WHEN f.is_anonymous = true THEN 'Anonymous Student'
              ELSE f.student_number
            END
          WHEN f.user_type = 'visitor' THEN f.visitor_name
        END as user_identifier,
        f.visitor_email,
        f.visitor_phone,
        f.service_type,
        f.visit_date,
        f.overall_rating,
        f.processing_time,
        f.staff_assistance,
        f.clarity,
        f.facility,
        f.comments,
        f.created_at,
        t.transaction_type,
        t.transaction_date
      FROM feedback f
      LEFT JOIN transactions t ON f.transaction_id = t.transaction_id
      WHERE f.department_id = $1
    `;
    
    const params = [department_id];
    let paramIndex = 2;
    
    if (user_type) {
      query += ` AND f.user_type = $${paramIndex}`;
      params.push(user_type);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND f.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND f.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    if (min_rating) {
      query += ` AND f.overall_rating >= $${paramIndex}`;
      params.push(min_rating);
      paramIndex++;
    }
    
    if (max_rating) {
      query += ` AND f.overall_rating <= $${paramIndex}`;
      params.push(max_rating);
      paramIndex++;
    }
    
    query += ` ORDER BY f.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} feedback items for department ${department_id}`);
    
    res.json({
      success: true,
      feedback: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error("Fetch department feedback error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback"
    });
  }
});

// GET - Department statistics
router.get("/feedback/department/:department_id/stats", async (req, res) => {
  console.log('🔍 GET /feedback/department/:id/stats hit');
  const { department_id } = req.params;
  
  try {
    const query = `
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN user_type = 'student' THEN 1 END) as student_feedback,
        COUNT(CASE WHEN user_type = 'visitor' THEN 1 END) as visitor_feedback,
        ROUND(AVG(overall_rating), 2) as avg_overall_rating,
        ROUND(AVG(processing_time), 2) as avg_processing_time,
        ROUND(AVG(staff_assistance), 2) as avg_staff_assistance,
        ROUND(AVG(clarity), 2) as avg_clarity,
        ROUND(AVG(facility), 2) as avg_facility,
        COUNT(CASE WHEN overall_rating = 5 THEN 1 END) as five_star_count,
        COUNT(CASE WHEN overall_rating = 4 THEN 1 END) as four_star_count,
        COUNT(CASE WHEN overall_rating = 3 THEN 1 END) as three_star_count,
        COUNT(CASE WHEN overall_rating = 2 THEN 1 END) as two_star_count,
        COUNT(CASE WHEN overall_rating = 1 THEN 1 END) as one_star_count
      FROM feedback
      WHERE department_id = $1
    `;
    
    const result = await pool.query(query, [department_id]);
    
    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (err) {
    console.error("Fetch department stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics"
    });
  }
});

// ============================================
// DIRECTOR ENDPOINTS (Read-only)
// ============================================

// GET - Aggregated analytics across all departments
router.get("/feedback/director/analytics", async (req, res) => {
  console.log('🔍 GET /feedback/director/analytics hit');
  const { start_date, end_date, user_type } = req.query;
  
  try {
    let query = `
      SELECT 
        d.department_name,
        d.department_id,
        COUNT(f.feedback_id) as total_feedback,
        COUNT(CASE WHEN f.user_type = 'student' THEN 1 END) as student_feedback,
        COUNT(CASE WHEN f.user_type = 'visitor' THEN 1 END) as visitor_feedback,
        ROUND(AVG(f.overall_rating), 2) as avg_rating,
        ROUND(AVG(f.processing_time), 2) as avg_processing_time,
        ROUND(AVG(f.staff_assistance), 2) as avg_staff_assistance,
        ROUND(AVG(f.clarity), 2) as avg_clarity,
        ROUND(AVG(f.facility), 2) as avg_facility,
        COUNT(CASE WHEN f.overall_rating <= 2 THEN 1 END) as low_rating_count
      FROM departments d
      LEFT JOIN feedback f ON d.department_id = f.department_id
    `;
    
    const params = [];
    let paramIndex = 1;
    const conditions = [];
    
    if (user_type) {
      conditions.push(`f.user_type = $${paramIndex}`);
      params.push(user_type);
      paramIndex++;
    }
    
    if (start_date) {
      conditions.push(`f.created_at >= $${paramIndex}`);
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      conditions.push(`f.created_at <= $${paramIndex}`);
      params.push(end_date);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ` GROUP BY d.department_id, d.department_name ORDER BY avg_rating DESC NULLS LAST`;
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Analytics returned ${result.rows.length} departments`);
    
    res.json({
      success: true,
      analytics: result.rows
    });
  } catch (err) {
    console.error("Director analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics"
    });
  }
});

// GET - Monthly satisfaction trends
router.get("/feedback/director/trends", async (req, res) => {
  console.log('🔍 GET /feedback/director/trends hit');
  const { months = 6, user_type } = req.query;
  
  try {
    let query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        ROUND(AVG(overall_rating), 2) as avg_rating,
        COUNT(*) as feedback_count,
        COUNT(CASE WHEN user_type = 'student' THEN 1 END) as student_count,
        COUNT(CASE WHEN user_type = 'visitor' THEN 1 END) as visitor_count
      FROM feedback
      WHERE created_at >= NOW() - INTERVAL '${parseInt(months)} months'
    `;
    
    if (user_type) {
      query += ` AND user_type = '${user_type}'`;
    }
    
    query += `
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Trends data: ${result.rows.length} months`);
    
    res.json({
      success: true,
      trends: result.rows
    });
  } catch (err) {
    console.error("Trends error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trends"
    });
  }
});

// GET - Common complaints (keyword-based)
router.get("/feedback/director/complaints", async (req, res) => {
  console.log('🔍 GET /feedback/director/complaints hit');
  const { user_type } = req.query;
  
  try {
    let query = `
      SELECT 
        d.department_name,
        f.user_type,
        CASE 
          WHEN f.user_type = 'student' THEN
            CASE WHEN f.is_anonymous THEN 'Anonymous Student' ELSE f.student_number END
          ELSE f.visitor_name
        END as user_identifier,
        f.comments,
        f.overall_rating,
        f.created_at
      FROM feedback f
      JOIN departments d ON f.department_id = d.department_id
      WHERE f.overall_rating <= 2 
        AND f.comments IS NOT NULL 
        AND LENGTH(f.comments) > 10
    `;
    
    if (user_type) {
      query += ` AND f.user_type = '${user_type}'`;
    }
    
    query += ` ORDER BY f.created_at DESC LIMIT 50`;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      complaints: result.rows
    });
  } catch (err) {
    console.error("Complaints error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch complaints"
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function sendLowRatingNotification(department_id, feedback_id, user_type) {
  console.log(`🔔 Low rating notification: Department ${department_id}, Feedback ${feedback_id}, Type: ${user_type}`);
  // TODO: Integrate with notification system
}

console.log('✅ All feedback routes registered');

export default router;