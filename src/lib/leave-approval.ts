import { ObjectId } from "mongodb";

type DbLike = {
  collection: (name: string) => any;
};

const ACTIVE_USER_FILTER = {
  isActive: { $ne: false },
  approvalStatus: { $ne: "rejected" },
};

function normalizeId(value: any): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (value instanceof ObjectId) return value.toString();

  if (typeof value === "object") {
    if (value._id) return normalizeId(value._id);

    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }

    if (typeof value.toString === "function") {
      const str = value.toString();
      if (str !== "[object Object]") return str;
    }
  }

  return "";
}

function toObjectIdSafe(value: string): ObjectId | null {
  try {
    return ObjectId.isValid(value) ? new ObjectId(value) : null;
  } catch {
    return null;
  }
}

function buildIdQueryVariants(value: string): any[] {
  const values: any[] = [value];
  const oid = toObjectIdSafe(value);
  if (oid) values.push(oid);
  return values;
}

function displayName(user: any): string {
  return user?.name || user?.email || "Approver";
}

/**
 * Normalize role into standard format
 */
export function normalizeRole(role: string | undefined): string {
  const normalized = (role || "Officer").toLowerCase().replace(/[\s_-]/g, "");

  const map: Record<string, string> = {
    officer: "Officer",
    divisionhead: "DivisionHead",
    departmenthead: "DepartmentHead",
    commissioner: "Commissioner",
    chairperson: "Chairperson",
    secretaryservice: "SecretaryService",
    admin: "Admin",
  };

  return map[normalized] || "Officer";
}

/**
 * Check if role is allowed to approve leaves
 */
export function isLeaveApproverRole(role: string): boolean {
  const normalized = normalizeRole(role);
  return ["DivisionHead", "DepartmentHead", "Commissioner"].includes(
    normalized
  );
}

/**
 * Generic user finder
 */
async function findSingleUser(db: DbLike, query: any) {
  return db.collection("users").findOne(query);
}

async function findDivisionHead(
  db: DbLike,
  divisionId: string,
  applicantId: string
) {
  if (!divisionId) return null;

  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "DivisionHead",
    _id: { $ne: toObjectIdSafe(applicantId) },
    divisionId: { $in: buildIdQueryVariants(divisionId) },
  });
}

async function findDepartmentHead(
  db: DbLike,
  departmentId: string,
  applicantId: string
) {
  if (!departmentId) return null;

  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "DepartmentHead",
    _id: { $ne: toObjectIdSafe(applicantId) },
    departmentId: { $in: buildIdQueryVariants(departmentId) },
  });
}

async function findCommissionerByDepartment(
  db: DbLike,
  departmentId: string,
  applicantId: string
) {
  if (!departmentId) return null;

  const assignment = await db.collection("commissioner_assignments").findOne({
    departmentId: { $in: buildIdQueryVariants(departmentId) },
  });

  if (!assignment) return null;

  const commissionerId = normalizeId(assignment.commissionerId);
  const oid = toObjectIdSafe(commissionerId);

  if (!oid) return null;

  return db.collection("users").findOne({
    ...ACTIVE_USER_FILTER,
    role: "Commissioner",
    _id: { $eq: oid, $ne: toObjectIdSafe(applicantId) },
  });
}

async function findChairperson(db: DbLike, applicantId: string) {
  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "Chairperson",
    _id: { $ne: toObjectIdSafe(applicantId) },
  });
}

async function findSecretaryService(db: DbLike, applicantId: string) {
  return findSingleUser(db, {
    isAdmin: true,
    isActive: { $ne: false },
    _id: { $ne: toObjectIdSafe(applicantId) },
  });
}

async function findAdmin(db: DbLike, applicantId: string) {
  return findSingleUser(db, {
    isAdmin: true,
    isActive: { $ne: false },
    _id: { $ne: toObjectIdSafe(applicantId) },
  });
}

/**
 * ✅ MAIN APPROVER RESOLUTION (NON-RECURSIVE)
 */
export async function resolveApproverForApplicant(
  db: DbLike,
  applicantUser: any
) {
  const applicantId = normalizeId(applicantUser?._id);
  const role = normalizeRole(applicantUser?.role);
  const departmentId = normalizeId(applicantUser?.departmentId);
  const divisionId = normalizeId(applicantUser?.divisionId);

  if (!applicantId) return null;

  console.log("🔵 Resolving approver:", {
    applicantId,
    role,
    departmentId,
    divisionId,
  });

  let candidate: any = null;

  if (role === "Officer") {
    candidate =
      (await findDivisionHead(db, divisionId, applicantId)) ||
      (await findDepartmentHead(db, departmentId, applicantId)) ||
      (await findCommissionerByDepartment(db, departmentId, applicantId)) ||
      (await findAdmin(db, applicantId));
  }

  if (role === "DivisionHead") {
    candidate =
      (await findDepartmentHead(db, departmentId, applicantId)) ||
      (await findCommissionerByDepartment(db, departmentId, applicantId)) ||
      (await findChairperson(db, applicantId)) ||
      (await findSecretaryService(db, applicantId)) ||
      (await findAdmin(db, applicantId));
  }

  if (role === "DepartmentHead") {
    candidate =
      (await findCommissionerByDepartment(db, departmentId, applicantId)) ||
      (await findChairperson(db, applicantId)) ||
      (await findSecretaryService(db, applicantId)) ||
      (await findAdmin(db, applicantId));
  }

  if (role === "Commissioner") {
    candidate =
      (await findChairperson(db, applicantId)) ||
      (await findSecretaryService(db, applicantId)) ||
      (await findAdmin(db, applicantId));
  }

  if (role === "Chairperson") {
    candidate =
      (await findSecretaryService(db, applicantId)) ||
      (await findAdmin(db, applicantId));
  }

  if (role === "SecretaryService") {
    candidate = await findAdmin(db, applicantId);
  }

  if (!candidate) return null;

  return {
    approverId: normalizeId(candidate._id),
    approverRole: candidate.role || (candidate.isAdmin ? "Admin" : "Approver"),
    approverName: displayName(candidate),
  };
}