import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { postgrestError } from '../../lib/errors';
import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { suppliersKey } from '../suppliers/queries';

// The per-merchant lookup behind the supplier form's Type field. Managed inline from that form, so it
// has no screen of its own.
const supplierTypesKey = {
  all: ['supplier-types'],
  list: (args: { merchantId: string }) => [...supplierTypesKey.all, 'list', args],
};

export function useSupplierTypesQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: supplierTypesKey.list({ merchantId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_types')
        .select('id, name')
        .eq('merchant_id', merchantId)
        .order('name')
        .throwOnError();

      return data;
    },
    staleTime: STALE.MINUTES.FIVE,
  });
}

export function useCreateSupplierTypeMutation({ merchantId }: { merchantId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await supabase
        .from('supplier_types')
        .insert({ merchant_id: merchantId, name })
        .select('id, name')
        .single()
        .throwOnError();

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: supplierTypesKey.all });
    },
  });
}

export function useDeleteSupplierTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Never refused: suppliers_type_fk is `on delete set null (supplier_type_id)`.
      await supabase.from('supplier_types').delete().eq('id', id).throwOnError();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierTypesKey.all }),
        queryClient.invalidateQueries({ queryKey: suppliersKey.all }),
      ]);
    },
  });
}

/** supplier_types_name_unique. */
export function isDuplicateType(cause: Error | null) {
  return postgrestError(cause)?.code === '23505';
}
