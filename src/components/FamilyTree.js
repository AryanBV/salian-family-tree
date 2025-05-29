import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Search, Plus, Home, ZoomIn, ZoomOut, Users, Download, Upload, Cloud, Wifi, WifiOff, User } from 'lucide-react';
import AddPersonForm from './AddPersonForm';
import PersonProfile from './PersonProfile';
import { initialFamilyData, searchFamilyData } from '../data/familyData';
import { familyService } from '../services/firebase';
import '../styles/FamilyTree.css';

const FamilyTree = () => {
  // State management
  const [familyData, setFamilyData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const [addingParentFor, setAddingParentFor] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  
  // Refs
  const svgRef = useRef();
  const unsubscribeRef = useRef(null);
  const dimensions = { width: 1400, height: 900 };

  // Firebase-compatible buildHierarchy function
  const buildHierarchy = (data) => {
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

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setConnectionStatus('Connecting...');
        
        // Check if there's existing localStorage data to migrate
        const localData = localStorage.getItem('salianFamilyData');
        if (localData) {
          try {
            const parsedLocalData = JSON.parse(localData);
            console.log('Found local data, checking if Firebase is empty...');
            
            // Get existing Firebase data
            const existingData = await familyService.getAllMembers();
            
            if (existingData.length === 0 && parsedLocalData.length > 0) {
              // Firebase is empty but localStorage has data - migrate it
              console.log('Migrating localStorage data to Firebase...');
              await familyService.migrateLocalData(parsedLocalData);
              
              // Clear localStorage after successful migration
              localStorage.removeItem('salianFamilyData');
              setConnectionStatus('Data migrated to cloud');
            }
          } catch (error) {
            console.error('Error during migration:', error);
          }
        }

        // Set up real-time listener
        const unsubscribe = familyService.subscribeToMembers((members) => {
          console.log('Received', members.length, 'family members from Firebase');
          setFamilyData(members);
          setIsLoading(false);
          setConnectionStatus('Connected');
          setIsOnline(true);
        });

        unsubscribeRef.current = unsubscribe;

        // If no data in Firebase and no localStorage, add initial data
        setTimeout(async () => {
          try {
            const currentData = await familyService.getAllMembers();
            if (currentData.length === 0) {
              console.log('No data found, adding initial family data...');
              await familyService.migrateLocalData(initialFamilyData);
            }
          } catch (error) {
            console.error('Error adding initial data:', error);
          }
        }, 1000);

      } catch (error) {
        console.error('Error loading data from Firebase:', error);
        setIsLoading(false);
        setConnectionStatus('Connection failed');
        setIsOnline(false);
        
        // Fallback to localStorage if Firebase fails
        const localData = localStorage.getItem('salianFamilyData');
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            setFamilyData(parsedData);
          } catch (e) {
            setFamilyData(initialFamilyData);
          }
        } else {
          setFamilyData(initialFamilyData);
        }
      }
    };

    loadData();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('Connected');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Use enhanced search that maintains tree structure
  const filteredData = searchFamilyData(familyData, searchTerm);
  const hierarchyData = buildHierarchy(filteredData);

  // Modern Card-Based Tree Visualization
  useEffect(() => {
    if (!hierarchyData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        setTransform(event.transform);
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g")
      .attr("transform", `translate(${transform.x},${transform.y}) scale(${transform.k})`);

    // Create tree layout with better spacing for cards
    const treeLayout = d3.tree()
      .size([width - 300, height - 300])
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 2));

    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    // Card dimensions
    const cardWidth = 180;
    const cardHeight = 120;

    // Draw links (family connections) - skip virtual root links
    const links = root.links().filter(d => !d.source.data.isVirtual);
    g.selectAll(".tree-link")
      .data(links)
      .enter().append("path")
      .attr("class", "tree-link")
      .attr("d", d3.linkVertical()
        .x(d => d.x + 150)
        .y(d => d.y + 150 + cardHeight/2))
      .style("fill", "none")
      .style("stroke", "#cbd5e1")
      .style("stroke-width", 2);

    // Draw nodes (family member cards) - skip virtual root
    const nodes = root.descendants().filter(d => !d.data.isVirtual);
    const nodeGroups = g.selectAll(".tree-node")
      .data(nodes)
      .enter().append("g")
      .attr("class", "tree-node")
      .attr("transform", d => `translate(${d.x + 150 - cardWidth/2},${d.y + 150})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedPerson(d.data);
        setShowProfile(true);
      });

    // Card backgrounds
    nodeGroups.append("rect")
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("rx", 12)
      .style("fill", "white")
      .style("stroke", d => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const isMatch = d.data.name.toLowerCase().includes(searchLower) ||
                         (d.data.location && d.data.location.toLowerCase().includes(searchLower));
          if (isMatch) return "#f59e0b";
        }
        return d.data.isMainLineage ? "#3b82f6" : "#10b981";
      })
      .style("stroke-width", d => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const isMatch = d.data.name.toLowerCase().includes(searchLower) ||
                         (d.data.location && d.data.location.toLowerCase().includes(searchLower));
          if (isMatch) return 4;
        }
        return 2;
      })
      .style("opacity", d => d.data.deathYear ? 0.8 : 1)
      .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
      .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))");

    // Photo placeholder
    nodeGroups.append("circle")
      .attr("cx", 30)
      .attr("cy", 30)
      .attr("r", 20)
      .style("fill", d => d.data.isMainLineage ? "#3b82f6" : "#10b981")
      .style("opacity", d => d.data.deathYear ? 0.7 : 1);

    // Gender icon in photo
    nodeGroups.append("text")
      .attr("x", 30)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(d => d.data.gender === 'female' ? '♀' : '♂');

    // Main lineage indicator - moved to bottom-right corner
    nodeGroups.filter(d => d.data.isMainLineage)
      .append("rect")
      .attr("x", cardWidth - 40)
      .attr("y", cardHeight - 18)
      .attr("width", 35)
      .attr("height", 12)
      .attr("rx", 6)
      .style("fill", "#dbeafe")
      .style("stroke", "#3b82f6")
      .style("stroke-width", 1);

    nodeGroups.filter(d => d.data.isMainLineage)
      .append("text")
      .attr("x", cardWidth - 22.5)
      .attr("y", cardHeight - 10)
      .attr("text-anchor", "middle")
      .style("fill", "#1e40af")
      .style("font-size", "7px")
      .style("font-weight", "bold")
      .text("MAIN");

    // Name
    nodeGroups.append("text")
      .attr("x", 60)
      .attr("y", 20)
      .style("fill", d => d.data.deathYear ? "#64748b" : "#1f2937")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .text(d => {
        const name = d.data.name;
        return name.length > 16 ? name.substring(0, 16) + '...' : name;
      });

    // Birth/Death years
    nodeGroups.append("text")
      .attr("x", 60)
      .attr("y", 38)
      .style("fill", "#6b7280")
      .style("font-size", "11px")
      .text(d => {
        const birth = d.data.birthYear || '?';
        const death = d.data.deathYear ? ` - ${d.data.deathYear}` : ' - ';
        return `${birth}${death}`;
      });

    // Location
    nodeGroups.append("text")
      .attr("x", 10)
      .attr("y", 70)
      .style("fill", "#9ca3af")
      .style("font-size", "10px")
      .text(d => {
        const location = d.data.location || '';
        return location.length > 20 ? location.substring(0, 20) + '...' : location;
      });

    // Spouse
    nodeGroups.append("text")
      .attr("x", 10)
      .attr("y", 88)
      .style("fill", "#9ca3af")
      .style("font-size", "9px")
      .style("font-style", "italic")
      .text(d => {
        const spouse = d.data.spouse;
        if (!spouse) return '';
        const text = `m. ${spouse}`;
        return text.length > 22 ? text.substring(0, 22) + '...' : text;
      });

    // Deceased overlay
    nodeGroups.filter(d => d.data.deathYear)
      .append("rect")
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("rx", 12)
      .style("fill", "rgba(0, 0, 0, 0.1)")
      .style("pointer-events", "none");

    // Hover effects
    nodeGroups
      .on("mouseenter", function(event, d) {
        d3.select(this).select("rect")
          .style("stroke-width", 3)
          .style("filter", "drop-shadow(0 8px 15px rgba(0, 0, 0, 0.2))");
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).select("rect")
          .style("stroke-width", d => {
            if (searchTerm) {
              const searchLower = searchTerm.toLowerCase();
              const isMatch = d.data.name.toLowerCase().includes(searchLower) ||
                             (d.data.location && d.data.location.toLowerCase().includes(searchLower));
              if (isMatch) return 4;
            }
            return 2;
          })
          .style("filter", "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))");
      });

  }, [hierarchyData, dimensions, transform, searchTerm]);

  // Add new person to Firebase
  const handleAddPerson = async (newPerson) => {
    try {
      setConnectionStatus('Saving...');
      
      // Special handling for adding parents
      if (addingParentFor) {
        // Create parent first
        const parentResult = await familyService.addMember(newPerson);
        
        // Update the child to have this parent
        const updatedChild = {
          ...addingParentFor,
          parentId: parentResult.id,
          // Recalculate main lineage status
          isMainLineage: newPerson.gender === 'female' && addingParentFor.gender === 'female'
        };
        
        await familyService.updateMember(addingParentFor.id, updatedChild);
        setAddingParentFor(null);
      } else {
        await familyService.addMember(newPerson);
      }
      
      setConnectionStatus('Saved to cloud');
      
      // Success feedback
      setTimeout(() => {
        if (isOnline) {
          setConnectionStatus('Connected');
        }
      }, 2000);
    } catch (error) {
      console.error('Error adding person:', error);
      setConnectionStatus('Save failed');
      
      // Show error for a moment
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 3000);
    }
  };

  // Edit person
  const handleEditPerson = async (updatedPerson) => {
    try {
      setConnectionStatus('Updating...');
      await familyService.updateMember(updatedPerson.id, updatedPerson);
      setConnectionStatus('Updated');
      
      setTimeout(() => {
        if (isOnline) {
          setConnectionStatus('Connected');
        }
      }, 2000);
    } catch (error) {
      console.error('Error updating person:', error);
      setConnectionStatus('Update failed');
      
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 3000);
    }
  };

  // Delete person
  const handleDeletePerson = async (personId) => {
    try {
      setConnectionStatus('Deleting...');
      await familyService.deleteMember(personId);
      setConnectionStatus('Deleted');
      
      setTimeout(() => {
        if (isOnline) {
          setConnectionStatus('Connected');
        }
      }, 2000);
    } catch (error) {
      console.error('Error deleting person:', error);
      setConnectionStatus('Delete failed');
      
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 3000);
    }
  };

  // Zoom controls
  const handleZoom = (scale) => {
    const svg = d3.select(svgRef.current);
    const newTransform = d3.zoomIdentity
      .translate(transform.x, transform.y)
      .scale(transform.k * scale);
    
    svg.transition().duration(300).call(
      d3.zoom().transform,
      newTransform
    );
  };

  const resetView = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(100, 50)
    );
  };

  // Export family data from Firebase
  const exportData = async () => {
    try {
      setConnectionStatus('Exporting...');
      const data = await familyService.getAllMembers();
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'salian-family-data.json';
      link.click();
      URL.revokeObjectURL(url);
      setConnectionStatus('Exported');
      
      setTimeout(() => {
        setConnectionStatus(isOnline ? 'Connected' : 'Offline');
      }, 2000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setConnectionStatus('Export failed');
    }
  };

  // Import family data to Firebase
  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setConnectionStatus('Importing...');
          const importedData = JSON.parse(e.target.result);
          
          // Add each person to Firebase
          for (const person of importedData) {
            const { id, firestoreId, createdAt, updatedAt, ...personData } = person;
            await familyService.addMember(personData);
          }
          
          setConnectionStatus('Import successful');
          setTimeout(() => {
            setConnectionStatus(isOnline ? 'Connected' : 'Offline');
          }, 2000);
        } catch (error) {
          console.error('Error importing data:', error);
          setConnectionStatus('Import failed');
        }
      };
      reader.readAsText(file);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="family-tree-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <Cloud size={48} style={{ marginBottom: '1rem', animation: 'pulse 2s infinite' }} />
          <h2>Loading Family Tree...</h2>
          <p>Connecting to Firebase database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="family-tree-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="title-section">
            <Users size={32} color="#3b82f6" />
            <h1 className="title">Salian Family Tree</h1>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: isOnline ? '#059669' : '#dc2626',
              background: isOnline ? '#d1fae5' : '#fee2e2',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem'
            }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connectionStatus}
            </div>
          </div>
          <div className="controls-section">
            {/* Search */}
            <div className="search-container">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search family members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Export/Import */}
            <button onClick={exportData} className="add-button" style={{ background: '#059669' }}>
              <Download size={16} />
              Export
            </button>
            
            <label className="add-button" style={{ background: '#7c3aed' }}>
              <Upload size={16} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importData}
                style={{ display: 'none' }}
              />
            </label>
            
            {/* Add Person Button */}
            <button
              onClick={() => {
                setSelectedPerson(null);
                setEditingPerson(null);
                setAddingParentFor(null);
                setShowAddForm(true);
              }}
              className="add-button"
            >
              <Plus size={16} />
              Add Person
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button onClick={() => handleZoom(1.2)} className="zoom-button" title="Zoom In">
          <ZoomIn size={20} />
        </button>
        <button onClick={() => handleZoom(0.8)} className="zoom-button" title="Zoom Out">
          <ZoomOut size={20} />
        </button>
        <button onClick={resetView} className="zoom-button" title="Reset View">
          <Home size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="legend">
        <h3>Legend</h3>
        <div className="legend-item">
          <div className="legend-circle legend-main"></div>
          <span>Main Salian lineage (♀)</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle legend-member"></div>
          <span>Salian family member</span>
        </div>
        <div className="legend-item">
          <div className="legend-circle legend-deceased"></div>
          <span>Deceased</span>
        </div>
        {searchTerm && (
          <div className="legend-item">
            <div className="legend-circle" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}></div>
            <span>Search matches</span>
          </div>
        )}
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
          Click any card to view profile & actions
        </div>
      </div>

      {/* Family Tree */}
      <div className="tree-container">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="tree-svg"
        />
      </div>

      {/* Person Profile Modal */}
      <PersonProfile
        person={selectedPerson}
        isOpen={showProfile}
        onClose={() => {
          setShowProfile(false);
          setSelectedPerson(null);
        }}
        onAddChild={(person) => {
          setSelectedPerson(person);
          setAddingParentFor(null);
          setShowProfile(false);
          setShowAddForm(true);
        }}
        onAddParent={(person) => {
          setAddingParentFor(person);
          setSelectedPerson(null);
          setShowProfile(false);
          setShowAddForm(true);
        }}
        onEdit={(person) => {
          setEditingPerson(person);
          setAddingParentFor(null);
          setShowProfile(false);
          setShowAddForm(true);
        }}
        onDelete={handleDeletePerson}
        familyData={familyData}
      />

      {/* Add/Edit Person Form Modal */}
      <AddPersonForm
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setSelectedPerson(null);
          setEditingPerson(null);
          setAddingParentFor(null);
        }}
        onAddPerson={editingPerson ? handleEditPerson : handleAddPerson}
        selectedParent={selectedPerson}
        familyData={familyData}
        editingPerson={editingPerson}
        isEditing={!!editingPerson}
        addingParentFor={addingParentFor}
      />

      {/* Data info */}
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        background: 'rgba(255,255,255,0.9)',
        padding: '0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        color: '#6b7280'
      }}>
        {familyData.length} family members • {isOnline ? 'Cloud storage' : 'Offline mode'}
        {searchTerm && ` • Showing ${filteredData.length} matches`}
      </div>
    </div>
  );
};

export default FamilyTree;