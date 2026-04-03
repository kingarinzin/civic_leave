import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";


const getYear = () => new Date().getFullYear();




// ================= GET (SHOW ALL USERS) =================
export async function GET(req) {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");
   const year = getYear();

   const url = new URL(req.url);
   const userId = url.searchParams.get("userId");

   if (userId) {
     let parsedUserId;
     try {
       parsedUserId = new ObjectId(userId);
     } catch {
       return new Response(JSON.stringify({ error: "Invalid user ID" }), {
         status: 400,
       });
     }

     const leaveTypes = await db.collection("leave-types").find({}).toArray();

     const single = await db.collection("leave_balances").findOne({
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

        const created = await db.collection("leave_balances").findOne({
          _id: insertResult.insertedId,
        });

        return new Response(JSON.stringify(created || null), { status: 200 });
      }

     if (single) {
       // Sync any leave types added after this record was created
       const existingIds = single.leaves.map((l) => l.leaveTypeId.toString());
       const missing = leaveTypes.filter(
         (lt) => !existingIds.includes(lt._id.toString())
       );
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


   const users = await db.collection("users").find({}).toArray();
   const leaveTypes = await db.collection("leave-types").find({}).toArray();


   const results = [];


   for (const user of users) {
     let record = await db.collection("leave_balances").findOne({
       userId: user._id,
       year,
     });


     // Auto create if not exists
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
         userName: user.name || user.fullName || user.name || "",
         year,
         leaves,
         remarks: "",
         createdAt: new Date(),
         updatedAt: new Date(),
       });


       record = await db.collection("leave_balances").findOne({
         _id: insertResult.insertedId,
       });
     } else {
       // Sync any leave types added after this record was created
       const existingIds = record.leaves?.map((l) => l.leaveTypeId.toString()) || [];
       const missing = leaveTypes.filter(
         (lt) => !existingIds.includes(lt._id.toString())
       );
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
       userName:
         user.name || user.fullName || user.name || "No Name",
     });
   }


   return new Response(JSON.stringify(results), { status: 200 });


 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), {
     status: 500,
   });
 }
}




// ================= POST (Allocate / Reallocate All Users) =================
export async function POST(req) {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");


   const allocation = await req.json();
   const year = getYear();
   const prevYear = year - 1;


   const users = await db.collection("users").find({}).toArray();
   const leaveTypes = await db.collection("leave-types").find({}).toArray();


   for (const user of users) {


     const prev = await db.collection("leave_balances").findOne({
       userId: user._id,
       year: prevYear,
     });


     const leaves = [];


     for (const lt of leaveTypes) {
       const newAllocation = Number(allocation[lt._id] || 0);
       let carry = 0;


       if (prev) {
         const prevLeave = prev.leaves?.find(
           (l) => l.leaveTypeId.toString() === lt._id.toString()
         );
         if (prevLeave) carry = prevLeave.balance;
       }


       let finalBalance = newAllocation;


       // Annual carry forward (max 51)
       if (lt.name?.toLowerCase().includes("annual")) {
         finalBalance = Math.min(carry + newAllocation, 51);
       }


       // Casual + EOL = no carry
       if (
         lt.name?.toLowerCase().includes("casual") ||
         lt.name?.toLowerCase().includes("eol")
       ) {
         finalBalance = newAllocation;
       }


       leaves.push({
         leaveTypeId: lt._id,
         leaveTypeName: lt.name,
         allocated: newAllocation,
         used: 0,
         balance: finalBalance,
       });
     }


     // 🔥 IMPORTANT FIX
     // Use UPSERT so it updates if exists, inserts if not
     await db.collection("leave_balances").updateOne(
       { userId: user._id, year },
       {
         $set: {
           userName:
             user.name || user.fullName || user.name || "",
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


   return new Response(
     JSON.stringify({ message: "Leave allocation completed" }),
     { status: 201 }
   );


 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), {
     status: 500,
   });
 }
}




// ================= PUT (Edit Single User) =================
export async function PUT(req) {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");


   const { _id, leaves, remarks } = await req.json();
   if (!_id) throw new Error("ID required");


   const updatedLeaves = leaves.map((l) => ({
     ...l,
     balance: Number(l.allocated) - Number(l.used || 0),
   }));


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


   return new Response(
     JSON.stringify({ message: "Updated successfully" }),
     { status: 200 }
   );


 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), {
     status: 500,
   });
 }
}




// ================= DELETE =================
export async function DELETE(req) {
 try {
   const client = await clientPromise;
   const db = client.db("civic_leave_db");


   const { _id } = await req.json();
   if (!_id) throw new Error("ID required");


   await db.collection("leave_balances").deleteOne({
     _id: new ObjectId(_id),
   });


   return new Response(
     JSON.stringify({ message: "Deleted successfully" }),
     { status: 200 }
   );


 } catch (error) {
   return new Response(JSON.stringify({ error: error.message }), {
     status: 500,
   });
 }
}

