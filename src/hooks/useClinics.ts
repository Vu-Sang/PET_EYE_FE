import { useQuery } from '@tanstack/react-query';
import { shopService, ShopPublicResponse } from '../services/shop.service';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Debounce a value by `delay` ms — prevents API spam while typing */
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useClinics() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'Tất cả';
  const initialCity = searchParams.get('city') || '';
  const initialQ = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [cityQuery, setCityQuery] = useState(initialCity);
  const [activeService, setActiveService] = useState(initialType);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Debounce text inputs so API is only called after user stops typing
  const debouncedSearch = useDebounce(searchQuery, 400);
  const debouncedCity   = useDebounce(cityQuery,   400);

  const shopTypeParam = activeService === 'Tất cả' ? undefined : activeService;

  const { data: pagedData, isLoading, error } = useQuery({
    queryKey: ['shops-public', debouncedSearch, debouncedCity, shopTypeParam, page],
    queryFn: () => shopService.searchPublicPaged({
      keyword:  debouncedSearch || undefined,
      city:     debouncedCity   || undefined,
      shopType: shopTypeParam,
      page,
    }),
    staleTime: 30_000,
  });

  const shops = pagedData?.content ?? [];
  const totalPages = pagedData?.totalPages ?? 1;
  const totalElements = pagedData?.totalElements ?? 0;

  // Client-side rating filter
  const filteredShops = useMemo(() => {
    let result = shops;
    if (minRating > 0) {
      result = result.filter((s: ShopPublicResponse) => s.ratingAvg >= minRating);
    }
    if (selectedServices.length > 0) {
      result = result.filter((s: ShopPublicResponse) => {
        if (!s.serviceNames || s.serviceNames.length === 0) return false;
        return selectedServices.some(svc => s.serviceNames?.includes(svc));
      });
    }
    return result;
  }, [shops, minRating, selectedServices]);

  const availableServices = useMemo(() => {
    const services = new Set<string>();
    shops.forEach((s: ShopPublicResponse) => {
      if (s.serviceNames) {
        s.serviceNames.forEach(svc => services.add(svc));
      }
    });
    return Array.from(services).sort();
  }, [shops]);

  // Reset page khi filter thay đổi
  useEffect(() => { setPage(0); }, [debouncedSearch, debouncedCity, activeService]);

  return {
    clinics: filteredShops,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    cityQuery,
    setCityQuery,
    activeService,
    setActiveService,
    minRating,
    setMinRating,
    page,
    setPage,
    totalPages,
    totalElements,
    selectedServices,
    setSelectedServices,
    availableServices,
  };
}
