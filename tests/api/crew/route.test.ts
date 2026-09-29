import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../../src/prisma/db";

let organizationId = 0;
let otherOrganizationId = 0;
let userId = 0;
let otherUserId = 0;
let eventId = 0;
let otherEventId = 0;
let departmentId = 0;
let otherDepartmentId = 0;
let crewMemberId = 0;
let otherCrewMemberId = 0;
let assignmentId = 0;

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

const { GET: getCrewMembers, POST: createCrewMember } =
  await import("../../../app/api/crew/route");

const {
  GET: getCrewMember,
  PATCH: updateCrewMember,
  DELETE: deleteCrewMember,
} = await import("../../../app/api/crew/[id]/route");

const {
  GET: getEventCrew,
  POST: createCrewAssignment,
} = await import("../../../app/api/events/[id]/crew/route");

const {
  GET: getAssignment,
  PATCH: updateAssignment,
  DELETE: deleteAssignment,
} = await import("../../../app/api/events/[id]/crew/[assignmentId]/route");

const {
  PATCH: updateAssignmentLifecycle,
} = await import(
  "../../../app/api/events/[id]/crew-assignments/[assignmentId]/route"
);

async function createFixture() {
  const unique = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  const organization = await db.orm.public.Organization.create({
    name: `Vitest Crew Organization ${unique}`,
    slug: `vitest-crew-${unique}`,
  });

  organizationId = organization.id;

  const otherOrganization = await db.orm.public.Organization.create({
    name: `Vitest Other Crew Organization ${unique}`,
    slug: `vitest-other-crew-${unique}`,
  });

  otherOrganizationId = otherOrganization.id;

  const user = await db.orm.public.User.create({
    authUserId: `vitest-crew-auth-${unique}`,
    email: `crew-${unique}@example.com`,
    name: "Vitest Crew User",
  });

  userId = user.id;

  const otherUser = await db.orm.public.User.create({
    authUserId: `vitest-other-crew-auth-${unique}`,
    email: `other-crew-${unique}@example.com`,
    name: "Vitest Other Crew User",
  });

  otherUserId = otherUser.id;

  await db.orm.public.OrganizationMembership.create({
    userId,
    organizationId,
    role: "OWNER",
    status: "ACTIVE",
  });

  await db.orm.public.OrganizationMembership.create({
    userId: otherUserId,
    organizationId: otherOrganizationId,
    role: "OWNER",
    status: "ACTIVE",
  });

  const event = await db.orm.public.Event.create({
    name: `Vitest Crew Event ${unique}`,
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

  const otherEvent = await db.orm.public.Event.create({
    name: `Vitest Other Crew Event ${unique}`,
    status: "DRAFT",
    startDate: new Date(
      "2030-02-01T00:00:00.000Z",
    ).toISOString(),
    endDate: new Date(
      "2030-02-02T00:00:00.000Z",
    ).toISOString(),
    organizationId: otherOrganizationId,
    createdById: otherUserId,
  });

  otherEventId = otherEvent.id;

  const department = await db.orm.public.Department.create({
    name: `Vitest Crew Department ${unique}`,
    type: "STAGE",
    eventId,
  });

  departmentId = department.id;

  const otherDepartment =
    await db.orm.public.Department.create({
      name: `Vitest Other Crew Department ${unique}`,
      type: "STAGE",
      eventId: otherEventId,
    });

  otherDepartmentId = otherDepartment.id;

  const crewMember =
    await db.orm.public.CrewMember.create({
      name: "Primary Crew Member",
      email: `primary-${unique}@example.com`,
      organizationId,
      crewType: "FREELANCER",
      status: "ACTIVE",
    });

  crewMemberId = crewMember.id;

  const otherCrewMember =
    await db.orm.public.CrewMember.create({
      name: "Other Organization Crew Member",
      email: `other-primary-${unique}@example.com`,
      organizationId: otherOrganizationId,
      crewType: "EMPLOYEE",
      status: "ACTIVE",
    });

  otherCrewMemberId = otherCrewMember.id;

  if (!user.authUserId) {
    throw new Error("Test user is missing authUserId.");
  }

  mockContext.authUser.id = user.authUserId;
  mockContext.authUser.email = user.email;
  mockContext.user.id = userId;
  mockContext.user.email = user.email;
  mockContext.membership.userId = userId;
  mockContext.membership.organizationId = organizationId;
  mockContext.membership.role = "OWNER";
  mockContext.membership.status = "ACTIVE";
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
  if (assignmentId) {
    await db.orm.public.CrewAssignment
      .where({ id: assignmentId })
      .delete();
  }

  if (crewMemberId) {
    await db.orm.public.CrewAssignment
      .where({ crewMemberId })
      .deleteAll();
  }

  if (otherCrewMemberId) {
    await db.orm.public.CrewAssignment
      .where({ crewMemberId: otherCrewMemberId })
      .deleteAll();
  }

  if (eventId) {
    await db.orm.public.CrewAssignment
      .where({ eventId })
      .deleteAll();

    await db.orm.public.Department
      .where({ eventId })
      .deleteAll();

    await db.orm.public.Event
      .where({ id: eventId })
      .delete();
  }

  if (otherEventId) {
    await db.orm.public.CrewAssignment
      .where({ eventId: otherEventId })
      .deleteAll();

    await db.orm.public.Department
      .where({ eventId: otherEventId })
      .deleteAll();

    await db.orm.public.Event
      .where({ id: otherEventId })
      .delete();
  }

  if (crewMemberId) {
    await db.orm.public.CrewMember
      .where({ id: crewMemberId })
      .delete();
  }

  if (otherCrewMemberId) {
    await db.orm.public.CrewMember
      .where({ id: otherCrewMemberId })
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

  if (otherUserId) {
    await db.orm.public.OrganizationMembership
      .where({ userId: otherUserId })
      .delete();

    await db.orm.public.User
      .where({ id: otherUserId })
      .delete();
  }

  if (organizationId) {
    await db.orm.public.Organization
      .where({ id: organizationId })
      .delete();
  }

  if (otherOrganizationId) {
    await db.orm.public.Organization
      .where({ id: otherOrganizationId })
      .delete();
  }

  organizationId = 0;
  otherOrganizationId = 0;
  userId = 0;
  otherUserId = 0;
  eventId = 0;
  otherEventId = 0;
  departmentId = 0;
  otherDepartmentId = 0;
  crewMemberId = 0;
  otherCrewMemberId = 0;
  assignmentId = 0;
}

function jsonRequest(
  url: string,
  method: string,
  body?: Record<string, unknown>,
) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });
}

