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

export const buildHierarchy = (data) => {
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

  return roots[0] || null; // Return the root node
};