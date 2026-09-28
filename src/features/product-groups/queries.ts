import { useQuery } from '@tanstack/react-query';

import { STALE } from '../../lib/query';
import { supabase } from '../../lib/supabase';

// The groups an Inventory item can be a variant of. Created by save_stock_item from a typed group name,
// so there is no create mutation here and no screen of its own.
export const productGroupsKey = {
  all: ['product-groups'],
  list: (args: { merchantId: string }) => [...productGroupsKey.all, 'list', args],
};

export function useProductGroupsQuery({ merchantId }: { merchantId: string }) {
  return useQuery({
    queryKey: productGroupsKey.list({ merchantId }),
    queryFn: async () => {
      const { data } = await supabase
        .from('product_groups')
        .select('id, name')
        .eq('merchant_id', merchantId)
        .order('name')
        .throwOnError();

      return data;
    },
    staleTime: STALE.MINUTES.FIVE,
  });
}
