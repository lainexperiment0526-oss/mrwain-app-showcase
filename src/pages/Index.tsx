import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { AppCard, SectionHeader } from '@/components/AppCard';
import { CategoryPill } from '@/components/CategoryCard';
import { HomeAdBanner } from '@/components/HomeAdBanner';
import { useApps, useFeaturedApps, usePopularApps, useNewApps, useCategories } from '@/hooks/useApps';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/Logo';

export default function Index() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const queryParam = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(queryParam);
  
  const { data: apps, isLoading: appsLoading } = useApps();
  const { data: featuredApps } = useFeaturedApps();
  const { data: popularApps } = usePopularApps();
  const { data: newApps } = useNewApps();
  const { data: categories } = useCategories();

  const approvedApps = useMemo(() => {
    return apps?.filter(app => app.status === 'approved' || !app.status) || [];
  }, [apps]);

  useEffect(() => {
    if (queryParam !== search) {
      setSearch(queryParam);
    }
  }, [queryParam, search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const normalize = useCallback((value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ''), []);

  const filteredApps = useMemo(() => {
    let filtered = search ? (apps ?? []) : approvedApps;
    if (categoryFilter) {
      filtered = filtered.filter(app => String(app.category_id ?? '') === String(categoryFilter));
    }
    if (search) {
      const searchLower = search.trim().toLowerCase();
      const searchCompact = normalize(search);
      if (!searchLower) return filtered;
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(searchLower) ||
        normalize(app.name).includes(searchCompact) ||
        (app.tagline ? app.tagline.toLowerCase().includes(searchLower) : false) ||
        (app.tagline ? normalize(app.tagline).includes(searchCompact) : false) ||
        (app.description ? app.description.toLowerCase().includes(searchLower) : false) ||
        (app.description ? normalize(app.description).includes(searchCompact) : false) ||
        (app.category?.name ? app.category.name.toLowerCase().includes(searchLower) : false) ||
        (app.category?.name ? normalize(app.category.name).includes(searchCompact) : false) ||
        (app.developer_name ? app.developer_name.toLowerCase().includes(searchLower) : false) ||
        (app.developer_name ? normalize(app.developer_name).includes(searchCompact) : false) ||
        (Array.isArray(app.tags)
          ? app.tags.some((tag: string) =>
              tag.toLowerCase().includes(searchLower) || normalize(tag).includes(searchCompact)
            )
          : typeof app.tags === 'string'
            ? (app.tags as string).toLowerCase().includes(searchLower) || normalize(app.tags as string).includes(searchCompact)
            : false)
      );
    }
    return filtered;
  }, [approvedApps, categoryFilter, normalize, search]);

  // Group apps by category for the home view
  const appsByCategory = useMemo(() => {
    if (!categories || !approvedApps.length) return [];
    return categories
      .map(cat => ({
        category: cat,
        apps: approvedApps
          .filter(app => app.category_id === cat.id)
          .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)),
      }))
      .filter(group => group.apps.length > 0);
  }, [categories, approvedApps]);

  const isSearching = search || categoryFilter;
  const currentCategory = categories?.find(c => c.id === categoryFilter);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="mx-auto max-w-6xl px-4 py-4">
        {/* Categories Pills */}
        {categories && categories.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            <Link
              to="/"
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                !categoryFilter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t('common.all')}
            </Link>
            {categories.map(category => (
              <CategoryPill 
                key={category.id} 
                category={category} 
                isActive={categoryFilter === category.id}
              />
            ))}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <SearchBar value={search} onChange={handleSearchChange} />
        </div>

        {isSearching ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-foreground">
                {currentCategory ? currentCategory.name : t('home.searchResults')}
              </h1>
              {categoryFilter && (
                <Link to="/" className="text-primary text-sm font-medium">{t('common.clear')}</Link>
              )}
            </div>
            {filteredApps.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground">{t('home.noAppsFound')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredApps.map(app => (
                  <AppCard key={app.id} app={app} variant="list" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Video Ads */}
            <HomeAdBanner />

            {/* Featured Story Cards */}
            {featuredApps && featuredApps.length > 0 && (
              <section className="mb-8">
                <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
                  {featuredApps.map(app => (
                    <div key={app.id} className="flex-shrink-0 w-[85vw] max-w-md">
                      <AppCard app={app} variant="featured" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Popular Apps ranked by rating */}
            {popularApps && popularApps.length > 0 && (
              <section className="mb-8">
                <SectionHeader title={t('home.topApps')} href="/top" />
                <div className="divide-y divide-border">
                  {[...popularApps].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).slice(0, 4).map(app => (
                    <AppCard key={app.id} app={app} variant="list" />
                  ))}
                </div>
              </section>
            )}

            {/* New Apps */}
            {newApps && newApps.length > 0 && (
              <section className="mb-8">
                <SectionHeader title={t('home.newArrivals')} href="/new" />
                <div className="divide-y divide-border">
                  {newApps.slice(0, 4).map(app => (
                    <AppCard key={app.id} app={app} variant="list" />
                  ))}
                </div>
              </section>
            )}

            {/* Apps grouped by Category */}
            {appsByCategory.map(({ category, apps }) => (
              <section key={category.id} className="mb-8">
                <SectionHeader title={category.name} href={`/?category=${category.id}`} />
                <div className="divide-y divide-border">
                  {apps.slice(0, 4).map(app => (
                    <AppCard key={app.id} app={app} variant="list" />
                  ))}
                </div>
              </section>
            ))}

            {/* Loading State */}
            {appsLoading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-14 w-14 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!appsLoading && approvedApps.length === 0 && (
              <div className="py-20 text-center">
                <div className="mx-auto mb-4 flex justify-center">
                  <Logo size="lg" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t('home.noAppsYet')}</h2>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
