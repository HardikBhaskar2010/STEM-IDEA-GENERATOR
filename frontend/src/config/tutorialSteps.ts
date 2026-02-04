// Tutorial step configurations for different pages

export const generatorTutorialSteps = [
  {
    title: '🎯 Project Parameters',
    description: 'Fill out these fields to customize your project. Select a project type and skill level to get started!',
    target: '[data-tutorial="project-form"]',
    position: 'right' as const,
  },
  {
    title: '⚡ Generate Button',
    description: 'Click here to generate your personalized STEM project! Our AI will create a custom project based on your inputs.',
    target: '[data-tutorial="generate-button"]',
    position: 'top' as const,
  },
  {
    title: '💾 Save Your Projects',
    description: 'Once you generate a project, you can save it to your library for future reference and tracking!',
    target: '[data-tutorial="save-button"]',
    position: 'top' as const,
  },
];

export const componentsTutorialSteps = [
  {
    title: '🔍 Search Components',
    description: 'Use the search bar to quickly find specific components from our database of 500+ electronics parts.',
    target: '[data-tutorial="search-components"]',
    position: 'bottom' as const,
  },
  {
    title: '🏷️ Filter by Category',
    description: 'Filter components by category to narrow down your search and find exactly what you need.',
    target: '[data-tutorial="filter-category"]',
    position: 'bottom' as const,
  },
  {
    title: '📊 Component Details',
    description: 'Each component card shows detailed specifications, pricing, and availability information.',
    target: '[data-tutorial="component-card"]',
    position: 'top' as const,
  },
];

export const libraryTutorialSteps = [
  {
    title: '📚 Your Project Library',
    description: 'All your saved projects appear here. You can track progress, organize, and manage them easily!',
    target: '[data-tutorial="project-library"]',
    position: 'bottom' as const,
  },
  {
    title: '🎯 Filter Projects',
    description: 'Use filters to organize projects by status, difficulty, or type. Keep your workspace clean and organized!',
    target: '[data-tutorial="filter-projects"]',
    position: 'bottom' as const,
  },
  {
    title: '⭐ Star Favorites',
    description: 'Star your favorite projects for quick access. Perfect for projects you want to build soon!',
    target: '[data-tutorial="star-project"]',
    position: 'top' as const,
  },
];

export const profileTutorialSteps = [
  {
    title: '👤 Your Profile',
    description: 'Manage your account settings and preferences here. Customize your maker experience!',
    target: '[data-tutorial="profile-info"]',
    position: 'right' as const,
  },
  {
    title: '🏆 Track Achievements',
    description: 'See your achievements, completed projects, and skill progression. Track your maker journey!',
    target: '[data-tutorial="achievements"]',
    position: 'left' as const,
  },
  {
    title: '📊 Project Statistics',
    description: 'View statistics about your projects, including completion rates and time spent building.',
    target: '[data-tutorial="stats"]',
    position: 'top' as const,
  },
];