function routeContext(id: number) {
  return {
    params: Promise.resolve({
      id: String(id),
    }),
  };
}

function assignmentRouteContext(
  eventIdValue: number,
  assignmentIdValue: number,
) {
  return {
    params: Promise.resolve({
      id: String(eventIdValue),
      assignmentId: String(assignmentIdValue),
    }),
  };
}

beforeEach(async () => {
  await createFixture();
});

afterEach(async () => {
  await cleanupFixture();
});

describe("crew member CRUD", () => {
  it("creates a crew member with defaults", async () => {
    const response = await createCrewMember(
      jsonRequest(
        "http://localhost/api/crew",
        "POST",
        {
          name: "New Crew Member",
        },
      ),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.crewMember.name).toBe(
      "New Crew Member",
    );
    expect(body.crewMember.crewType).toBe(
      "FREELANCER",
    );
    expect(body.crewMember.status).toBe("ACTIVE");

    await db.orm.public.CrewMember
      .where({ id: body.crewMember.id })
      .delete();
  });

  it("rejects an invalid crew type", async () => {
    const response = await createCrewMember(
      jsonRequest(
        "http://localhost/api/crew",
        "POST",
        {
          name: "Invalid Crew",
          crewType: "INVALID",
        },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("rejects an invalid crew status", async () => {
    const response = await createCrewMember(
      jsonRequest(
        "http://localhost/api/crew",
        "POST",
        {
          name: "Invalid Crew",
          status: "INVALID",
        },
      ),
    );

    expect(response.status).toBe(400);
  });

  it("does not expose another organization's crew member", async () => {
    mockContext.organization.id =
      otherOrganizationId;
    mockContext.membership.organizationId =
      otherOrganizationId;

    const response = await getCrewMember(
      new Request(
        "http://localhost/api/crew",
      ),
      {
        params: Promise.resolve({
          id: String(crewMemberId),
        }),
      },
    );

    expect(response.status).toBe(404);
  });

  it("updates a crew member within its organization", async () => {
    const response = await updateCrewMember(
      jsonRequest(
        `http://localhost/api/crew/${crewMemberId}`,
        "PATCH",
        {
          name: "Updated Crew",
          status: "ON_LEAVE",
          crewType: "EMPLOYEE",
        },
      ),
      {
        params: Promise.resolve({
          id: String(crewMemberId),
        }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.crewMember.name).toBe(
      "Updated Crew",
    );
    expect(body.crewMember.status).toBe(
      "ON_LEAVE",
    );
    expect(body.crewMember.crewType).toBe(
      "EMPLOYEE",
    );
  });

  it("rejects deleting a crew member referenced by an assignment", async () => {
    const assignment =
      await db.orm.public.CrewAssignment.create({
        crewMemberId,
        eventId,
        assignmentStatus: "PLANNED",
      });

    assignmentId = assignment.id;

    const response = await deleteCrewMember(
      new Request(
        `http://localhost/api/crew/${crewMemberId}`,
        {
          method: "DELETE",
        },
      ),
      {
        params: Promise.resolve({
          id: String(crewMemberId),
        }),
      },
    );

    expect(response.status).toBe(500);

    const existing =
      await db.orm.public.CrewMember
        .where({ id: crewMemberId })
        .first();

    expect(existing).not.toBeNull();
  });
});

describe("event crew assignment create", () => {
  it("creates a planned assignment", async () => {
    const response = await createCrewAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew`,
        "POST",
        {
          crewMemberId,
          departmentId,
          role: "Camera Operator",
          assignmentStatus: "PLANNED",
          callTime:
            "2030-01-01T10:00:00.000Z",
          releaseTime:
            "2030-01-01T18:00:00.000Z",
        },
      ),
      routeContext(eventId),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.assignment.crewMemberId).toBe(
      crewMemberId,
    );
    expect(body.assignment.eventId).toBe(eventId);
    expect(body.assignment.departmentId).toBe(
      departmentId,
    );
    expect(body.assignment.assignmentStatus).toBe(
      "PLANNED",
    );

    assignmentId = body.assignment.id;
  });

  it("creates a confirmed assignment", async () => {
    const response = await createCrewAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew`,
        "POST",
        {
          crewMemberId,
          assignmentStatus: "CONFIRMED",
        },
      ),
      routeContext(eventId),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.assignment.assignmentStatus).toBe(
      "CONFIRMED",
    );

    assignmentId = body.assignment.id;
  });

  it.each([
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ])(
    "rejects creating an assignment directly as %s",
    async (assignmentStatus) => {
      const response =
        await createCrewAssignment(
          jsonRequest(
            `http://localhost/api/events/${eventId}/crew`,
            "POST",
            {
              crewMemberId,
              assignmentStatus,
            },
          ),
          routeContext(eventId),
        );

      expect(response.status).toBe(400);
    },
  );

  it("rejects an assignment for a crew member in another organization", async () => {
    const response =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId: otherCrewMemberId,
          },
        ),
        routeContext(eventId),
      );

    expect(response.status).toBe(404);
  });

  it("rejects a department belonging to another event", async () => {
    const response =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            departmentId: otherDepartmentId,
          },
        ),
        routeContext(eventId),
      );

    expect(response.status).toBe(404);
  });

  it("rejects an invalid call time", async () => {
    const response =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            callTime: "not-a-date",
          },
        ),
        routeContext(eventId),
      );

    expect(response.status).toBe(400);
  });

  it("rejects release time before call time", async () => {
    const response =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            callTime:
              "2030-01-01T18:00:00.000Z",
            releaseTime:
              "2030-01-01T10:00:00.000Z",
          },
        ),
        routeContext(eventId),
      );

    expect(response.status).toBe(400);
  });

  it("allows adjacent assignments", async () => {
    const first =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            callTime:
              "2030-01-01T10:00:00.000Z",
            releaseTime:
              "2030-01-01T18:00:00.000Z",
          },
        ),
        routeContext(eventId),
      );

    expect(first.status).toBe(201);

    const firstBody = await first.json();
    assignmentId = firstBody.assignment.id;

    const second =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            callTime:
              "2030-01-01T18:00:00.000Z",
            releaseTime:
              "2030-01-01T22:00:00.000Z",
          },
        ),
        routeContext(eventId),
      );

    expect(second.status).toBe(201);

    const secondBody = await second.json();

    await db.orm.public.CrewAssignment
      .where({ id: secondBody.assignment.id })
      .delete();
  });

  it("rejects overlapping active assignments", async () => {
    const first =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            callTime:
              "2030-01-01T10:00:00.000Z",
            releaseTime:
              "2030-01-01T18:00:00.000Z",
          },
        ),
        routeContext(eventId),
      );

    expect(first.status).toBe(201);

    const firstBody = await first.json();
    assignmentId = firstBody.assignment.id;

    const second =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            callTime:
              "2030-01-01T17:00:00.000Z",
            releaseTime:
              "2030-01-01T19:00:00.000Z",
          },
        ),
        routeContext(eventId),
      );

    expect(second.status).toBe(409);
  });

  it("allows an overlap when the existing assignment is terminal", async () => {
    const existing =
      await db.orm.public.CrewAssignment.create({
        crewMemberId,
        eventId,
        assignmentStatus: "COMPLETED",
        callTime:
          "2030-01-01T10:00:00.000Z",
        releaseTime:
          "2030-01-01T18:00:00.000Z",
      });

    const response =
      await createCrewAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew`,
          "POST",
          {
            crewMemberId,
            callTime:
              "2030-01-01T17:00:00.000Z",
            releaseTime:
              "2030-01-01T19:00:00.000Z",
          },
        ),
        routeContext(eventId),
      );

    expect(response.status).toBe(201);

    const body = await response.json();

    await db.orm.public.CrewAssignment
      .where({ id: body.assignment.id })
      .delete();

    await db.orm.public.CrewAssignment
      .where({ id: existing.id })
      .delete();
  });

  it("does not expose another organization's event", async () => {
    mockContext.organization.id =
      otherOrganizationId;
    mockContext.membership.organizationId =
      otherOrganizationId;

    const response = await getEventCrew(
      new Request(
        `http://localhost/api/events/${eventId}/crew`,
      ),
      routeContext(eventId),
    );

    expect(response.status).toBe(404);
  });
});

