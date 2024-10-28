interface Event {
  id: string
  title: string
  start: Date
  end: Date
  description: string
  location: string
  reputation: number
  crowdId: string
}

interface Crowd {
  id: string
  name: string
  description: string
  code?: string
  emailDomain?: string
  events: Event[]
  CrowdUserProfiles: CrowdUserProfile[]
  creatorId: string
}

interface User {
  id: string
  name: string
  email: string
  crowds: Crowd[]
  globalReputation: number
  CrowdUserProfiles: CrowdUserProfile[]
}

interface CrowdUserProfile {
  id: string
  crowdId: string
  userId: string
  reputation: number
}

export type APIResponse<T = object> = { success: true; data: T } | { success: false; error: string };

export type { Event, Crowd, User, CrowdUserProfile }
