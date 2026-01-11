// backend/routes/scholarshipsRoute.js
// Backend route for scholarship management (Future Implementation)

import express from "express";
import pool from "../db.js";
const router = express.Router();

// GET all active scholarships (public-facing)
router.get("/scholarships", async (req, res) => {
  try {
    const query = `
      SELECT 
        id, title, provider, provider_type, description, 
        eligibility, type, status, deadline, campus, 
        posted_date, requirements, documents, process, contact
      FROM scholarships
      WHERE campus = 'PUP Parañaque' 
        AND status IN ('Open', 'Upcoming')
      ORDER BY 
        CASE status 
          WHEN 'Open' THEN 1 
          WHEN 'Upcoming' THEN 2 
          ELSE 3 
        END,
        posted_date DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      scholarships: result.rows
    });
  } catch (err) {
    console.error("Failed to fetch scholarships:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch scholarships"
    });
  }
});

// GET single scholarship by ID
router.get("/scholarships/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      SELECT * FROM scholarships 
      WHERE id = $1 AND campus = 'PUP Parañaque'
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found"
      });
    }
    
    res.json({
      success: true,
      scholarship: result.rows[0]
    });
  } catch (err) {
    console.error("Failed to fetch scholarship:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch scholarship details"
    });
  }
});

// POST create new scholarship (Admin only - requires authentication)
router.post("/scholarships", async (req, res) => {
  const {
    title,
    provider,
    provider_type,
    description,
    eligibility,
    type,
    status,
    deadline,
    requirements,
    documents,
    process,
    contact
  } = req.body;
  
  try {
    const query = `
      INSERT INTO scholarships (
        title, provider, provider_type, description, 
        eligibility, type, status, deadline, campus,
        requirements, documents, process, contact, posted_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `;
    
    const values = [
      title,
      provider,
      provider_type,
      description,
      eligibility,
      type,
      status,
      deadline,
      'PUP Parañaque',
      JSON.stringify(requirements),
      JSON.stringify(documents),
      JSON.stringify(process),
      contact
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      message: "Scholarship created successfully",
      scholarship: result.rows[0]
    });
  } catch (err) {
    console.error("Failed to create scholarship:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create scholarship"
    });
  }
});

// PUT update scholarship (Admin only - requires authentication)
router.put("/scholarships/:id", async (req, res) => {
  const { id } = req.params;
  const {
    title,
    provider,
    provider_type,
    description,
    eligibility,
    type,
    status,
    deadline,
    requirements,
    documents,
    process,
    contact
  } = req.body;
  
  try {
    const query = `
      UPDATE scholarships SET
        title = $1,
        provider = $2,
        provider_type = $3,
        description = $4,
        eligibility = $5,
        type = $6,
        status = $7,
        deadline = $8,
        requirements = $9,
        documents = $10,
        process = $11,
        contact = $12
      WHERE id = $13 AND campus = 'PUP Parañaque'
      RETURNING *
    `;
    
    const values = [
      title,
      provider,
      provider_type,
      description,
      eligibility,
      type,
      status,
      deadline,
      JSON.stringify(requirements),
      JSON.stringify(documents),
      JSON.stringify(process),
      contact,
      id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found"
      });
    }
    
    res.json({
      success: true,
      message: "Scholarship updated successfully",
      scholarship: result.rows[0]
    });
  } catch (err) {
    console.error("Failed to update scholarship:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update scholarship"
    });
  }
});

// DELETE scholarship (Admin only - requires authentication)
router.delete("/scholarships/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const query = `
      DELETE FROM scholarships 
      WHERE id = $1 AND campus = 'PUP Parañaque'
      RETURNING id
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found"
      });
    }
    
    res.json({
      success: true,
      message: "Scholarship deleted successfully"
    });
  } catch (err) {
    console.error("Failed to delete scholarship:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete scholarship"
    });
  }
});

// GET scholarship statistics (for admin dashboard)
router.get("/scholarships/stats/summary", async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_scholarships,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_scholarships,
        COUNT(CASE WHEN status = 'Upcoming' THEN 1 END) as upcoming_scholarships,
        COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed_scholarships,
        COUNT(CASE WHEN provider_type = 'Government' THEN 1 END) as government_scholarships,
        COUNT(CASE WHEN provider_type = 'Private' THEN 1 END) as private_scholarships,
        COUNT(CASE WHEN provider_type = 'School-based' THEN 1 END) as school_scholarships
      FROM scholarships
      WHERE campus = 'PUP Parañaque'
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (err) {
    console.error("Failed to fetch scholarship statistics:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics"
    });
  }
});

export default router;

/* 
DATABASE SCHEMA (for future implementation):

CREATE TABLE scholarships (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('Government', 'Private', 'School-based')),
  description TEXT NOT NULL,
  eligibility TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Academic', 'Financial Assistance', 'Grant', 'Allowance-based')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('Open', 'Upcoming', 'Closed')),
  deadline DATE NOT NULL,
  campus VARCHAR(100) NOT NULL DEFAULT 'PUP Parañaque',
  posted_date TIMESTAMP DEFAULT NOW(),
  requirements JSONB NOT NULL,
  documents JSONB NOT NULL,
  process JSONB NOT NULL,
  contact VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scholarships_campus ON scholarships(campus);
CREATE INDEX idx_scholarships_status ON scholarships(status);
CREATE INDEX idx_scholarships_posted_date ON scholarships(posted_date DESC);
*/