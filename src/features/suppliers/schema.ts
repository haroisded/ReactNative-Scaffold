import * as z from 'zod';

import type { TablesInsert } from '../../lib/database.types';

// The supplier form (src/components/supplier-dialog.tsx). Every field is the text the merchant typed;
// toSupplierRow turns blanks into nulls and the lead time into a number at the mutation boundary, so
// the form never holds a value it did not show. The limits are suppliers_details_length and
// suppliers_contact_person_length (20260928100000_suppliers_extend.sql), reported here before a round trip.

const optional = (max: number, label: string) =>
  z.string().trim().max(max, `${label} can be up to ${max} characters.`);

export const supplierSchema = z.object({
  // Profile
  name: z.string().trim().min(1, 'Enter a name.').max(80, 'Name can be up to 80 characters.'),
  code: optional(20, 'Code'),
  contactPerson: optional(255, 'Contact person'),
  phone: optional(32, 'Phone'),
  email: z.union([z.literal(''), z.email('Enter a valid email address.').max(255)]),
  address: optional(255, 'Address'),
  supplierTypeId: z.string(),
  // Terms
  paymentTerms: optional(60, 'Payment terms'),
  leadTimeDays: z.string().trim().regex(/^\d{0,4}$/, 'Enter a whole number of days.'),
  tin: optional(20, 'TIN'),
  // Extra
  notes: optional(2000, 'Notes'),
  active: z.boolean(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

const orNull = (value: string) => (value === '' ? null : value);

export function toSupplierRow(values: SupplierFormValues) {
  return {
    name: values.name,
    // A blank code is issued by the database: suppliers_assign_code fills '' with the next SUP-####.
    code: values.code,
    contact_person: orNull(values.contactPerson),
    phone: orNull(values.phone),
    email: orNull(values.email),
    address: orNull(values.address),
    supplier_type_id: orNull(values.supplierTypeId),
    payment_terms: orNull(values.paymentTerms),
    lead_time_days: values.leadTimeDays === '' ? null : Number(values.leadTimeDays),
    tin: orNull(values.tin),
    notes: orNull(values.notes),
    active: values.active,
  } satisfies Omit<TablesInsert<'suppliers'>, 'merchant_id'>;
}
