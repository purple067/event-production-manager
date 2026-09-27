import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { db } from "../../../src/prisma/db";

let organizationId = 0;
let userId = 0;
let categoryId = 0;
let eventId = 0;
let equipmentId = 0;

type MockContext = {
  session: Record<string, never>;
  authUser: {
    id: string;
    email: string;
  };
  user: {
    id: number;
    email: string;
  };
  membership: {
    userId: number;
    organizationId: number;
    role: string;
    status: string;
  };
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  organizations: Array<{
    membership: {
      userId: number;
      organizationId: number;
      role: string;
      status: string;
    };
    organization: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
};

const mockContext: MockContext = {
  session: {},
  authUser: {
    id: "",
    email: "",
  },
  user: {
    id: 0,
    email: "",
  },
  membership: {
    userId: 0,
    organizationId: 0,
    role: "OWNER",
    status: "ACTIVE",
  },
  organization: {
    id: 0,
    name: "",
    slug: "",
  },
  organizations: [],
};

vi.mock("../../../src/lib/authorization", () => ({
  requireCurrentContext: vi.fn(async () => mockContext),
  requireRole: vi.fn(),
  authorizationErrorResponse: vi.fn(() => null),
}));

const { PATCH } = await import(
  "../../../app/api/events/[id]/equipment-assignments/[assignmentId]/operation/route"
);

async function createFixture() {
  const unique = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  const slug = `vitest-equipment-operation-${unique}`;
  const email = `${slug}@example.com`;
  const authUserId = `vitest-equipment-operation-auth-${unique}`;
  const categoryCode = `VITEST-OP-${unique}`;

  const organization =
    await db.orm.public.Organization.create({
      name: `Vitest Equipment Operation Organization ${unique}`,
      slug,
    });

  organizationId = organization.id;

  const user = await db.orm.public.User.create({
    authUserId,
    email,
    name: "Vitest Equipment Operation User",
  });

  userId = user.id;

  await db.orm.public.OrganizationMembership.create({
    userId,
    organizationId,
    role: "OWNER",
    status: "ACTIVE",
  });

  const category =
    await db.orm.public.EquipmentCategory.create({
      name: `Vitest Equipment Operation Category ${unique}`,
      code: categoryCode,
      organizationId,
    });

  categoryId = category.id;

  const event = await db.orm.public.Event.create({
    name: `Vitest Equipment Operation Event ${unique}`,
    status: "DRAFT",
    startDate: new Date(
      "2030-01-01T00:00:00.000Z",
    ).toISOString(),
    endDate: new Date(
      "2030-01-02T00:00:00.000Z",
    ).toISOString(),
    organizationId,
    createdById: userId,
  });

  eventId = event.id;

  const equipment = await db.orm.public.Equipment.create({
    name: "Vitest Equipment Operation Camera",
    quantity: 10,
    organizationId,
    categoryId,
  });

  equipmentId = equipment.id;

  mockContext.authUser.id = authUserId;
  mockContext.authUser.email = email;
  mockContext.user.id = userId;
  mockContext.user.email = email;
  mockContext.membership.userId = userId;
  mockContext.membership.organizationId = organizationId;
  mockContext.organization.id = organizationId;
  mockContext.organization.name = organization.name;
  mockContext.organization.slug = organization.slug;
  mockContext.organizations = [
    {
      membership: mockContext.membership,
      organization: mockContext.organization,
    },
  ];
}

async function cleanupFixture() {
  if (eventId) {
    const assignments =
      await db.orm.public.EquipmentAssignment
        .where({ eventId })
        .all();

    for (const assignment of assignments) {
      await db.orm.public.EquipmentAssignment
        .where({ id: assignment.id })
        .delete();
    }
  }

  if (eventId) {
    await db.orm.public.Event
      .where({ id: eventId })
      .delete();
  }

  if (equipmentId) {
    await db.orm.public.Equipment
      .where({ id: equipmentId })
      .delete();
  }

  if (categoryId) {
    await db.orm.public.EquipmentCategory
      .where({ id: categoryId })
      .delete();
  }

  if (userId) {
    await db.orm.public.OrganizationMembership
      .where({ userId })
      .delete();

    await db.orm.public.User
      .where({ id: userId })
      .delete();
  }

  if (organizationId) {
    await db.orm.public.Organization
      .where({ id: organizationId })
      .delete();
  }

  organizationId = 0;
  userId = 0;
  categoryId = 0;
  eventId = 0;
  equipmentId = 0;
}

async function createAssignment(
  status:
    | "PLANNED"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW" = "PLANNED",
  allocatedAt?: string,
) {
  return db.orm.public.EquipmentAssignment.create({
    eventId,
    equipmentId,
    quantity: 1,
    status,
    allocatedAt: allocatedAt ?? null,
    returnedAt: null,
  });
}

function operationRequestFor(
  assignmentId: number,
  action: "CHECK_IN" | "RETURN",
) {
  return new Request(
    `http://localhost/api/events/${eventId}/equipment-assignments/${assignmentId}/operation`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ action }),
    },
  );
}

