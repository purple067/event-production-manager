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

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";

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

const { GET: getTasks, POST: createTask } =
  await import("../../../app/api/events/[id]/tasks/route");

const {
  GET: getTask,
  PATCH: updateTask,
  DELETE: deleteTask,
} = await import("../../../app/api/events/[id]/tasks/[taskId]/route");

const { PATCH: operateTask } =
  await import("../../../app/api/events/[id]/tasks/[taskId]/operation/route");

async function createFixture() {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const organization = await db.orm.public.Organization.create({
    name: `Vitest Task Organization ${unique}`,
    slug: `vitest-task-${unique}`,
  });

  organizationId = organization.id;

  const otherOrganization = await db.orm.public.Organization.create({
    name: `Vitest Other Task Organization ${unique}`,
    slug: `vitest-other-task-${unique}`,
  });

  otherOrganizationId = otherOrganization.id;

  const user = await db.orm.public.User.create({
    authUserId: `vitest-task-auth-${unique}`,
    email: `task-${unique}@example.com`,
    name: "Vitest Task User",
  });

  userId = user.id;

  const otherUser = await db.orm.public.User.create({
    authUserId: `vitest-other-task-auth-${unique}`,
    email: `other-task-${unique}@example.com`,
    name: "Vitest Other Task User",
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
    name: `Vitest Task Event ${unique}`,
    status: "DRAFT",
    startDate: new Date("2030-01-01T00:00:00.000Z").toISOString(),
    endDate: new Date("2030-01-02T00:00:00.000Z").toISOString(),
    organizationId,
    createdById: userId,
  });

  eventId = event.id;

  const otherEvent = await db.orm.public.Event.create({
    name: `Vitest Other Task Event ${unique}`,
    status: "DRAFT",
    startDate: new Date("2030-02-01T00:00:00.000Z").toISOString(),
    endDate: new Date("2030-02-02T00:00:00.000Z").toISOString(),
    organizationId: otherOrganizationId,
    createdById: otherUserId,
  });

  otherEventId = otherEvent.id;

  const department = await db.orm.public.Department.create({
    name: `Vitest Task Department ${unique}`,
    type: "STAGE",
    eventId,
  });

  departmentId = department.id;

  const otherDepartment = await db.orm.public.Department.create({
    name: `Vitest Other Task Department ${unique}`,
    type: "STAGE",
    eventId: otherEventId,
  });

  otherDepartmentId = otherDepartment.id;

  const crewMember = await db.orm.public.CrewMember.create({
    name: "Primary Task Crew Member",
    email: `primary-task-${unique}@example.com`,
    organizationId,
    crewType: "FREELANCER",
    status: "ACTIVE",
  });

  crewMemberId = crewMember.id;

  const otherCrewMember = await db.orm.public.CrewMember.create({
    name: "Other Organization Task Crew Member",
    email: `other-primary-task-${unique}@example.com`,
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
    await db.orm.public.ProductionTask.where({ eventId }).deleteAll();

    await db.orm.public.Department.where({ eventId }).deleteAll();

    await db.orm.public.CrewMember.where({ id: crewMemberId }).delete();

    await db.orm.public.Event.where({ id: eventId }).delete();
  }

  if (otherEventId) {
    await db.orm.public.ProductionTask.where({
      eventId: otherEventId,
    }).deleteAll();

    await db.orm.public.Department.where({ eventId: otherEventId }).deleteAll();

    await db.orm.public.CrewMember.where({ id: otherCrewMemberId }).delete();

    await db.orm.public.Event.where({ id: otherEventId }).delete();
  }

  if (crewMemberId) {
    await db.orm.public.CrewMember.where({ id: crewMemberId }).delete();
  }

  if (otherCrewMemberId) {
    await db.orm.public.CrewMember.where({ id: otherCrewMemberId }).delete();
  }

  if (userId) {
    await db.orm.public.OrganizationMembership.where({ userId }).delete();

    await db.orm.public.User.where({ id: userId }).delete();
  }

  if (otherUserId) {
    await db.orm.public.OrganizationMembership.where({
      userId: otherUserId,
    }).delete();

    await db.orm.public.User.where({ id: otherUserId }).delete();
  }

  if (organizationId) {
    await db.orm.public.Organization.where({ id: organizationId }).delete();
  }

  if (otherOrganizationId) {
    await db.orm.public.Organization.where({
      id: otherOrganizationId,
    }).delete();
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
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function routeContext(eventIdValue: number) {
  return {
    params: Promise.resolve({
      id: String(eventIdValue),
    }),
  };
}

function taskRouteContext(eventIdValue: number, taskIdValue: number) {
  return {
    params: Promise.resolve({
      id: String(eventIdValue),
      taskId: String(taskIdValue),
    }),
  };
}

async function createTestTask(status: TaskStatus = "TODO") {
  return db.orm.public.ProductionTask.create({
    title: `Test Task ${Date.now()}-${Math.random()}`,
    description: "Initial task description",
    status,
    priority: "MEDIUM",
    dueDate: new Date("2030-01-01T12:00:00.000Z").toISOString(),
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

describe("task CRUD", () => {
  it("creates a task as TODO by default", async () => {
    const response = await createTask(
      jsonRequest(`http://localhost/api/events/${eventId}/tasks`, "POST", {
        title: "Build stage",
        priority: "HIGH",
      }),
      routeContext(eventId),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.task.status).toBe("TODO");
  });

  it("accepts explicit TODO status", async () => {
    const response = await createTask(
      jsonRequest(`http://localhost/api/events/${eventId}/tasks`, "POST", {
        title: "Prepare cables",
        status: "TODO",
      }),
      routeContext(eventId),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body.task.status).toBe("TODO");
  });

  it.each(["IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const)(
    "rejects creating a task directly as %s",
    async (status) => {
      const response = await createTask(
        jsonRequest(`http://localhost/api/events/${eventId}/tasks`, "POST", {
          title: "Invalid lifecycle task",
          status,
        }),
        routeContext(eventId),
      );

      expect(response.status).toBe(400);
    },
  );

  it("updates normal task fields without changing lifecycle", async () => {
    const task = await createTestTask();

    const response = await updateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}`,
        "PATCH",
        {
          title: "Updated task",
          description: "Updated description",
          priority: "HIGH",
          dueDate: "2030-01-01T14:00:00.000Z",
          notes: "Updated notes",
        },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.title).toBe("Updated task");
    expect(body.task.priority).toBe("HIGH");
    expect(body.task.status).toBe("TODO");
  });

  it("rejects lifecycle mutation through generic PATCH", async () => {
    const task = await createTestTask();

    const response = await updateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}`,
        "PATCH",
        {
          status: "DONE",
        },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(409);

    const persisted = await db.orm.public.ProductionTask.where({
      id: task.id,
    }).first();

    expect(persisted?.status).toBe("TODO");
  });

  it("gets tasks for the event", async () => {
    const task = await createTestTask();

    const response = await getTasks(
      new NextRequest(`http://localhost/api/events/${eventId}/tasks`),
      routeContext(eventId),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.tasks.some((item: { id: number }) => item.id === task.id)).toBe(
      true,
    );
  });

  it("gets a single task", async () => {
    const task = await createTestTask();

    const response = await getTask(
      new NextRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}`,
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.id).toBe(task.id);
    expect(body.task.status).toBe("TODO");
  });

  it("does not expose another organization's task", async () => {
    const otherTask = await db.orm.public.ProductionTask.create({
      title: "Other Organization Task",
      status: "TODO",
      priority: "MEDIUM",
      eventId: otherEventId,
      departmentId: otherDepartmentId,
      crewMemberId: otherCrewMemberId,
    });

    const response = await getTask(
      new NextRequest(
        `http://localhost/api/events/${eventId}/tasks/${otherTask.id}`,
      ),
      taskRouteContext(eventId, otherTask.id),
    );

    expect(response.status).toBe(404);
  });
});

describe("task lifecycle", () => {
  it("TODO -> IN_PROGRESS with START", async () => {
    const task = await createTestTask();

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "START" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("IN_PROGRESS");
  });

  it("TODO -> BLOCKED with BLOCK", async () => {
    const task = await createTestTask();

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "BLOCK" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("BLOCKED");
  });

  it("TODO -> CANCELLED with CANCEL", async () => {
    const task = await createTestTask();

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "CANCEL" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("CANCELLED");
  });

  it("IN_PROGRESS -> BLOCKED with BLOCK", async () => {
    const task = await createTestTask("IN_PROGRESS");

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "BLOCK" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("BLOCKED");
  });

  it("IN_PROGRESS -> DONE with COMPLETE", async () => {
    const task = await createTestTask("IN_PROGRESS");

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "COMPLETE" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("DONE");
  });

  it("IN_PROGRESS -> CANCELLED with CANCEL", async () => {
    const task = await createTestTask("IN_PROGRESS");

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "CANCEL" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("CANCELLED");
  });

  it("BLOCKED -> IN_PROGRESS with RESUME", async () => {
    const task = await createTestTask("BLOCKED");

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "RESUME" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("IN_PROGRESS");
  });

  it("BLOCKED -> CANCELLED with CANCEL", async () => {
    const task = await createTestTask("BLOCKED");

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "CANCEL" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.task.status).toBe("CANCELLED");
  });

  it("rejects DONE as a terminal state", async () => {
    const task = await createTestTask("DONE");

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "START" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(409);
  });

  it("rejects CANCELLED as a terminal state", async () => {
    const task = await createTestTask("CANCELLED");

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "START" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(409);
  });

  it.each([
    ["RESUME", "TODO"],
    ["RESUME", "DONE"],
    ["RESUME", "CANCELLED"],
    ["COMPLETE", "TODO"],
    ["COMPLETE", "BLOCKED"],
    ["COMPLETE", "DONE"],
    ["COMPLETE", "CANCELLED"],
  ] as const)("rejects %s from %s", async (action, status) => {
    const task = await createTestTask(status);

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(409);
  });

  it("rejects an invalid operation", async () => {
    const task = await createTestTask();

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "INVALID" },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(400);
  });

  it("does not operate another organization's task", async () => {
    const otherTask = await db.orm.public.ProductionTask.create({
      title: "Other Organization Task",
      status: "TODO",
      priority: "MEDIUM",
      eventId: otherEventId,
      departmentId: otherDepartmentId,
      crewMemberId: otherCrewMemberId,
    });

    const response = await operateTask(
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${otherTask.id}/operation`,
        "PATCH",
        { action: "START" },
      ),
      taskRouteContext(eventId, otherTask.id),
    );

    expect(response.status).toBe(404);
  });

  it("allows only one concurrent START transition", async () => {
    const task = await createTestTask();

    const request = () =>
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "START" },
      );

    const [first, second] = await Promise.all([
      operateTask(request(), taskRouteContext(eventId, task.id)),
      operateTask(request(), taskRouteContext(eventId, task.id)),
    ]);

    expect([first.status, second.status].sort((a, b) => a - b)).toEqual([
      200, 409,
    ]);

    const persisted = await db.orm.public.ProductionTask.where({
      id: task.id,
    }).first();

    expect(persisted?.status).toBe("IN_PROGRESS");
  });

  it("allows only one concurrent COMPLETE transition", async () => {
    const task = await createTestTask("IN_PROGRESS");

    const request = () =>
      jsonRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}/operation`,
        "PATCH",
        { action: "COMPLETE" },
      );

    const [first, second] = await Promise.all([
      operateTask(request(), taskRouteContext(eventId, task.id)),
      operateTask(request(), taskRouteContext(eventId, task.id)),
    ]);

    expect([first.status, second.status].sort((a, b) => a - b)).toEqual([
      200, 409,
    ]);

    const persisted = await db.orm.public.ProductionTask.where({
      id: task.id,
    }).first();

    expect(persisted?.status).toBe("DONE");
  });
});

describe("task deletion", () => {
  it("deletes a task", async () => {
    const task = await createTestTask();

    const response = await deleteTask(
      new NextRequest(
        `http://localhost/api/events/${eventId}/tasks/${task.id}`,
        {
          method: "DELETE",
        },
      ),
      taskRouteContext(eventId, task.id),
    );

    expect(response.status).toBe(200);

    const persisted = await db.orm.public.ProductionTask.where({
      id: task.id,
    }).first();

    expect(persisted).toBeNull();
  });
});
