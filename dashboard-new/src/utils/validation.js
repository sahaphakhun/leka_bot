/**
 * Form Validation Utilities
 * Comprehensive validation for all forms in the dashboard
 */

// Validation rules
export const validationRules = {
  // Required field
  required: (value, message = "ฟิลด์นี้จำเป็นต้องกรอก") => {
    if (value === null || value === undefined || value === "") {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  },

  // Email validation
  email: (value, message = "รูปแบบอีเมลไม่ถูกต้อง") => {
    if (!value) return null; // Skip if empty (use required separately)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : message;
  },

  // Min length
  minLength: (min, message) => (value) => {
    if (!value) return null;
    const length = typeof value === "string" ? value.length : value;
    return length >= min
      ? null
      : message || `ต้องมีความยาวอย่างน้อย ${min} ตัวอักษร`;
  },

  // Max length
  maxLength: (max, message) => (value) => {
    if (!value) return null;
    const length = typeof value === "string" ? value.length : value;
    return length <= max
      ? null
      : message || `ความยาวต้องไม่เกิน ${max} ตัวอักษร`;
  },

  // Min value
  minValue: (min, message) => (value) => {
    if (value === null || value === undefined || value === "") return null;
    const numValue = Number(value);
    return numValue >= min ? null : message || `ค่าต้องไม่น้อยกว่า ${min}`;
  },

  // Max value
  maxValue: (max, message) => (value) => {
    if (value === null || value === undefined || value === "") return null;
    const numValue = Number(value);
    return numValue <= max ? null : message || `ค่าต้องไม่เกิน ${max}`;
  },

  // Pattern matching
  pattern: (regex, message = "รูปแบบไม่ถูกต้อง") => (value) => {
    if (!value) return null;
    return regex.test(value) ? null : message;
  },

  // URL validation
  url: (value, message = "รูปแบบ URL ไม่ถูกต้อง") => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },

  // Date validation
  date: (value, message = "รูปแบบวันที่ไม่ถูกต้อง") => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? message : null;
  },

  // Future date
  futureDate: (value, message = "วันที่ต้องเป็นอนาคต") => {
    if (!value) return null;
    const date = new Date(value);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date >= now ? null : message;
  },

  // Past date
  pastDate: (value, message = "วันที่ต้องเป็นอดีต") => {
    if (!value) return null;
    const date = new Date(value);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return date <= now ? null : message;
  },

  // Phone number (Thai format)
  phone: (value, message = "หมายเลขโทรศัพท์ไม่ถูกต้อง") => {
    if (!value) return null;
    const phoneRegex = /^0[0-9]{9}$/;
    return phoneRegex.test(value.replace(/\s|-/g, "")) ? null : message;
  },

  // File size
  fileSize: (maxSizeInMB, message) => (file) => {
    if (!file) return null;
    const maxBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxBytes
      ? null
      : message || `ขนาดไฟล์ต้องไม่เกิน ${maxSizeInMB}MB`;
  },

  // File type
  fileType: (allowedTypes, message) => (file) => {
    if (!file) return null;
    const fileExt = file.name.split(".").pop().toLowerCase();
    return allowedTypes.includes(fileExt)
      ? null
      : message || `ประเภทไฟล์ที่อนุญาต: ${allowedTypes.join(", ")}`;
  },

  // Array min items
  minItems: (min, message) => (value) => {
    if (!Array.isArray(value)) return null;
    return value.length >= min
      ? null
      : message || `ต้องเลือกอย่างน้อย ${min} รายการ`;
  },

  // Array max items
  maxItems: (max, message) => (value) => {
    if (!Array.isArray(value)) return null;
    return value.length <= max
      ? null
      : message || `เลือกได้ไม่เกิน ${max} รายการ`;
  },

  // Custom validator
  custom: (validatorFn, message = "ค่าไม่ถูกต้อง") => (value) => {
    return validatorFn(value) ? null : message;
  },
};

/**
 * Validate single field
 */
export const validateField = (value, rules = []) => {
  for (const rule of rules) {
    const error = rule(value);
    if (error) {
      return error;
    }
  }
  return null;
};

/**
 * Validate entire form
 */
