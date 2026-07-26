import mongoose, { Schema, models } from 'mongoose';

const EmployeeSchema = new Schema(
  {
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
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Employee = models.Employee || mongoose.model('Employee', EmployeeSchema);