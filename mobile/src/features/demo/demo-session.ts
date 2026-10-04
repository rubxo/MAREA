export type DemoStory = Readonly<{
  id: string;
  username: string;
  avatarUrl: string;
  seen: boolean;
}>;

export type DemoPost = Readonly<{
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  imageUrl: string;
  location: string;
  caption: string;
  likes: number;
  comments: number;
  createdLabel: string;
}>;

export const demoUser = {
  id: 'user-valeria',
  username: 'valeria.m',
  displayName: 'Valeria Mora',
  bio: 'Fotografía urbana · Bogotá\nColecciono luz, esquinas y domingos lentos.',
  avatarUrl: 'https://i.pravatar.cc/300?img=47',
  followers: 1284,
  following: 318,
  posts: 42,
} as const;

export const demoStories: readonly DemoStory[] = [
  { id: 's1', username: 'Tu historia', avatarUrl: demoUser.avatarUrl, seen: true },
  { id: 's2', username: 'santi.r', avatarUrl: 'https://i.pravatar.cc/200?img=12', seen: false },
  { id: 's3', username: 'linafilm', avatarUrl: 'https://i.pravatar.cc/200?img=32', seen: false },
  { id: 's4', username: 'mateo.jpg', avatarUrl: 'https://i.pravatar.cc/200?img=15', seen: true },
  { id: 's5', username: 'ines.c', avatarUrl: 'https://i.pravatar.cc/200?img=25', seen: false },
];

export const demoPosts: readonly DemoPost[] = [
  {
    id: 'post-1',
    username: 'linafilm',
    displayName: 'Lina Cárdenas',
    avatarUrl: 'https://i.pravatar.cc/200?img=32',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=85',
    location: 'Chapinero, Bogotá',
    caption: 'La ciudad también respira cuando baja el ruido.',
    likes: 842,
    comments: 31,
    createdLabel: 'Hace 18 min',
  },
  {
    id: 'post-2',
    username: 'santi.r',
    displayName: 'Santiago Rojas',
    avatarUrl: 'https://i.pravatar.cc/200?img=12',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=85',
    location: 'Guatavita, Cundinamarca',
    caption: 'Salir temprano siempre paga la pena.',
    likes: 1205,
    comments: 48,
    createdLabel: 'Hace 1 h',
  },
  {
    id: 'post-3',
    username: 'mateo.jpg',
    displayName: 'Mateo Silva',
    avatarUrl: 'https://i.pravatar.cc/200?img=15',
    imageUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&q=85',
    location: 'Cartagena, Colombia',
    caption: 'Última luz sobre la muralla.',
    likes: 2268,
    comments: 96,
    createdLabel: 'Ayer',
  },
];

export const demoGallery = [
  ...demoPosts.map((post) => post.imageUrl),
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?w=800&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80',
  'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=800&q=80',
  'https://images.unsplash.com/photo-1524230572899-a752b3835840?w=800&q=80',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
] as const;
