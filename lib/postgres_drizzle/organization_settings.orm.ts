import { integer, pgTable, timestamp, varchar, text } from "drizzle-orm/pg-core";

export const OrganizationSettingsPgTable = pgTable('organization_settings', {
  organizationid: integer('organizationid'),
  settingkey: varchar('settingkey', { length: 200 }),
  settingvalue: text('settingvalue'),
  created: timestamp('created', { mode: 'date'}),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(new Date())
});
