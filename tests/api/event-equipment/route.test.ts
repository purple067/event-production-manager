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

const { POST } = await import(
  "../../../app/api/events/[id]/equipment/route"
);

const { PATCH } = await import(
  "../../../app/api/events/[id]/equipment/[assignmentId]/route"
);

async function createFixture() {
  const unique = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  const slug = `vitest-event-equipment-${unique}`;
  const email = `${slug}@example.com`;
  const authUserId = `vitest-event-equipment-auth-${unique}`;
  const categoryCode = `VITEST-EQ-${unique}`;

  const organization =
    await db.orm.public.Organization.create({
      name: `Vitest Event Equipment Organization ${unique}`,
      slug,
    });

  organizationId = organization.id;

  const user = await db.orm.public.User.create({
    authUserId,
    email,
    name: "Vitest Event Equipment User",
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
      name: `Vitest Event Equipment Category ${unique}`,
      code: categoryCode,
      organizationId,
    });

  categoryId = category.id;

  const event = await db.orm.public.Event.create({
    name: `Vitest Event Equipment Event ${unique}`,
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
    name: "Vitest Event Equipment Camera",
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
}

function postRequest(
  body: Record<string, unknown>,
) {
  return new Request(
    `http://localhost/api/events/${eventId}/equipment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

function patchRequest(
  assignmentId: number,
  body: Record<string, unknown>,
) {
  return new Request(
    `http://localhost/api/events/${eventId}/equipment/${assignmentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

async function createAssignment(
  quantity: number,
  status:
    | "PLANNED"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW",
) {
  return db.orm.public.EquipmentAssignment.create({
    equipmentId,
    eventId,
    quantity,
    status,
  });
}

async function getActiveAllocatedQuantity() {
  const assignments =
    await db.orm.public.EquipmentAssignment
      .where({ equipmentId })
      .all();

  return assignments
    .filter((assignment) =>
      [
        "PLANNED",
        "CONFIRMED",
        "CHECKED_IN",
      ].includes(assignment.status),
    )
    .reduce(
      (total, assignment) =>
        total + assignment.quantity,
      0,
    );
}

beforeEach(async () => {
  organizationId = 0;
  userId = 0;
  categoryId = 0;
  eventId = 0;
  equipmentId = 0;

  await createFixture();
});

afterEach(async () => {
  await cleanupFixture();
});

describe("POST /api/events/[id]/equipment", () => {
  it("creates an assignment when inventory is available", async () => {
    await createAssignment(7, "PLANNED");

    const response = await POST(
      postRequest({
        equipmentId,
        quantity: 3,
        status: "PLANNED",
      }),
      {
        params: Promise.resolve({
          id: String(eventId),
        }),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.assignment.equipmentId).toBe(
      equipmentId,
    );
    expect(body.assignment.eventId).toBe(eventId);
    expect(body.assignment.quantity).toBe(3);
    expect(body.assignment.status).toBe("PLANNED");

    await expect(
      getActiveAllocatedQuantity(),
    ).resolves.toBe(10);
  });

  it("rejects an allocation that exceeds available inventory", async () => {
    await createAssignment(7, "PLANNED");

    const response = await POST(
      postRequest({
        equipmentId,
        quantity: 4,
        status: "PLANNED",
      }),
      {
        params: Promise.resolve({
          id: String(eventId),
        }),
      },
    );

    expect(response.status).toBe(409);

    await expect(response.json()).resolves.toEqual({
      error:
        "Insufficient equipment inventory. Inventory: 10, Already allocated: 7, Requested: 4.",
    });

    await expect(
      getActiveAllocatedQuantity(),
    ).resolves.toBe(7);
  });

  it("counts only active assignment statuses against inventory", async () => {
    await createAssignment(3, "PLANNED");
    await createAssignment(2, "CONFIRMED");
    await createAssignment(2, "CHECKED_IN");

    await createAssignment(5, "COMPLETED");
    await createAssignment(5, "CANCELLED");
    await createAssignment(5, "NO_SHOW");

    const response = await POST(
      postRequest({
        equipmentId,
        quantity: 3,
        status: "CONFIRMED",
      }),
      {
        params: Promise.resolve({
          id: String(eventId),
        }),
      },
    );

    expect(response.status).toBe(201);

    await expect(
      getActiveAllocatedQuantity(),
    ).resolves.toBe(10);
  });

  it("rejects lifecycle statuses that cannot be used for new assignments", async () => {
    const response = await POST(
      postRequest({
        equipmentId,
        quantity: 1,
        status: "CHECKED_IN",
      }),
      {
        params: Promise.resolve({
          id: String(eventId),
        }),
      },
    );

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error:
        "New equipment assignments must start as PLANNED or CONFIRMED.",
    });
  });

  it("rejects allocatedAt when creating an assignment", async () => {
    const response = await POST(
      postRequest({
        equipmentId,
        quantity: 1,
        status: "PLANNED",
        allocatedAt: "2030-01-01T10:00:00.000Z",
      }),
      {
        params: Promise.resolve({
          id: String(eventId),
        }),
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "Allocation time cannot be set when creating an assignment. Use the equipment operation endpoint.",
    });

    await expect(
      db.orm.public.EquipmentAssignment
        .where({ eventId })
        .all(),
    ).resolves.toHaveLength(0);
  });

  it("rejects returnedAt when creating an assignment", async () => {
    const response = await POST(
      postRequest({
        equipmentId,
        quantity: 1,
        status: "PLANNED",
        returnedAt: "2030-01-01T11:00:00.000Z",
      }),
      {
        params: Promise.resolve({
          id: String(eventId),
        }),
      },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "Return time cannot be set when creating an assignment.",
    });

    await expect(
      db.orm.public.EquipmentAssignment
        .where({ eventId })
        .all(),
    ).resolves.toHaveLength(0);
  });

  it("creates new assignments without lifecycle timestamps", async () => {
    const response = await POST(
      postRequest({
        equipmentId,
        quantity: 1,
        status: "PLANNED",
      }),
      {
        params: Promise.resolve({
          id: String(eventId),
        }),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.assignment.status).toBe("PLANNED");
    expect(body.assignment.allocatedAt).toBeNull();
    expect(body.assignment.returnedAt).toBeNull();
  });

  it("prevents concurrent allocations from exceeding inventory", async () => {
    await createAssignment(8, "PLANNED");

    const requests = [
      POST(
        postRequest({
          equipmentId,
          quantity: 2,
          status: "PLANNED",
        }),
        {
          params: Promise.resolve({
            id: String(eventId),
          }),
        },
      ),
      POST(
        postRequest({
          equipmentId,
          quantity: 2,
          status: "PLANNED",
        }),
        {
          params: Promise.resolve({
            id: String(eventId),
          }),
        },
      ),
    ];

    const responses = await Promise.all(requests);
    const statuses = responses.map(
      (response) => response.status,
    );

    expect(
      statuses.filter((status) => status === 201),
    ).toHaveLength(1);

    expect(
      statuses.filter((status) => status === 409),
    ).toHaveLength(1);

    await expect(
      getActiveAllocatedQuantity(),
    ).resolves.toBe(10);
  });
});

describe(
  "PATCH /api/events/[id]/equipment/[assignmentId]",
  () => {
    it("allows an active assignment to increase within available inventory", async () => {
      const current = await createAssignment(
        3,
        "PLANNED",
      );

      await createAssignment(4, "CONFIRMED");

      const response = await PATCH(
        patchRequest(current.id, {
          quantity: 6,
        }),
        {
          params: Promise.resolve({
            id: String(eventId),
            assignmentId: String(current.id),
          }),
        },
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.assignment.id).toBe(current.id);
      expect(body.assignment.quantity).toBe(6);

      await expect(
        getActiveAllocatedQuantity(),
      ).resolves.toBe(10);
    });

    it("rejects an active assignment increase beyond inventory", async () => {
      const current = await createAssignment(
        3,
        "PLANNED",
      );

      await createAssignment(5, "CONFIRMED");

      const response = await PATCH(
        patchRequest(current.id, {
          quantity: 6,
        }),
        {
          params: Promise.resolve({
            id: String(eventId),
            assignmentId: String(current.id),
          }),
        },
      );

      expect(response.status).toBe(409);

      await expect(response.json()).resolves.toEqual({
        error:
          "Insufficient equipment inventory. Inventory: 10, Already allocated: 5, Requested: 6.",
      });

      const assignment =
        await db.orm.public.EquipmentAssignment
          .where({ id: current.id })
          .first();

      expect(assignment?.quantity).toBe(3);

      await expect(
        getActiveAllocatedQuantity(),
      ).resolves.toBe(8);
    });

    it("excludes the current assignment from its own allocation calculation", async () => {
      const current = await createAssignment(
        3,
        "PLANNED",
      );

      await createAssignment(4, "CONFIRMED");

      const response = await PATCH(
        patchRequest(current.id, {
          quantity: 6,
        }),
        {
          params: Promise.resolve({
            id: String(eventId),
            assignmentId: String(current.id),
          }),
        },
      );

      expect(response.status).toBe(200);

      const assignment =
        await db.orm.public.EquipmentAssignment
          .where({ id: current.id })
          .first();

      expect(assignment?.quantity).toBe(6);
    });

    it("does not enforce inventory for inactive assignments", async () => {
      const current = await createAssignment(
        3,
        "COMPLETED",
      );

      await createAssignment(10, "PLANNED");

      const response = await PATCH(
        patchRequest(current.id, {
          quantity: 50,
        }),
        {
          params: Promise.resolve({
            id: String(eventId),
            assignmentId: String(current.id),
          }),
        },
      );

      expect(response.status).toBe(200);

      const assignment =
        await db.orm.public.EquipmentAssignment
          .where({ id: current.id })
          .first();

      expect(assignment?.quantity).toBe(50);
    });

    it("rejects lifecycle field changes through generic PATCH", async () => {
      const current = await createAssignment(
        2,
        "PLANNED",
      );

      const response = await PATCH(
        patchRequest(current.id, {
          status: "CHECKED_IN",
        }),
        {
          params: Promise.resolve({
            id: String(eventId),
            assignmentId: String(current.id),
          }),
        },
      );

      expect(response.status).toBe(409);

      await expect(response.json()).resolves.toEqual({
        error:
          "Assignment status cannot be changed through this endpoint. Use the equipment operation endpoint.",
      });
    });
  },
);