describe("event crew assignment CRUD", () => {
  async function createAssignment(
    status:
      | "PLANNED"
      | "CONFIRMED"
      | "CHECKED_IN"
      | "COMPLETED"
      | "CANCELLED"
      | "NO_SHOW" = "CONFIRMED",
    overrides: {
      crewMemberId?: number;
      departmentId?: number | null;
      callTime?: string | null;
      releaseTime?: string | null;
    } = {},
  ) {
    const assignment =
      await db.orm.public.CrewAssignment.create({
        crewMemberId:
          overrides.crewMemberId ?? crewMemberId,
        eventId,
        departmentId:
          overrides.departmentId ?? null,
        assignmentStatus: status,
        callTime:
          overrides.callTime ?? null,
        releaseTime:
          overrides.releaseTime ?? null,
      });

    assignmentId = assignment.id;
    return assignment;
  }

  it("updates the crew member within the organization", async () => {
    await createAssignment();

    const secondCrewMember =
      await db.orm.public.CrewMember.create({
        name: "Second Crew Member",
        organizationId,
      });

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        "PATCH",
        {
          crewMemberId: secondCrewMember.id,
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.crewMemberId).toBe(
      secondCrewMember.id,
    );

    await db.orm.public.CrewAssignment
      .where({ crewMemberId: secondCrewMember.id })
      .delete();

    await db.orm.public.CrewMember
      .where({ id: secondCrewMember.id })
      .delete();
  });

  it("rejects updating to a crew member from another organization", async () => {
    await createAssignment();

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        "PATCH",
        {
          crewMemberId: otherCrewMemberId,
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(404);

    const existing =
      await db.orm.public.CrewAssignment
        .where({ id: assignmentId })
        .first();

    expect(existing?.crewMemberId).toBe(
      crewMemberId,
    );
  });

  it("updates the department within the event", async () => {
    await createAssignment();

    const department =
      await db.orm.public.Department.create({
        name: "PATCH Department",
        type: "STAGE",
        eventId,
      });

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        "PATCH",
        {
          departmentId: department.id,
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.departmentId).toBe(
      department.id,
    );

  });

  it("rejects updating to a department from another event", async () => {
    await createAssignment();

    const otherDepartment =
      await db.orm.public.Department.create({
        name: "Other Event Department",
        type: "STAGE",
        eventId: otherEventId,
      });

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        "PATCH",
        {
          departmentId: otherDepartment.id,
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(404);

    const existing =
      await db.orm.public.CrewAssignment
        .where({ id: assignmentId })
        .first();

    expect(existing?.departmentId).toBeNull();

    await db.orm.public.Department
      .where({ id: otherDepartment.id })
      .delete();
  });

  it("updates call and release times", async () => {
    await createAssignment();

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        "PATCH",
        {
          callTime:
            "2030-01-01T10:00:00.000Z",
          releaseTime:
            "2030-01-01T18:00:00.000Z",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(
      new Date(body.assignment.callTime).toISOString(),
    ).toBe("2030-01-01T10:00:00.000Z");
    expect(
      new Date(body.assignment.releaseTime).toISOString(),
    ).toBe("2030-01-01T18:00:00.000Z");
  });

  it.each([
    {
      callTime: "not-a-date",
      releaseTime: "2030-01-01T18:00:00.000Z",
    },
    {
      callTime: "2030-01-01T18:00:00.000Z",
      releaseTime: "2030-01-01T10:00:00.000Z",
    },
  ])(
    "rejects invalid or reversed assignment times",
    async ({ callTime, releaseTime }) => {
      await createAssignment();

      const response = await updateAssignment(
        jsonRequest(
          `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
          "PATCH",
          {
            callTime,
            releaseTime,
          },
        ),
        assignmentRouteContext(
          eventId,
          assignmentId,
        ),
      );

      expect(response.status).toBe(400);
    },
  );

  it("rejects PATCH when the resulting assignment overlaps an active assignment", async () => {
    await createAssignment(
      "CONFIRMED",
      {
        callTime:
          "2030-01-01T10:00:00.000Z",
        releaseTime:
          "2030-01-01T18:00:00.000Z",
      },
    );

    const secondCrewMember =
      await db.orm.public.CrewMember.create({
        name: "Overlap Crew Member",
        organizationId,
      });

    const second =
      await db.orm.public.CrewAssignment.create({
        crewMemberId: secondCrewMember.id,
        eventId,
        assignmentStatus: "CONFIRMED",
        callTime:
          "2030-01-01T19:00:00.000Z",
        releaseTime:
          "2030-01-01T20:00:00.000Z",
      });

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${second.id}`,
        "PATCH",
        {
          crewMemberId,
          callTime:
            "2030-01-01T17:00:00.000Z",
          releaseTime:
            "2030-01-01T19:30:00.000Z",
        },
      ),
      assignmentRouteContext(
        eventId,
        second.id,
      ),
    );

    expect(response.status).toBe(409);

    const existing =
      await db.orm.public.CrewAssignment
        .where({ id: second.id })
        .first();

    expect(existing?.crewMemberId).toBe(
      secondCrewMember.id,
    );
    expect(
      existing?.callTime
        ? new Date(existing.callTime).toISOString()
        : null,
    ).toBe("2030-01-01T19:00:00.000Z");
    expect(
      existing?.releaseTime
        ? new Date(existing.releaseTime).toISOString()
        : null,
    ).toBe("2030-01-01T20:00:00.000Z");

    await db.orm.public.CrewAssignment
      .where({ id: second.id })
      .delete();

    await db.orm.public.CrewAssignment
      .where({ id: assignmentId })
      .delete();

    await db.orm.public.CrewMember
      .where({ id: secondCrewMember.id })
      .delete();
  });

  it("allows PATCH when the resulting assignment is adjacent to another active assignment", async () => {
    await createAssignment(
      "CONFIRMED",
      {
        callTime:
          "2030-01-01T10:00:00.000Z",
        releaseTime:
          "2030-01-01T18:00:00.000Z",
      },
    );

    const secondCrewMember =
      await db.orm.public.CrewMember.create({
        name: "Adjacent Crew Member",
        organizationId,
      });

    const second =
      await db.orm.public.CrewAssignment.create({
        crewMemberId: secondCrewMember.id,
        eventId,
        assignmentStatus: "CONFIRMED",
      });

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${second.id}`,
        "PATCH",
        {
          crewMemberId,
          callTime:
            "2030-01-01T18:00:00.000Z",
          releaseTime:
            "2030-01-01T22:00:00.000Z",
        },
      ),
      assignmentRouteContext(
        eventId,
        second.id,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.crewMemberId).toBe(
      crewMemberId,
    );
    expect(
      new Date(body.assignment.callTime).toISOString(),
    ).toBe("2030-01-01T18:00:00.000Z");
    expect(
      new Date(body.assignment.releaseTime).toISOString(),
    ).toBe("2030-01-01T22:00:00.000Z");

    await db.orm.public.CrewAssignment
      .where({ id: second.id })
      .delete();

    await db.orm.public.CrewMember
      .where({ id: secondCrewMember.id })
      .delete();
  });

  it("gets an assignment within its event", async () => {
    await createAssignment();

    const response = await getAssignment(
      new Request(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.id).toBe(assignmentId);
  });

  it("does not expose an assignment from another event", async () => {
    const assignment =
      await db.orm.public.CrewAssignment.create({
        crewMemberId,
        eventId: otherEventId,
        assignmentStatus: "CONFIRMED",
      });

    assignmentId = assignment.id;

    const response = await getAssignment(
      new Request(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(404);
  });

  it("allows PLANNED to CONFIRMED through the lifecycle endpoint", async () => {
    await createAssignment("PLANNED");

    const response = await updateAssignmentLifecycle(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew-assignments/${assignmentId}`,
        "PATCH",
        {
          status: "CONFIRMED",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.assignmentStatus).toBe(
      "CONFIRMED",
    );
  });

  it("rejects PLANNED to CHECKED_IN through the lifecycle endpoint", async () => {
    await createAssignment("PLANNED");

    const response = await updateAssignmentLifecycle(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew-assignments/${assignmentId}`,
        "PATCH",
        {
          status: "CHECKED_IN",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(409);
  });

  it("allows CONFIRMED to CHECKED_IN and sets callTime", async () => {
    await createAssignment("CONFIRMED");

    const response = await updateAssignmentLifecycle(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew-assignments/${assignmentId}`,
        "PATCH",
        {
          status: "CHECKED_IN",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.assignmentStatus).toBe(
      "CHECKED_IN",
    );
    expect(body.assignment.callTime).not.toBeNull();
    expect(body.assignment.releaseTime).toBeNull();

    const persisted = await db.orm.public.CrewAssignment
      .where({ id: assignmentId })
      .first();

    expect(persisted?.assignmentStatus).toBe(
      "CHECKED_IN",
    );
    expect(persisted?.callTime).not.toBeNull();
    expect(persisted?.releaseTime).toBeNull();
  });

  it("allows CHECKED_IN to COMPLETED and sets releaseTime", async () => {
    await createAssignment("CHECKED_IN");

    const response = await updateAssignmentLifecycle(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew-assignments/${assignmentId}`,
        "PATCH",
        {
          status: "COMPLETED",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.assignment.assignmentStatus).toBe(
      "COMPLETED",
    );
    expect(body.assignment.releaseTime).not.toBeNull();

    const persisted = await db.orm.public.CrewAssignment
      .where({ id: assignmentId })
      .first();

    expect(persisted?.assignmentStatus).toBe(
      "COMPLETED",
    );
    expect(persisted?.releaseTime).not.toBeNull();
  });

  it.each([
    ["COMPLETED", "CONFIRMED"],
    ["CANCELLED", "CONFIRMED"],
    ["NO_SHOW", "CONFIRMED"],
  ] as const)(
    "rejects lifecycle transition %s to %s",
    async (from, to) => {
      await createAssignment(from);

      const response =
        await updateAssignmentLifecycle(
          jsonRequest(
            `http://localhost/api/events/${eventId}/crew-assignments/${assignmentId}`,
            "PATCH",
            {
              status: to,
            },
          ),
          assignmentRouteContext(
            eventId,
            assignmentId,
          ),
        );

      expect(response.status).toBe(409);
    },
  );

  it("rejects lifecycle status changes through generic assignment PATCH", async () => {
    await createAssignment("CONFIRMED");

    const response = await updateAssignment(
      jsonRequest(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        "PATCH",
        {
          assignmentStatus: "CHECKED_IN",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(409);

    const persisted = await db.orm.public.CrewAssignment
      .where({ id: assignmentId })
      .first();

    expect(persisted?.assignmentStatus).toBe(
      "CONFIRMED",
    );
    expect(persisted?.callTime).toBeNull();
    expect(persisted?.releaseTime).toBeNull();
  });

  it("does not expose an assignment from another organization", async () => {
    const assignment =
      await db.orm.public.CrewAssignment.create({
        crewMemberId: otherCrewMemberId,
        eventId: otherEventId,
        assignmentStatus: "CONFIRMED",
      });

    assignmentId = assignment.id;

    const response = await getAssignment(
      new Request(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(404);
  });

  it("rejects deleting a checked-in assignment", async () => {
    await createAssignment("CHECKED_IN");

    const response = await deleteAssignment(
      new Request(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        {
          method: "DELETE",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(409);

    const existing =
      await db.orm.public.CrewAssignment
        .where({ id: assignmentId })
        .first();

    expect(existing).not.toBeNull();
  });

  it("rejects deleting a completed assignment", async () => {
    await createAssignment("COMPLETED");

    const response = await deleteAssignment(
      new Request(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        {
          method: "DELETE",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(409);
  });

  it("deletes a planned assignment", async () => {
    await createAssignment("PLANNED");

    const response = await deleteAssignment(
      new Request(
        `http://localhost/api/events/${eventId}/crew/${assignmentId}`,
        {
          method: "DELETE",
        },
      ),
      assignmentRouteContext(
        eventId,
        assignmentId,
      ),
    );

    expect(response.status).toBe(200);

    const existing =
      await db.orm.public.CrewAssignment
        .where({ id: assignmentId })
        .first();

    expect(existing).toBeNull();

    assignmentId = 0;
  });
});