export const validateForm = (values, schema) => {
  const errors = {};
  let hasErrors = false;

  Object.keys(schema).forEach((field) => {
    const rules = schema[field];
    const value = values[field];
    const error = validateField(value, rules);

    if (error) {
      errors[field] = error;
      hasErrors = true;
    }
  });

  return { errors, hasErrors };
};

/**
 * Sanitize input (prevent XSS)
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Sanitize object (recursive)
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  Object.keys(obj).forEach((key) => {
    sanitized[key] = sanitizeObject(obj[key]);
  });

  return sanitized;
};

/**
 * Common validation schemas
 */
export const schemas = {
  // Task form
  task: {
    title: [
      validationRules.required("กรุณาระบุชื่องาน"),
      validationRules.minLength(3, "ชื่องานต้องมีอย่างน้อย 3 ตัวอักษร"),
      validationRules.maxLength(200, "ชื่องานต้องไม่เกิน 200 ตัวอักษร"),
    ],
    dueDate: [validationRules.required("กรุณาเลือกวันที่ครบกำหนด")],
    assignedUsers: [
      validationRules.required("กรุณาเลือกผู้รับผิดชอบ"),
      validationRules.minItems(1, "ต้องเลือกผู้รับผิดชอบอย่างน้อย 1 คน"),
    ],
  },

  // Recurring task form
  recurringTask: {
    title: [
      validationRules.required("กรุณาระบุชื่องาน"),
      validationRules.minLength(3, "ชื่องานต้องมีอย่างน้อย 3 ตัวอักษร"),
    ],
    recurrence: [validationRules.required("กรุณาเลือกรอบการทำซ้ำ")],
    startDate: [validationRules.required("กรุณาเลือกวันที่เริ่ม")],
    assignedUsers: [validationRules.minItems(1, "ต้องเลือกผู้รับผิดชอบอย่างน้อย 1 คน")],
  },

  // Profile form
  profile: {
    displayName: [
      validationRules.required("กรุณาระบุชื่อแสดง"),
      validationRules.minLength(2, "ชื่อแสดงต้องมีอย่างน้อย 2 ตัวอักษร"),
      validationRules.maxLength(50, "ชื่อแสดงต้องไม่เกิน 50 ตัวอักษร"),
    ],
    email: [validationRules.email("รูปแบบอีเมลไม่ถูกต้อง")],
  },

  // File upload
  file: {
    file: [
      validationRules.required("กรุณาเลือกไฟล์"),
      // Note: File size limit removed per user request in FileUploadZone.jsx
      validationRules.fileType(
        [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "webp",
          "svg",
          "pdf",
          "doc",
          "docx",
          "txt",
          "xls",
          "xlsx",
          "csv",
          "ppt",
          "pptx",
          "zip",
          "rar",
          "7z",
          "mp4",
          "mov",
          "avi",
          "mkv",
          "webm",
          "mp3",
          "wav",
          "m4a",
          "aac",
          "flac",
        ],
        "ประเภทไฟล์ไม่รองรับ"
      ),
    ],
  },

  // Member invite
  memberInvite: {
    email: [
      validationRules.required("กรุณาระบุอีเมล"),
      validationRules.email("รูปแบบอีเมลไม่ถูกต้อง"),
    ],
  },
};

/**
 * useFormValidation hook
 */
export const useFormValidation = (initialValues, schema) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));

    // Validate on change if field was touched
    if (touched[field]) {
      const fieldRules = schema[field] || [];
      const error = validateField(value, fieldRules);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate on blur
    const fieldRules = schema[field] || [];
    const error = validateField(values[field], fieldRules);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validate = () => {
    const { errors: validationErrors, hasErrors } = validateForm(
      values,
      schema
    );
    setErrors(validationErrors);

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(schema).forEach((field) => {
      allTouched[field] = true;
    });
    setTouched(allTouched);

    return !hasErrors;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValues,
  };
};

// For non-React usage
if (typeof React === "undefined") {
  var React = { useState: () => [{}, () => {}] };
}

export default {
  validationRules,
  validateField,
  validateForm,
  sanitizeInput,
  sanitizeObject,
  schemas,
};
