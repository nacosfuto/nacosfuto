/**
 * @typedef {Object} StudentProfile
 * @property {string} id
 * @property {string} full_name
 * @property {string} email
 * @property {string} matric_number
 * @property {string} institution
 * @property {string} department
 * @property {string} level
 * @property {string} role
 * @property {string} [avatar_url]
 * @property {string} created_at
 */

/**
 * @typedef {Object} VerifiedStudent
 * @property {string} id
 * @property {string} registration_number
 * @property {string} full_name
 * @property {string} department
 * @property {string} faculty
 * @property {number} entry_year
 * @property {string} current_level
 * @property {boolean} is_registered
 * @property {string} [registered_at]
 * @property {string} status
 */

/**
 * @typedef {Object} IdCardApplication
 * @property {string} id
 * @property {string} student_id
 * @property {string} registration_number
 * @property {string} full_name
 * @property {string} passport_url
 * @property {'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'} status
 * @property {string} [rejection_reason]
 * @property {string} [card_front_url]
 * @property {string} [card_back_url]
 * @property {string} created_at
 */

/**
 * @typedef {Object} DuesPayment
 * @property {string} id
 * @property {string} student_id
 * @property {string} session
 * @property {number} amount
 * @property {string} reference
 * @property {'pending' | 'verified' | 'rejected'} status
 * @property {string} verified_at
 * @property {string} receipt_url
 */

/**
 * @typedef {Object} AcademicResult
 * @property {string} id
 * @property {string} student_id
 * @property {string} course_code
 * @property {string} course_title
 * @property {number} credit_units
 * @property {number} score
 * @property {string} grade
 * @property {number} grade_point
 * @property {string} session
 * @property {'First' | 'Second'} semester
 */

/**
 * @typedef {Object} AdminSession
 * @property {string} id
 * @property {string} user_id
 * @property {string} email
 * @property {string} full_name
 * @property {'main_website' | 'student_portal' | 'super_admin'} scope
 * @property {string} role
 * @property {string[]} permissions
 * @property {boolean} is_super_admin
 * @property {string} logged_in_at
 */

/**
 * @typedef {Object} WebsiteArticle
 * @property {string} id
 * @property {string} title
 * @property {string} excerpt
 * @property {string} content
 * @property {string} author
 * @property {string} cover_image
 * @property {'draft' | 'published'} status
 * @property {string} published_at
 */

/**
 * @typedef {Object} WebsiteEvent
 * @property {string} id
 * @property {string} title
 * @property {string} date
 * @property {string} time
 * @property {string} location
 * @property {string} description
 * @property {string} flyer_url
 * @property {boolean} is_featured
 */

/**
 * @typedef {Object} HeroSlide
 * @property {string} id
 * @property {string} image_url
 * @property {string} [cloudinary_public_id]
 * @property {string} [title]
 * @property {string} [heading]
 * @property {string} [subtext]
 * @property {string} [cta_text]
 * @property {string} [cta_link]
 * @property {number} display_order
 * @property {boolean} is_published
 * @property {string} [image_position]
 * @property {string} [created_by]
 * @property {string} created_at
 * @property {string} updated_at
 */

export {};
