import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

const { GET: getMilestones, POST: createMilestone } =
  await import("../../../app/api/events/[id]/milestones/route");

const {
  GET: getMilestone,
  PATCH: updateMilestone,
  DELETE: deleteMilestone,
} = await import(
  "../../../app/api/events/[id]/milestones/[milestoneId]/route"
);

const { PATCH: operateMilestone } = await import(
  "../../../app/api/events/[id]/milestones/[milestoneId]/operation/route"
);

async function createFixture() {
  const unique = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  const organization = await db.orm.public.Organization.create({
    name: `Vitest Milestone Organization ${unique}`,
    slug: `vitest-milestone-${unique}`,
  });
  organizationId = organization.id;

  const otherOrganization = await db.orm.public.Organization.create({
    name: `Vitest Other Milestone Organization ${unique}`,
    slug: `vitest-other-milestone-${unique}`,
  });
  otherOrganizationId = otherOrganization.id;

  const user = await db.orm.public.User.create({
    authUserId: `vitest-milestone-auth-${unique}`,
    email: `milestone-${unique}@example.com`,
    name: "Vitest Milestone User",
  });
  userId = user.id;

  const otherUser = await db.orm.public.User.create({
    authUserId: `vitest-other-milestone-auth-${unique}`,
    email: `other-milestone-${unique}@example.com`,
    name: "Vitest Other Milestone User",
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
    name: `Vitest Milestone Event ${unique}`,
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
    name: `Vitest Other Milestone Event ${unique}`,
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
    name: `Vitest Milestone Department ${unique}`,
    type: "STAGE",
    eventId,
  });
  departmentId = department.id;

  const otherDepartment =
    await db.orm.public.Department.create({
      name: `Vitest Other Milestone Department ${unique}`,
      type: "STAGE",
      eventId: otherEventId,
    });
  otherDepartmentId = otherDepartment.id;

  const crewMember =
    await db.orm.public.CrewMember.create({
      name: "Primary Milestone Crew Member",
      email: `primary-milestone-${unique}@example.com`,
      organizationId,
      crewType: "FREELANCER",
      status: "ACTIVE",
    });
  crewMemberId = crewMember.id;

  const otherCrewMember =
    await db.orm.public.CrewMember.create({
      name: "Other Organization Milestone Crew Member",
      email: `other-primary-milestone-${unique}@example.com`,
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
  if (eventId) {
    await db.orm.public.Milestone
      .where({ eventId })
      .deleteAll();

    await db.orm.public.Department
      .where({ eventId })
      .deleteAll();

    await db.orm.public.CrewMember
      .where({ id: crewMemberId })
      .delete();

    await db.orm.public.Event
      .where({ id: eventId })
      .delete();
  }

  if (otherEventId) {
    await db.orm.public.Milestone
      .where({ eventId: otherEventId })
      .deleteAll();

    await db.orm.public.Department
      .where({ eventId: otherEventId })
      .deleteAll();

    await db.orm.public.CrewMember
      .where({ id: otherCrewMemberId })
      .delete();

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
}

function jsonRequest(
  url: string,
  method: string,
  body?: Record<string, unknown>,
) {
  return new NextRequest(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });
}

function routeContext(eventIdValue: number) {
  return {
    params: Promise.resolve({
      id: String(eventIdValue),
    }),
  };
}

function milestoneRouteContext(
  eventIdValue: number,
  milestoneIdValue: number,
) {
  return {
    params: Promise.resolve({
      id: String(eventIdValue),
      milestoneId: String(milestoneIdValue),
    }),
  };
}

async function createTestMilestone(
  status:
    | "PLANNED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "SKIPPED"
    | "CANCELLED" = "PLANNED",
) {
  return db.orm.public.Milestone.create({
    title: `Test Milestone ${Date.now()}-${Math.random()}`,
    type: "SETUP",
    status,
    startTime: new Date(
      "2030-01-01T10:00:00.000Z",
    ).toISOString(),
    endTime: new Date(
      "2030-01-01T12:00:00.000Z",
    ).toISOString(),
    notes: "Initial notes",
    eventId,
    departmentId,
    crewMemberId,
  });
}

beforeEach(async () => {
  await createFixture();
});

afterEach(async () => {
  await cleanupFixture();
});

describe("milestone CRUD", () => {
  it("creates milestones as PLANNED", async () => {
    const response = await createMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones`,
        "POST",
        {
          title: "Load In",
          type: "LOAD_IN",
          startTime: "2030-01-01T08:00:00.000Z",
        },
      ),
      routeContext(eventId),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.milestone.status).toBe("PLANNED");

    await db.orm.public.Milestone
      .where({ id: body.milestone.id })
      .delete();
  });

  it.each([
    "IN_PROGRESS",
    "COMPLETED",
    "SKIPPED",
    "CANCELLED",
  ] as const)(
    "rejects creating a milestone directly as %s",
    async (status) => {
      const response = await createMilestone(
        jsonRequest(
          `http://localhost/api/events/${eventId}/milestones`,
          "POST",
          {
            title: "Invalid Lifecycle Milestone",
            type: "SETUP",
            status,
            startTime: "2030-01-01T08:00:00.000Z",
          },
        ),
        routeContext(eventId),
      );

      expect(response.status).toBe(400);
    },
  );

  it("updates normal milestone fields without changing lifecycle", async () => {
    const milestone = await createTestMilestone();

    const response = await updateMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}`,
        "PATCH",
        {
          title: "Updated Setup",
          type: "SOUNDCHECK",
          startTime: "2030-01-01T11:00:00.000Z",
          endTime: "2030-01-01T13:00:00.000Z",
          notes: "Updated notes",
        },
      ),
      milestoneRouteContext(eventId, milestone.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.milestone.title).toBe("Updated Setup");
    expect(body.milestone.type).toBe("SOUNDCHECK");
    expect(body.milestone.status).toBe("PLANNED");
    expect(body.milestone.notes).toBe("Updated notes");
  });

  it("rejects direct lifecycle status mutation through generic PATCH", async () => {
    const milestone = await createTestMilestone();

    const response = await updateMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}`,
        "PATCH",
        {
          status: "COMPLETED",
        },
      ),
      milestoneRouteContext(eventId, milestone.id),
    );

    expect(response.status).toBe(409);

    const persisted = await db.orm.public.Milestone
      .where({ id: milestone.id })
      .first();

    expect(persisted?.status).toBe("PLANNED");
  });

  it("does not expose another organization's milestone", async () => {
    const otherMilestone = await db.orm.public.Milestone.create({
      title: "Other Organization Milestone",
      type: "SETUP",
      status: "PLANNED",
      startTime: "2030-02-01T10:00:00.000Z",
      eventId: otherEventId,
      departmentId: otherDepartmentId,
      crewMemberId: otherCrewMemberId,
    });

    const response = await getMilestone(
      new NextRequest(
        `http://localhost/api/events/${eventId}/milestones/${otherMilestone.id}`,
      ),
      milestoneRouteContext(eventId, otherMilestone.id),
    );

    expect(response.status).toBe(404);
  });

  it("rejects access to an event from another organization", async () => {
    const response = await getMilestones(
      new NextRequest(
        `http://localhost/api/events/${otherEventId}/milestones`,
      ),
      routeContext(otherEventId),
    );

    expect(response.status).toBe(404);
  });
});

