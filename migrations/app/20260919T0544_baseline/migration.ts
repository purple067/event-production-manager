#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/f8712fe16f7ad11f2c0c03f4502c8ffded28086c184aa32e7fa51ea8022a9c8b/contract';
import endContract from '../../snapshots/f8712fe16f7ad11f2c0c03f4502c8ffded28086c184aa32e7fa51ea8022a9c8b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'client',
        columns: [
          col('company', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'crewAssignment',
        columns: [
          col('assignmentStatus', 'text', {
            notNull: true,
            default: lit('PLANNED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('callTime', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('crewMemberId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('departmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('eventId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('rate', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('rateUnit', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('releaseTime', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('role', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'crewAssignment_assignmentStatus_check_8d18568e',
            "\"assignmentStatus\" IN ('PLANNED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'crewMember',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('crewType', 'text', {
            notNull: true,
            default: lit('FREELANCER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('designation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('skills', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'crewMember_crewType_check_defef05d',
            "\"crewType\" IN ('EMPLOYEE', 'FREELANCER', 'CONTRACTOR', 'INTERN')",
          ),
          checkExpression(
            'crewMember_status_check_2ace4085',
            "\"status\" IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'department',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('eventId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'department_type_check_cab3566b',
            "\"type\" IN ('AUDIO', 'LIGHTING', 'VIDEO', 'STAGE', 'POWER', 'RIGGING', 'STREAMING', 'SPECIAL_EFFECTS', 'SECURITY', 'TRANSPORT', 'OTHER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'equipment',
        columns: [
          col('assetNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('categoryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('condition', 'text', {
            notNull: true,
            default: lit('GOOD'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('manufacturer', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('model', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ownership', 'text', {
            notNull: true,
            default: lit('OWNED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('purchaseCost', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('purchaseDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('serialNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('AVAILABLE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'equipment_condition_check_1c70822e',
            "\"condition\" IN ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'NON_FUNCTIONAL')",
          ),
          checkExpression(
            'equipment_ownership_check_06a86497',
            "\"ownership\" IN ('OWNED', 'RENTED', 'LEASED', 'CLIENT_PROVIDED', 'VENDOR_PROVIDED')",
          ),
          checkExpression(
            'equipment_status_check_2338d6dd',
            "\"status\" IN ('AVAILABLE', 'IN_USE', 'RESERVED', 'MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'equipmentAssignment',
        columns: [
          col('allocatedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('equipmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('eventId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('returnedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PLANNED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'equipmentAssignment_status_check_e5a4999c',
            "\"status\" IN ('PLANNED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'equipmentCategory',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'event',
        columns: [
          col('clientId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('startDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('venueId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'event_status_check_34a01527',
            "\"status\" IN ('DRAFT', 'PLANNING', 'PRE_PRODUCTION', 'READY', 'LIVE', 'COMPLETED', 'ARCHIVED', 'ON_HOLD', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'organization',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'organizationMembership',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('joinedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('CREW'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['userId', 'organizationId']),
          checkExpression(
            'organizationMembership_role_check_cf1e7a6e',
            "\"role\" IN ('OWNER', 'ADMIN', 'PRODUCER', 'PRODUCTION_MANAGER', 'DEPARTMENT_HEAD', 'CREW', 'VIEWER')",
          ),
          checkExpression(
            'organizationMembership_status_check_8145c889',
            "\"status\" IN ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('authUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'venue',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('capacity', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'equipmentCategory',
        constraint: 'equipmentCategory_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'organization',
        constraint: 'organization_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_authUserId_key',
        columns: ['authUserId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_username_key',
        columns: ['username'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'client',
        index: 'client_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'crewAssignment',
        index: 'crewAssignment_crewMemberId_idx_307a1f62',
        columns: ['crewMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'crewAssignment',
        index: 'crewAssignment_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'crewAssignment',
        index: 'crewAssignment_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'crewMember',
        index: 'crewMember_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'department',
        index: 'department_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'equipment',
        index: 'equipment_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'equipment',
        index: 'equipment_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'equipmentAssignment',
        index: 'equipmentAssignment_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'equipmentAssignment',
        index: 'equipmentAssignment_equipmentId_idx_e1548594',
        columns: ['equipmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'equipmentAssignment',
        index: 'equipmentAssignment_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'equipmentCategory',
        index: 'equipmentCategory_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_venueId_idx_b49e8dab',
        columns: ['venueId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationMembership',
        index: 'organizationMembership_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'organizationMembership',
        index: 'organizationMembership_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'venue',
        index: 'venue_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'client',
        foreignKey: {
          name: 'client_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crewAssignment',
        foreignKey: {
          name: 'crewAssignment_crewMemberId_fkey',
          columns: ['crewMemberId'],
          references: { schema: 'public', table: 'crewMember', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crewAssignment',
        foreignKey: {
          name: 'crewAssignment_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crewAssignment',
        foreignKey: {
          name: 'crewAssignment_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crewMember',
        foreignKey: {
          name: 'crewMember_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'department',
        foreignKey: {
          name: 'department_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'equipment',
        foreignKey: {
          name: 'equipment_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'equipment',
        foreignKey: {
          name: 'equipment_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'equipmentCategory', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'equipmentAssignment',
        foreignKey: {
          name: 'equipmentAssignment_equipmentId_fkey',
          columns: ['equipmentId'],
          references: { schema: 'public', table: 'equipment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'equipmentAssignment',
        foreignKey: {
          name: 'equipmentAssignment_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'equipmentAssignment',
        foreignKey: {
          name: 'equipmentAssignment_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'equipmentCategory',
        foreignKey: {
          name: 'equipmentCategory_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'event',
        foreignKey: {
          name: 'event_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'event',
        foreignKey: {
          name: 'event_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'client', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'event',
        foreignKey: {
          name: 'event_venueId_fkey',
          columns: ['venueId'],
          references: { schema: 'public', table: 'venue', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'event',
        foreignKey: {
          name: 'event_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationMembership',
        foreignKey: {
          name: 'organizationMembership_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'organizationMembership',
        foreignKey: {
          name: 'organizationMembership_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'venue',
        foreignKey: {
          name: 'venue_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
