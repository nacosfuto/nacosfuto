/**
 * NACOS FUTO Student ID Card Master Template Configuration
 * Centralized coordinates, dimensions, and typography tokens for programmatic ID card generation
 * Based strictly on the authoritative master template (662 × 1075 px).
 * 
 * DOUBLE-SIDED CARD:
 * 1. FRONT: Dynamic compositing (Master Front + Passport Photo + Full Name + Reg Number)
 * 2. BACK: Static completed template (Untouched official NACOS FUTO certification & QR back)
 * 
 * FONT:
 * - Font used for Name and Registration Number is Aeonik Black ('Aeonik Black', 'Aeonik').
 */

export const ID_CARD_TEMPLATE = {
  version: '2026.2',
  isDoubleSided: true,
  masterTemplateUrl: '',
  masterBackUrl: '',
  dimensions: {
    width: 662,
    height: 1075,
    aspectRatio: 662 / 1075
  },
  photo: {
    // Regular hexagon with rounded corners centered inside the green/white border
    centerX: 331,
    centerY: 358,
    radius: 164,          // Distance from center to each vertex
    cornerRadius: 18,     // Corner rounding radius
    boundingBox: {
      x: 184,
      y: 194,
      width: 294,
      height: 328
    },
    vertices: [
      { x: 331, y: 194 }, // Top (270°)
      { x: 473, y: 276 }, // Top Right (330°)
      { x: 473, y: 440 }, // Bottom Right (30°)
      { x: 331, y: 522 }, // Bottom (90°)
      { x: 189, y: 440 }, // Bottom Left (150°)
      { x: 189, y: 276 }  // Top Left (210°)
    ]
  },
  name: {
    // Positioned directly below the static green 'NAME' badge (y: 635 to 682)
    badge: {
      x: 255,
      y: 635,
      width: 141,
      height: 48
    },
    centerX: 331,
    centerY: 750,         // Target optical vertical center between NAME and REG NO. badges
    line1Y: 726,          // Baseline for 2-line name (Line 1)
    line2Y: 776,          // Baseline for 2-line name (Line 2)
    singleLineY: 750,     // Baseline for 1-line name
    maxWidth: 490,        // Max horizontal text span before wrapping to next line
    fontSize: 38,         // Fixed 38px across all cards - never shrink
    fontWeight: '900',
    color: '#000000',
    fontFamily: '"Aeonik Black", "Aeonik", "Montserrat", "Plus Jakarta Sans", Inter, -apple-system, "Segoe UI", Arial, sans-serif'
  },
  registrationNumber: {
    // Positioned directly below the static green 'REG NO.' badge (y: 865 to 913)
    badge: {
      x: 260,
      y: 865,
      width: 142,
      height: 49
    },
    centerX: 331,
    y: 956,               // Middle baseline for registration number
    maxWidth: 480,
    fontSize: 38,
    fontWeight: '900',
    color: '#000000',
    fontFamily: '"Aeonik Black", "Aeonik", "Montserrat", "Plus Jakarta Sans", Inter, -apple-system, "Segoe UI", Arial, sans-serif'
  }
};

export default ID_CARD_TEMPLATE;
