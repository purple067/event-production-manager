#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/bb9d2c5f8a4fff954fe78709c0d0329a6c65187340a023b7f9c1868c07e9fbe7/contract';
import endContract from '../../snapshots/bb9d2c5f8a4fff954fe78709c0d0329a6c65187340a023b7f9c1868c07e9fbe7/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f8712fe16f7ad11f2c0c03f4502c8ffded28086c184aa32e7fa51ea8022a9c8b/contract';
import startContract from '../../snapshots/f8712fe16f7ad11f2c0c03f4502c8ffded28086c184aa32e7fa51ea8022a9c8b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'budget',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('NPR'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('eventId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('totalBudget', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'budgetItem',
        columns: [
          col('actualCost', 'numeric', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('budgetId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('estimatedCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'eventVendorAssignment',
        columns: [
          col('agreedCost', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('NPR'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('departmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('eventId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quotedCost', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
          col('serviceName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PLANNED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vendorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'milestone',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('crewMemberId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('departmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('endTime', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('eventId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startTime', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('PLANNED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'milestone_status_check_3e310172',
            "\"status\" IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED')",
          ),
          checkExpression(
            'milestone_type_check_4e78db03',
            "\"type\" IN ('LOAD_IN', 'SETUP', 'SOUNDCHECK', 'REHEARSAL', 'SHOW_START', 'SHOW_END', 'LOAD_OUT', 'OTHER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'productionTask',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('crewMemberId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('departmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('dueDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('eventId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('priority', 'text', {
            notNull: true,
            default: lit('MEDIUM'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('TODO'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'productionTask_priority_check_0838e5f0',
            "\"priority\" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
          ),
          checkExpression(
            'productionTask_status_check_a2eef1dc',
            "\"status\" IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'vendor',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactPerson', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('serviceType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'budget',
        constraint: 'budget_eventId_key',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'budgetItem',
        index: 'budgetItem_budgetId_idx_abbf614c',
        columns: ['budgetId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eventVendorAssignment',
        index: 'eventVendorAssignment_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eventVendorAssignment',
        index: 'eventVendorAssignment_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eventVendorAssignment',
        index: 'eventVendorAssignment_vendorId_idx_95bbe6fd',
        columns: ['vendorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'milestone',
        index: 'milestone_crewMemberId_idx_307a1f62',
        columns: ['crewMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'milestone',
        index: 'milestone_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'milestone',
        index: 'milestone_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'productionTask',
        index: 'productionTask_crewMemberId_idx_307a1f62',
        columns: ['crewMemberId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'productionTask',
        index: 'productionTask_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'productionTask',
        index: 'productionTask_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'vendor',
        index: 'vendor_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'budget',
        foreignKey: {
          name: 'budget_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'budgetItem',
        foreignKey: {
          name: 'budgetItem_budgetId_fkey',
          columns: ['budgetId'],
          references: { schema: 'public', table: 'budget', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'eventVendorAssignment',
        foreignKey: {
          name: 'eventVendorAssignment_vendorId_fkey',
          columns: ['vendorId'],
          references: { schema: 'public', table: 'vendor', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'eventVendorAssignment',
        foreignKey: {
          name: 'eventVendorAssignment_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'eventVendorAssignment',
        foreignKey: {
          name: 'eventVendorAssignment_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'milestone',
        foreignKey: {
          name: 'milestone_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'milestone',
        foreignKey: {
          name: 'milestone_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'milestone',
        foreignKey: {
          name: 'milestone_crewMemberId_fkey',
          columns: ['crewMemberId'],
          references: { schema: 'public', table: 'crewMember', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'productionTask',
        foreignKey: {
          name: 'productionTask_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'productionTask',
        foreignKey: {
          name: 'productionTask_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'productionTask',
        foreignKey: {
          name: 'productionTask_crewMemberId_fkey',
          columns: ['crewMemberId'],
          references: { schema: 'public', table: 'crewMember', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'vendor',
        foreignKey: {
          name: 'vendor_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
