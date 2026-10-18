/**
 * NACOS FUTO Official Academic Grading Scale & GPA/CGPA Engine
 * 
 * Standard 5-Point Grade Point Average (GPA) & Cumulative Grade Point Average (CGPA)
 * system aligned with Nigerian Universities Commission (NUC) BMAS & FUTO academic regulations.
 */

export const GRADING_SCALE_VERSION = '5.0_standard';

/**
 * Official 5-Point Letter Grade to Grade Point mapping
 */
export const GRADE_POINTS_MAP = {
  A: 5.0,
  B: 4.0,
  C: 3.0,
  D: 2.0,
  E: 1.0,
  F: 0.0
};

export const SUPPORTED_LETTER_GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Standard FUTO Score Boundaries (Configurable Default)
 * 70 - 100: A (5.0 GP) - Excellent
 * 60 - 69:  B (4.0 GP) - Very Good
 * 50 - 59:  C (3.0 GP) - Good
 * 45 - 49:  D (2.0 GP) - Fair
 * 40 - 44:  E (1.0 GP) - Pass
 * 0  - 39:  F (0.0 GP) - Fail / Carry Over
 */
export const DEFAULT_SCORE_BOUNDARIES = [
  { min: 70, max: 100, grade: 'A', point: 5.0, description: 'Excellent' },
  { min: 60, max: 69.99, grade: 'B', point: 4.0, description: 'Very Good' },
  { min: 50, max: 59.99, grade: 'C', point: 3.0, description: 'Good' },
  { min: 45, max: 49.99, grade: 'D', point: 2.0, description: 'Fair' },
  { min: 40, max: 44.99, grade: 'E', point: 1.0, description: 'Pass' },
  { min: 0,  max: 39.99, grade: 'F', point: 0.0, description: 'Fail' }
];

/**
 * Degree Classifications (5.00 Scale)
 */
export const DEGREE_CLASSIFICATIONS = [
  { min: 4.50, max: 5.00, title: 'First Class Honours', badge: 'First Class' },
  { min: 3.50, max: 4.49, title: 'Second Class Honours (Upper Division)', badge: '2nd Class Upper' },
  { min: 2.40, max: 3.49, title: 'Second Class Honours (Lower Division)', badge: '2nd Class Lower' },
  { min: 1.50, max: 2.39, title: 'Third Class Honours', badge: 'Third Class' },
  { min: 1.00, max: 1.49, title: 'Pass', badge: 'Pass' },
  { min: 0.00, max: 0.99, title: 'Fail / Academic Probation', badge: 'Probation' }
];

/**
 * Validates whether a numerical score is within [0, 100]
 */
export function validateScore(score) {
  if (score === null || score === undefined || score === '') return false;
  const num = Number(score);
  return !isNaN(num) && num >= 0 && num <= 100;
}

/**
 * Validates whether a letter grade is one of [A, B, C, D, E, F]
 */
export function validateGrade(grade) {
  if (!grade || typeof grade !== 'string') return false;
  return SUPPORTED_LETTER_GRADES.includes(grade.trim().toUpperCase());
}

/**
 * Converts a numerical score (0 - 100) to its corresponding Letter Grade and Grade Point
 * @param {number|string} score 
 * @param {Array} [boundaries] Custom score boundaries if configured
 * @returns {{ grade: string, point: number, description: string }|null}
 */
export function scoreToGrade(score, boundaries = DEFAULT_SCORE_BOUNDARIES) {
  if (!validateScore(score)) return null;
  const num = Number(score);

  for (const b of boundaries) {
    if (num >= b.min && num <= b.max) {
      return {
        grade: b.grade,
        point: b.point,
        description: b.description
      };
    }
  }

  // Fallback boundary handling
  if (num >= 70) return { grade: 'A', point: 5.0, description: 'Excellent' };
  return { grade: 'F', point: 0.0, description: 'Fail' };
}

/**
 * Converts a Letter Grade (A, B, C, D, E, F) to its 5-point scale Grade Point
 * @param {string} grade 
 * @returns {number|null}
 */
export function letterGradeToPoint(grade) {
  if (!validateGrade(grade)) return null;
  const clean = grade.trim().toUpperCase();
  return GRADE_POINTS_MAP[clean] ?? null;
}

/**
 * Calculates Quality Points for a course
 * Quality Points = Credit Units × Grade Point
 */
export function calculateQualityPoints(units, gradePoint) {
  const u = Math.max(0, parseInt(units, 10) || 0);
  const gp = gradePoint !== null && gradePoint !== undefined ? Number(gradePoint) : null;
  if (gp === null || isNaN(gp)) return null;
  return Number((u * gp).toFixed(4));
}

