import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/endpoints/dashboard';

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.gerar() });
}
