import { PetData } from '../pages/PetProfile';

// items used by the pet list UI
export interface PetListItem {
    id: number;
    name: string;
    breed: string;
    species: string;
    age: number;
    weight: string;
    gender: 'Đực' | 'Cái';
    color: string;
    vaccinated: boolean;
    img: string;
    nextVaccine: string;
    microchip: string;
    // optional fields for converting to PetData
    birthYear?: number;
    chipId?: string;
    sterilized?: boolean;
    notes?: string;
    avatar?: string;
}

export const PETS: PetListItem[] = [
    {
        id: 1,
        name: 'Lucky',
        breed: 'Golden Retriever',
        species: 'Chó',
        age: 3,
        weight: '28 kg',
        gender: 'Đực',
        color: 'Vàng',
        vaccinated: true,
        img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=300&auto=format&fit=crop',
        nextVaccine: '15/06/2026',
        microchip: 'VN-2023-001845',
        // fields for detail view
        birthYear: 2023,
        chipId: 'VN-2023-001845',
        sterilized: false,
        notes: '',
        avatar: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=300&auto=format&fit=crop',
    },
    {
        id: 2,
        name: 'Miu Miu',
        breed: 'Mèo Anh Lông Ngắn',
        species: 'Mèo',
        age: 2,
        weight: '4.5 kg',
        gender: 'Cái',
        color: 'Xám xanh',
        vaccinated: false,
        img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop',
        nextVaccine: '—',
        microchip: 'Chưa gắn',
        birthYear: 2024,
        chipId: '#9821A',
        sterilized: true,
        notes: 'Bé rất thích chơi với đồ chơi có tiếng động. Nhút nhát với người lạ nhưng thân thiện khi quen.',
        avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop',
    },
];

// convert list item into the PetData shape used by PetProfile
export function getPetById(id: number): PetData | undefined {
    const item = PETS.find(p => p.id === id);
    if (!item) return undefined;
    return {
        name: item.name,
        breed: item.breed,
        gender: item.gender,
        birthYear: item.birthYear ?? new Date().getFullYear(),
        weight: parseFloat(item.weight) || 0,
        chipId: item.chipId ?? '',
        color: item.color,
        sterilized: item.sterilized ?? false,
        notes: item.notes ?? '',
        avatar: item.avatar ?? item.img,
    };
}
