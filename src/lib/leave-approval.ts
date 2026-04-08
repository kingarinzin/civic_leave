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

export function isLeaveApproverRole(role: string): boolean {
  const approverRoles = [
    "DivisionHead",
    "DepartmentHead",
    "Commissioner"
  ];

  return approverRoles.includes(role);
}

function isValidObjectId(value: string) {
  return ObjectId.isValid(value);
}

async function findSingleUser(db: DbLike, query: any) {
  return db.collection("users").findOne(query);
}

async function findDivisionHead(db: DbLike, divisionId: string, applicantId: string) {
  const applicantOid = toObjectIdSafe(applicantId);

  if (!divisionId) return null;

  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "DivisionHead",
    ...(applicantOid && { _id: { $ne: applicantOid } }),
    divisionId: { $in: buildIdQueryVariants(divisionId) },
  });
}

async function findDepartmentHead(db: DbLike, departmentId: string, applicantId: string) {
  const applicantOid = toObjectIdSafe(applicantId);

  if (!departmentId) return null;

  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "DepartmentHead",
    ...(applicantOid && { _id: { $ne: applicantOid } }),
    departmentId: { $in: buildIdQueryVariants(departmentId) },
  });
}

async function findCommissioner(db: DbLike, applicantId: string) {
  const applicantOid = toObjectIdSafe(applicantId);

  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "Commissioner",
    ...(applicantOid && { _id: { $ne: applicantOid } }),
  });
}

async function findChairperson(db: DbLike, applicantId: string) {
  const applicantOid = toObjectIdSafe(applicantId);

  return findSingleUser(db, {
    ...ACTIVE_USER_FILTER,
    role: "Chairperson",
    ...(applicantOid && { _id: { $ne: applicantOid } }),
  });
}

async function findSecretaryService(db: DbLike, applicantId: string) {
  const applicantOid = toObjectIdSafe(applicantId);

  return findSingleUser(db, {
    isAdmin: true,
    isActive: { $ne: false },
    ...(applicantOid && { _id: { $ne: applicantOid } }),
  });
}

async function findAdmin(db: DbLike, applicantId: string) {
  const applicantOid = toObjectIdSafe(applicantId);

  return findSingleUser(db, {
    isAdmin: true,
    isActive: { $ne: false },
    ...(applicantOid && { _id: { $ne: applicantOid } }),
  });
}

async function findMappedCommissionerByDepartment(
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
    _id: oid,
  });
}

export async function resolveApproverForApplicant(
  db: DbLike,
  applicantUser: any,
  leaveWindow: { fromDate?: string; toDate?: string } = {},
  visited: Set<string> = new Set() // ✅ cycle guard
) {
  const applicantId = normalizeId(applicantUser?._id);
  const role = normalizeRole(applicantUser?.role);
  const departmentId = normalizeId(applicantUser?.departmentId);
  const divisionId = normalizeId(applicantUser?.divisionId);

  if (!applicantId) return null;

  // 🔒 Prevent infinite recursion / loops
  if (visited.has(applicantId)) {
    console.warn("Circular approver resolution detected for:", applicantId);
    return null;
  }

  visited.add(applicantId);

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
    SecretaryService: [() => findAdmin(db, applicantId)],
  };

  const chain = resolverChains[role] || resolverChains.Officer;

  for (const finder of chain) {
    const candidate = await finder();

    if (!candidate) continue;

    const candidateId = normalizeId(candidate._id);
    if (!candidateId) continue;

    // 🔒 Avoid self-approval loops
    if (candidateId === applicantId) continue;

    return {
      approverId: candidateId,
      approverRole: candidate.role || (candidate.isAdmin ? "Admin" : "Approver"),
      approverName: displayName(candidate),
    };
  }

  return null;
}