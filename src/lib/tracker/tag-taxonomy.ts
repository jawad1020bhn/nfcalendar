// Smart tag taxonomy — niches, sub-niches, and progressive disclosure
// Instead of showing all tags at once, we show category chips,
// then when a category is selected, show sub-niche suggestions,
// and after selecting one, suggest related tags from the same niche.

export type TagNode = {
  tag: string
  label: string
  children?: TagNode[]
}

// Root categories — shown as initial chips
export const TAG_TREE: TagNode[] = [
  {
    tag: 'Mind', label: 'Mind',
    children: [
      { tag: 'Meditated', label: 'Meditated' },
      { tag: 'Mindfulness', label: 'Mindfulness' },
      { tag: 'Journaling', label: 'Journaling' },
      { tag: 'Therapy', label: 'Therapy' },
      { tag: 'Gratitude', label: 'Gratitude' },
      { tag: 'Prayer', label: 'Prayer' },
      { tag: 'Reflection', label: 'Reflection' },
      { tag: 'Calm', label: 'Calm' },
    ],
  },
  {
    tag: 'Body', label: 'Body',
    children: [
      { tag: 'Workout', label: 'Workout' },
      { tag: 'ColdShower', label: 'Cold Shower' },
      { tag: 'NatureWalk', label: 'Nature Walk' },
      { tag: 'Yoga', label: 'Yoga' },
      { tag: 'HealthyMeal', label: 'Healthy Meal' },
      { tag: 'NoSugar', label: 'No Sugar' },
      { tag: 'Sunlight', label: 'Sunlight' },
      { tag: 'Hydration', label: 'Hydration' },
      { tag: 'Stretching', label: 'Stretching' },
      { tag: 'Run', label: 'Running' },
    ],
  },
  {
    tag: 'Sleep', label: 'Sleep',
    children: [
      { tag: 'GoodSleep', label: 'Good Sleep' },
      { tag: 'EarlyBedtime', label: 'Early Bedtime' },
      { tag: 'Insomnia', label: 'Insomnia' },
      { tag: 'Tired', label: 'Tired' },
      { tag: 'Overslept', label: 'Overslept' },
    ],
  },
  {
    tag: 'Focus', label: 'Focus',
    children: [
      { tag: 'DeepWork', label: 'Deep Work' },
      { tag: 'Read', label: 'Read' },
      { tag: 'Procrastination', label: 'Procrastination' },
      { tag: 'Distracted', label: 'Distracted' },
      { tag: 'Flow', label: 'Flow State' },
      { tag: 'Learned', label: 'Learned Something' },
    ],
  },
  {
    tag: 'Social', label: 'Social',
    children: [
      { tag: 'SocialWin', label: 'Social Win' },
      { tag: 'Loneliness', label: 'Loneliness' },
      { tag: 'PeerPressure', label: 'Peer Pressure' },
      { tag: 'FamilyTime', label: 'Family Time' },
      { tag: 'Friends', label: 'Friends' },
      { tag: 'Date', label: 'Date' },
    ],
  },
  {
    tag: 'Triggers', label: 'Triggers',
    children: [
      { tag: 'Stress', label: 'Stress' },
      { tag: 'Boredom', label: 'Boredom' },
      { tag: 'SocialMedia', label: 'Social Media' },
      { tag: 'Porn', label: 'Porn' },
      { tag: 'LateNight', label: 'Late Night' },
      { tag: 'Anger', label: 'Anger' },
      { tag: 'Sadness', label: 'Sadness' },
      { tag: 'Anxiety', label: 'Anxiety' },
      { tag: 'Hangover', label: 'Hangover' },
      { tag: 'Caffeine', label: 'Caffeine' },
    ],
  },
  {
    tag: 'Emotions', label: 'Feelings',
    children: [
      { tag: 'Happy', label: 'Happy' },
      { tag: 'Motivated', label: 'Motivated' },
      { tag: 'Grateful', label: 'Grateful' },
      { tag: 'Frustrated', label: 'Frustrated' },
      { tag: 'Hopeless', label: 'Hopeless' },
      { tag: 'Confident', label: 'Confident' },
      { tag: 'Ashamed', label: 'Ashamed' },
      { tag: 'Peaceful', label: 'Peaceful' },
    ],
  },
  {
    tag: 'Lifestyle', label: 'Lifestyle',
    children: [
      { tag: 'NoFap', label: 'NoFap' },
      { tag: 'NoCoffee', label: 'No Coffee' },
      { tag: 'NoAlcohol', label: 'No Alcohol' },
      { tag: 'NoJunkFood', label: 'No Junk Food' },
      { tag: 'DigitalDetox', label: 'Digital Detox' },
      { tag: 'Minimalism', label: 'Minimalism' },
      { tag: 'Routine', label: 'Routine' },
      { tag: 'Hobby', label: 'Hobby' },
    ],
  },
]

// Get the flat list of all tags (for autocomplete)
export function getAllTags(): string[] {
  const tags: string[] = []
  for (const node of TAG_TREE) {
    if (node.children) {
      for (const child of node.children) {
        tags.push(child.tag)
      }
    } else {
      tags.push(node.tag)
    }
  }
  return tags
}

// Get related tags within the same niche (for progressive suggestions)
export function getRelatedTags(selectedTag: string): string[] {
  for (const node of TAG_TREE) {
    if (node.children) {
      const idx = node.children.findIndex(c => c.tag === selectedTag)
      if (idx >= 0) {
        // Return siblings (same niche), excluding the selected one
        return node.children
          .filter(c => c.tag !== selectedTag)
          .slice(0, 5)
          .map(c => c.tag)
      }
    }
  }
  return []
}

// Get initial category chips (one per niche, rotating based on day state)
export function getCategoryChips(dayState: number): string[] {
  if (dayState === 1) {
    // Clean day — show positive categories first
    return ['Mind', 'Body', 'Focus', 'Social', 'Feelings', 'Sleep', 'Lifestyle', 'Triggers']
  } else if (dayState === 3) {
    // Relapse day — show triggers first
    return ['Triggers', 'Feelings', 'Sleep', 'Social', 'Mind', 'Body', 'Focus', 'Lifestyle']
  }
  // Default
  return ['Mind', 'Body', 'Triggers', 'Sleep', 'Focus', 'Social', 'Feelings', 'Lifestyle']
}
