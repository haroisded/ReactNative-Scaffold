import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { postgrestError } from '../../lib/errors';
import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { productsKey } from '../products/queries';
import { toSupplierRow } from './schema';
import type { SupplierFormValues } from './schema';

// Stock → Suppliers manages this table (src/screens/stock/), and the product form's picker and the
// receipt wizard read the same list.
//
// Every call ends in throwOnError(), so a failure rejects with a real PostgrestError — see the note in
// merchants/queries.ts.
export const suppliersKey = {
  all: ['suppliers'],
  lists: () => [...suppliersKey.all, 'list'],
  list: (args: { merchantId: string }) => [...suppliersKey.lists(), args],
};

export function useSuppliersQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: suppliersKey.list({ merchantId }),
    queryFn: async () => {
      // Scoping to this system, not security — see the note in categories/queries.ts.
      const { data } = await supabase
        .from('suppliers')
        .select('*, type:supplier_types!suppliers_type_fk(name)')
        .eq('merchant_id', merchantId)
        .order('name')
        .throwOnError();

      return data;
    },
    staleTime: STALE.MINUTES.FIVE,
  });
}

export type Supplier = NonNullable<ReturnType<typeof useSuppliersQuery>['data']>[number];

/** Create when `supplierId` is null, otherwise update that supplier. Resolves to the saved row's id and name. */
export function useSaveSupplierMutation({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ values, supplierId }: { values: SupplierFormValues; supplierId: string | null }) => {
      const row = toSupplierRow(values);
      const { data } = supplierId
        ? await supabase.from('suppliers').update(row).eq('id', supplierId).select('id, name').single().throwOnError()
        : await supabase
            .from('suppliers')
            .insert({ ...row, merchant_id: merchantId })
            .select('id, name')
            .single()
            .throwOnError();

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: suppliersKey.all });
    },
  });
}

/** suppliers_code_unique: a typed code that another supplier of this system already has. */
export function isDuplicateCode(cause: Error | null) {
  const error = postgrestError(cause);
  return error?.code === '23505' && error.message.includes('suppliers_code_unique');
}

export function useSetSupplierActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from('suppliers').update({ active }).eq('id', id).throwOnError();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: suppliersKey.all });
    },
  });
}

/**
 * True when a delete was refused because a receipt still names the supplier: stock_receipts' key to it
 * has no cascade on purpose, so a supplier with receipts can only be deactivated.
 */
export function hasReceipts(cause: Error | null) {
  return postgrestError(cause)?.code === '23503';
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Products do not block it: products_supplier_fk is `on delete set null (supplier_id)`, so every
      // product that had this supplier keeps its row and loses only the supplier. Receipts do (hasReceipts).
      await supabase.from('suppliers').delete().eq('id', id).throwOnError();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: suppliersKey.all }),
        queryClient.invalidateQueries({ queryKey: productsKey.all }),
      ]);
    },
  });
}
