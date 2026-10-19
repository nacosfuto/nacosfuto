import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  calculateSemesterGPA, 
  calculateCumulativeCGPA, 
  getDegreeClass,
  DEFAULT_SCORE_BOUNDARIES,
  DEGREE_CLASSIFICATIONS,
  formatSemesterName,
  formatLevelName,
  getNumericLevel
} from '@nacos/config/grading';
import logoImg from '../assets/full-logo-light.png';

export { formatSemesterName, formatLevelName, getNumericLevel };

/**
 * Preload image URL as Base64 Data URL for embedding into jsPDF
 */
const loadImageAsDataUrl = (src) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !src) {
      return resolve(null);
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};


/**
 * Generate a professional NACOS-branded, level-by-level academic transcript PDF
 * inspired by FUTO official transcript layout.
 * 
 * @param {Object} params
 * @param {Object} params.user Authenticated student profile object
 * @param {Array} params.semesters Array of semester records with their courses and saved results
 * @param {Object} [params.options]
 * @param {string|number} [params.options.levelFilter] Optional level filter (e.g. 100, '200 Level')
 * @param {boolean} [params.options.singleSemester] Optional semester filter flag
 * @param {string} [params.options.title] Custom document title
 */
export async function generateAcademicRecordPdf({ user = {}, semesters = [], options = {} }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Safe wrapper for jspdf-autotable
  const runAutoTable = (opts) => {
    if (typeof autoTable === 'function') {
      autoTable(doc, opts);
    } else if (autoTable && typeof autoTable.default === 'function') {
      autoTable.default(doc, opts);
    } else if (doc.autoTable) {
      doc.autoTable(opts);
    }
  };

  // Student metadata
  const rawName = (user.fullName || user.full_name || user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim();
  const studentName = rawName.toLowerCase().includes('president') ? 'Emmanuel Irechukwu' : (rawName || 'Student Profile');
  const matricNo = user.registration_number || user.matric_number || user.matric || user.studentId || user.regNo || 'Not Set';
  const department = user.department || 'Computer Science';
  const faculty = user.faculty || user.school || 'School of Computing and Information Technology (SCIT)';
  const currentLevel = user.level || user.current_level || '100 Level';

  const docRef = `NF-TRANS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Preload logo
  const logoDataUrl = await loadImageAsDataUrl(logoImg);

  // -------------------------------------------------------------
  // 1. Group & Chronologically Sort Semesters Level by Level
  // -------------------------------------------------------------
  // Ensure we sort:
  // - Level Number: 100, 200, 300, 400, 500
  // - Session: e.g. 2024/2025 before 2025/2026
  // - Semester: Harmattan (1st) before Rain (2nd)
  const sortedSemesters = [...semesters].sort((a, b) => {
    const lvlA = getNumericLevel(a);
    const lvlB = getNumericLevel(b);
    if (lvlA !== lvlB) return lvlA - lvlB;

    const sessA = String(a.academicSession || a.session || '');
    const sessB = String(b.academicSession || b.session || '');
    if (sessA !== sessB) return sessA.localeCompare(sessB);

    const isRainA = String(a.semester || '').toLowerCase().includes('rain') || String(a.semester || '').toLowerCase().includes('second');
    const isRainB = String(b.semester || '').toLowerCase().includes('rain') || String(b.semester || '').toLowerCase().includes('second');
    return (isRainA ? 1 : 0) - (isRainB ? 1 : 0);
  });

  // Calculate Running Cumulative Stats across all sorted semesters
  let runningQualityPoints = 0;
  let runningGradedUnits = 0;
  let runningTotalCourses = 0;
  let runningGradedCourses = 0;

  const processedSemesters = sortedSemesters.map((sem) => {
    const courses = sem.courses || [];
    const semStats = calculateSemesterGPA(courses);

    runningQualityPoints += semStats.totalQualityPoints;
    runningGradedUnits += semStats.totalGradedUnits;
    runningTotalCourses += semStats.totalCourses;
    runningGradedCourses += semStats.gradedCourses;

    const cumGpa = runningGradedUnits > 0 ? (runningQualityPoints / runningGradedUnits) : null;
    const cumGpaDisplay = cumGpa !== null ? cumGpa.toFixed(2) : 'Not calculated';

    return {
      ...sem,
      numericLevel: getNumericLevel(sem),
      levelName: formatLevelName(sem.level || `${getNumericLevel(sem)} Level`),
      formattedSemester: formatSemesterName(sem.semester),
      semStats,
      cumStatsAtSemester: {
        totalQualityPoints: runningQualityPoints,
        totalGradedUnits: runningGradedUnits,
        cgpa: cumGpa,
        cgpaDisplay: cumGpaDisplay
      }
    };
  });

  // Group by Numeric Level: Map of levelNum -> { levelName, sessions: Map of sessionName -> [semesters] }
  const levelGroupsMap = new Map();
  for (const sem of processedSemesters) {
    const lvlNum = sem.numericLevel;
    if (!levelGroupsMap.has(lvlNum)) {
      levelGroupsMap.set(lvlNum, {
        levelNum,
        levelName: sem.levelName,
        sessionsMap: new Map(),
        allSemesters: []
      });
    }
    const lvlObj = levelGroupsMap.get(lvlNum);
    lvlObj.allSemesters.push(sem);

    const sessionKey = sem.academicSession || sem.session || 'Current Academic Session';
    if (!lvlObj.sessionsMap.has(sessionKey)) {
      lvlObj.sessionsMap.set(sessionKey, []);
    }
    lvlObj.sessionsMap.get(sessionKey).push(sem);
  }

  // Calculate Level Summaries for each Level
  const levelSummaries = new Map();
  for (const [lvlNum, lvlObj] of levelGroupsMap.entries()) {
    let lvlUnits = 0;
    let lvlQP = 0;
    let lvlTotalCourses = 0;
    let lvlGradedCourses = 0;

    for (const sem of lvlObj.allSemesters) {
      lvlUnits += sem.semStats.totalGradedUnits;
      lvlQP += sem.semStats.totalQualityPoints;
      lvlTotalCourses += sem.semStats.totalCourses;
      lvlGradedCourses += sem.semStats.gradedCourses;
    }

    const lvlGpa = lvlUnits > 0 ? (lvlQP / lvlUnits) : null;
    const lvlGpaDisplay = lvlGpa !== null ? lvlGpa.toFixed(2) : 'Not calculated';

    // The cumulative GPA up to the end of this level
    const lastSem = lvlObj.allSemesters[lvlObj.allSemesters.length - 1];
    const cumGpaAtLevel = lastSem?.cumStatsAtSemester?.cgpa ?? null;
    const cumGpaAtLevelDisplay = lastSem?.cumStatsAtSemester?.cgpaDisplay ?? 'Not calculated';

    levelSummaries.set(lvlNum, {
      levelNum,
      levelName: lvlObj.levelName,
      totalGradedUnits: lvlUnits,
      totalQualityPoints: lvlQP,
      gpa: lvlGpa,
      gpaDisplay: lvlGpaDisplay,
      totalCourses: lvlTotalCourses,
      gradedCourses: lvlGradedCourses,
      cumulativeGpa: cumGpaAtLevel,
      cumulativeGpaDisplay: cumGpaAtLevelDisplay
    });
  }

  // Overall Cumulative Stats across all included records
  const allIncludedCourses = [];
  processedSemesters.forEach((sem) => {
    (sem.courses || []).forEach((c) => allIncludedCourses.push(c));
  });
  const overallStats = calculateCumulativeCGPA(allIncludedCourses);
  const overallDegreeClass = getDegreeClass(overallStats.cgpa);

  // Filter levels if a specific level was requested
  const targetLevelNum = options.levelFilter ? getNumericLevel(options.levelFilter) : null;
  let levelsToRender = Array.from(levelGroupsMap.keys()).sort((a, b) => a - b);
  if (targetLevelNum) {
    levelsToRender = levelsToRender.filter((lvl) => lvl === targetLevelNum);
  }

  // -------------------------------------------------------------
  // 2. Document Rendering
  // -------------------------------------------------------------
  let currentY = margin;

  // Helper: Draw Document Header on First Page
  const drawDocumentHeader = () => {
    // Top NACOS Green Accent Bar
    doc.setFillColor(19, 134, 1); // #138601
    doc.rect(margin, currentY, contentWidth, 2.5, 'F');
    currentY += 6.5;

    // Logo (if available)
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', margin, currentY, 34, 11);
      } catch (_) {}
    }

    // Header Text Block
    const textStartX = logoDataUrl ? margin + 37 : margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(19, 134, 1);
    doc.text('NATIONAL ASSOCIATION OF COMPUTING STUDENTS (NACOS)', textStartX, currentY + 3.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text('FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI (FUTO) CHAPTER', textStartX, currentY + 7.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 80, 1);
    const docTitle = targetLevelNum 
      ? `STUDENT ACADEMIC TRANSCRIPT • ${targetLevelNum} LEVEL RECORD`
      : 'STUDENT ACADEMIC TRANSCRIPT';
    doc.text(docTitle, textStartX, currentY + 11.2);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text('Student-Maintained Academic Record • Self-Recorded Progress Tracker', textStartX, currentY + 14.5);

    currentY += 18;

    // Student Information Section Card (Requirement 2)
    doc.setFillColor(248, 250, 248);
    doc.setDrawColor(210, 225, 210);
    doc.roundedRect(margin, currentY, contentWidth, 23, 1.5, 1.5, 'FD');

    const col1X = margin + 4;
    const col2X = margin + (contentWidth / 2) + 3;

    // Col 1: Student Particulars
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('STUDENT NAME:', col1X, currentY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(20, 20, 20);
    doc.text(studentName.toUpperCase(), col1X + 32, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('REG / MATRIC NO:', col1X, currentY + 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(20, 20, 20);
    doc.text(matricNo, col1X + 32, currentY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('DEPARTMENT:', col1X, currentY + 16.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 30, 30);
    doc.text(department, col1X + 32, currentY + 16.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('SCHOOL / FACULTY:', col1X, currentY + 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(40, 40, 40);
    doc.text(faculty, col1X + 32, currentY + 21);

    // Col 2: Academic Standing & Generation Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('CURRENT LEVEL:', col2X, currentY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text(currentLevel, col2X + 30, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('ACADEMIC SESSION:', col2X, currentY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 30, 30);
    doc.text(user.academicSession || user.session || 'Active Academic Session', col2X + 30, currentY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('DATE GENERATED:', col2X, currentY + 16.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 30, 30);
    doc.text(issueDate, col2X + 30, currentY + 16.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(90, 90, 90);
    doc.text('DOCUMENT REF:', col2X, currentY + 21);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(19, 134, 1);
    doc.text(docRef, col2X + 30, currentY + 21);

    currentY += 26;

    // Prominent Notice Box (Requirement 8)
    doc.setFillColor(254, 249, 235); // Warm amber
    doc.setDrawColor(245, 180, 80);
    doc.roundedRect(margin, currentY, contentWidth, 16.5, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(160, 75, 5);
    doc.text('IMPORTANT NOTICE: UNOFFICIAL STUDENT-MAINTAINED ACADEMIC RECORD', margin + 3, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(110, 55, 5);
    const noticeContent = 
      'This document is a student-maintained academic record generated from information entered and saved by the student in the ' +
      'NACOS FUTO portal. It is not an official academic transcript, verified result, or degree classification issued by the ' +
      'Federal University of Technology, Owerri (FUTO). For official academic records, contact the university\'s appropriate office.';
    const splitNotice = doc.splitTextToSize(noticeContent, contentWidth - 6);
    doc.text(splitNotice, margin + 3, currentY + 8.2);

    currentY += 20;
  };

  drawDocumentHeader();

  // -------------------------------------------------------------
  // 3. Render Level Sections
  // -------------------------------------------------------------
  if (levelsToRender.length === 0) {
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(margin, currentY, contentWidth, 18, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text('No saved academic results found for the selected level(s).', pageWidth / 2, currentY + 10, { align: 'center' });
    currentY += 24;
  }

  for (const lvlNum of levelsToRender) {
    const lvlObj = levelGroupsMap.get(lvlNum);
    if (!lvlObj) continue;

    // Page Break Guard: ensure space for Level Header + Session + Semester Header
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = margin + 5;
    }

    // Level Header Banner
    doc.setFillColor(19, 134, 1); // #138601
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(lvlObj.levelName, margin + 4, currentY + 4.8);

    const lvlSummary = levelSummaries.get(lvlNum);
    if (lvlSummary && lvlSummary.gradedCourses > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(230, 255, 230);
      doc.text(
        `Progression GPA: ${lvlSummary.gpaDisplay} | Cum GPA: ${lvlSummary.cumulativeGpaDisplay}`,
        pageWidth - margin - 4,
        currentY + 4.8,
        { align: 'right' }
      );
    }

    currentY += 9;

    // Sessions within this Level
    for (const [sessionName, sessionSemesters] of lvlObj.sessionsMap.entries()) {
      // Session Subheader
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = margin + 5;
      }

      doc.setFillColor(242, 246, 242);
      doc.setDrawColor(200, 225, 200);
      doc.rect(margin, currentY, contentWidth, 5.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 80, 1);
      doc.text(`${sessionName.toUpperCase()} ACADEMIC SESSION`, margin + 3, currentY + 3.8);
      currentY += 7.5;

      // Semesters within this Session
      for (const sem of sessionSemesters) {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = margin + 5;
        }

        const courses = sem.courses || [];
        const { semStats, cumStatsAtSemester } = sem;

        // Semester Sub-Banner
        doc.setFillColor(250, 252, 250);
        doc.setDrawColor(215, 230, 215);
        doc.roundedRect(margin, currentY, contentWidth, 6, 0.8, 0.8, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(30, 30, 30);
        doc.text(sem.formattedSemester.toUpperCase(), margin + 3, currentY + 4.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(19, 134, 1);
        const semRightText = semStats.isCalculated
          ? `GPA: ${semStats.gpaDisplay}  |  Cum GPA: ${cumStatsAtSemester.cgpaDisplay}`
          : 'GPA: Not calculated';
        doc.text(semRightText, pageWidth - margin - 3, currentY + 4.2, { align: 'right' });

        currentY += 7.5;

        // If semester has NO courses recorded
        if (courses.length === 0) {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(230, 230, 230);
          doc.rect(margin, currentY, contentWidth, 6.5, 'FD');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 130);
          doc.text('No course results recorded for this semester.', margin + 4, currentY + 4.2);
          currentY += 9;
          continue;
        }

        // Build Course Table Rows
        // Format follows FUTO Official Transcript Columns:
        // Course Code | Title of Course | Units | Grade | Total Grade Point
        const tableBody = courses.map((c) => {
          const code = c.course_code || c.code || '—';
          const title = c.course_title || c.title || 'Course Title';
          const units = Number(c.credit_units ?? c.units ?? 0);

          let gradeDisplay = '—';
          let tgpDisplay = '—';

          const hasGrade = c.grade && String(c.grade).trim() !== '';
          if (hasGrade) {
            const gradeUpper = String(c.grade).trim().toUpperCase();
            if (c.entryMode === 'score' && c.score !== undefined && c.score !== null && c.score !== '') {
              gradeDisplay = `${gradeUpper} (${c.score}%)`;
            } else {
              gradeDisplay = gradeUpper;
            }

            if (c.qualityPoints !== null && c.qualityPoints !== undefined) {
              tgpDisplay = Number(c.qualityPoints).toFixed(1);
            } else if (c.gradePoint !== null && c.gradePoint !== undefined) {
              tgpDisplay = (units * Number(c.gradePoint)).toFixed(1);
            }
          }

          return [
            code,
            title,
            units.toString(),
            gradeDisplay,
            tgpDisplay
          ];
        });

        runAutoTable({
          startY: currentY,
          margin: { left: margin, right: margin, bottom: 20 },
          head: [['Course Code', 'Title of Course', 'Units', 'Grade', 'Total Grade Point']],
          body: tableBody,
          theme: 'grid',
          pageBreak: 'auto',
          showHead: 'everyPage',
          headStyles: {
            fillColor: [19, 134, 1],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.2,
            cellPadding: 1.8,
            lineWidth: 0.15,
            lineColor: [15, 110, 1]
          },
          styles: {
            font: 'helvetica',
            fontSize: 7,
            textColor: [30, 30, 30],
            cellPadding: 1.8,
            overflow: 'linebreak',
            lineColor: [225, 230, 225],
            lineWidth: 0.15
          },
          columnStyles: {
            0: { cellWidth: 26, fontStyle: 'bold', halign: 'left' },
            1: { cellWidth: 'auto', halign: 'left' }, // Course title takes available width
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
          },
          alternateRowStyles: {
            fillColor: [251, 253, 251]
          }
        });

        currentY = doc.lastAutoTable.finalY + 1.5;

        // Semester Summary Line (Requirement 5)
        doc.setFillColor(245, 248, 245);
        doc.setDrawColor(215, 225, 215);
        doc.rect(margin, currentY, contentWidth, 5.2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(60, 60, 60);
        const semSummaryStr = 
          `Total Graded Units: ${semStats.totalGradedUnits}   |   ` +
          `Total Quality Points: ${semStats.totalQualityPoints.toFixed(1)}   |   ` +
          `Semester GPA: ${semStats.gpaDisplay}   |   ` +
          `Cumulative GPA: ${cumStatsAtSemester.cgpaDisplay}`;
        doc.text(semSummaryStr, margin + 3, currentY + 3.6);

        currentY += 7.5;
      }
    }

    // Level Summary Box (Requirement 6)
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = margin + 5;
    }

    doc.setFillColor(240, 248, 240);
    doc.setDrawColor(19, 134, 1);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, 12, 1, 1, 'FD');
    doc.setLineWidth(0.15); // reset

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 80, 1);
    doc.text(`${lvlObj.levelName} SUMMARY`, margin + 3.5, currentY + 4.2);

    const lSummary = levelSummaries.get(lvlNum);
    const blockW = (contentWidth - 7) / 4;
    const lSummaryY = currentY + 8.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(90, 90, 90);
    doc.text('Level Graded Units:', margin + 3.5, lSummaryY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${lSummary?.totalGradedUnits || 0} Units`, margin + 3.5 + 26, lSummaryY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('Total Quality Points:', margin + 3.5 + blockW, lSummaryY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${(lSummary?.totalQualityPoints || 0).toFixed(1)}`, margin + 3.5 + blockW + 28, lSummaryY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('Level GPA:', margin + 3.5 + blockW * 2, lSummaryY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(19, 134, 1);
    doc.text(`${lSummary?.gpaDisplay || 'Not calculated'}`, margin + 3.5 + blockW * 2 + 16, lSummaryY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('Cumulative CGPA:', margin + 3.5 + blockW * 3, lSummaryY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(19, 134, 1);
    doc.text(`${lSummary?.cumulativeGpaDisplay || 'Not calculated'}`, margin + 3.5 + blockW * 3 + 24, lSummaryY);

    currentY += 16;
  }

  // -------------------------------------------------------------
  // 4. Overall Final Academic Summary (Requirement 7)
  // -------------------------------------------------------------
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFillColor(19, 134, 1);
  doc.rect(margin, currentY, contentWidth, 1.8, 'F');
  currentY += 1.8;

  doc.setFillColor(245, 250, 245);
  doc.setDrawColor(180, 220, 180);
  doc.roundedRect(margin, currentY, contentWidth, 23, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 80, 1);
  const summaryTitle = targetLevelNum 
    ? `CUMULATIVE ACADEMIC SUMMARY UP TO ${targetLevelNum} LEVEL`
    : 'OVERALL CUMULATIVE ACADEMIC PERFORMANCE SUMMARY';
  doc.text(summaryTitle, margin + 4, currentY + 5.2);

  const blockW = (contentWidth - 8) / 4;
  const metricY = currentY + 10;

  // 1: Graded Units
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('TOTAL GRADED UNITS', margin + 4, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`${overallStats.totalGradedUnits} Units`, margin + 4, metricY + 5.2);

  // 2: Quality Points
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('TOTAL QUALITY POINTS', margin + 4 + blockW, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(`${overallStats.totalQualityPoints.toFixed(1)}`, margin + 4 + blockW, metricY + 5.2);

  // 3: Cumulative CGPA
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('CUMULATIVE CGPA (5.0 SCALE)', margin + 4 + blockW * 2, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(19, 134, 1);
  doc.text(`${overallStats.cgpaDisplay}`, margin + 4 + blockW * 2, metricY + 5.2);

  // 4: Degree Classification
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('ESTIMATED DEGREE CLASS*', margin + 4 + blockW * 3, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 80, 1);
  doc.text(overallDegreeClass, margin + 4 + blockW * 3, metricY + 5.2);

  currentY += 25;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text('*Estimated classification based on student-entered results; not an official graduation degree award issued by FUTO.', margin + 2, currentY);
  currentY += 5;

  // -------------------------------------------------------------
  // 5. Grading Scale Reference & Explanatory Notes (Requirement 8)
  // -------------------------------------------------------------
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setFillColor(250, 252, 250);
  doc.setDrawColor(215, 230, 215);
  doc.roundedRect(margin, currentY, contentWidth, 24, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 80, 1);
  doc.text('FUTO OFFICIAL FIVE-POINT GRADING SCALE & DEGREE CLASSIFICATION REFERENCE', margin + 3, currentY + 4.2);

  // Render 6 Score Boundaries in a neat row
  const bColW = (contentWidth - 6) / 6;
  const bRowY = currentY + 8.5;

  DEFAULT_SCORE_BOUNDARIES.forEach((b, idx) => {
    const x = margin + 3 + (bColW * idx);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 225, 220);
    doc.rect(x, bRowY, bColW - 1.5, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(19, 134, 1);
    doc.text(b.grade, x + 2, bRowY + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 30, 30);
    doc.text(`${b.point.toFixed(1)} GP`, x + 9, bRowY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 100, 100);
    doc.text(b.displayRange || `${b.min}–${b.max}%`, x + 2, bRowY + 6);
  });

  // Degree Classification Reference String
  const classText = 
    'Degree Classification Thresholds (Unrounded CGPA): ' +
    'First Class: 4.50–5.00  |  Second Class Upper: 3.50–4.49  |  Second Class Lower: 2.40–3.49  |  ' +
    'Third Class: 1.50–2.39  |  Pass: 1.00–1.49  |  Fail: 0.00–0.99';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(90, 90, 90);
  doc.text(classText, margin + 3, currentY + 20);

  currentY += 28;

  // -------------------------------------------------------------
  // 6. Running Footers and Page Numbers across all pages (Requirement 9)
  // -------------------------------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header on pages > 1
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `NACOS FUTO STUDENT ACADEMIC TRANSCRIPT • ${studentName.toUpperCase()} (${matricNo})`,
        margin,
        9
      );
      doc.text(docRef, pageWidth - margin, 9, { align: 'right' });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.line(margin, 11, pageWidth - margin, 11);
    }

    // Bottom Footer Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'UNOFFICIAL STUDENT-MAINTAINED ACADEMIC RECORD • Generated via NACOS FUTO Portal',
      margin,
      pageHeight - 7
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  // Generate Safe Download Filename
  const levelSuffix = targetLevelNum ? `_${targetLevelNum}L` : '_Full_Transcript';
  const safeFilename = `${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_Academic_Transcript${levelSuffix}_${issueDate.replace(/\s+/g, '_')}.pdf`;
  doc.save(safeFilename);
  return safeFilename;
}
