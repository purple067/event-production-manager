import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const { PATCH } = await import("../../../app/api/equipment/[id]/route");

async function createFixture() {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const slug = `vitest-equipment-${unique}`;
  const email = `${slug}@example.com`;
  const authUserId = `vitest-auth-${unique}`;
  const categoryCode = `VITEST-${unique}`;

  const organization = await db.orm.public.Organization.create({
    name: `Vitest Equipment Test Organization ${unique}`,
    slug,
  });
  organizationId = organization.id;

  const user = await db.orm.public.User.create({
    authUserId,
    email,
    name: "Vitest Equipment User",
  });
  userId = user.id;

  await db.orm.public.OrganizationMembership.create({
    userId,
    organizationId,
    role: "OWNER",
    status: "ACTIVE",
  });

  const category = await db.orm.public.EquipmentCategory.create({
    name: `Vitest Equipment Category ${unique}`,
    code: categoryCode,
    organizationId,
  });
  categoryId = category.id;

  const event = await db.orm.public.Event.create({
    name: `Vitest Equipment Event ${unique}`,
    status: "DRAFT",
    startDate: new Date("2030-01-01T00:00:00.000Z").toISOString(),
    endDate: new Date("2030-01-02T00:00:00.000Z").toISOString(),
    organizationId,
    createdById: userId,
  });
  eventId = event.id;

  const equipment = await db.orm.public.Equipment.create({
    name: "Vitest Camera",
    quantity: 10,
    organizationId,
    categoryId,
  });
  equipmentId = equipment.id;

  await db.orm.public.EquipmentAssignment.create({
    quantity: 3,
    status: "PLANNED",
    equipmentId,
    eventId,
  });

  await db.orm.public.EquipmentAssignment.create({
    quantity: 2,
    status: "CONFIRMED",
    equipmentId,
    eventId,
  });

  await db.orm.public.EquipmentAssignment.create({
    quantity: 2,
    status: "CHECKED_IN",
    equipmentId,
    eventId,
  });

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
  if (equipmentId) {
    const assignments = await db.orm.public.EquipmentAssignment
      .where({ equipmentId })
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

function patchRequest(body: Record<string, unknown>) {
  return new Request(
    `http://localhost/api/equipment/${equipmentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
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

describe("PATCH /api/equipment/[id] quantity protection", () => {
  it("rejects quantity below active allocations", async () => {
    const response = await PATCH(
      patchRequest({ quantity: 6 }),
      {
        params: Promise.resolve({
          id: String(equipmentId),
        }),
      },
    );

    expect(response.status).toBe(409);

    await expect(response.json()).resolves.toEqual({
      error:
        "Equipment quantity cannot be reduced below active allocations.",
      requestedQuantity: 6,
      activeAllocatedQuantity: 7,
    });

    const equipment = await db.orm.public.Equipment
      .where({
        id: equipmentId,
        organizationId,
      })
      .first();

    expect(equipment?.quantity).toBe(10);
  });

  it("allows quantity equal to active allocations", async () => {
    const response = await PATCH(
      patchRequest({ quantity: 7 }),
      {
        params: Promise.resolve({
          id: String(equipmentId),
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.equipment.quantity).toBe(7);
  });

  it("allows quantity above active allocations", async () => {
    const response = await PATCH(
      patchRequest({ quantity: 9 }),
      {
        params: Promise.resolve({
          id: String(equipmentId),
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.equipment.quantity).toBe(9);
  });

  it("rejects invalid quantity before reaching the transaction", async () => {
    const response = await PATCH(
      patchRequest({ quantity: 0 }),
      {
        params: Promise.resolve({
          id: String(equipmentId),
        }),
      },
    );

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "Quantity must be a positive integer.",
    });
  });

  it("rejects invalid purchase date", async () => {
    const response = await PATCH(
      patchRequest({
        purchaseDate: "not-a-real-date",
      }),
      {
        params: Promise.resolve({
          id: String(equipmentId),
        }),
      },
    );

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: "Invalid purchase date.",
    });
  });
});
