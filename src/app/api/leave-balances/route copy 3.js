import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const getYear = () => new Date().getFullYear();

// Helper: max total balance for each leave type
const getMaxBalance = (leaveTypeName) => {
  const name = leaveTypeName?.toLowerCase() || "";
  if (name.includes("annual")) return 51;
  return Infinity;
};

// ================= GET =================
export async function GET(req) {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam) : getYear();

    if (userId) {
      let parsedUserId;
      try {
        parsedUserId = new ObjectId(userId);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid user ID" }), { status: 400 });
      }

      const leaveTypes = await db.collection("leave-types").find({}).toArray();
      let single = await db.collection("leave_balances").findOne({
        userId: parsedUserId,
        year,
      });

      if (!single) {
        const user = await db.collection("users").findOne({ _id: parsedUserId });
        const leaves = leaveTypes.map((lt) => ({
          leaveTypeId: lt._id,
          leaveTypeName: lt.name,
          allocated: 0,
          used: 0,
          balance: 0,
        }));

        const insertResult = await db.collection("leave_balances").insertOne({
          userId: parsedUserId,
          userName: user?.name || user?.fullName || user?.email || "",
          year,
          leaves,
          remarks: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        single = await db.collection("leave_balances").findOne({ _id: insertResult.insertedId });
      } else {
        // Sync missing leave types
        const existingIds = single.leaves.map((l) => l.leaveTypeId.toString());
        const missing = leaveTypes.filter((lt) => !existingIds.includes(lt._id.toString()));
        if (missing.length > 0) {
          const newEntries = missing.map((lt) => ({
            leaveTypeId: lt._id,
            leaveTypeName: lt.name,
            allocated: 0,
            used: 0,
            balance: 0,
          }));
          await db.collection("leave_balances").updateOne(
            { _id: single._id },
            {
              $push: { leaves: { $each: newEntries } },
              $set: { updatedAt: new Date() },
            }
          );
          single.leaves = [...single.leaves, ...newEntries];
        }
      }
      return new Response(JSON.stringify(single || null), { status: 200 });
    }

    // No userId: return all users for the given year
    const users = await db.collection("users").find({}).toArray();
    const leaveTypes = await db.collection("leave-types").find({}).toArray();
    const results = [];

    for (const user of users) {
      let record = await db.collection("leave_balances").findOne({
        userId: user._id,
        year,
      });

      if (!record) {
        const leaves = leaveTypes.map((lt) => ({
          leaveTypeId: lt._id,
          leaveTypeName: lt.name,
          allocated: 0,
          used: 0,
          balance: 0,
        }));
        const insertResult = await db.collection("leave_balances").insertOne({
          userId: user._id,
          userName: user.name || user.fullName || user.email || "",
          year,
          leaves,
          remarks: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        record = await db.collection("leave_balances").findOne({ _id: insertResult.insertedId });
      } else {
        const existingIds = record.leaves?.map((l) => l.leaveTypeId.toString()) || [];
        const missing = leaveTypes.filter((lt) => !existingIds.includes(lt._id.toString()));
        if (missing.length > 0) {
          const newEntries = missing.map((lt) => ({
            leaveTypeId: lt._id,
            leaveTypeName: lt.name,
            allocated: 0,
            used: 0,
            balance: 0,
          }));
          await db.collection("leave_balances").updateOne(
            { _id: record._id },
            {
              $push: { leaves: { $each: newEntries } },
              $set: { updatedAt: new Date() },
            }
          );
          record.leaves = [...(record.leaves || []), ...newEntries];
        }
      }

      results.push({
        ...record,
        userName: user.name || user.fullName || user.email || "No Name",
      });
    }

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ================= POST =================
export async function POST(req) {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const { year, allocation } = await req.json();
    if (!year || !allocation) {
      return new Response(JSON.stringify({ error: "Year and allocation data are required" }), { status: 400 });
    }

    const leaveTypes = await db.collection("leave-types").find({}).toArray();
    const cappedInfo = [];

    // Validate inputs
    for (const lt of leaveTypes) {
      const raw = Number(allocation[lt._id] || 0);
      if (isNaN(raw) || raw < 0) {
        return new Response(
          JSON.stringify({ error: `Invalid number for ${lt.name}` }),
          { status: 400 }
        );
      }
    }

    const prevYear = year - 1;
    const users = await db.collection("users").find({}).toArray();

    for (const user of users) {
      const existing = await db.collection("leave_balances").findOne({
        userId: user._id,
        year,
      });
      const prev = await db.collection("leave_balances").findOne({
        userId: user._id,
        year: prevYear,
      });

      const leaves = [];

      for (const lt of leaveTypes) {
        const rawAllocation = Number(allocation[lt._id] || 0);
        let carry = 0;
        if (prev) {
          const prevLeave = prev.leaves?.find(
            (l) => l.leaveTypeId.toString() === lt._id.toString()
          );
          if (prevLeave) carry = prevLeave.balance;
        }

        let used = 0;
        if (existing) {
          const existingLeave = existing.leaves?.find(
            (l) => l.leaveTypeId.toString() === lt._id.toString()
          );
          if (existingLeave) used = existingLeave.used || 0;
        }

        const isAnnual = lt.name?.toLowerCase().includes("annual");
        const isCasual = lt.name?.toLowerCase().includes("casual");
        const isEOL = lt.name?.toLowerCase().includes("eol");

        let finalBalance = 0;

        if (isAnnual) {
          // Balance = capped total (carry + allocated), no subtraction of used
          const totalEntitlement = carry + rawAllocation;
          const maxCap = getMaxBalance(lt.name);
          let cappedTotal = totalEntitlement;
          if (cappedTotal > maxCap) {
            cappedInfo.push({
              leaveType: lt.name,
              originalTotal: totalEntitlement,
              cappedTo: maxCap,
            });
            cappedTotal = maxCap;
          }
          finalBalance = cappedTotal; // ✅ no subtraction
        } else if (isCasual || isEOL) {
          // No carry, balance = raw allocation (no cap unless added)
          finalBalance = rawAllocation;
        } else {
          // Other types – optional cap, no carry
          const totalEntitlement = rawAllocation;
          const maxCap = getMaxBalance(lt.name);
          let cappedTotal = totalEntitlement;
          if (cappedTotal > maxCap) {
            cappedInfo.push({
              leaveType: lt.name,
              originalTotal: totalEntitlement,
              cappedTo: maxCap,
            });
            cappedTotal = maxCap;
          }
          finalBalance = cappedTotal;
        }

        leaves.push({
          leaveTypeId: lt._id,
          leaveTypeName: lt.name,
          allocated: rawAllocation,
          used: used,
          balance: finalBalance,
        });
      }

      await db.collection("leave_balances").updateOne(
        { userId: user._id, year },
        {
          $set: {
            userName: user.name || user.fullName || user.email || "",
            leaves,
            remarks: "",
            updatedAt: new Date(),
          },
          $setOnInsert: {
            userId: user._id,
            year,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    let responseMessage = `Leave allocation completed for ${year}`;
    if (cappedInfo.length > 0) {
      const details = cappedInfo.map(
        (c) => `${c.leaveType}: total ${c.originalTotal} → ${c.cappedTo} days`
      ).join(", ");
      responseMessage += ` (capped: ${details})`;
    }

    return new Response(
      JSON.stringify({ message: responseMessage, capped: cappedInfo }),
      { status: 201 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ================= PUT =================
export async function PUT(req) {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const { _id, leaves, remarks } = await req.json();
    if (!_id) throw new Error("ID required");

    const existing = await db.collection("leave_balances").findOne({ _id: new ObjectId(_id) });
    if (!existing) throw new Error("Record not found");

    const cappedInfo = [];
    const updatedLeaves = [];

    for (const newLeaf of leaves) {
      const oldLeaf = existing.leaves.find(
        (l) => l.leaveTypeId.toString() === newLeaf.leaveTypeId.toString()
      );
      if (!oldLeaf) {
        // New leave type – use provided values
        const allocated = Number(newLeaf.allocated) || 0;
        const used = Number(newLeaf.used) || 0;
        let balance = allocated; // no carry, no subtraction
        const maxCap = getMaxBalance(newLeaf.leaveTypeName);
        if (balance > maxCap) {
          cappedInfo.push({
            leaveType: newLeaf.leaveTypeName,
            originalTotal: balance,
            cappedTo: maxCap,
          });
          balance = maxCap;
        }
        updatedLeaves.push({
          ...newLeaf,
          allocated,
          used,
          balance,
        });
        continue;
      }

      const oldAllocated = Number(oldLeaf.allocated) || 0;
      const oldBalance = Number(oldLeaf.balance) || 0;
      const newAllocated = Number(newLeaf.allocated) || 0;
      const used = Number(oldLeaf.used) || 0; // preserve used

      // New balance = oldBalance - oldAllocated + newAllocated (preserves carry)
      let newBalance = oldBalance - oldAllocated + newAllocated;
      const maxCap = getMaxBalance(newLeaf.leaveTypeName);
      if (newBalance > maxCap) {
        cappedInfo.push({
          leaveType: newLeaf.leaveTypeName,
          originalTotal: newBalance,
          cappedTo: maxCap,
        });
        newBalance = maxCap;
      }

      updatedLeaves.push({
        leaveTypeId: newLeaf.leaveTypeId,
        leaveTypeName: newLeaf.leaveTypeName,
        allocated: newAllocated,
        used: used,
        balance: newBalance, // no subtraction of used
      });
    }

    await db.collection("leave_balances").updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          leaves: updatedLeaves,
          remarks: remarks || "",
          updatedAt: new Date(),
        },
      }
    );

    let responseMessage = "Updated successfully";
    if (cappedInfo.length > 0) {
      const details = cappedInfo.map(
        (c) => `${c.leaveType}: total ${c.originalTotal} → ${c.cappedTo} days`
      ).join(", ");
      responseMessage += ` (capped: ${details})`;
    }

    return new Response(
      JSON.stringify({ message: responseMessage, capped: cappedInfo }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// ================= DELETE =================
export async function DELETE(req) {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const { _id } = await req.json();
    if (!_id) throw new Error("ID required");

    await db.collection("leave_balances").deleteOne({ _id: new ObjectId(_id) });

    return new Response(JSON.stringify({ message: "Deleted successfully" }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}