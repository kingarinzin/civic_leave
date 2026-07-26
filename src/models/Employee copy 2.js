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

    // ✅ CUSTOM FIELDS
    gender: { type: String, default: '' },
    parentAgency: { type: String, default: '' },
    mog: { type: String, default: '' },          // Ministry/Organization Group
    subGroup: { type: String, default: '' },
    superStructure: { type: String, default: '' },
    positionType: { type: String, default: '' },
    qualificationRemarks: { type: String, default: '' },

    // ✅ Passport photo (Base64 string)
    passportPhoto: { type: String, default: '' },

    // Metadata
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Employee = models.Employee || mongoose.model('Employee', EmployeeSchema);