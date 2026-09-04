import mongoose from "mongoose";

const InstitutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
      unique: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Optional: Drop any existing unique index in development to avoid conflicts
if (process.env.NODE_ENV === "development") {
  InstitutionSchema.pre("init", async function () {
    try {
      const collection = this.collection;
      const indexes = await collection.indexes();
      const nameIndex = indexes.find((idx) => idx.name === "name_1");
      if (nameIndex && nameIndex.unique) {
        await collection.dropIndex("name_1");
        console.log("Dropped existing unique index on institution name field.");
      }
    } catch (error) {
      console.warn("Failed to drop index:", error.message);
    }
  });
}

export default mongoose.models.Institution ||
  mongoose.model("Institution", InstitutionSchema);