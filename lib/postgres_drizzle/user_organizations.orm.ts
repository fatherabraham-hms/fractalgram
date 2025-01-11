import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import { ApplicationRolesPgTable } from "@/lib/postgres_drizzle/application_roles.orm";
import { OrganizationsPgTable } from "@/lib/postgres_drizzle/organizations.orm";

export const UserOrganizationsPgTable = pgTable('user_organizations', {
  userid: integer('userid'),
  organizationid: integer('organizationid').references(() => OrganizationsPgTable.id),
  userrole: integer('userrole').references(() => ApplicationRolesPgTable.id),
  created: timestamp('created', { mode: 'date'}),
  updated: timestamp('updated', { mode: 'date' }).notNull().default(new Date())
});
