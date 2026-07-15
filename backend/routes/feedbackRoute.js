// backend/routes/feedbackRoute.js
// General Feedback & Satisfaction Rating System (Students & Visitors)

import express from "express";
import pool from "../db.js";
const router = express.Router();
console.log('✅ Feedback routes file loaded');

// ============================================
// PUBLIC ENDPOINTS (Student & Visitor Side)
// ============================================

// POST - Submit feedback (STUDENT & GENERAL)
router.post("/feedback", async (req, res) => {
  console.log('🔍 POST /feedback hit');
  console.log('📦 Request body:', req.body);

  const {
    submitter_name,
    submitter_email,
    submitter_phone,
    department_id,
    overall_rating,
    processing_time,
    staff_assistance,
    clarity,
    facility,
    comments,
    is_anonymous,
    user_type
  } = req.body;

  // Validation - ratings are required
  if (!department_id || !overall_rating || !processing_time ||
      !staff_assistance || !clarity || !facility) {
    console.log('❌ Missing required fields');
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  // If not anonymous, require name
  if (!is_anonymous && !submitter_name) {
    console.log('❌ Name required for non-anonymous submission');
    return res.status(400).json({
      success: false,
      message: "Name is required for non-anonymous submission"
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
    // Insert feedback
    const insertQuery = `
      INSERT INTO feedback (
        submitter_name,
        submitter_email,
        submitter_phone,
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING feedback_id, created_at
    `;

    const values = [
      is_anonymous ? null : submitter_name,
      is_anonymous ? null : submitter_email || null,
      is_anonymous ? null : submitter_phone || null,
      department_id,
      overall_rating,
      processing_time,
      staff_assistance,
      clarity,
      facility,
      comments || null,
      is_anonymous || false,
      user_type || 'general'
    ];

    const result = await pool.query(insertQuery, values);
    const feedback = result.rows[0];

    console.log('✅ Feedback saved successfully:', feedback);

    // Send notification if rating is 2 or below
    if (overall_rating <= 2) {
      await sendLowRatingNotification(department_id, feedback.feedback_id, user_type || 'general');
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


// ============================================
// ADMIN ENDPOINTS (Department Staff)
// ============================================

// GET - Fetch feedback for specific department (with filters)
router.get("/feedback/department/:department_id", async (req, res) => {
  console.log('🔍 GET /feedback/department/:id hit');
  const { department_id } = req.params;
  const { start_date, end_date, min_rating, max_rating, user_type } = req.query;
  const isSuperAdmin = req.user?.role === 'super_admin'; // Assumes auth middleware sets req.user

  try {
    let query = `
      SELECT
        f.feedback_id,
        f.user_type,
        CASE
          WHEN f.is_anonymous = true THEN 'Anonymous'
          ELSE COALESCE(f.submitter_name, 'Not Specified')
        END as user_identifier,
        CASE
          WHEN f.is_anonymous = true OR NOT $1::boolean THEN NULL
          ELSE f.submitter_email
        END as submitter_email,
        CASE
          WHEN f.is_anonymous = true OR NOT $1::boolean THEN NULL
          ELSE f.submitter_phone
        END as submitter_phone,
        f.overall_rating,
        f.processing_time,
        f.staff_assistance,
        f.clarity,
        f.facility,
        f.comments,
        f.created_at,
        f.is_anonymous
      FROM feedback f
      WHERE f.department_id = $2
    `;

    const params = [isSuperAdmin, department_id];
    let paramIndex = 3;

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