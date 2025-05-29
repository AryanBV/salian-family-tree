// Sample Salian family data
// Replace this with your actual family information

export const initialFamilyData = [
  {
    id: 1,
    name: "Maria Salian",
    birthYear: 1920,
    deathYear: 1995,
    location: "Mumbai",
    gender: "female",
    parentId: null,
    isMainLineage: true,
    spouse: "Joseph D'Souza" // Optional spouse information
  },
  {
    id: 2,
    name: "Anna Salian",
    birthYear: 1945,
    deathYear: null,
    location: "Bangalore",
    gender: "female",
    parentId: 1,
    isMainLineage: true,
    spouse: "Robert Fernandes"
  },
  {
    id: 3,
    name: "John Salian",
    birthYear: 1948,
    deathYear: null,
    location: "Mumbai",
    gender: "male",
    parentId: 1,
    isMainLineage: false,
    spouse: "Mary Pereira"
  },
  {
    id: 4,
    name: "Catherine Salian",
    birthYear: 1970,
    deathYear: null,
    location: "Goa",
    gender: "female",
    parentId: 2,
    isMainLineage: true,
    spouse: "David Costa"
  },
  {
    id: 5,
    name: "Michael Salian",
    birthYear: 1972,
    deathYear: null,
    location: "Bangalore",
    gender: "male",
    parentId: 2,
    isMainLineage: false,
    spouse: "Lisa Rodrigues"
  },
  {
    id: 6,
    name: "Elena Salian",
    birthYear: 1995,
    deathYear: null,
    location: "Bangalore",
    gender: "female",
    parentId: 4,
    isMainLineage: true,
    spouse: null
  }
];

// Helper functions for family data
export const addPersonToFamily = (familyData, newPerson) => {
  const newId = Math.max(...familyData.map(p => p.id)) + 1;
  const isMainLineage = newPerson.parentId ? 
    familyData.find(p => p.id === newPerson.parentId)?.gender === 'female' && newPerson.gender === 'female' : 
    newPerson.gender === 'female';
  
  return [...familyData, {
    ...newPerson,
    id: newId,
    isMainLineage
  }];
};

// Fixed hierarchy builder that handles multiple roots and search
export const buildHierarchy = (data) => {
  if (!data || data.length === 0) return null;

  const map = new Map();
  const roots = [];

  // Create nodes
  data.forEach(person => {
    map.set(person.id, { ...person, children: [] });
  });

  // Build parent-child relationships
  data.forEach(person => {
    if (person.parentId) {
      const parent = map.get(person.parentId);
      const child = map.get(person.id);
      if (parent && child) {
        parent.children.push(child);
      }
    } else {
      roots.push(map.get(person.id));
    }
  });

  // If multiple roots exist, create a virtual root to contain them all
  if (roots.length === 0) return null;
  if (roots.length === 1) return roots[0];
  
  // Multiple roots - create virtual root
  return {
    id: 'virtual-root',
    name: 'Salian Family',
    isVirtual: true,
    children: roots
  };
};

// Enhanced search that maintains family tree structure
export const searchFamilyData = (familyData, searchTerm) => {
  if (!searchTerm.trim()) return familyData;

  const lowerSearchTerm = searchTerm.toLowerCase();
  const matchingIds = new Set();
  
  // Find direct matches
  familyData.forEach(person => {
    if (
      person.name.toLowerCase().includes(lowerSearchTerm) ||
      (person.location && person.location.toLowerCase().includes(lowerSearchTerm))
    ) {
      matchingIds.add(person.id);
    }
  });

  // Include all ancestors and descendants of matching people
  const includeAncestors = (personId) => {
    const person = familyData.find(p => p.id === personId);
    if (person && person.parentId && !matchingIds.has(person.parentId)) {
      matchingIds.add(person.parentId);
      includeAncestors(person.parentId);
    }
  };

  const includeDescendants = (personId) => {
    const children = familyData.filter(p => p.parentId === personId);
    children.forEach(child => {
      if (!matchingIds.has(child.id)) {
        matchingIds.add(child.id);
        includeDescendants(child.id);
      }
    });
  };

  // For each match, include ancestors and descendants
  Array.from(matchingIds).forEach(id => {
    includeAncestors(id);
    includeDescendants(id);
  });

  // Return filtered data that maintains tree structure
  return familyData.filter(person => matchingIds.has(person.id));
};