import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  calculateSemesterGPA, 
  calculateCumulativeCGPA, 
  getDegreeClass 
} from '@nacos/config/grading';
import logoImg from '../assets/full-logo-light.png';

/**
 * Helper to preload an image URL as Base64 Data URL
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
 * Generate a professional unofficial academic record PDF
 * 
 * @param {Object} params
 * @param {Object} params.user Student profile object
 * @param {Array} params.semesters Array of semester records with their courses and saved results
 * @param {Object} [params.options]
 * @param {string} [params.options.title] Optional custom document title
 * @param {boolean} [params.options.singleSemester] If true, generates only for a specific semester
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
  const contentWidth = pageWidth - margin * 2;

  // Student metadata
  const rawName = (user.fullName || user.full_name || user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim();
  const studentName = rawName.toLowerCase().includes('president') ? 'Emmanuel Irechukwu' : (rawName || 'Student Profile');
  const matricNo = user.registration_number || user.matric_number || user.matric || user.studentId || user.regNo || 'Not Set';
  const department = user.department || 'Computer Science';
  const faculty = user.faculty || 'School of Computing and Information Technology (SCIT)';
  const currentLevel = user.level || user.current_level || '100 Level';

  const docRef = `NF-SAR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Collect all courses across all included semesters for overall CGPA
  const allIncludedCourses = [];
  semesters.forEach(sem => {
    (sem.courses || []).forEach(c => {
      allIncludedCourses.push(c);
    });
  });

  const cumulativeStats = calculateCumulativeCGPA(allIncludedCourses);
  const degreeClassification = getDegreeClass(cumulativeStats.cgpa);

  // Preload logo
  const logoDataUrl = await loadImageAsDataUrl(logoImg);

  // AutoTable helper that supports both import styles
  const runAutoTable = (options) => {
    if (typeof autoTable === 'function') {
      autoTable(doc, options);
    } else if (autoTable && typeof autoTable.default === 'function') {
      autoTable.default(doc, options);
    } else if (doc.autoTable) {
      doc.autoTable(options);
    }
  };

  let currentY = margin;

  // Header Bar with NACOS Green styling
  doc.setFillColor(19, 134, 1); // #138601
  doc.rect(margin, currentY, contentWidth, 2, 'F');
  currentY += 6;

  // Brand Header
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', margin, currentY, 32, 10);
    } catch (e) {
      // Fallback text if logo fails to render
    }
  }

  // Header Title Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(19, 134, 1);
  doc.text('NIGERIA ASSOCIATION OF COMPUTING STUDENTS (NACOS)', margin + 36, currentY + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text('FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI (FUTO)', margin + 36, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`${department.toUpperCase()} • ${faculty.toUpperCase()}`, margin + 36, currentY + 11.5);

  currentY += 16;

  // Document Title Banner
  doc.setFillColor(245, 247, 245);
  doc.setDrawColor(200, 220, 200);
  doc.roundedRect(margin, currentY, contentWidth, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 80, 1);
  doc.text('STUDENT ACADEMIC PERFORMANCE RECORD', pageWidth / 2, currentY + 5.8, { align: 'center' });
  currentY += 12;

  // Prominent Mandatory Unofficial-Record Notice Box (Phase 10 requirement)
  doc.setFillColor(254, 249, 235); // warm amber notice
  doc.setDrawColor(245, 180, 80);
  doc.roundedRect(margin, currentY, contentWidth, 18, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 75, 5);
  doc.text('MANDATORY NOTICE: UNOFFICIAL STUDENT-MAINTAINED ACADEMIC RECORD', margin + 3, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 55, 5);
  const disclaimerText = 
    'This document was electronically generated from academic information entered and maintained by the student through the ' +
    'NACOS FUTO student portal. The results have not been independently verified or certified by the university. ' +
    'This document is not an official academic transcript and cannot be represented as such.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth - 6);
  doc.text(splitDisclaimer, margin + 3, currentY + 9);

  currentY += 21;

  // Student Profile Metadata Card
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(225, 225, 225);
  doc.roundedRect(margin, currentY, contentWidth, 20, 1.5, 1.5, 'FD');

  // Column 1: Student details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('STUDENT NAME:', margin + 4, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(studentName.toUpperCase(), margin + 30, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('REG / MATRIC NO:', margin + 4, currentY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text(matricNo, margin + 30, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('PROGRAMME:', margin + 4, currentY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text(department, margin + 30, currentY + 16.5);

  // Column 2: Document info & standing
  const col2X = margin + (contentWidth / 2) + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('ACADEMIC LEVEL:', col2X, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(currentLevel, col2X + 28, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('RECORD DATE:', col2X, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text(issueDate, col2X + 28, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('DOCUMENT REF:', col2X, currentY + 16.5);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(19, 134, 1);
  doc.text(docRef, col2X + 28, currentY + 16.5);

  currentY += 24;

  // Semesters Tables
  semesters.forEach((sem, semIdx) => {
    // Check if we need a page break before starting a new semester
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = margin + 5;
    }

    const courses = sem.courses || [];
    const semStats = calculateSemesterGPA(courses);

    // Semester Section Header
    doc.setFillColor(240, 244, 240);
    doc.setDrawColor(210, 230, 210);
    doc.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 80, 1);
    const semTitle = `${sem.academicSession || sem.session || 'Session'} • ${sem.level || `${sem.numericLevel || 100} Level`} • ${sem.semester || (sem.semesterNumber === 2 ? 'Second Semester' : 'First Semester')}`;
    doc.text(semTitle.toUpperCase(), margin + 3, currentY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const gpaBadge = semStats.isCalculated ? `Semester GPA: ${semStats.gpaDisplay} / 5.00` : 'Semester GPA: Not calculated';
    doc.text(gpaBadge, pageWidth - margin - 3, currentY + 4.8, { align: 'right' });

    currentY += 8.5;

    // Table Rows
    const tableBody = courses.map((course, idx) => {
      const mode = course.entryMode === 'grade' ? 'Direct Grade' : (course.score !== undefined && course.score !== null ? 'Score' : 'Not entered');
      const scoreDisplay = (course.entryMode === 'score' && course.score !== undefined && course.score !== null)
        ? `${course.score}%`
        : (course.score !== undefined && course.score !== null && course.entryMode !== 'grade' ? `${course.score}%` : '—');
      
      const gradeDisplay = course.grade || '—';
      const gpDisplay = course.gradePoint !== null && course.gradePoint !== undefined ? Number(course.gradePoint).toFixed(1) : '—';
      const qpDisplay = course.qualityPoints !== null && course.qualityPoints !== undefined ? Number(course.qualityPoints).toFixed(1) : '—';

      return [
        (idx + 1).toString(),
        course.course_code || course.code || '',
        course.course_title || course.title || '',
        (course.credit_units || course.units || 0).toString(),
        mode,
        scoreDisplay,
        gradeDisplay,
        gpDisplay,
        qpDisplay
      ];
    });

    if (tableBody.length === 0) {
      tableBody.push([
        '-',
        '-',
        'No eligible courses recorded for this semester',
        '0',
        '-',
        '-',
        '-',
        '-',
        '-'
      ]);
    }

    runAutoTable({
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Course Code', 'Course Title', 'Units', 'Mode', 'Score', 'Grade', 'GP', 'QP']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [19, 134, 1],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left',
        cellPadding: 2
      },
      styles: {
        fontSize: 7.2,
        textColor: [35, 35, 35],
        cellPadding: 2,
        lineColor: [225, 225, 225],
        lineWidth: 0.15
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 24, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 14, halign: 'right' },
        8: { cellWidth: 16, halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [250, 252, 250]
      }
    });

    currentY = doc.lastAutoTable.finalY + 2.5;

    // Semester summary line
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, currentY, contentWidth, 5.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const summaryText = `Total Courses: ${semStats.totalCourses}  |  Graded: ${semStats.gradedCourses}  |  Unentered: ${semStats.unenteredCourses}  |  Graded Units: ${semStats.totalGradedUnits}  |  Total Quality Points: ${semStats.totalQualityPoints.toFixed(1)}  |  Semester GPA: ${semStats.gpaDisplay}`;
    doc.text(summaryText, margin + 3, currentY + 3.8);

    currentY += 8.5;
  });

  // Check space for Cumulative Record Summary Card
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin + 5;
  }

  // Cumulative Summary Box
  doc.setFillColor(19, 134, 1);
  doc.rect(margin, currentY, contentWidth, 1.5, 'F');
  currentY += 1.5;

  doc.setFillColor(245, 250, 245);
  doc.setDrawColor(180, 220, 180);
  doc.roundedRect(margin, currentY, contentWidth, 22, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 80, 1);
  doc.text('CUMULATIVE ACADEMIC SUMMARY (OVERALL PERFORMANCE)', margin + 4, currentY + 5.5);

  // 4 metrics horizontally
  const blockW = (contentWidth - 8) / 4;
  const metricY = currentY + 10;

  // 1: Graded Units
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('GRADED UNITS', margin + 4, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`${cumulativeStats.totalGradedUnits} Units`, margin + 4, metricY + 5);

  // 2: Quality Points
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('TOTAL QUALITY POINTS', margin + 4 + blockW, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`${cumulativeStats.totalQualityPoints.toFixed(1)}`, margin + 4 + blockW, metricY + 5);

  // 3: Cumulative CGPA
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('CUMULATIVE CGPA (5.0 SCALE)', margin + 4 + blockW * 2, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(19, 134, 1);
  doc.text(`${cumulativeStats.cgpaDisplay}`, margin + 4 + blockW * 2, metricY + 5.2);

  // 4: Degree Classification
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('CLASS OF DEGREE', margin + 4 + blockW * 3, metricY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 80, 1);
  doc.text(degreeClassification, margin + 4 + blockW * 3, metricY + 5);

  currentY += 26;

  // Add Footers and Page Numbers across all generated pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom subtle divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(
      'UNOFFICIAL STUDENT-MAINTAINED RECORD • Generated via NACOS FUTO Student Portal',
      margin,
      pageHeight - 8
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Trigger download
  const safeFilename = `${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_Academic_Record_${issueDate.replace(/\s+/g, '_')}.pdf`;
  doc.save(safeFilename);
  return safeFilename;
}
