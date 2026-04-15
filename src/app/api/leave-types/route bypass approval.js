import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb"; // ⚡ important

// ================== GET ==================
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const leaveTypes = await db
      .collection("leave-types")
      .find({})
      .toArray();

    return new Response(JSON.stringify(leaveTypes), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

// ================== POST ==================
export async function POST(req) {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const body = await req.json();

    if (!body.name) {
      throw new Error("Leave Type Name is required");
    }

    const result = await db
      .collection("leave-types")
      .insertOne({
        name: body.name,
        remarks: body.remarks || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    // Sync new leave type into all existing leave_balances records for current year
    const year = new Date().getFullYear();
    await db.collection("leave_balances").updateMany(
      { year, "leaves.leaveTypeId": { $ne: result.insertedId } },
      {
        $push: {
          leaves: {
            leaveTypeId: result.insertedId,
            leaveTypeName: body.name,
            allocated: 0,
            used: 0,
            balance: 0,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    return new Response(JSON.stringify(result), { status: 201 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

// ================== PUT ==================
export async function PUT(req) {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const { _id, name, remarks } = await req.json();

    if (!_id) throw new Error("ID is required for updating");

    const result = await db
      .collection("leave-types")
      .updateOne(
        { _id: new ObjectId(_id) },
        {
          $set: {
            name,
            remarks,
            updatedAt: new Date(),
          },
        }
      );

    // Sync updated name into all leave_balances records
    if (name) {
      await db.collection("leave_balances").updateMany(
        { "leaves.leaveTypeId": new ObjectId(_id) },
        {
          $set: {
            "leaves.$[elem].leaveTypeName": name,
            updatedAt: new Date(),
          },
        },
        { arrayFilters: [{ "elem.leaveTypeId": new ObjectId(_id) }] }
      );
    }

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

// ================== DELETE ==================
export async function DELETE(req) {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const { _id } = await req.json();

    if (!_id) throw new Error("ID is required for deletion");

    const result = await db
      .collection("leave-types")
      .deleteOne({ _id: new ObjectId(_id) });

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}