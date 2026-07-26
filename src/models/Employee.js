import mongoose, { Schema, models } from 'mongoose';

const EmployeeSchema = new Schema(
  {
    // Existing fields (from external API)
    fullName: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    cidNumber: { type: String, required: true, unique: true },
    employeeNumber: { type: String },
    positionTitle: { type: String },
    positionLevel: { type: String },
    subLevel: { type: String },
    agency: { type: String },
    mainWorkingAgency: { type: String },
    department: { type: String },
    division: { type: String },
    email: { type: String },
    mobile: { type: String },
    dateOfBirth: { type: String },
    dateOfAppointment: { type: String },
    lastDateOfPromotion: { type: String },
    empType: { type: String },
    fullAgencyPath: { type: String },

    // Custom HR fields
    gender: { type: String, default: '' },
    parentAgency: { type: String, default: 'Anti-Corruption Commission' },
    mog: { type: String, default: '' },
    subGroup: { type: String, default: '' },
    superStructure: { type: String, default: '' },
    positionType: { type: String, default: '' },
    degree: { type: String, default: '' },
    qualification: { type: String, default: '' }, // → "Area of Study" in UI
    remarks: { type: String, default: '' },

    // ✅ NEW FIELDS
    currentStatus: { type: String, default: 'Active' },
    dateOfJoining: { type: String, default: '' },
    intactType: { type: String, default: '' },

    // Passport photo (Base64)
    passportPhoto: { type: String, default: '' },

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Employee = models.Employee || mongoose.model('Employee', EmployeeSchema);