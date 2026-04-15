'use client';

import { HeroSection } from './HeroSection';
import { CategoryTabs } from './CategoryTabs';
import { AchievementGrid } from './AchievementGrid';
import { AchievementManagement } from './AchievementManagement';
import { useAchievementProgress } from './useAchievementProgress';

/**
 * Main AchievementProgress component
 * Displays the complete achievements page with:
 * - Hero section with stats
 * - Category filter tabs
 * - Achievement grid
 * - Achievement management section
 */
const AchievementProgress = () => {
  const {
    selectedCategory,
    unlockedAchievements,
    totalPoints,
    level,
    filteredAchievements,
    unlockedCount,
    totalCount,
    completionPercentage,
    handleCategorySelect,
    getAchievementProgress,
    getCategoryStats,
  } = useAchievementProgress();

  return (
    <div className='w-full'>
      {/* Hero Section */}
      <HeroSection
        unlockedCount={unlockedCount}
        totalCount={totalCount}
        totalPoints={totalPoints}
        level={level}
        completionPercentage={completionPercentage}
      />

      {/* Category Tabs & Achievement Grid */}
      <div className='px-6 py-6'>
        <div className='mx-auto max-w-6xl'>
          <CategoryTabs
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            getCategoryStats={getCategoryStats}
          />

          <AchievementGrid
            achievements={filteredAchievements}
            unlockedAchievements={unlockedAchievements}
            getAchievementProgress={getAchievementProgress}
            selectedCategory={selectedCategory}
          />
        </div>

        {/* Achievement Management Section */}
        <AchievementManagement />
      </div>
    </div>
  );
};

export default AchievementProgress;
