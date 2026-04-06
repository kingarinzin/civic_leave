import { ObjectId } from "mongodb";

type DbLike = {
  collection: (name: string) => {
    findOne: (query: Record<string, unknown>, options?: Record<string, unknown>) => Promise<any>;
    find: (query: Record<string, unknown>, options?: Record<string, unknown>) => {
      sort: (sortQuery: Record<string, 1 | -1>) => { toArray: () => Promise<any[]> };
      toArray: () => Promise<any[]>;
    };
  };
};

const ACTIVE_USER_FILTER = {
  isActive: { $ne: false },
  approvalStatus: { $ne: "rejected" },
};

function normalizeId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const maybeObject = value as { _id?: unknown; toString?: () => string };
    if (maybeObject._id) return normalizeId(maybeObject._id);
    if (typeof maybeObject.toString === "function") return maybeObject.toString();
  }
  return "";
}
export function isLeaveApproverRole(role: string | undefined): boolean {
  const normalized = normalizeRole(role);

  return [
    "DivisionHead",
    "DepartmentHead",
    "Commissioner",
    "Chairperson",
    "SecretaryService",
  ].includes(normalized);
}


function toObjectIdIfValid(value: string): ObjectId | null {
  try {
    return ObjectId.isValid(value) ? new ObjectId(value) : null;
  } catch {
    return null;
  }
}

function buildIdQueryVariants(value: string): unknown[] {
  const values: unknown[] = [value];
  const objectIdValue = toObjectIdIfValid(value);
  if (objectIdValue) values.push(objectIdValue);
  return values;
}

function displayName(user: any): string {
  return user?.name || user?.email || "Approver";
}

export function normalizeRole(role: string | undefined): string {
  const normalized = (role || "Officer").toLowerCase().replace(/[\s_-]/g, "");
  const roleMap: Record<string, string> = {
    officer: "Officer",
    divisionhead: "DivisionHead",
    departmenthead: "DepartmentHead",
    commissioner: "Commissioner",
    chairperson: "Chairperson",
    secretaryservice: "SecretaryService",
    admin: "Admin",
  };

  return roleMap[normalized] || "Officer";
}

type LeaveWindow = {
  fromDate?: string;
  toDate?: string;
};

async function findSingleUser(db: DbLike, query: Record<string, unknown>) {
  return db.collection("users").findOne(query, { sort: { createdAt: 1 } });
}

async function findDivisionHead(db: DbLike, divisionId: string, applicantId: string) {
  if (!divisionId) return null;
  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "DivisionHead",
    _id: { $ne: new ObjectId(applicantId) },
    divisionId: { $in: buildIdQueryVariants(divisionId) },
  });
}

async function findDepartmentHead(db: DbLike, departmentId: string, applicantId: string) {
  if (!departmentId) return null;
  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "DepartmentHead",
    _id: { $ne: new ObjectId(applicantId) },
    departmentId: { $in: buildIdQueryVariants(departmentId) },
  });
}

async function findCommissioner(db: DbLike, applicantId: string) {
  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "Commissioner",
    _id: { $ne: new ObjectId(applicantId) },
  });
}

async function findMappedCommissionerByDepartment(
  db: DbLike,
  departmentId: string,
  applicantId: string,
) {
  if (!departmentId) return null;

  const assignment = await db.collection("commissioner_assignments").findOne({
    departmentId: { $in: buildIdQueryVariants(departmentId) },
  });

  if (!assignment) return null;

  const commissionerId = normalizeId(assignment.commissionerId);
  if (!commissionerId) return null;

  const commissionerObjectId = toObjectIdIfValid(commissionerId);
  if (!commissionerObjectId) return null;

  return db.collection("users").findOne({
    ...ACTIVE_USER_FILTER,
    role: "Commissioner",
    _id: commissionerObjectId,
  });
}

async function findChairperson(db: DbLike, applicantId: string) {
  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "Chairperson",
    _id: { $ne: new ObjectId(applicantId) },
  });
}

async function findSecretaryService(db: DbLike, applicantId: string) {
  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "SecretaryService",
    _id: { $ne: new ObjectId(applicantId) },
  });
}

async function findAdmin(db: DbLike, applicantId: string) {
  return findSingleUser(db, {
    isAdmin: true,
    isActive: { $ne: false },
    _id: { $ne: new ObjectId(applicantId) },
  });
}

async function isApproverOnLeaveInRequestedRange(
  db: DbLike,
  approverId: string,
  leaveWindow: LeaveWindow,
) {
  if (!leaveWindow.fromDate || !leaveWindow.toDate) return false;

  const approverIdVariants: unknown[] = [approverId];
  const approverObjectId = toObjectIdIfValid(approverId);
  if (approverObjectId) approverIdVariants.push(approverObjectId);

  const overlap = await db.collection("leave_applications").findOne({
    userId: { $in: approverIdVariants },
    status: "approved",
    fromDate: { $lte: leaveWindow.toDate },
    toDate: { $gte: leaveWindow.fromDate },
  });

  return !!overlap;
}

/* ===================== MAIN ===================== */

export async function resolveApproverForApplicant(
  db: DbLike,
  applicantUser: any,
  leaveWindow: LeaveWindow = {},
) {
  const applicantId = normalizeId(applicantUser?._id);
  const role = normalizeRole(applicantUser?.role);
  const departmentId = normalizeId(applicantUser?.departmentId);
  const divisionId = normalizeId(applicantUser?.divisionId);

  if (!applicantId) return null;

  console.log("=== APPROVER RESOLUTION START ===");
  console.log("Role:", role);

  const resolverChains: Record<string, Array<() => Promise<any>>> = {
    Officer: [
      () => findDivisionHead(db, divisionId, applicantId),
      () => findDepartmentHead(db, departmentId, applicantId),
      () => findMappedCommissionerByDepartment(db, departmentId, applicantId),
      () => findAdmin(db, applicantId),
    ],

    DivisionHead: [
      () => findDepartmentHead(db, departmentId, applicantId),
      () => findMappedCommissionerByDepartment(db, departmentId, applicantId),
      () => findCommissioner(db, applicantId),
      () => findChairperson(db, applicantId),
      () => findSecretaryService(db, applicantId),
      () => findAdmin(db, applicantId),
    ],

    DepartmentHead: [
      () => findMappedCommissionerByDepartment(db, departmentId, applicantId),
      () => findCommissioner(db, applicantId),
      () => findChairperson(db, applicantId),
      () => findSecretaryService(db, applicantId),
      () => findAdmin(db, applicantId),
    ],

    Commissioner: [
      () => findChairperson(db, applicantId),
      () => findSecretaryService(db, applicantId),
      () => findAdmin(db, applicantId),
    ],

    Chairperson: [
      () => findSecretaryService(db, applicantId),
      () => findAdmin(db, applicantId),
    ],

    SecretaryService: [
      () => findAdmin(db, applicantId),
    ],
  };

  const chain = resolverChains[role] || resolverChains.Officer;

  /* ✅ STOPPER LOGIC (SEQUENTIAL) */
  for (const finder of chain) {
    const candidate = await finder();

    if (!candidate) continue;

    const candidateId = normalizeId(candidate._id);
    if (!candidateId) continue;

    const approverOnLeave = await isApproverOnLeaveInRequestedRange(
      db,
      candidateId,
      leaveWindow,
    );

    if (approverOnLeave) continue;

    return {
      approverId: candidateId,
      approverRole: candidate.role || (candidate.isAdmin ? "Admin" : "Approver"),
      approverName: displayName(candidate),
    };
  }

  return null;
}