/**
 * Calculates Semester GPA from an array of course results
 * Excludes blank/unentered courses from both quality points and graded units denominator.
 * A valid F grade has Grade Point = 0 and is included in the denominator.
 * 
 * @param {Array<{ credit_units: number, units: number, grade_point?: number, point?: number, grade?: string }>} courses 
 * @returns {{ gpa: number|null, formattedGpa: string, totalGradedUnits: number, totalQualityPoints: number, totalCourses: number, gradedCoursesCount: number, unenteredCoursesCount: number }}
 */
export function calculateSemesterGPA(courses = []) {
  let totalQualityPoints = 0;
  let totalGradedUnits = 0;
  let gradedCount = 0;

  for (const c of courses) {
    const rawUnits = parseInt(c.credit_units ?? c.units, 10) || 0;
    
    // Check if grade is entered
    let gp = null;
    if (c.grade_point !== undefined && c.grade_point !== null) {
      gp = Number(c.grade_point);
    } else if (c.point !== undefined && c.point !== null) {
      gp = Number(c.point);
    } else if (c.grade && validateGrade(c.grade)) {
      gp = letterGradeToPoint(c.grade);
    }

    if (gp !== null && !isNaN(gp)) {
      gradedCount++;
      totalGradedUnits += rawUnits;
      totalQualityPoints += (rawUnits * gp);
    }
  }

  const unenteredCoursesCount = courses.length - gradedCount;
  const gpa = totalGradedUnits > 0 ? (totalQualityPoints / totalGradedUnits) : null;
  const formattedGpa = gpa !== null ? gpa.toFixed(2) : 'Not calculated';

  return {
    gpa,
    gpaDisplay: formattedGpa,
    formattedGpa,
    totalGradedUnits,
    totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
    totalCourses: courses.length,
    gradedCourses: gradedCount,
    gradedCoursesCount: gradedCount,
    unenteredCourses: unenteredCoursesCount,
    unenteredCoursesCount,
    isCalculated: gpa !== null
  };
}

/**
 * Calculates Cumulative CGPA across all eligible semesters
 * Aggregates all quality points and graded credit units. Does NOT average semester GPAs.
 * 
 * @param {Array<{ courses: Array }>} semestersList 
 * @returns {{ cgpa: number|null, formattedCgpa: string, totalGradedUnits: number, totalQualityPoints: number, totalCourses: number, totalGradedCourses: number, degreeClass: string }}
 */
export function calculateCumulativeCGPA(inputList = []) {
  let aggregateQualityPoints = 0;
  let aggregateGradedUnits = 0;
  let totalCourses = 0;
  let totalGradedCourses = 0;

  // Extract all courses whether passed as an array of semesters or a flat array of courses
  const allCourses = [];
  for (const item of inputList) {
    if (!item) continue;
    if (Array.isArray(item.courses)) {
      allCourses.push(...item.courses);
    } else {
      allCourses.push(item);
    }
  }

  totalCourses = allCourses.length;

  for (const c of allCourses) {
    const rawUnits = parseInt(c.credit_units ?? c.units, 10) || 0;

    let gp = null;
    if (c.grade_point !== undefined && c.grade_point !== null) {
      gp = Number(c.grade_point);
    } else if (c.point !== undefined && c.point !== null) {
      gp = Number(c.point);
    } else if (c.grade && validateGrade(c.grade)) {
      gp = letterGradeToPoint(c.grade);
    }

    if (gp !== null && !isNaN(gp)) {
      totalGradedCourses++;
      aggregateGradedUnits += rawUnits;
      aggregateQualityPoints += (rawUnits * gp);
    }
  }

  const cgpa = aggregateGradedUnits > 0 ? (aggregateQualityPoints / aggregateGradedUnits) : null;
  const formattedCgpa = cgpa !== null ? cgpa.toFixed(2) : 'Not calculated';

  let degreeClass = 'No Graded Results';
  if (cgpa !== null) {
    const matched = DEGREE_CLASSIFICATIONS.find(d => cgpa >= d.min && cgpa <= d.max);
    degreeClass = matched ? matched.title : 'Under Evaluation';
  }

  return {
    cgpa,
    cgpaDisplay: formattedCgpa,
    formattedCgpa,
    totalGradedUnits: aggregateGradedUnits,
    totalQualityPoints: Number(aggregateQualityPoints.toFixed(2)),
    totalCourses,
    totalGradedCourses,
    gradedCourses: totalGradedCourses,
    unenteredCourses: Math.max(0, totalCourses - totalGradedCourses),
    isCalculated: cgpa !== null,
    degreeClass
  };
}

/**
 * Returns Degree Classification title for a given CGPA
 */
export function getDegreeClass(cgpa) {
  if (cgpa === null || cgpa === undefined || isNaN(cgpa)) return 'No Graded Results';
  const val = Number(cgpa);
  const matched = DEGREE_CLASSIFICATIONS.find(d => val >= d.min && val <= d.max);
  return matched ? matched.title : 'Under Evaluation';
}