function operationParams(
  assignmentId: number,
) {
  return {
    params: Promise.resolve({
      id: String(eventId),
      assignmentId: String(assignmentId),
    }),
  };
}

describe("equipment assignment operation route", () => {
  beforeEach(async () => {
    await createFixture();
  });

  afterEach(async () => {
    await cleanupFixture();
  });

  it("checks in a PLANNED assignment", async () => {
    const assignment = await createAssignment("PLANNED");

    const response = await PATCH(
      operationRequestFor(assignment.id, "CHECK_IN"),
      operationParams(assignment.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.id).toBe(assignment.id);
    expect(body.assignment.status).toBe("CHECKED_IN");
    expect(body.assignment.allocatedAt).not.toBeNull();
    expect(body.assignment.returnedAt).toBeNull();

    const persisted =
      await db.orm.public.EquipmentAssignment
        .where({ id: assignment.id })
        .first();

    expect(persisted?.status).toBe("CHECKED_IN");
    expect(persisted?.allocatedAt).not.toBeNull();
    expect(persisted?.returnedAt).toBeNull();
  });

  it("checks in a CONFIRMED assignment", async () => {
    const assignment = await createAssignment("CONFIRMED");

    const response = await PATCH(
      operationRequestFor(assignment.id, "CHECK_IN"),
      operationParams(assignment.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.status).toBe("CHECKED_IN");
    expect(body.assignment.allocatedAt).not.toBeNull();
  });

  it.each([
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ] as const)(
    "rejects CHECK_IN from %s",
    async (status) => {
      const assignment = await createAssignment(status);

      const response = await PATCH(
        operationRequestFor(assignment.id, "CHECK_IN"),
        operationParams(assignment.id),
      );

      expect(response.status).toBe(409);

      const body = await response.json();

      expect(body.error).toBe(
        `Equipment cannot be checked in from ${status}.`,
      );

      const persisted =
        await db.orm.public.EquipmentAssignment
          .where({ id: assignment.id })
          .first();

      expect(persisted?.status).toBe(status);
    },
  );

  it("preserves an existing allocatedAt timestamp during CHECK_IN", async () => {
    const allocatedAt =
      "2020-01-01T12:00:00.000Z";

    const assignment = await createAssignment(
      "PLANNED",
      allocatedAt,
    );

    const response = await PATCH(
      operationRequestFor(assignment.id, "CHECK_IN"),
      operationParams(assignment.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.status).toBe("CHECKED_IN");
    expect(
      Date.parse(body.assignment.allocatedAt),
    ).toBe(Date.parse(allocatedAt));
  });

  it("returns a CHECKED_IN assignment", async () => {
    const allocatedAt =
      "2020-01-01T12:00:00.000Z";

    const assignment = await createAssignment(
      "CHECKED_IN",
      allocatedAt,
    );

    const beforeReturn = Date.now();

    const response = await PATCH(
      operationRequestFor(assignment.id, "RETURN"),
      operationParams(assignment.id),
    );

    const afterReturn = Date.now();

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.id).toBe(assignment.id);
    expect(body.assignment.status).toBe("COMPLETED");
    expect(
      Date.parse(body.assignment.allocatedAt),
    ).toBe(Date.parse(allocatedAt));
    expect(body.assignment.returnedAt).not.toBeNull();

    const returnedAt = Date.parse(
      body.assignment.returnedAt,
    );

    expect(returnedAt).toBeGreaterThanOrEqual(
      Date.parse(allocatedAt),
    );
    expect(returnedAt).toBeGreaterThanOrEqual(
      beforeReturn,
    );
    expect(returnedAt).toBeLessThanOrEqual(
      afterReturn,
    );
  });

  it.each([
    "PLANNED",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ] as const)(
    "rejects RETURN from %s",
    async (status) => {
      const assignment = await createAssignment(status);

      const response = await PATCH(
        operationRequestFor(assignment.id, "RETURN"),
        operationParams(assignment.id),
      );

      expect(response.status).toBe(409);

      const body = await response.json();

      expect(body.error).toBe(
        `Equipment cannot be returned from ${status}.`,
      );

      const persisted =
        await db.orm.public.EquipmentAssignment
          .where({ id: assignment.id })
          .first();

      expect(persisted?.status).toBe(status);
      expect(persisted?.returnedAt).toBeNull();
    },
  );

  it("rejects an invalid operation action", async () => {
    const assignment = await createAssignment("PLANNED");

    const request = new Request(
      `http://localhost/api/events/${eventId}/equipment-assignments/${assignment.id}/operation`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "CANCEL",
        }),
      },
    );

    const response = await PATCH(
      request,
      operationParams(assignment.id),
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body.error).toBe(
      "Invalid action. Use CHECK_IN or RETURN.",
    );
  });

  it("returns 404 for a missing assignment", async () => {
    const response = await PATCH(
      operationRequestFor(999999999, "CHECK_IN"),
      operationParams(999999999),
    );

    expect(response.status).toBe(404);

    const body = await response.json();

    expect(body.error).toBe(
      "Equipment assignment not found.",
    );
  });

  it("does not operate on an assignment belonging to another event", async () => {
    const otherEvent = await db.orm.public.Event.create({
      name: `Vitest Other Event ${Date.now()}`,
      status: "DRAFT",
      startDate: new Date(
        "2030-02-01T00:00:00.000Z",
      ).toISOString(),
      endDate: new Date(
        "2030-02-02T00:00:00.000Z",
      ).toISOString(),
      organizationId,
      createdById: userId,
    });

    const assignment =
      await db.orm.public.EquipmentAssignment.create({
        eventId: otherEvent.id,
        equipmentId,
        quantity: 1,
        status: "PLANNED",
        allocatedAt: null,
        returnedAt: null,
      });

    try {
      const response = await PATCH(
        operationRequestFor(assignment.id, "CHECK_IN"),
        operationParams(assignment.id),
      );

      expect(response.status).toBe(404);

      const body = await response.json();

      expect(body.error).toBe(
        "Equipment assignment not found.",
      );

      const persisted =
        await db.orm.public.EquipmentAssignment
          .where({ id: assignment.id })
          .first();

      expect(persisted?.status).toBe("PLANNED");
    } finally {
      await db.orm.public.EquipmentAssignment
        .where({ id: assignment.id })
        .delete();

      await db.orm.public.Event
        .where({ id: otherEvent.id })
        .delete();
    }
  });

  it("allows only one concurrent CHECK_IN to transition the assignment", async () => {
    const assignment = await createAssignment("PLANNED");

    const [first, second] = await Promise.all([
      PATCH(
        operationRequestFor(assignment.id, "CHECK_IN"),
        operationParams(assignment.id),
      ),
      PATCH(
        operationRequestFor(assignment.id, "CHECK_IN"),
        operationParams(assignment.id),
      ),
    ]);

    const statuses = [
      first.status,
      second.status,
    ].sort();

    expect(statuses).toEqual([200, 409]);

    const persisted =
      await db.orm.public.EquipmentAssignment
        .where({ id: assignment.id })
        .first();

    expect(persisted?.status).toBe("CHECKED_IN");
    expect(persisted?.allocatedAt).not.toBeNull();
  });

  it("allows only one concurrent RETURN to transition the assignment", async () => {
    const assignment = await createAssignment(
      "CHECKED_IN",
      "2020-01-01T12:00:00.000Z",
    );

    const [first, second] = await Promise.all([
      PATCH(
        operationRequestFor(assignment.id, "RETURN"),
        operationParams(assignment.id),
      ),
      PATCH(
        operationRequestFor(assignment.id, "RETURN"),
        operationParams(assignment.id),
      ),
    ]);

    const statuses = [
      first.status,
      second.status,
    ].sort();

    expect(statuses).toEqual([200, 409]);

    const persisted =
      await db.orm.public.EquipmentAssignment
        .where({ id: assignment.id })
        .first();

    expect(persisted?.status).toBe("COMPLETED");
    expect(persisted?.returnedAt).not.toBeNull();
  });
});