describe("milestone lifecycle operations", () => {
  it("starts a planned milestone", async () => {
    const milestone = await createTestMilestone();

    const response = await operateMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
        "PATCH",
        {
          action: "START",
        },
      ),
      milestoneRouteContext(eventId, milestone.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.milestone.status).toBe("IN_PROGRESS");
  });

  it("completes an in-progress milestone", async () => {
    const milestone = await createTestMilestone("IN_PROGRESS");

    const before = Date.now();

    const response = await operateMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
        "PATCH",
        {
          action: "COMPLETE",
        },
      ),
      milestoneRouteContext(eventId, milestone.id),
    );

    const after = Date.now();

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.milestone.status).toBe("COMPLETED");

    const endTime = new Date(
      body.milestone.endTime,
    ).getTime();

    expect(endTime).toBeGreaterThanOrEqual(before);
    expect(endTime).toBeLessThanOrEqual(after);
  });

  it("skips a planned milestone", async () => {
    const milestone = await createTestMilestone();

    const response = await operateMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
        "PATCH",
        {
          action: "SKIP",
        },
      ),
      milestoneRouteContext(eventId, milestone.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.milestone.status).toBe("SKIPPED");
  });

  it("allows only one concurrent START transition", async () => {
    const milestone = await createTestMilestone();

    const request = ():
      ReturnType<typeof jsonRequest> =>
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
        "PATCH",
        {
          action: "START",
        },
      );

    const [first, second] = await Promise.all([
      operateMilestone(
        request(),
        milestoneRouteContext(eventId, milestone.id),
      ),
      operateMilestone(
        request(),
        milestoneRouteContext(eventId, milestone.id),
      ),
    ]);

    expect(
      [first.status, second.status].sort((a, b) => a - b),
    ).toEqual([200, 409]);

    const persisted = await db.orm.public.Milestone
      .where({ id: milestone.id })
      .first();

    expect(persisted?.status).toBe("IN_PROGRESS");
  });

  it("allows only one concurrent COMPLETE transition", async () => {
    const milestone = await createTestMilestone("IN_PROGRESS");

    const request = ():
      ReturnType<typeof jsonRequest> =>
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
        "PATCH",
        {
          action: "COMPLETE",
        },
      );

    const [first, second] = await Promise.all([
      operateMilestone(
        request(),
        milestoneRouteContext(eventId, milestone.id),
      ),
      operateMilestone(
        request(),
        milestoneRouteContext(eventId, milestone.id),
      ),
    ]);

    expect(
      [first.status, second.status].sort((a, b) => a - b),
    ).toEqual([200, 409]);

    const persisted = await db.orm.public.Milestone
      .where({ id: milestone.id })
      .first();

    expect(persisted?.status).toBe("COMPLETED");
    expect(persisted?.endTime).toBeTruthy();
  });

  it("allows only one concurrent SKIP transition", async () => {
    const milestone = await createTestMilestone();

    const request = ():
      ReturnType<typeof jsonRequest> =>
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
        "PATCH",
        {
          action: "SKIP",
        },
      );

    const [first, second] = await Promise.all([
      operateMilestone(
        request(),
        milestoneRouteContext(eventId, milestone.id),
      ),
      operateMilestone(
        request(),
        milestoneRouteContext(eventId, milestone.id),
      ),
    ]);

    expect(
      [first.status, second.status].sort((a, b) => a - b),
    ).toEqual([200, 409]);

    const persisted = await db.orm.public.Milestone
      .where({ id: milestone.id })
      .first();

    expect(persisted?.status).toBe("SKIPPED");
  });

  it.each([
    ["START", "IN_PROGRESS"],
    ["START", "COMPLETED"],
    ["START", "SKIPPED"],
    ["START", "CANCELLED"],
    ["COMPLETE", "PLANNED"],
    ["COMPLETE", "COMPLETED"],
    ["COMPLETE", "SKIPPED"],
    ["COMPLETE", "CANCELLED"],
    ["SKIP", "IN_PROGRESS"],
    ["SKIP", "COMPLETED"],
    ["SKIP", "SKIPPED"],
    ["SKIP", "CANCELLED"],
  ] as const)(
    "rejects %s from %s",
    async (action, status) => {
      const milestone = await createTestMilestone(status);

      const response = await operateMilestone(
        jsonRequest(
          `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
          "PATCH",
          {
            action,
          },
        ),
        milestoneRouteContext(eventId, milestone.id),
      );

      expect(response.status).toBe(409);
    },
  );

  it("rejects an invalid operation", async () => {
    const milestone = await createTestMilestone();

    const response = await operateMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}/operation`,
        "PATCH",
        {
          action: "CANCEL",
        },
      ),
      milestoneRouteContext(eventId, milestone.id),
    );

    expect(response.status).toBe(400);
  });

  it("rejects operating on a milestone from another event", async () => {
    const otherMilestone = await db.orm.public.Milestone.create({
      title: "Other Event Milestone",
      type: "SETUP",
      status: "PLANNED",
      startTime: "2030-02-01T10:00:00.000Z",
      eventId: otherEventId,
      departmentId: otherDepartmentId,
      crewMemberId: otherCrewMemberId,
    });

    const response = await operateMilestone(
      jsonRequest(
        `http://localhost/api/events/${eventId}/milestones/${otherMilestone.id}/operation`,
        "PATCH",
        {
          action: "START",
        },
      ),
      milestoneRouteContext(eventId, otherMilestone.id),
    );

    expect(response.status).toBe(404);
  });
});

describe("milestone deletion", () => {
  it("allows deleting a planned milestone", async () => {
    const milestone = await createTestMilestone();

    const response = await deleteMilestone(
      new NextRequest(
        `http://localhost/api/events/${eventId}/milestones/${milestone.id}`,
        {
          method: "DELETE",
        },
      ),
      milestoneRouteContext(eventId, milestone.id),
    );

    expect(response.status).toBe(200);

    const persisted = await db.orm.public.Milestone
      .where({ id: milestone.id })
      .first();

    expect(persisted).toBeNull();
  });
});
